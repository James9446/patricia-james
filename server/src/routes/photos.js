const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const { query } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

// Configure multer for file uploads (no size limits)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Configure multer for batch uploads (max 20 photos)
const batchUpload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads/photos');
const ensureUploadsDir = async () => {
  try {
    await fs.access(uploadsDir);
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true });
  }
};

// Initialize uploads directory
ensureUploadsDir();

// Helper function to get user info
const getUserInfo = async (userId) => {
  const result = await query(
    'SELECT id, first_name, last_name, full_name FROM users WHERE id = $1 AND deleted_at IS NULL',
    [userId]
  );
  return result.rows[0];
};

// Helper function to generate file hash for duplicate detection
const generateFileHash = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

// Helper function to process and save image (background optimization)
const processAndSaveImage = async (buffer, originalFilename, photoId) => {
  try {
    const optimizedFilename = `optimized_${crypto.randomUUID()}.jpg`;
    const thumbnailFilename = `thumb_${crypto.randomUUID()}.jpg`;
    
    const optimizedPath = path.join(uploadsDir, optimizedFilename);
    const thumbnailPath = path.join(uploadsDir, thumbnailFilename);
    
    // Process optimized version
    const optimizedBuffer = await sharp(buffer)
      .resize(2048, 2048, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality: 85 })
      .toBuffer();
    
    await fs.writeFile(optimizedPath, optimizedBuffer);
    
    // Process thumbnail
    const thumbnailBuffer = await sharp(buffer)
      .resize(300, 300, { 
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toBuffer();
    
    await fs.writeFile(thumbnailPath, thumbnailBuffer);
    
    // Update database with optimized versions
    await query(`
      UPDATE photos 
      SET 
        optimized_filename = $1,
        thumbnail_filename = $2,
        is_optimized = true,
        optimized_at = CURRENT_TIMESTAMP,
        optimized_file_size = $3
      WHERE id = $4
    `, [optimizedFilename, thumbnailFilename, optimizedBuffer.length, photoId]);
    
    logger.info(`Photo ${photoId} optimized successfully`);
  } catch (error) {
    logger.error(`Failed to optimize photo ${photoId}: ${error.message}`, { stack: error.stack });
  }
};

// GET /api/photos - Get all approved photos with metadata
router.get('/', async (req, res) => {
  try {
    const { 
      sort = 'newest', 
      limit = 20, 
      offset = 0,
      category = null 
    } = req.query;
    
    let whereClause = 'WHERE p.is_approved = true AND u.deleted_at IS NULL';
    let params = [];
    let paramCount = 0;
    
    if (category) {
      paramCount++;
      whereClause += ` AND c.slug = $${paramCount}`;
      params.push(category);
    }

    // Whitelist valid sort options to prevent SQL injection
    // Using switch statement ensures only predefined ORDER BY clauses are used
    const validSortOptions = ['newest', 'oldest', 'most_liked', 'most_commented', 'featured'];
    const sortOption = validSortOptions.includes(sort) ? sort : 'newest';

    let orderBy;
    switch (sortOption) {
      case 'newest':
        orderBy = 'p.upload_date DESC';
        break;
      case 'oldest':
        orderBy = 'p.upload_date ASC';
        break;
      case 'most_liked':
        orderBy = 'like_count DESC, p.upload_date DESC';
        break;
      case 'most_commented':
        orderBy = 'comment_count DESC, p.upload_date DESC';
        break;
      case 'featured':
        orderBy = 'p.is_featured DESC, p.upload_date DESC';
        break;
      default:
        orderBy = 'p.upload_date DESC';
    }

    const result = await query(`
      SELECT 
        p.id,
        p.filename,
        p.optimized_filename,
        p.thumbnail_filename,
        p.caption,
        p.is_featured,
        p.upload_date,
        p.display_order,
        c.name as category_name,
        c.slug as category_slug,
        u.first_name,
        u.last_name,
        u.full_name,
        COALESCE(like_stats.like_count, 0) as like_count,
        COALESCE(comment_stats.comment_count, 0) as comment_count,
        CASE WHEN user_likes.id IS NOT NULL THEN true ELSE false END as user_has_liked
      FROM photos p
      JOIN photo_categories c ON p.category_id = c.id
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
      LEFT JOIN photo_likes user_likes ON p.id = user_likes.photo_id AND user_likes.user_id = $${paramCount + 1}
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramCount + 2} OFFSET $${paramCount + 3}
    `, [...params, req.session.userId || null, parseInt(limit), parseInt(offset)]);

    res.json({
      success: true,
      photos: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: result.rows.length === parseInt(limit)
      }
    });
  } catch (error) {
    logger.error(`Error fetching photos: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch photos',
      error: error.message
    });
  }
});

// POST /api/photos - Upload a new photo (no size limits)
router.post('/', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No photo file provided'
      });
    }

    const { caption = '', category_id } = req.body;
    const userId = req.session.userId;

    if (!category_id) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }

    // Validate category exists
    const categoryCheck = await query(
      'SELECT id FROM photo_categories WHERE id = $1 AND is_active = true',
      [category_id]
    );

    if (categoryCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }

    // Generate file hash for duplicate detection
    const fileHash = generateFileHash(req.file.buffer);

    // Check for duplicate photo
    const duplicateCheck = await query(
      'SELECT id, original_filename FROM photos WHERE file_hash = $1',
      [fileHash]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This photo has already been uploaded',
        duplicate: true,
        existing_photo: {
          id: duplicateCheck.rows[0].id,
          filename: duplicateCheck.rows[0].original_filename
        }
      });
    }

    // Save original photo immediately
    const originalFilename = `original_${crypto.randomUUID()}.${getFileExtension(req.file.originalname)}`;
    const originalPath = path.join(uploadsDir, originalFilename);
    await fs.writeFile(originalPath, req.file.buffer);

    // Create database record immediately
    const result = await query(`
      INSERT INTO photos (user_id, filename, original_filename, file_path, file_size, mime_type, caption, category_id, is_approved, original_file_size, file_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, upload_date
    `, [
      userId,
      originalFilename,
      req.file.originalname,
      originalPath,
      req.file.size,
      req.file.mimetype,
      caption,
      category_id,
      true, // Auto-approve for now
      req.file.size,
      fileHash
    ]);

    const photoId = result.rows[0].id;

    // Start background optimization (non-blocking)
    processAndSaveImage(req.file.buffer, req.file.originalname, photoId);

    // Get user info for response
    const userInfo = await getUserInfo(userId);

    res.status(201).json({
      success: true,
      message: 'Photo uploaded successfully',
      photo: {
        id: photoId,
        filename: originalFilename,
        caption,
        upload_date: result.rows[0].upload_date,
        user: userInfo,
        is_optimized: false
      }
    });
  } catch (error) {
    logger.error(`Error uploading photo: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to upload photo',
      error: error.message
    });
  }
});

