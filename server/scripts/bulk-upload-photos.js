/**
 * Bulk Photo Upload Script
 *
 * Description: Uploads photos from the source photos folder into the database
 *              and copies them to the server uploads directory.
 *
 * When to use: Initial photo import or bulk adding curated photos to production
 *
 * Folder mappings:
 * - engagement_photos → Engagement category
 * - patricia_and_james → Relationship Timeline category
 *
 * Features:
 * - Automatically generates unique filenames
 * - Prevents duplicate uploads (checks original_filename + category)
 * - Auto-approves imported photos (sets is_approved = true)
 * - Marks as 'bulk_import' source
 * - Skips macOS metadata files (._*)
 *
 * Usage:
 *   cd server
 *   node scripts/bulk-upload-photos.js
 *
 * Prerequisites:
 * - DATABASE_URL environment variable configured
 * - Source photos directory exists (../../photos/)
 * - Database migrations up to date (migration 006 minimum)
 *
 * Output: Displays upload progress and summary statistics
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Folder to category mapping
const FOLDER_MAPPINGS = {
  'engagement_photos': 'engagement',
  'patricia_and_james': 'timeline'
};

// Source and destination paths
const SOURCE_DIR = path.join(__dirname, '../../photos');
const DEST_DIR = path.join(__dirname, '../uploads/photos');

// Supported image extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

async function ensureUploadDir() {
  try {
    await fs.access(DEST_DIR);
  } catch {
    await fs.mkdir(DEST_DIR, { recursive: true });
    console.log(`✓ Created uploads directory: ${DEST_DIR}`);
  }
}

async function getUploadUser() {
  // Try to find admin user first
  let result = await pool.query(
    'SELECT id, first_name, last_name FROM users WHERE is_admin = true AND deleted_at IS NULL LIMIT 1'
  );

  // If no admin, use first available user
  if (result.rows.length === 0) {
    result = await pool.query(
      'SELECT id, first_name, last_name FROM users WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1'
    );
  }

  if (result.rows.length === 0) {
    throw new Error('No users found in database. Please create a user first.');
  }

  return result.rows[0];
}

async function getCategoryId(slug) {
  const result = await pool.query(
    'SELECT id FROM photo_categories WHERE slug = $1',
    [slug]
  );

  if (result.rows.length === 0) {
    throw new Error(`Category with slug "${slug}" not found`);
  }

  return result.rows[0].id;
}

function generateFileHash(filepath) {
  // For now, use filename as hash since we're not reading file contents
  // In production, you'd read the file and hash its contents
  return crypto.createHash('md5').update(filepath).digest('hex');
}

function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  // Skip macOS metadata files (._filename)
  if (filename.startsWith('._')) {
    return false;
  }
  return IMAGE_EXTENSIONS.includes(ext);
}

async function uploadPhotosFromFolder(folderName, categorySlug, userId) {
  const folderPath = path.join(SOURCE_DIR, folderName);
  const categoryId = await getCategoryId(categorySlug);

  console.log(`\n📸 Processing folder: ${folderName} → Category: ${categorySlug}`);

  // Read all files from the folder
  const files = await fs.readdir(folderPath);
  const imageFiles = files.filter(isImageFile);

  console.log(`   Found ${imageFiles.length} image files`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const filename of imageFiles) {
    try {
      const sourcePath = path.join(folderPath, filename);
      const fileStats = await fs.stat(sourcePath);

      // Generate unique filename for storage
      const ext = path.extname(filename);
      const uniqueFilename = `original_${crypto.randomUUID()}${ext}`;
      const destPath = path.join(DEST_DIR, uniqueFilename);

      // Check if photo already exists (by original filename and category)
      const existingCheck = await pool.query(
        'SELECT id FROM photos WHERE original_filename = $1 AND category_id = $2',
        [filename, categoryId]
      );

      if (existingCheck.rows.length > 0) {
        skipCount++;
        continue;
      }

      // Copy file to uploads directory
      await fs.copyFile(sourcePath, destPath);

      // Insert into database
      await pool.query(`
        INSERT INTO photos (
          user_id,
          category_id,
          filename,
          original_filename,
          file_path,
          file_size,
          mime_type,
          original_file_size,
          file_hash,
          is_approved,
          upload_source
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        userId,
        categoryId,
        uniqueFilename,
        filename,
        destPath,
        fileStats.size,
        `image/${ext.substring(1)}`,
        fileStats.size,
        generateFileHash(sourcePath),
        true, // Auto-approve since these are curated photos
        'bulk_import' // Mark as bulk imported
      ]);

      successCount++;

      if (successCount % 10 === 0) {
        console.log(`   ✓ Uploaded ${successCount} photos...`);
      }

    } catch (error) {
      console.error(`   ✗ Error uploading ${filename}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n   Summary for ${folderName}:`);
  console.log(`   ✓ Successfully uploaded: ${successCount}`);
  console.log(`   ⊘ Skipped (already exists): ${skipCount}`);
  console.log(`   ✗ Errors: ${errorCount}`);

  return { successCount, skipCount, errorCount };
}

async function main() {
  console.log('==========================================');
  console.log('BULK PHOTO UPLOAD');
  console.log('==========================================\n');

  try {
    // Ensure upload directory exists
    await ensureUploadDir();

    // Get user for uploads
    const uploadUser = await getUploadUser();
    console.log(`✓ Using user for uploads: ${uploadUser.first_name} ${uploadUser.last_name} (ID: ${uploadUser.id})\n`);

    let totalSuccess = 0;
    let totalSkip = 0;
    let totalError = 0;

    // Upload photos from each folder
    for (const [folderName, categorySlug] of Object.entries(FOLDER_MAPPINGS)) {
      const stats = await uploadPhotosFromFolder(folderName, categorySlug, uploadUser.id);
      totalSuccess += stats.successCount;
      totalSkip += stats.skipCount;
      totalError += stats.errorCount;
    }

    console.log('\n==========================================');
    console.log('UPLOAD COMPLETE');
    console.log('==========================================');
    console.log(`✓ Total uploaded: ${totalSuccess}`);
    console.log(`⊘ Total skipped: ${totalSkip}`);
    console.log(`✗ Total errors: ${totalError}`);
    console.log('==========================================\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
main();
