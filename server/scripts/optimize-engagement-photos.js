const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Helper function to query database
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

async function optimizeEngagementPhotos() {
  try {
    console.log('🖼️  Optimizing engagement photos for better performance...');
    
    // Get all engagement photos
    const photos = await query(`
      SELECT id, filename, file_path 
      FROM photos 
      WHERE filename LIKE 'engagement_%'
      ORDER BY display_order
    `);
    
    console.log(`📸 Found ${photos.rows.length} photos to optimize`);
    
    const uploadsDir = path.join(__dirname, '../uploads/photos');
    
    let optimizedCount = 0;
    
    for (const photo of photos.rows) {
      try {
        const sourcePath = photo.file_path;
        const optimizedFilename = `opt_${photo.filename}`;
        const optimizedPath = path.join(uploadsDir, optimizedFilename);
        
        // Check if source file exists
        if (!fs.existsSync(sourcePath)) {
          console.log(`⚠️  Source file not found: ${sourcePath}`);
          continue;
        }
        
        // Skip if already optimized
        if (fs.existsSync(optimizedPath)) {
          console.log(`⏭️  Already optimized: ${photo.filename}`);
          continue;
        }
        
        // Optimize image: resize to max 1200px width, 85% quality
        await sharp(sourcePath)
          .resize(1200, null, { 
            withoutEnlargement: true,
            fit: 'inside'
          })
          .jpeg({ 
            quality: 85,
            progressive: true
          })
          .toFile(optimizedPath);
        
        // Update database with optimized filename
        await query(`
          UPDATE photos 
          SET optimized_filename = $1 
          WHERE id = $2
        `, [optimizedFilename, photo.id]);
        
        console.log(`✅ Optimized: ${photo.filename} -> ${optimizedFilename}`);
        optimizedCount++;
        
      } catch (error) {
        console.error(`❌ Failed to optimize ${photo.filename}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Optimized ${optimizedCount} out of ${photos.rows.length} photos`);
    console.log('📱 Photos should now load much faster!');
    
  } catch (error) {
    console.error('❌ Error optimizing photos:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
optimizeEngagementPhotos();

