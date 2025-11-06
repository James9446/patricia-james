/**
 * Generate Thumbnails and Optimized Images
 *
 * Description: Processes all existing photos to create thumbnails and optimized versions
 *              using the Sharp image processing library.
 *
 * When to use: After bulk photo upload or when photos are missing optimized versions
 *
 * Processing Details:
 * - Thumbnails: 300x300px, 80% quality, cover fit (for gallery grid)
 * - Optimized: 1200px max dimension, 85% quality, inside fit (for lightbox)
 * - Auto-rotates based on EXIF orientation
 * - Preserves aspect ratio
 *
 * Usage:
 *   cd server
 *   node scripts/generate-thumbnails.js
 *
 * Prerequisites:
 * - DATABASE_URL environment variable configured
 * - Sharp library installed (npm install sharp)
 * - Photos exist in server/uploads directory
 * - Database migrations up to date
 *
 * Output: Progress updates and size reduction statistics
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const UPLOADS_DIR = path.join(__dirname, '../uploads/photos');

// Image sizes
const THUMBNAIL_SIZE = 300;
const OPTIMIZED_MAX_WIDTH = 1200;
const QUALITY = 85;

async function generateThumbnail(sourcePath, filename) {
  const thumbnailFilename = filename.replace('original_', 'thumb_');
  const thumbnailPath = path.join(UPLOADS_DIR, thumbnailFilename);

  await sharp(sourcePath)
    .rotate() // Auto-rotate based on EXIF orientation
    .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: QUALITY })
    .toFile(thumbnailPath);

  return thumbnailFilename;
}

async function generateOptimized(sourcePath, filename) {
  const optimizedFilename = filename.replace('original_', 'optimized_');
  const optimizedPath = path.join(UPLOADS_DIR, optimizedFilename);

  const metadata = await sharp(sourcePath).metadata();

  // Only resize if image is wider than max width
  if (metadata.width > OPTIMIZED_MAX_WIDTH) {
    await sharp(sourcePath)
      .rotate() // Auto-rotate based on EXIF orientation
      .resize(OPTIMIZED_MAX_WIDTH, null, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: QUALITY })
      .toFile(optimizedPath);
  } else {
    // Just optimize quality without resizing
    await sharp(sourcePath)
      .rotate() // Auto-rotate based on EXIF orientation
      .jpeg({ quality: QUALITY })
      .toFile(optimizedPath);
  }

  return optimizedFilename;
}

async function processPhoto(photo) {
  try {
    const sourcePath = path.join(UPLOADS_DIR, photo.filename);

    // Check if source file exists
    try {
      await fs.access(sourcePath);
    } catch (err) {
      console.error(`   ✗ Source file not found: ${photo.filename}`);
      return { success: false, error: 'Source file not found' };
    }

    // Generate thumbnail
    const thumbnailFilename = await generateThumbnail(sourcePath, photo.filename);

    // Generate optimized version
    const optimizedFilename = await generateOptimized(sourcePath, photo.filename);

    // Get file sizes
    const thumbnailStats = await fs.stat(path.join(UPLOADS_DIR, thumbnailFilename));
    const optimizedStats = await fs.stat(path.join(UPLOADS_DIR, optimizedFilename));

    // Update database
    await pool.query(`
      UPDATE photos
      SET
        thumbnail_filename = $1,
        optimized_filename = $2,
        optimized_file_size = $3,
        is_optimized = true,
        optimized_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [
      thumbnailFilename,
      optimizedFilename,
      optimizedStats.size,
      photo.id
    ]);

    return {
      success: true,
      thumbnailSize: thumbnailStats.size,
      optimizedSize: optimizedStats.size,
      originalSize: photo.file_size
    };

  } catch (error) {
    console.error(`   ✗ Error processing ${photo.filename}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('==========================================');
  console.log('GENERATING THUMBNAILS & OPTIMIZED IMAGES');
  console.log('==========================================\n');

  try {
    // Get all photos from database
    const result = await pool.query(`
      SELECT id, filename, file_size, original_filename
      FROM photos
      WHERE thumbnail_filename IS NULL OR optimized_filename IS NULL
      ORDER BY upload_date DESC
    `);

    const photos = result.rows;
    console.log(`Found ${photos.length} photos to process\n`);

    let successCount = 0;
    let errorCount = 0;
    let totalOriginalSize = 0;
    let totalThumbnailSize = 0;
    let totalOptimizedSize = 0;

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      process.stdout.write(`Processing ${i + 1}/${photos.length}: ${photo.original_filename}...`);

      const result = await processPhoto(photo);

      if (result.success) {
        successCount++;
        totalOriginalSize += result.originalSize;
        totalThumbnailSize += result.thumbnailSize;
        totalOptimizedSize += result.optimizedSize;
        console.log(' ✓');
      } else {
        errorCount++;
        console.log(` ✗ ${result.error}`);
      }
    }

    // Calculate savings
    const thumbnailSavings = ((1 - totalThumbnailSize / totalOriginalSize) * 100).toFixed(1);
    const optimizedSavings = ((1 - totalOptimizedSize / totalOriginalSize) * 100).toFixed(1);

    console.log('\n==========================================');
    console.log('PROCESSING COMPLETE');
    console.log('==========================================');
    console.log(`✓ Successfully processed: ${successCount}`);
    console.log(`✗ Errors: ${errorCount}`);
    console.log(`\nSize Reduction:`);
    console.log(`  Original files:  ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Thumbnails:      ${(totalThumbnailSize / 1024 / 1024).toFixed(2)} MB (${thumbnailSavings}% smaller)`);
    console.log(`  Optimized:       ${(totalOptimizedSize / 1024 / 1024).toFixed(2)} MB (${optimizedSavings}% smaller)`);
    console.log('==========================================\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