// POST /api/photos/batch - Upload multiple photos at once
router.post('/batch', requireAuth, batchUpload.array('photos', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No photos provided'
      });
    }

    const { category_id, captions = [] } = req.body;
    const userId = req.session.userId;

    if (!category_id) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }

    // Validate category exists
    const categoryCheck = await query(
      'SELECT id FROM photo_categories WHERE id = $1 AND is_active = true',
      [category_id]
    );

    if (categoryCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }

    const results = {
      successful: [],
      failed: [],
      summary: {
        total: req.files.length,
        succeeded: 0,
        failed: 0
      }
    };

    // Process each photo individually
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const caption = captions[i] || '';

      try {
        // Generate file hash for duplicate detection
        const fileHash = generateFileHash(file.buffer);

        // Check for duplicate photo
        const duplicateCheck = await query(
          'SELECT id, original_filename FROM photos WHERE file_hash = $1',
          [fileHash]
        );

        if (duplicateCheck.rows.length > 0) {
          results.failed.push({
            index: i,
            filename: file.originalname,
            error: 'This photo has already been uploaded',
            duplicate: true
          });
          results.summary.failed++;
          continue;
        }

        // Save original photo
        const originalFilename = `original_${crypto.randomUUID()}.${getFileExtension(file.originalname)}`;
        const originalPath = path.join(uploadsDir, originalFilename);
        await fs.writeFile(originalPath, file.buffer);

        // Create database record
        const result = await query(`
          INSERT INTO photos (user_id, filename, original_filename, file_path, file_size, mime_type, caption, category_id, is_approved, original_file_size, file_hash)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id, upload_date
        `, [
          userId,
          originalFilename,
          file.originalname,
          originalPath,
          file.size,
          file.mimetype,
          caption,
          category_id,
          true, // Auto-approve for now
          file.size,
          fileHash
        ]);

        const photoId = result.rows[0].id;

        // Start background optimization (non-blocking)
        processAndSaveImage(file.buffer, file.originalname, photoId);

        results.successful.push({
          id: photoId,
          filename: originalFilename,
          caption,
          upload_date: result.rows[0].upload_date,
          index: i
        });
        results.summary.succeeded++;

      } catch (error) {
        logger.error(`Error processing photo ${i}: ${error.message}`, { stack: error.stack });
        results.failed.push({
          index: i,
          filename: file.originalname,
          error: error.message
        });
        results.summary.failed++;
      }
    }

    // Get user info for response
    const userInfo = await getUserInfo(userId);

    res.status(201).json({
      success: true,
      message: `Batch upload completed: ${results.summary.succeeded} succeeded, ${results.summary.failed} failed`,
      results,
      user: userInfo
    });

  } catch (error) {
    logger.error(`Error in batch upload: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to process batch upload',
      error: error.message
    });
  }
});

// GET /api/photos/:id - Get a specific photo with interactions
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        p.id,
        p.filename,
        p.optimized_filename,
        p.caption,
        p.is_featured,
        p.upload_date,
        COALESCE(like_stats.like_count, 0) as like_count,
        COALESCE(comment_stats.comment_count, 0) as comment_count,
        CASE WHEN $2 IS NOT NULL AND pl.id IS NOT NULL THEN true ELSE false END as user_has_liked,
        u.full_name,
        c.name as category_name,
        '[]'::json as comments
      FROM photos p
      JOIN photo_categories c ON p.category_id = c.id
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
      LEFT JOIN photo_likes pl ON p.id = pl.photo_id AND pl.user_id = $2
      WHERE p.id = $1 AND p.is_approved = true
    `, [id, req.session.userId || null]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }

    res.json({
      success: true,
      photo: result.rows[0]
    });
  } catch (error) {
    logger.error(`Error fetching photo: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch photo',
      error: error.message
    });
  }
});

// POST /api/photos/:id/likes - Like a photo
router.post('/:id/likes', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    // Check if photo exists and is approved
    const photoCheck = await query(
      'SELECT id FROM photos WHERE id = $1 AND is_approved = true',
      [id]
    );

    if (photoCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }

    // Check if user already liked
    const existingLike = await query(
      'SELECT id FROM photo_likes WHERE photo_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingLike.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already liked this photo'
      });
    }

    // Add like
    await query(
      'INSERT INTO photo_likes (photo_id, user_id) VALUES ($1, $2)',
      [id, userId]
    );

    res.json({
      success: true,
      message: 'Photo liked successfully'
    });
  } catch (error) {
    logger.error(`Error liking photo: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to like photo',
      error: error.message
    });
  }
});

