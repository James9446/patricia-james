const express = require('express');
const { query } = require('../config/db');

const router = express.Router();

// GET /api/categories - Get all active photo categories
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id,
        name,
        slug,
        description,
        display_order,
        is_active,
        created_at
      FROM photo_categories 
      WHERE is_active = true 
      ORDER BY display_order ASC, name ASC
    `);

    res.json({
      success: true,
      categories: result.rows
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
});

// GET /api/categories/:slug - Get specific category with photo count
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    // Get category details
    const categoryResult = await query(`
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.description,
        c.display_order,
        c.is_active,
        c.created_at,
        COUNT(p.id) as photo_count,
        MAX(p.upload_date) as latest_photo_date
      FROM photo_categories c
      LEFT JOIN photos p ON c.id = p.category_id AND p.is_approved = true
      WHERE c.slug = $1 AND c.is_active = true
      GROUP BY c.id, c.name, c.slug, c.description, c.display_order, c.is_active, c.created_at
    `, [slug]);

    if (categoryResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const category = categoryResult.rows[0];

    // Get recent photos for this category (limit 6 for preview)
    const recentPhotosResult = await query(`
      SELECT 
        p.id,
        p.filename,
        p.optimized_filename,
        p.thumbnail_filename,
        p.caption,
        p.is_featured,
        p.upload_date,
        u.first_name,
        u.last_name,
        u.full_name,
        COALESCE(like_stats.like_count, 0) as like_count,
        COALESCE(comment_stats.comment_count, 0) as comment_count
      FROM photos p
      JOIN users u ON p.user_id = u.id
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
      WHERE p.category_id = $1 
      AND p.is_approved = true
      AND u.deleted_at IS NULL
      ORDER BY p.upload_date DESC
      LIMIT 6
    `, [category.id]);

    res.json({
      success: true,
      category: {
        ...category,
        recent_photos: recentPhotosResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category',
      error: error.message
    });
  }
});

// GET /api/categories/:slug/photos - Get photos for a specific category with pagination
router.get('/:slug/photos', async (req, res) => {
  try {
    const { slug } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      sort = 'newest' 
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Validate sort parameter
    const validSorts = ['newest', 'oldest', 'most_liked', 'most_commented', 'featured'];
    const sortBy = validSorts.includes(sort) ? sort : 'newest';

    // Get category ID
    const categoryResult = await query(
      'SELECT id FROM photo_categories WHERE slug = $1 AND is_active = true',
      [slug]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const categoryId = categoryResult.rows[0].id;

    // Get photos using the database function
    const photosResult = await query(
      'SELECT * FROM get_photos_by_category($1, $2, $3, $4)',
      [slug, parseInt(limit), offset, sortBy]
    );

    // Get total count for pagination
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM photos p
      JOIN users u ON p.user_id = u.id
      WHERE p.category_id = $1 
      AND p.is_approved = true
      AND u.deleted_at IS NULL
    `, [categoryId]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      photos: photosResult.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_photos: total,
        limit: parseInt(limit),
        has_next: parseInt(page) < totalPages,
        has_prev: parseInt(page) > 1
      },
      category: {
        slug,
        sort: sortBy
      }
    });
  } catch (error) {
    console.error('Error fetching category photos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category photos',
      error: error.message
    });
  }
});

// GET /api/categories/stats - Get category statistics
router.get('/stats', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.display_order,
        COUNT(p.id) as photo_count,
        MAX(p.upload_date) as latest_photo_date,
        COALESCE(SUM(like_stats.like_count), 0) as total_likes,
        COALESCE(SUM(comment_stats.comment_count), 0) as total_comments
      FROM photo_categories c
      LEFT JOIN photos p ON c.id = p.category_id AND p.is_approved = true
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
      WHERE c.is_active = true
      GROUP BY c.id, c.name, c.slug, c.display_order
      ORDER BY c.display_order ASC
    `);

    res.json({
      success: true,
      categories: result.rows
    });
  } catch (error) {
    console.error('Error fetching category stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category statistics',
      error: error.message
    });
  }
});

module.exports = router;
