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

// Helper function to generate file hash
const generateFileHash = (buffer) => {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

async function uploadEngagementPhotos() {
  try {
    console.log('🎯 Starting engagement photo upload...');
    
    // 1. Clear existing photos
    console.log('🗑️  Clearing existing photos...');
    await query('DELETE FROM photos');
    console.log('✅ Existing photos cleared');
    
    // 2. Get engagement category ID
    console.log('📂 Getting engagement category...');
    const categoryResult = await query(
      'SELECT id FROM photo_categories WHERE slug = $1',
      ['engagement']
    );
    
    if (categoryResult.rows.length === 0) {
      console.log('❌ Engagement category not found. Creating it...');
      await query(`
        INSERT INTO photo_categories (name, slug, description, display_order)
        VALUES ($1, $2, $3, $4)
      `, ['Engagement', 'engagement', 'Our engagement photos', 1]);
      
      const newCategoryResult = await query(
        'SELECT id FROM photo_categories WHERE slug = $1',
        ['engagement']
      );
      var categoryId = newCategoryResult.rows[0].id;
    } else {
      var categoryId = categoryResult.rows[0].id;
    }
    console.log(`✅ Using category ID: ${categoryId}`);
    
    // 3. Get a user ID (we'll use the first user)
    const userResult = await query('SELECT id FROM users LIMIT 1');
    if (userResult.rows.length === 0) {
      throw new Error('No users found in database');
    }
    const userId = userResult.rows[0].id;
    console.log(`✅ Using user ID: ${userId}`);
    
    // 4. Upload engagement photos
    const engagementPhotosDir = path.join(__dirname, '../../client/src/images/engagement-photos');
    const photoFiles = fs.readdirSync(engagementPhotosDir)
      .filter(file => file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg'))
      .sort();
    
    console.log(`📸 Found ${photoFiles.length} engagement photos to upload`);
    
    const uploadPromises = photoFiles.map(async (filename, index) => {
      try {
        const filePath = path.join(engagementPhotosDir, filename);
        const fileBuffer = fs.readFileSync(filePath);
        const fileHash = generateFileHash(fileBuffer);
        
        // Generate a clean filename
        const cleanFilename = `engagement_${String(index + 1).padStart(2, '0')}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const optimizedFilename = `opt_${cleanFilename}`;
        
        // Create caption based on filename
        let caption = '';
        if (filename.includes('proposal')) {
          caption = 'The moment he asked the question 💍';
        } else if (filename.includes('ring')) {
          caption = 'The beautiful ring ✨';
        } else if (filename.includes('champaigne') || filename.includes('champaign')) {
          caption = 'Celebrating with champagne 🥂';
        } else if (filename.includes('picnic')) {
          caption = 'Our romantic picnic setup 🧺';
        } else if (filename.includes('engagement')) {
          caption = 'Engagement celebration photos 📸';
        } else {
          caption = 'Engagement memories 💕';
        }
        
        // Insert into database
        const result = await query(`
          INSERT INTO photos (
            user_id, filename, original_filename, file_path, file_size, 
            mime_type, caption, category_id, is_approved, original_file_size, 
            file_hash, optimized_filename, display_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING id
        `, [
          userId,
          cleanFilename,
          filename,
          filePath,
          fileBuffer.length,
          'image/jpeg',
          caption,
          categoryId,
          true, // Auto-approve
          fileBuffer.length,
          fileHash,
          optimizedFilename,
          index + 1
        ]);
        
        console.log(`✅ Uploaded: ${filename} -> ${cleanFilename}`);
        return { success: true, filename, id: result.rows[0].id };
        
      } catch (error) {
        console.error(`❌ Failed to upload ${filename}:`, error.message);
        return { success: false, filename, error: error.message };
      }
    });
    
    // Wait for all uploads to complete
    const results = await Promise.all(uploadPromises);
    
    // Summary
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log('\n📊 Upload Summary:');
    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    
    if (failed.length > 0) {
      console.log('\n❌ Failed uploads:');
      failed.forEach(f => console.log(`  - ${f.filename}: ${f.error}`));
    }
    
    console.log('\n🎉 Engagement photo upload complete!');
    
  } catch (error) {
    console.error('❌ Error uploading engagement photos:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
uploadEngagementPhotos();

