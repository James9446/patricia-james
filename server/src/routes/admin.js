const express = require('express');
const { query } = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const logger = require('../config/logger');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// All admin routes require authentication and admin privileges
router.use(requireAuth, requireAdmin);

// GET /api/admin/stats - Dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    // Get photo counts
    const photosResult = await query(`
      SELECT
        COUNT(*) FILTER (WHERE deleted_at IS NULL) as total_photos,
        COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_featured = true) as featured_photos,
        COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_photos
      FROM photos
    `);

    // Get RSVP counts
    const rsvpsResult = await query(`
      SELECT
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT r.id) FILTER (WHERE r.response_status = 'attending') as attending,
        COUNT(DISTINCT r.id) FILTER (WHERE r.response_status = 'not_attending') as not_attending,
        COUNT(DISTINCT u.id) FILTER (WHERE r.id IS NULL) as pending
      FROM users u
      LEFT JOIN rsvps r ON u.id = r.user_id
      WHERE u.deleted_at IS NULL
    `);

    // Get recent photo uploads (last 10)
    const recentPhotosResult = await query(`
      SELECT
        p.id,
        p.filename,
        p.thumbnail_filename,
        p.upload_date,
        p.is_featured,
        p.deleted_at,
        u.full_name as uploader_name,
        c.name as category_name
      FROM photos p
      JOIN users u ON p.user_id = u.id
      JOIN photo_categories c ON p.category_id = c.id
      ORDER BY p.upload_date DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      stats: {
        photos: photosResult.rows[0],
        rsvps: rsvpsResult.rows[0],
        recent_photos: recentPhotosResult.rows
      }
    });
  } catch (error) {
    logger.error(`Error fetching admin stats: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// GET /api/admin/photos - List all photos with filters
router.get('/photos', async (req, res) => {
  try {
    const {
      category = null,
      featured = null,
      deleted = 'false', // 'true', 'false', or 'all'
      search = null,
      sort = 'newest',
      limit = 50,
      offset = 0
    } = req.query;

    let whereConditions = ['u.deleted_at IS NULL'];
    let params = [];
    let paramCount = 0;

    // Filter by category
    if (category && category !== 'all') {
      paramCount++;
      whereConditions.push(`c.slug = $${paramCount}`);
      params.push(category);
    }

    // Filter by featured status
    if (featured === 'true') {
      whereConditions.push('p.is_featured = true');
    } else if (featured === 'false') {
      whereConditions.push('p.is_featured = false');
    }

    // Filter by deleted status
    if (deleted === 'true') {
      whereConditions.push('p.deleted_at IS NOT NULL');
    } else if (deleted === 'false') {
      whereConditions.push('p.deleted_at IS NULL');
    }
    // 'all' shows both deleted and non-deleted

    // Search by uploader name or caption
    if (search) {
      paramCount++;
      whereConditions.push(`(u.full_name ILIKE $${paramCount} OR p.caption ILIKE $${paramCount})`);
      params.push(`%${search}%`);
    }

    // Build ORDER BY clause
    let orderBy = '';
    switch (sort) {
      case 'oldest':
        orderBy = 'p.upload_date ASC';
        break;
      case 'featured':
        orderBy = 'p.is_featured DESC, p.upload_date DESC';
        break;
      case 'uploader':
        orderBy = 'u.full_name ASC, p.upload_date DESC';
        break;
      case 'newest':
      default:
        orderBy = 'p.upload_date DESC';
    }

    const whereClause = whereConditions.join(' AND ');

    paramCount++;
    params.push(parseInt(limit));
    paramCount++;
    params.push(parseInt(offset));

    const photosResult = await query(`
      SELECT
        p.id,
        p.filename,
        p.optimized_filename,
        p.thumbnail_filename,
        p.caption,
        p.upload_date,
        p.is_featured,
        p.is_approved,
        p.deleted_at,
        p.file_size,
        u.full_name as uploader_name,
        u.email as uploader_email,
        c.name as category_name,
        c.slug as category_slug,
        COALESCE(like_stats.like_count, 0) as like_count,
        COALESCE(comment_stats.comment_count, 0) as comment_count
      FROM photos p
      JOIN users u ON p.user_id = u.id
      JOIN photo_categories c ON p.category_id = c.id
      LEFT JOIN (
        SELECT photo_id, COUNT(*) as like_count
        FROM photo_likes
        GROUP BY photo_id
      ) like_stats ON p.id = like_stats.photo_id
      LEFT JOIN (
        SELECT photo_id, COUNT(*) as comment_count
        FROM photo_comments
        WHERE is_approved = true
        GROUP BY photo_id
      ) comment_stats ON p.id = comment_stats.photo_id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramCount - 1}
      OFFSET $${paramCount}
    `, params);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM photos p
      JOIN users u ON p.user_id = u.id
      JOIN photo_categories c ON p.category_id = c.id
      WHERE ${whereClause}
    `, params.slice(0, -2));

    res.json({
      success: true,
      photos: photosResult.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    logger.error(`Error fetching admin photos: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch photos',
      error: error.message
    });
  }
});

