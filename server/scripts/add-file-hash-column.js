const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function addFileHashColumn() {
  try {
    console.log('🔧 Adding file_hash column to photos table...');
    
    const client = await pool.connect();
    
    // Check if column already exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'photos' AND column_name = 'file_hash'
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('✅ file_hash column already exists');
    } else {
      // Add the column
      await client.query(`
        ALTER TABLE photos ADD COLUMN file_hash VARCHAR(64) UNIQUE
      `);
      console.log('✅ Added file_hash column to photos table');
    }
    
    client.release();
    console.log('🎉 Migration complete!');
    
  } catch (error) {
    console.error('❌ Error adding file_hash column:', error);
  } finally {
    await pool.end();
  }
}

// Run the migration
addFileHashColumn();

