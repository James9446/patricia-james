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

// ==========================================
// USER MANAGEMENT ENDPOINTS
// ==========================================

// GET /api/admin/users - List all users with filters
router.get('/users', async (req, res) => {
  try {
    const {
      status = 'all', // 'all', 'guest', 'registered'
      has_partner = 'all', // 'all', 'true', 'false'
      plus_one = 'all', // 'all', 'true', 'false'
      search = null,
      sort = 'name',
      limit = 100,
      offset = 0,
      include_deleted = 'false'
    } = req.query;

    let whereConditions = [];
    const params = [];
    let paramCount = 0;

    // Filter by deleted status
    if (include_deleted === 'false') {
      whereConditions.push('u.deleted_at IS NULL');
    }

    // Filter by account status
    if (status === 'guest') {
      whereConditions.push("u.account_status = 'guest'");
    } else if (status === 'registered') {
      whereConditions.push("u.account_status = 'registered'");
    }

    // Filter by partner status
    if (has_partner === 'true') {
      whereConditions.push('u.partner_id IS NOT NULL');
    } else if (has_partner === 'false') {
      whereConditions.push('u.partner_id IS NULL');
    }

    // Filter by plus-one allowed
    if (plus_one === 'true') {
      whereConditions.push('u.plus_one_allowed = true');
    } else if (plus_one === 'false') {
      whereConditions.push('u.plus_one_allowed = false');
    }

    // Search by name or email
    if (search) {
      paramCount++;
      whereConditions.push(`(u.full_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`);
      params.push(`%${search}%`);
    }

    // Build ORDER BY clause
    let orderBy = '';
    switch (sort) {
      case 'email':
        orderBy = 'u.email ASC NULLS LAST, u.last_name ASC';
        break;
      case 'status':
        orderBy = 'u.account_status ASC, u.last_name ASC';
        break;
      case 'created':
        orderBy = 'u.created_at DESC';
        break;
      case 'name':
      default:
        orderBy = 'u.last_name ASC, u.first_name ASC';
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    paramCount++;
    params.push(parseInt(limit));
    paramCount++;
    params.push(parseInt(offset));

    const usersResult = await query(`
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.full_name,
        u.address,
        u.partner_id,
        u.plus_one_allowed,
        u.is_admin,
        u.account_status,
        u.created_at,
        u.deleted_at,
        p.full_name as partner_name,
        p.email as partner_email,
        r.response_status as rsvp_status
      FROM users u
      LEFT JOIN users p ON u.partner_id = p.id
      LEFT JOIN rsvps r ON u.id = r.user_id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramCount - 1}
      OFFSET $${paramCount}
    `, params);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM users u
      ${whereClause}
    `, params.slice(0, -2));

    // Get statistics
    const statsResult = await query(`
      SELECT
        COUNT(*) FILTER (WHERE deleted_at IS NULL) as total_active,
        COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as total_deleted,
        COUNT(*) FILTER (WHERE account_status = 'guest' AND deleted_at IS NULL) as total_guests,
        COUNT(*) FILTER (WHERE account_status = 'registered' AND deleted_at IS NULL) as total_registered,
        COUNT(*) FILTER (WHERE partner_id IS NOT NULL AND deleted_at IS NULL) as total_with_partner,
        COUNT(*) FILTER (WHERE plus_one_allowed = true AND deleted_at IS NULL) as total_plus_one_allowed
      FROM users
    `);

    res.json({
      success: true,
      users: usersResult.rows,
      total: parseInt(countResult.rows[0].total),
      stats: statsResult.rows[0],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    logger.error(`Error fetching admin users: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

// GET /api/admin/users/:id - Get single user with full details
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.full_name,
        u.address,
        u.partner_id,
        u.plus_one_allowed,
        u.is_admin,
        u.account_status,
        u.created_at,
        u.deleted_at,
        p.id as partner_id_full,
        p.full_name as partner_name,
        p.email as partner_email,
        p.account_status as partner_status,
        r.response_status,
        r.dietary_restrictions,
        r.message as rsvp_message,
        r.responded_at
      FROM users u
      LEFT JOIN users p ON u.partner_id = p.id
      LEFT JOIN rsvps r ON u.id = r.user_id
      WHERE u.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    logger.error(`Error fetching user ${req.params.id}: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
});

// POST /api/admin/users - Create new user
router.post('/users', async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email = null,
      address = null,
      partner_id = null,
      plus_one_allowed = false,
      account_status = 'guest'
    } = req.body;

    // Validate required fields
    if (!first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: 'First name and last name are required'
      });
    }

    // Validate account_status
    if (!['guest', 'registered'].includes(account_status)) {
      return res.status(400).json({
        success: false,
        message: 'account_status must be "guest" or "registered"'
      });
    }

    // If registered, email is required
    if (account_status === 'registered' && !email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for registered users'
      });
    }

    // Check if email already exists (if provided)
    if (email) {
      const emailCheck = await query(
        'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
        [email]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Validate partner_id if provided
    if (partner_id) {
      const partnerCheck = await query(
        'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL',
        [partner_id]
      );
      if (partnerCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Partner user not found'
        });
      }
    }

    // Create user
    const result = await query(`
      INSERT INTO users (
        first_name,
        last_name,
        email,
        address,
        partner_id,
        plus_one_allowed,
        account_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, first_name, last_name, full_name, email, address, partner_id, plus_one_allowed, account_status, created_at
    `, [first_name, last_name, email, address, partner_id, plus_one_allowed, account_status]);

    // Handle bidirectional partner relationship
    if (partner_id) {
      await query(
        'UPDATE users SET partner_id = $1 WHERE id = $2 AND deleted_at IS NULL',
        [result.rows[0].id, partner_id]
      );
    }

    logger.info(`User ${result.rows[0].id} created by admin ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: result.rows[0]
    });
  } catch (error) {
    logger.error(`Error creating user: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
});

// PUT /api/admin/users/:id - Update user
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      email,
      address,
      partner_id,
      plus_one_allowed,
      account_status
    } = req.body;

    // Check if user exists
    const userCheck = await query('SELECT id, account_status FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validate account_status if being changed
    if (account_status && !['guest', 'registered'].includes(account_status)) {
      return res.status(400).json({
        success: false,
        message: 'account_status must be "guest" or "registered"'
      });
    }

    // If changing to registered, email is required
    if (account_status === 'registered' && !email && !userCheck.rows[0].email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required when changing status to registered'
      });
    }

    // Check email uniqueness if being changed
    if (email) {
      const emailCheck = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2 AND deleted_at IS NULL',
        [email, id]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Validate partner_id if provided
    if (partner_id !== undefined && partner_id !== null) {
      // Prevent self-partnering
      if (partner_id === id) {
        return res.status(400).json({
          success: false,
          message: 'Users cannot be their own partner'
        });
      }

      const partnerCheck = await query(
        'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL',
        [partner_id]
      );
      if (partnerCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Partner user not found'
        });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 0;

    if (first_name !== undefined) {
      paramCount++;
      updates.push(`first_name = $${paramCount}`);
      values.push(first_name);
    }
    if (last_name !== undefined) {
      paramCount++;
      updates.push(`last_name = $${paramCount}`);
      values.push(last_name);
    }
    if (email !== undefined) {
      paramCount++;
      updates.push(`email = $${paramCount}`);
      values.push(email);
    }
    if (address !== undefined) {
      paramCount++;
      updates.push(`address = $${paramCount}`);
      values.push(address);
    }
    if (partner_id !== undefined) {
      paramCount++;
      updates.push(`partner_id = $${paramCount}`);
      values.push(partner_id);
    }
    if (plus_one_allowed !== undefined) {
      paramCount++;
      updates.push(`plus_one_allowed = $${paramCount}`);
      values.push(plus_one_allowed);
    }
    if (account_status !== undefined) {
      paramCount++;
      updates.push(`account_status = $${paramCount}`);
      values.push(account_status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    paramCount++;
    values.push(id);

    // Get the user's old partner_id before update
    const oldUserData = await query('SELECT partner_id FROM users WHERE id = $1', [id]);
    const oldPartnerId = oldUserData.rows[0]?.partner_id;

    const result = await query(`
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, first_name, last_name, full_name, email, address, partner_id, plus_one_allowed, account_status, created_at, deleted_at
    `, values);

    // Handle bidirectional partner relationship changes
    if (partner_id !== undefined) {
      // If old partner exists and is different from new partner, unlink them
      if (oldPartnerId && oldPartnerId !== partner_id) {
        await query(
          'UPDATE users SET partner_id = NULL WHERE id = $1 AND partner_id = $2',
          [oldPartnerId, id]
        );
      }

      // If new partner is set, link them bidirectionally
      if (partner_id) {
        await query(
          'UPDATE users SET partner_id = $1 WHERE id = $2 AND deleted_at IS NULL',
          [id, partner_id]
        );
      }
      // If partner_id is being cleared (null), unlink the old partner
      else if (oldPartnerId) {
        await query(
          'UPDATE users SET partner_id = NULL WHERE id = $1 AND partner_id = $2',
          [oldPartnerId, id]
        );
      }
    }

    logger.info(`User ${id} updated by admin ${req.user.email}`);

    res.json({
      success: true,
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    logger.error(`Error updating user ${req.params.id}: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
});

// DELETE /api/admin/users/:id - Delete user (soft or hard)
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = 'false' } = req.query;

    const isPermanent = permanent === 'true';

    if (isPermanent) {
      // Hard delete - permanently remove from database
      // First, unlink any partners
      await query(`
        UPDATE users
        SET partner_id = NULL
        WHERE partner_id = $1
      `, [id]);

      const result = await query(`
        DELETE FROM users
        WHERE id = $1
        RETURNING id, full_name, email
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      logger.info(`User ${id} (${result.rows[0].full_name}) permanently deleted by admin ${req.user.email}`);

      res.json({
        success: true,
        message: 'User permanently deleted',
        user: result.rows[0]
      });
    } else {
      // Soft delete - mark as deleted and unlink partners
      await query(`
        UPDATE users
        SET partner_id = NULL
        WHERE partner_id = $1
      `, [id]);

      const result = await query(`
        UPDATE users
        SET deleted_at = CURRENT_TIMESTAMP, partner_id = NULL
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, full_name, email
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found or already deleted'
        });
      }

      logger.info(`User ${id} (${result.rows[0].full_name}) soft deleted by admin ${req.user.email}`);

      res.json({
        success: true,
        message: 'User hidden (soft deleted)',
        user: result.rows[0]
      });
    }
  } catch (error) {
    logger.error(`Error deleting user ${req.params.id}: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
});

// PUT /api/admin/users/:id/restore - Restore soft-deleted user
router.put('/users/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      UPDATE users
      SET deleted_at = NULL
      WHERE id = $1 AND deleted_at IS NOT NULL
      RETURNING id, full_name, email, created_at
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found or not deleted'
      });
    }

    logger.info(`User ${id} (${result.rows[0].full_name}) restored by admin ${req.user.email}`);

    res.json({
      success: true,
      message: 'User restored successfully',
      user: result.rows[0]
    });
  } catch (error) {
    logger.error(`Error restoring user ${req.params.id}: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to restore user',
      error: error.message
    });
  }
});

// ==========================================
// RSVP MANAGEMENT ENDPOINTS
// ==========================================

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
