const fs = require('fs');
const path = require('path');
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

async function fixPhotoPaths() {
  try {
    console.log('🔧 Fixing photo file paths...');
    
    // Get all photos from database
    const photos = await query(`
      SELECT id, filename, file_path, original_filename 
      FROM photos 
      ORDER BY display_order
    `);
    
    console.log(`📸 Found ${photos.rows.length} photos to fix`);
    
    const uploadsDir = path.join(__dirname, '../uploads/photos');
    
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Created uploads directory');
    }
    
    let fixedCount = 0;
    
    for (const photo of photos.rows) {
      try {
        const sourcePath = photo.file_path;
        const targetPath = path.join(uploadsDir, photo.filename);
        
        // Check if source file exists
        if (!fs.existsSync(sourcePath)) {
          console.log(`⚠️  Source file not found: ${sourcePath}`);
          continue;
        }
        
        // Copy file to uploads directory
        fs.copyFileSync(sourcePath, targetPath);
        
        // Update database with correct path
        await query(`
          UPDATE photos 
          SET file_path = $1 
          WHERE id = $2
        `, [targetPath, photo.id]);
        
        console.log(`✅ Fixed: ${photo.filename}`);
        fixedCount++;
        
      } catch (error) {
        console.error(`❌ Failed to fix ${photo.filename}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Fixed ${fixedCount} out of ${photos.rows.length} photos`);
    
  } catch (error) {
    console.error('❌ Error fixing photo paths:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
fixPhotoPaths();

