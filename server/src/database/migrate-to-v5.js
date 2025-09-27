#!/usr/bin/env node

/**
 * Migration Script: Schema v4 → v5
 * 
 * This script migrates from the current schema v4 to the new schema v5
 * with invitation-centric design and simplified relationships.
 * 
 * WARNING: This will reset the database and create new tables.
 * Make sure to backup your data before running this migration.
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrateToV5() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting migration from Schema v4 to v5...');
    
    // Step 1: Backup existing data (optional)
    console.log('📋 Step 1: Checking for existing data...');
    const guestCount = await client.query('SELECT COUNT(*) FROM guests');
    const rsvpCount = await client.query('SELECT COUNT(*) FROM rsvps');
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    
    console.log(`   Found ${guestCount.rows[0].count} guests`);
    console.log(`   Found ${rsvpCount.rows[0].count} RSVPs`);
    console.log(`   Found ${userCount.rows[0].count} users`);
    
    if (parseInt(guestCount.rows[0].count) > 0) {
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
      'DROP TABLE IF EXISTS guests CASCADE',
      'DROP TABLE IF EXISTS invitations CASCADE'
    ];
    
    for (const dropQuery of dropTables) {
      await client.query(dropQuery);
    }
    console.log('   ✅ Existing tables dropped');
    
    // Step 3: Create new schema v5
    console.log('🏗️  Step 3: Creating new schema v5...');
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, 'schema-v5.sql');
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
    
    // Test invitation creation
    const testInvitation = await client.query(`
      INSERT INTO invitations (invitation_code, primary_guest_name, party_size, plus_one_allowed, invitation_sent)
      VALUES ('TEST001', 'Test Guest', 1, true, true)
      RETURNING id, invitation_code
    `);
    console.log(`   ✅ Test invitation created: ${testInvitation.rows[0].invitation_code}`);
    
    // Test guest creation
    const testGuest = await client.query(`
      INSERT INTO guests (invitation_id, first_name, last_name)
      VALUES ($1, 'Test', 'Guest')
      RETURNING id, first_name, last_name
    `, [testInvitation.rows[0].id]);
    console.log(`   ✅ Test guest created: ${testGuest.rows[0].first_name} ${testGuest.rows[0].last_name}`);
    
    // Test user creation
    const testUser = await client.query(`
      INSERT INTO users (guest_id, email, password_hash)
      VALUES ($1, 'test@example.com', 'hashed_password')
      RETURNING id, email
    `, [testGuest.rows[0].id]);
    console.log(`   ✅ Test user created: ${testUser.rows[0].email}`);
    
    // Test RSVP creation
    const testRSVP = await client.query(`
      INSERT INTO rsvps (invitation_id, user_id, guest_id, response_status, attending_count)
      VALUES ($1, $2, $3, 'attending', 1)
      RETURNING id, response_status
    `, [testInvitation.rows[0].id, testUser.rows[0].id, testGuest.rows[0].id]);
    console.log(`   ✅ Test RSVP created: ${testRSVP.rows[0].response_status}`);
    
    // Clean up test data
    await client.query('DELETE FROM rsvps WHERE id = $1', [testRSVP.rows[0].id]);
    await client.query('DELETE FROM users WHERE id = $1', [testUser.rows[0].id]);
    await client.query('DELETE FROM guests WHERE id = $1', [testGuest.rows[0].id]);
    await client.query('DELETE FROM invitations WHERE id = $1', [testInvitation.rows[0].id]);
    console.log('   🧹 Test data cleaned up');
    
    console.log('🎉 Migration to Schema v5 completed successfully!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Update API endpoints to use new schema');
    console.log('   2. Update authentication system');
    console.log('   3. Update RSVP system with user type detection');
    console.log('   4. Test all functionality end-to-end');
    console.log('   5. Update frontend to work with new APIs');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function resetToV5() {
  console.log('🔄 Resetting database to Schema v5...');
  await migrateToV5();
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
    
    const v5Tables = ['invitations', 'guests', 'users', 'rsvps', 'user_sessions'];
    const hasV5Tables = v5Tables.every(table => 
      tables.rows.some(row => row.table_name === table)
    );
    
    if (hasV5Tables) {
      console.log('   ✅ Schema v5 detected');
      
      // Show data counts
      const invitationCount = await client.query('SELECT COUNT(*) FROM invitations');
      const guestCount = await client.query('SELECT COUNT(*) FROM guests');
      const userCount = await client.query('SELECT COUNT(*) FROM users');
      const rsvpCount = await client.query('SELECT COUNT(*) FROM rsvps');
      
      console.log(`   📊 Data counts:`);
      console.log(`      - Invitations: ${invitationCount.rows[0].count}`);
      console.log(`      - Guests: ${guestCount.rows[0].count}`);
      console.log(`      - Users: ${userCount.rows[0].count}`);
      console.log(`      - RSVPs: ${rsvpCount.rows[0].count}`);
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
    migrateToV5()
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
    console.log('Schema v5 Migration Tool');
    console.log('');
    console.log('Usage:');
    console.log('  node migrate-to-v5.js migrate  - Migrate from v4 to v5');
    console.log('  node migrate-to-v5.js reset   - Reset database to v5');
    console.log('  node migrate-to-v5.js status  - Check current schema status');
    console.log('');
    console.log('⚠️  WARNING: This will reset your database!');
    console.log('   Make sure to backup your data before running migration.');
    process.exit(0);
}

