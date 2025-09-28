/**
 * Database Migration Script
 * 
 * This script manages database migrations and resets.
 * Current schema: v4 (streamlined)
 */

require('dotenv').config();
const { query } = require('../config/db');

/**
 * Migrate from schema v3 to v4
 */
async function migrateToV4() {
  try {
    console.log('🔄 Starting migration from schema v3 to v4...');
    
    // Check if we're already on v4 (no is_primary_guest column)
    const columnCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'guests' 
      AND column_name = 'is_primary_guest'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('✅ Database is already using schema v4');
      return;
    }
    
    console.log('📋 Removing unnecessary columns and streamlining schema...');
    
    // First, drop views that depend on columns we're removing
    console.log('🗑️  Dropping dependent views...');
    const dropViews = [
      'DROP VIEW IF EXISTS guest_pairs CASCADE',
      'DROP VIEW IF EXISTS rsvp_summary CASCADE', 
      'DROP VIEW IF EXISTS guest_auth CASCADE'
    ];
    
    for (const dropView of dropViews) {
      try {
        await query(dropView);
        console.log(`✅ Dropped view`);
      } catch (error) {
        console.log(`⚠️  View already dropped or doesn't exist`);
      }
    }
    
    // Remove unnecessary columns from guests table
    const guestMigrations = [
      'ALTER TABLE guests DROP COLUMN IF EXISTS is_invited',
      'ALTER TABLE guests DROP COLUMN IF EXISTS is_primary_guest', 
      'ALTER TABLE guests DROP COLUMN IF EXISTS invitation_sent',
      'ALTER TABLE guests DROP COLUMN IF EXISTS dietary_restrictions'
    ];
    
    for (const migration of guestMigrations) {
      try {
        await query(migration);
        console.log(`✅ Executed: ${migration}`);
      } catch (error) {
        if (error.code === '42703') { // Column does not exist
          console.log(`⚠️  Column already removed: ${migration}`);
        } else {
          throw error;
        }
      }
    }
    
    // Remove unnecessary columns from users table
    const userMigrations = [
      'ALTER TABLE users DROP COLUMN IF EXISTS username'
    ];
    
    for (const migration of userMigrations) {
      try {
        await query(migration);
        console.log(`✅ Executed: ${migration}`);
      } catch (error) {
        if (error.code === '42703') { // Column does not exist
          console.log(`⚠️  Column already removed: ${migration}`);
        } else {
          throw error;
        }
      }
    }
    
    // Remove unnecessary columns from rsvps table
    const rsvpMigrations = [
      'ALTER TABLE rsvps DROP COLUMN IF EXISTS plus_one_name',
      'ALTER TABLE rsvps DROP COLUMN IF EXISTS plus_one_email'
    ];
    
    for (const migration of rsvpMigrations) {
      try {
        await query(migration);
        console.log(`✅ Executed: ${migration}`);
      } catch (error) {
        if (error.code === '42703') { // Column does not exist
          console.log(`⚠️  Column already removed: ${migration}`);
        } else {
          throw error;
        }
      }
    }
    
    // Add dietary_restrictions to rsvps table if it doesn't exist
    try {
      await query('ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT');
      console.log('✅ Added dietary_restrictions to rsvps table');
    } catch (error) {
      console.log('⚠️  dietary_restrictions already exists in rsvps table');
    }
    
    // Add computed full_name column to guests table
    try {
      await query('ALTER TABLE guests ADD COLUMN IF NOT EXISTS full_name VARCHAR(200) GENERATED ALWAYS AS (first_name || \' \' || last_name) STORED');
      console.log('✅ Added full_name computed column to guests table');
    } catch (error) {
      console.log('⚠️  full_name column already exists in guests table');
    }
    
    // Update views to reflect new schema
    console.log('📋 Updating database views...');
    
    const viewUpdates = [
      `CREATE OR REPLACE VIEW guest_pairs AS
       SELECT 
         g1.id as primary_guest_id,
         g1.first_name as primary_first_name,
         g1.last_name as primary_last_name,
         g1.full_name as primary_full_name,
         g1.email as primary_email,
         g1.plus_one_allowed as primary_plus_one_allowed,
         g2.id as partner_guest_id,
         g2.first_name as partner_first_name,
         g2.last_name as partner_last_name,
         g2.full_name as partner_full_name,
         g2.email as partner_email,
         CASE 
           WHEN g2.id IS NOT NULL THEN 2 
           ELSE 1 
         END as total_invited_count
       FROM guests g1
       LEFT JOIN guests g2 ON g1.partner_id = g2.id
       WHERE g1.partner_id IS NULL OR g1.id < g2.id`,
       
      `CREATE OR REPLACE VIEW rsvp_summary AS
       SELECT 
         g.id as guest_id,
         g.first_name,
         g.last_name,
         g.full_name,
         g.email,
         g.plus_one_allowed,
         r.response_status,
         r.rsvp_for_self,
         r.rsvp_for_partner,
         r.partner_attending,
         r.plus_one_attending,
         r.dietary_restrictions,
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
       WHERE g.partner_id IS NULL OR g.id < g.partner_id`,
       
      `CREATE OR REPLACE VIEW guest_auth AS
       SELECT 
         g.id,
         g.first_name,
         g.last_name,
         g.full_name,
         g.email,
         g.partner_id,
         g.plus_one_allowed,
         p.first_name as partner_first_name,
         p.last_name as partner_last_name,
         p.full_name as partner_full_name,
         p.email as partner_email
       FROM guests g
       LEFT JOIN guests p ON g.partner_id = p.id`
    ];
    
    for (const viewUpdate of viewUpdates) {
      await query(viewUpdate);
      console.log(`✅ Updated view`);
    }
    
    console.log('✅ Migration to schema v4 completed successfully');
    
    // Show summary
    const summary = await query(`
      SELECT 
        COUNT(*) as total_guests,
        COUNT(CASE WHEN partner_id IS NOT NULL THEN 1 END) as guests_with_partners,
        COUNT(CASE WHEN plus_one_allowed = true THEN 1 END) as plus_one_allowed
      FROM guests
    `);
    
    console.log('\n📊 Migration Summary:');
    console.log(`Total guests: ${summary.rows[0].total_guests}`);
    console.log(`Guests with partners: ${summary.rows[0].guests_with_partners}`);
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
    
    // Reinitialize with v4 schema
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await query(schema);
    
    console.log('✅ Database reset and reinitialized with current schema');
    
  } catch (error) {
    console.error('❌ Database reset failed:', error.message);
    throw error;
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'migrate':
    migrateToV4();
    break;
  case 'reset':
    resetDatabase();
    break;
  default:
    console.log('Usage:');
    console.log('  node migrate.js migrate  - Migrate database schema');
    console.log('  node migrate.js reset    - Reset database (WARNING: deletes all data)');
    break;
}
