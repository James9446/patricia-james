const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');

/**
 * Initialize the database with enhanced schema v2
 */
async function initializeDatabaseV2() {
  try {
    console.log('🗄️  Initializing database with enhanced schema v2...');
    
    // Test the connection first
    const result = await query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful:', result.rows[0].current_time);
    
    // Check if tables already exist
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'guests'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('📋 Creating enhanced database schema v2...');
      
      // Read the enhanced schema file
      const schemaPath = path.join(__dirname, 'schema-v2.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // Execute the schema
      await query(schema);
      
      console.log('✅ Enhanced database schema v2 created successfully');
    } else {
      console.log('✅ Database schema already exists');
      
      // Check if we need to migrate from v1 to v2
      const columnCheck = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'guests' 
        AND column_name IN ('partner_id', 'is_primary_guest', 'plus_one_allowed')
      `);
      
      if (columnCheck.rows.length === 0) {
        console.log('🔄 Migrating from schema v1 to v2...');
        await migrateToV2();
      } else {
        console.log('✅ Database is already using schema v2');
      }
    }
    
    // Check if we have any guests
    const guestCount = await query('SELECT COUNT(*) as count FROM guests');
    console.log(`📊 Current guest count: ${guestCount.rows[0].count}`);
    
    // Show guest relationships if any exist
    const relationshipCount = await query(`
      SELECT COUNT(*) as count 
      FROM guests 
      WHERE partner_id IS NOT NULL
    `);
    console.log(`👥 Guest relationships: ${relationshipCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
}

/**
 * Migrate from schema v1 to v2
 */
async function migrateToV2() {
  try {
    console.log('🔄 Starting migration to schema v2...');
    
    // Add new columns to guests table
    const migrations = [
      'ALTER TABLE guests ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES guests(id) ON DELETE SET NULL',
      'ALTER TABLE guests ADD COLUMN IF NOT EXISTS is_primary_guest BOOLEAN DEFAULT true',
      'ALTER TABLE guests ADD COLUMN IF NOT EXISTS plus_one_allowed BOOLEAN DEFAULT false',
      'ALTER TABLE guests ADD COLUMN IF NOT EXISTS plus_one_name VARCHAR(200)',
      'ALTER TABLE guests ADD COLUMN IF NOT EXISTS plus_one_email VARCHAR(255)',
      'ALTER TABLE guests ADD COLUMN IF NOT EXISTS invitation_sent_date TIMESTAMP WITH TIME ZONE',
      'ALTER TABLE guests ADD COLUMN IF NOT EXISTS admin_notes TEXT',
      
      // Add new columns to rsvps table
      'ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS partner_attending BOOLEAN',
      'ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS partner_guest_id UUID REFERENCES guests(id) ON DELETE SET NULL',
      'ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS plus_one_attending BOOLEAN DEFAULT false',
      'ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS plus_one_name VARCHAR(200)',
      'ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS plus_one_email VARCHAR(255)',
      
      // Create indexes
      'CREATE INDEX IF NOT EXISTS idx_guests_partner_id ON guests(partner_id)',
      'CREATE INDEX IF NOT EXISTS idx_guests_primary ON guests(is_primary_guest)',
      'CREATE INDEX IF NOT EXISTS idx_guests_plus_one_allowed ON guests(plus_one_allowed)',
      'CREATE INDEX IF NOT EXISTS idx_rsvps_partner_guest_id ON rsvps(partner_guest_id)',
      
      // Create views
      `CREATE OR REPLACE VIEW guest_pairs AS
       SELECT 
         g1.id as primary_guest_id,
         g1.first_name as primary_first_name,
         g1.last_name as primary_last_name,
         g1.email as primary_email,
         g1.plus_one_allowed as primary_plus_one_allowed,
         g2.id as partner_guest_id,
         g2.first_name as partner_first_name,
         g2.last_name as partner_last_name,
         g2.email as partner_email,
         CASE 
           WHEN g2.id IS NOT NULL THEN 2 
           ELSE 1 
         END as total_invited_count
       FROM guests g1
       LEFT JOIN guests g2 ON g1.partner_id = g2.id
       WHERE g1.is_primary_guest = true`,
       
      `CREATE OR REPLACE VIEW rsvp_summary AS
       SELECT 
         g.id as guest_id,
         g.first_name,
         g.last_name,
         g.email,
         r.response_status,
         r.party_size,
         r.partner_attending,
         r.plus_one_attending,
         r.responded_at,
         CASE 
           WHEN r.partner_attending = true AND r.plus_one_attending = true THEN r.party_size + 2
           WHEN r.partner_attending = true OR r.plus_one_attending = true THEN r.party_size + 1
           ELSE r.party_size
         END as total_attending
       FROM guests g
       LEFT JOIN rsvps r ON g.id = r.guest_id
       WHERE g.is_primary_guest = true`
    ];
    
    for (const migration of migrations) {
      await query(migration);
    }
    
    console.log('✅ Migration to schema v2 completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

/**
 * Reset the database (drop and recreate all tables)
 * WARNING: This will delete all data!
 */
async function resetDatabaseV2() {
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
      'DROP VIEW IF EXISTS guest_pairs CASCADE',
      'DROP VIEW IF EXISTS rsvp_summary CASCADE',
      'DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE'
    ];
    
    for (const dropQuery of dropTables) {
      await query(dropQuery);
    }
    
    console.log('🗑️  All tables dropped');
    
    // Reinitialize with v2 schema
    await initializeDatabaseV2();
    
  } catch (error) {
    console.error('❌ Database reset failed:', error.message);
    throw error;
  }
}

module.exports = {
  initializeDatabaseV2,
  resetDatabaseV2,
  migrateToV2
};
