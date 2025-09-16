/**
 * Migration Script: v1 to v3
 * 
 * This script migrates the database from schema v1 to v3
 * while preserving existing data.
 */

require('dotenv').config();
const { query } = require('../config/db');

/**
 * Migrate from schema v1 to v3
 */
async function migrateToV3() {
  try {
    console.log('🔄 Starting migration from schema v1 to v3...');
    
    // Check if we're already on v3
    const columnCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'guests' 
      AND column_name IN ('partner_id', 'is_primary_guest', 'plus_one_allowed')
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ Database is already using schema v3');
      return;
    }
    
    console.log('📋 Adding new columns to guests table...');
    
    // Add new columns to guests table
    const migrations = [
      'ALTER TABLE guests ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES guests(id) ON DELETE SET NULL',
      'ALTER TABLE guests ADD COLUMN IF NOT EXISTS is_primary_guest BOOLEAN DEFAULT true',
      'ALTER TABLE guests ADD COLUMN IF NOT EXISTS plus_one_allowed BOOLEAN DEFAULT false',
      'ALTER TABLE guests ADD COLUMN IF NOT EXISTS admin_notes TEXT',
      
      // Add new columns to rsvps table
      'ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS rsvp_for_self BOOLEAN DEFAULT true',
      'ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS rsvp_for_partner BOOLEAN DEFAULT false',
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
      
      // Add unique constraint on first_name, last_name
      'ALTER TABLE guests ADD CONSTRAINT guests_name_unique UNIQUE (first_name, last_name)',
      
      // Create views
      `CREATE OR REPLACE VIEW guest_pairs AS
       SELECT 
         g1.id as primary_guest_id,
         g1.first_name as primary_first_name,
         g1.last_name as primary_last_name,
         g1.first_name || ' ' || g1.last_name as primary_full_name,
         g1.email as primary_email,
         g1.plus_one_allowed as primary_plus_one_allowed,
         g2.id as partner_guest_id,
         g2.first_name as partner_first_name,
         g2.last_name as partner_last_name,
         g2.first_name || ' ' || g2.last_name as partner_full_name,
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
         g.first_name || ' ' || g.last_name as full_name,
         g.email,
         g.plus_one_allowed,
         r.response_status,
         r.rsvp_for_self,
         r.rsvp_for_partner,
         r.partner_attending,
         r.plus_one_attending,
         r.plus_one_name,
         r.plus_one_email,
         r.responded_at,
         CASE 
           WHEN r.rsvp_for_self = true AND r.rsvp_for_partner = true AND r.partner_attending = true AND r.plus_one_attending = true THEN 3
           WHEN r.rsvp_for_self = true AND r.rsvp_for_partner = true AND r.partner_attending = true THEN 2
           WHEN r.rsvp_for_self = true AND r.plus_one_attending = true THEN 2
           WHEN r.rsvp_for_self = true THEN 1
           ELSE 0
         END as total_attending
       FROM guests g
       LEFT JOIN rsvps r ON g.id = r.guest_id
       WHERE g.is_primary_guest = true`,
       
      `CREATE OR REPLACE VIEW guest_auth AS
       SELECT 
         g.id,
         g.first_name,
         g.last_name,
         g.first_name || ' ' || g.last_name as full_name,
         g.email,
         g.partner_id,
         g.is_primary_guest,
         g.plus_one_allowed,
         p.first_name as partner_first_name,
         p.last_name as partner_last_name,
         p.first_name || ' ' || p.last_name as partner_full_name,
         p.email as partner_email
       FROM guests g
       LEFT JOIN guests p ON g.partner_id = p.id
       WHERE g.is_primary_guest = true`
    ];
    
    for (const migration of migrations) {
      try {
        await query(migration);
        console.log(`✅ Executed: ${migration.substring(0, 50)}...`);
      } catch (error) {
        if (error.code === '42710') { // Object already exists
          console.log(`⚠️  Already exists: ${migration.substring(0, 50)}...`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('✅ Migration to schema v3 completed successfully');
    
    // Show summary
    const summary = await query(`
      SELECT 
        COUNT(*) as total_guests,
        COUNT(CASE WHEN is_primary_guest = true THEN 1 END) as primary_guests,
        COUNT(CASE WHEN is_primary_guest = false THEN 1 END) as partners,
        COUNT(CASE WHEN plus_one_allowed = true THEN 1 END) as plus_one_allowed
      FROM guests
    `);
    
    console.log('\n📊 Migration Summary:');
    console.log(`Total guests: ${summary.rows[0].total_guests}`);
    console.log(`Primary guests: ${summary.rows[0].primary_guests}`);
    console.log(`Partners: ${summary.rows[0].partners}`);
    console.log(`Plus-one allowed: ${summary.rows[0].plus_one_allowed}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
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
      'DROP VIEW IF EXISTS guest_pairs CASCADE',
      'DROP VIEW IF EXISTS rsvp_summary CASCADE',
      'DROP VIEW IF EXISTS guest_auth CASCADE',
      'DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE'
    ];
    
    for (const dropQuery of dropTables) {
      await query(dropQuery);
    }
    
    console.log('🗑️  All tables dropped');
    
    // Reinitialize with v3 schema
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, 'schema-v3.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await query(schema);
    
    console.log('✅ Database reset and reinitialized with v3 schema');
    
  } catch (error) {
    console.error('❌ Database reset failed:', error.message);
    throw error;
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'migrate':
    migrateToV3();
    break;
  case 'reset':
    resetDatabase();
    break;
  default:
    console.log('Usage:');
    console.log('  node migrate-to-v3.js migrate  - Migrate from v1 to v3');
    console.log('  node migrate-to-v3.js reset    - Reset database (WARNING: deletes all data)');
    break;
}
