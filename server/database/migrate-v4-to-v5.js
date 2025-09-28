#!/usr/bin/env node

/**
 * Migration Script: Schema v4 → v5 (Combined Table Approach)
 * 
 * This script migrates from the current schema v4 to the new schema v5
 * with combined table approach and individual RSVP records.
 * 
 * WARNING: This will reset the database and create new tables.
 * Make sure to backup your data before running this migration.
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrateV4ToV5() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting migration from Schema v4 to v5 (Combined Table Approach)...');
    
    // Step 1: Check existing data (optional)
    console.log('📋 Step 1: Checking for existing data...');
    
    let guestCount = 0;
    let rsvpCount = 0;
    let userCount = 0;
    
    try {
      const guestResult = await client.query('SELECT COUNT(*) FROM guests');
      guestCount = parseInt(guestResult.rows[0].count);
    } catch (error) {
      console.log('   No guests table found');
    }
    
    try {
      const rsvpResult = await client.query('SELECT COUNT(*) FROM rsvps');
      rsvpCount = parseInt(rsvpResult.rows[0].count);
    } catch (error) {
      console.log('   No rsvps table found');
    }
    
    try {
      const userResult = await client.query('SELECT COUNT(*) FROM users');
      userCount = parseInt(userResult.rows[0].count);
    } catch (error) {
      console.log('   No users table found');
    }
    
    console.log(`   Found ${guestCount} guests`);
    console.log(`   Found ${rsvpCount} RSVPs`);
    console.log(`   Found ${userCount} users`);
    
    if (guestCount > 0 || rsvpCount > 0 || userCount > 0) {
      console.log('⚠️  WARNING: Existing data found. This migration will RESET the database.');
      console.log('   Make sure you have backed up your data before proceeding.');
    }
    
    // Step 2: Drop existing tables (in reverse dependency order)
    console.log('🗑️  Step 2: Dropping existing tables...');
    const dropTables = [
      'DROP TABLE IF EXISTS photo_upvotes CASCADE',
      'DROP TABLE IF EXISTS photo_comments CASCADE', 
      'DROP TABLE IF EXISTS photos CASCADE',
      'DROP TABLE IF EXISTS user_sessions CASCADE',
      'DROP TABLE IF EXISTS rsvps CASCADE',
      'DROP TABLE IF EXISTS users CASCADE',
      'DROP TABLE IF EXISTS guests CASCADE'
    ];
    
    for (const dropQuery of dropTables) {
      await client.query(dropQuery);
    }
    console.log('   ✅ Existing tables dropped');
    
    // Step 3: Create new schema v5
    console.log('🏗️  Step 3: Creating new schema v5...');
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, 'schema-v5-combined.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    await client.query(schemaSQL);
    console.log('   ✅ Schema v5 created successfully');
    
    // Step 4: Verify new schema
    console.log('🔍 Step 4: Verifying new schema...');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('   📊 New tables created:');
    tables.rows.forEach(row => {
      console.log(`      - ${row.table_name}`);
    });
    
    // Step 5: Test basic functionality
    console.log('🧪 Step 5: Testing basic functionality...');
    
    // Test user creation
    const testUser = await client.query(`
      INSERT INTO users (first_name, last_name, plus_one_allowed, admin_notes)
      VALUES ('Test', 'User', true, 'Test user for migration')
      RETURNING id, first_name, last_name, full_name
    `);
    console.log(`   ✅ Test user created: ${testUser.rows[0].full_name}`);
    
    // Test user registration
    const testRegistration = await client.query(`
      UPDATE users 
      SET email = 'test@example.com', 
          password_hash = 'hashed_password',
          account_status = 'registered'
      WHERE id = $1
      RETURNING email, account_status
    `, [testUser.rows[0].id]);
    console.log(`   ✅ Test user registered: ${testRegistration.rows[0].email}`);
    
    // Test RSVP creation
    const testRSVP = await client.query(`
      INSERT INTO rsvps (user_id, response_status, dietary_restrictions, message)
      VALUES ($1, 'attending', 'Vegetarian', 'Test RSVP message')
      RETURNING id, response_status
    `, [testUser.rows[0].id]);
    console.log(`   ✅ Test RSVP created: ${testRSVP.rows[0].response_status}`);
    
    // Test partner creation
    const testPartner = await client.query(`
      INSERT INTO users (first_name, last_name, partner_id, plus_one_allowed, admin_notes)
      VALUES ('Test', 'Partner', $1, false, 'Test partner')
      RETURNING id, first_name, last_name, partner_id
    `, [testUser.rows[0].id]);
    console.log(`   ✅ Test partner created: ${testPartner.rows[0].first_name} ${testPartner.rows[0].last_name}`);
    
    // Update original user with partner reference
    await client.query(`
      UPDATE users 
      SET partner_id = $1 
      WHERE id = $2
    `, [testPartner.rows[0].id, testUser.rows[0].id]);
    console.log(`   ✅ Partner relationship established`);
    
    // Test partner RSVP
    const testPartnerRSVP = await client.query(`
      INSERT INTO rsvps (user_id, partner_id, response_status, dietary_restrictions)
      VALUES ($1, $2, 'attending', 'No restrictions')
      RETURNING id, response_status
    `, [testUser.rows[0].id, testPartner.rows[0].id]);
    console.log(`   ✅ Test partner RSVP created: ${testPartnerRSVP.rows[0].response_status}`);
    
    // Clean up test data
    await client.query('DELETE FROM rsvps WHERE user_id = $1', [testUser.rows[0].id]);
    await client.query('DELETE FROM users WHERE id = $1', [testUser.rows[0].id]);
    await client.query('DELETE FROM users WHERE id = $1', [testPartner.rows[0].id]);
    console.log('   🧹 Test data cleaned up');
    
    console.log('🎉 Migration to Schema v5 completed successfully!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Seed the database with guest data using the new users table');
    console.log('   2. Update API endpoints to work with combined users table');
    console.log('   3. Update authentication system for new user structure');
    console.log('   4. Update RSVP system for individual records');
    console.log('   5. Test all functionality end-to-end');
    console.log('');
    console.log('🔧 Seeding Example:');
    console.log('   INSERT INTO users (first_name, last_name, partner_id, plus_one_allowed) VALUES');
    console.log('   (\'John\', \'Smith\', partner_id, false),');
    console.log('   (\'Jane\', \'Smith\', partner_id, false);');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function resetToV5() {
  console.log('🔄 Resetting database to Schema v5...');
  await migrateV4ToV5();
}

async function status() {
  const client = await pool.connect();
  
  try {
    console.log('📊 Database Status:');
    
    // Check if v5 tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const v5Tables = ['users', 'rsvps', 'user_sessions', 'photos'];
    const hasV5Tables = v5Tables.every(table => 
      tables.rows.some(row => row.table_name === table)
    );
    
    if (hasV5Tables) {
      console.log('   ✅ Schema v5 detected');
      
      // Show data counts
      const userCount = await client.query('SELECT COUNT(*) FROM users');
      const rsvpCount = await client.query('SELECT COUNT(*) FROM rsvps');
      const sessionCount = await client.query('SELECT COUNT(*) FROM user_sessions');
      
      console.log(`   📊 Data counts:`);
      console.log(`      - Users: ${userCount.rows[0].count}`);
      console.log(`      - RSVPs: ${rsvpCount.rows[0].count}`);
      console.log(`      - Sessions: ${sessionCount.rows[0].count}`);
      
      // Show user status breakdown
      const statusBreakdown = await client.query(`
        SELECT account_status, COUNT(*) as count 
        FROM users 
        WHERE deleted_at IS NULL 
        GROUP BY account_status
      `);
      
      console.log(`   👥 User status breakdown:`);
      statusBreakdown.rows.forEach(row => {
        console.log(`      - ${row.account_status}: ${row.count}`);
      });
      
    } else {
      console.log('   ⚠️  Schema v5 not detected - may be v4 or earlier');
    }
    
  } catch (error) {
    console.error('❌ Status check failed:', error);
  } finally {
    client.release();
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'migrate':
    migrateV4ToV5()
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Migration failed:', error);
        process.exit(1);
      });
    break;
    
  case 'reset':
    resetToV5()
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Reset failed:', error);
        process.exit(1);
      });
    break;
    
  case 'status':
    status()
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Status check failed:', error);
        process.exit(1);
      });
    break;
    
  default:
    console.log('Schema v5 Migration Tool (Combined Table Approach)');
    console.log('');
    console.log('Usage:');
    console.log('  node migrate-v4-to-v5.js migrate  - Migrate from v4 to v5');
    console.log('  node migrate-v4-to-v5.js reset     - Reset database to v5');
    console.log('  node migrate-v4-to-v5.js status    - Check current schema status');
    console.log('');
    console.log('⚠️  WARNING: This will reset your database!');
    console.log('   Make sure to backup your data before running migration.');
    console.log('');
    console.log('🔧 New Schema Features:');
    console.log('   - Combined users table for guest and user data');
    console.log('   - Individual RSVP records with dietary restrictions');
    console.log('   - Partner RSVP logic with separate records');
    console.log('   - Plus-one handling as real users');
    console.log('   - No data duplication');
    process.exit(0);
}