// PUT /api/admin/photos/:id - Update photo (toggle featured)
router.put('/photos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_featured } = req.body;

    if (typeof is_featured !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_featured must be a boolean value'
      });
    }

    const result = await query(`
      UPDATE photos
      SET is_featured = $1
      WHERE id = $2
      RETURNING id, is_featured, filename
    `, [is_featured, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }

    logger.info(`Photo ${id} featured status updated to ${is_featured} by admin ${req.user.email}`);

    res.json({
      success: true,
      photo: result.rows[0],
      message: is_featured ? 'Photo marked as featured' : 'Photo removed from featured'
    });
  } catch (error) {
    logger.error(`Error updating photo: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to update photo',
      error: error.message
    });
  }
});

// DELETE /api/admin/photos/:id - Delete photo (soft or hard)
router.delete('/photos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = 'false' } = req.query;

    const isPermanent = permanent === 'true';

    if (isPermanent) {
      // Hard delete - remove from database and filesystem
      const photoResult = await query(`
        SELECT filename, optimized_filename, thumbnail_filename, file_path
        FROM photos
        WHERE id = $1
      `, [id]);

      if (photoResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Photo not found'
        });
      }

      const photo = photoResult.rows[0];

      // Delete from database
      await query('DELETE FROM photos WHERE id = $1', [id]);

      // Delete files from filesystem
      const uploadsDir = path.join(__dirname, '../../uploads/photos');
      const filesToDelete = [
        photo.filename,
        photo.optimized_filename,
        photo.thumbnail_filename
      ].filter(Boolean);

      for (const filename of filesToDelete) {
        try {
          const filePath = path.join(uploadsDir, filename);
          await fs.unlink(filePath);
        } catch (fileError) {
          logger.warn(`Failed to delete file ${filename}: ${fileError.message}`);
        }
      }

      logger.info(`Photo ${id} permanently deleted by admin ${req.user.email}`);

      res.json({
        success: true,
        message: 'Photo permanently deleted'
      });
    } else {
      // Soft delete - mark as deleted
      const result = await query(`
        UPDATE photos
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, filename
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Photo not found or already deleted'
        });
      }

      logger.info(`Photo ${id} soft deleted by admin ${req.user.email}`);

      res.json({
        success: true,
        message: 'Photo hidden (soft deleted)',
        photo: result.rows[0]
      });
    }
  } catch (error) {
    logger.error(`Error deleting photo: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to delete photo',
      error: error.message
    });
  }
});

// PUT /api/admin/photos/:id/restore - Restore soft-deleted photo
router.put('/photos/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      UPDATE photos
      SET deleted_at = NULL
      WHERE id = $1 AND deleted_at IS NOT NULL
      RETURNING id, filename, upload_date
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found or not deleted'
      });
    }

    logger.info(`Photo ${id} restored by admin ${req.user.email}`);

    res.json({
      success: true,
      message: 'Photo restored successfully',
      photo: result.rows[0]
    });
  } catch (error) {
    logger.error(`Error restoring photo: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to restore photo',
      error: error.message
    });
  }
});

// GET /api/admin/rsvps - List all RSVPs
router.get('/rsvps', async (req, res) => {
  try {
    const {
      status = 'all', // 'all', 'attending', 'not_attending', 'pending'
      sort = 'name',
      limit = 100,
      offset = 0
    } = req.query;

    let whereConditions = ['u.deleted_at IS NULL'];
    const params = [];

    // Filter by RSVP status
    if (status === 'attending') {
      whereConditions.push("r.response_status = 'attending'");
    } else if (status === 'not_attending') {
      whereConditions.push("r.response_status = 'not_attending'");
    } else if (status === 'pending') {
      whereConditions.push('r.response_status IS NULL');
    }

    // Build ORDER BY clause
    let orderBy = '';
    switch (sort) {
      case 'date':
        orderBy = 'r.responded_at DESC NULLS LAST, u.last_name ASC';
        break;
      case 'status':
        orderBy = 'r.response_status ASC NULLS LAST, u.last_name ASC';
        break;
      case 'name':
      default:
        orderBy = 'u.last_name ASC, u.first_name ASC';
    }

    const whereClause = whereConditions.join(' AND ');

    const rsvpsResult = await query(`
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.full_name,
        u.plus_one_allowed,
        r.response_status,
        r.dietary_restrictions,
        r.message,
        r.responded_at as submitted_at,
        p.full_name as partner_name
      FROM users u
      LEFT JOIN rsvps r ON u.id = r.user_id
      LEFT JOIN users p ON u.partner_id = p.id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $1
      OFFSET $2
    `, [parseInt(limit), parseInt(offset)]);

    // Get count by status
    const statsResult = await query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(r.response_status) FILTER (WHERE r.response_status = 'attending') as attending_count,
        COUNT(r.response_status) FILTER (WHERE r.response_status = 'not_attending') as not_attending_count,
        COUNT(*) FILTER (WHERE r.response_status IS NULL) as pending_count
      FROM users u
      LEFT JOIN rsvps r ON u.id = r.user_id
      WHERE u.deleted_at IS NULL
    `);

    res.json({
      success: true,
      rsvps: rsvpsResult.rows,
      stats: statsResult.rows[0],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    logger.error(`Error fetching admin RSVPs: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch RSVPs',
      error: error.message
    });
  }
});

module.exports = router;
