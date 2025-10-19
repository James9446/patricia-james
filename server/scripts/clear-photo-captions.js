const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function clearPhotoCaptions() {
  try {
    console.log('🧹 Clearing all photo captions...');
    
    const client = await pool.connect();
    
    // Clear all captions
    const result = await client.query(`
      UPDATE photos SET caption = '' WHERE caption IS NOT NULL
    `);
    
    console.log(`✅ Cleared captions for ${result.rowCount} photos`);
    
    client.release();
    console.log('🎉 All photo captions cleared!');
    
  } catch (error) {
    console.error('❌ Error clearing captions:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
clearPhotoCaptions();