// DELETE /api/photos/:id/likes - Unlike a photo
router.delete('/:id/likes', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    const result = await query(
      'DELETE FROM photo_likes WHERE photo_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Like not found'
      });
    }

    res.json({
      success: true,
      message: 'Like removed successfully'
    });
  } catch (error) {
    logger.error(`Error removing like: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to remove like',
      error: error.message
    });
  }
});

// POST /api/photos/:id/comments - Add a comment to a photo
router.post('/:id/comments', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = req.session.userId;

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comment cannot be empty'
      });
    }

    // Check if photo exists and is approved
    const photoCheck = await query(
      'SELECT id FROM photos WHERE id = $1 AND is_approved = true',
      [id]
    );

    if (photoCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }

    // Add comment
    const result = await query(`
      INSERT INTO photo_comments (photo_id, user_id, comment, is_approved)
      VALUES ($1, $2, $3, $4)
      RETURNING id, created_at
    `, [id, userId, comment.trim(), true]); // Auto-approve for now

    // Get user info for response
    const userInfo = await getUserInfo(userId);

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      comment: {
        id: result.rows[0].id,
        comment: comment.trim(),
        created_at: result.rows[0].created_at,
        user: userInfo
      }
    });
  } catch (error) {
    logger.error(`Error adding comment: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to add comment',
      error: error.message
    });
  }
});

// GET /api/photos/:id/comments - Get comments for a photo
router.get('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        c.id,
        c.comment,
        c.created_at,
        u.first_name,
        u.last_name,
        u.full_name
      FROM photo_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.photo_id = $1 AND c.is_approved = true
      ORDER BY c.created_at ASC
    `, [id]);

    res.json({
      success: true,
      comments: result.rows
    });
  } catch (error) {
    logger.error(`Error fetching comments: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments',
      error: error.message
    });
  }
});

// Serve uploaded photos
router.get('/uploads/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(uploadsDir, filename);
  
  res.sendFile(filePath, (err) => {
    if (err) {
      logger.error(`Error serving photo: ${err.message}`, { stack: err.stack });
      res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }
  });
});

// Helper function to get file extension
function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

module.exports = router;