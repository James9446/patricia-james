const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkPhotoPaths() {
  try {
    console.log('🔍 Checking photo file paths in database...');
    
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT filename, file_path, original_filename 
      FROM photos 
      ORDER BY display_order 
      LIMIT 5
    `);
    
    console.log('📸 Photo paths in database:');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.filename}`);
      console.log(`   file_path: ${row.file_path}`);
      console.log(`   original_filename: ${row.original_filename}`);
      console.log('');
    });
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error checking photo paths:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
checkPhotoPaths();

