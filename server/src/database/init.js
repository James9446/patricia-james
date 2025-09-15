const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');

/**
 * Initialize the database with schema and sample data
 */
async function initializeDatabase() {
  try {
    console.log('🗄️  Initializing database...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await query(schema);
    
    console.log('✅ Database schema created successfully');
    
    // Test the connection
    const result = await query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful:', result.rows[0].current_time);
    
    // Check if we have any guests
    const guestCount = await query('SELECT COUNT(*) as count FROM guests');
    console.log(`📊 Current guest count: ${guestCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
}

/**
 * Reset the database (drop and recreate all tables)
 * WARNING: This will delete all data!
 */
async function resetDatabase() {
  try {
    console.log('⚠️  Resetting database (this will delete all data)...');
    
    // Drop tables in reverse order of dependencies
    const dropTables = [
      'DROP TABLE IF EXISTS photo_upvotes CASCADE',
      'DROP TABLE IF EXISTS photo_comments CASCADE', 
      'DROP TABLE IF EXISTS photos CASCADE',
      'DROP TABLE IF EXISTS rsvps CASCADE',
      'DROP TABLE IF EXISTS users CASCADE',
      'DROP TABLE IF EXISTS guests CASCADE',
      'DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE'
    ];
    
    for (const dropQuery of dropTables) {
      await query(dropQuery);
    }
    
    console.log('🗑️  All tables dropped');
    
    // Reinitialize
    await initializeDatabase();
    
  } catch (error) {
    console.error('❌ Database reset failed:', error.message);
    throw error;
  }
}

module.exports = {
  initializeDatabase,
  resetDatabase
};
