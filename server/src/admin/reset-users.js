#!/usr/bin/env node

/**
 * Reset Users Table to Initial Seeded State
 * 
 * This script resets the users table back to its initial seeded state,
 * useful for testing after registration and RSVP submissions.
 * 
 * Usage: node server/src/admin/reset-users.js
 */

const { Pool } = require('pg');
require('dotenv').config();

async function resetUsers() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  const client = await pool.connect();
  
  try {
    console.log('🔄 Resetting users table to initial seeded state...');
    
    // Step 1: Clear existing data
    console.log('📋 Step 1: Clearing existing data...');
    await client.query('TRUNCATE TABLE rsvps CASCADE');
    await client.query('TRUNCATE TABLE user_sessions CASCADE');
    await client.query('TRUNCATE TABLE users CASCADE');
    console.log('   ✅ Cleared all user-related data');
    
    // Step 2: Reset sequences (if any)
    console.log('📋 Step 2: Resetting sequences...');
    try {
      await client.query('ALTER SEQUENCE users_id_seq RESTART WITH 1');
    } catch (error) {
      // Sequences might not exist, that's okay
      console.log('   ℹ️  No sequences to reset');
    }
    
    // Step 3: Re-seed with initial data
    console.log('📋 Step 3: Re-seeding with initial data...');
    
    // Insert initial users (same as seed-v5-users.js)
    const users = [
      // Couple 1: Alfredo & Tara
      {
        first_name: 'Alfredo',
        last_name: 'Lopez',
        plus_one_allowed: false,
        account_status: 'guest',
        admin_notes: 'Wedding party - Best Man'
      },
      {
        first_name: 'Tara',
        last_name: 'Folenta',
        plus_one_allowed: false,
        account_status: 'guest',
        admin_notes: 'Wedding party - Maid of Honor'
      },
      
      // Couple 2: Cordelia & Marcus
      {
        first_name: 'Cordelia',
        last_name: 'Reynolds',
        plus_one_allowed: true,
        account_status: 'guest',
        admin_notes: 'College friend - can bring plus one'
      },
      {
        first_name: 'Marcus',
        last_name: 'Reynolds',
        plus_one_allowed: false,
        account_status: 'guest',
        admin_notes: 'Cordelia\'s partner'
      },
      
      // Individual users
      {
        first_name: 'Sarah',
        last_name: 'Johnson',
        plus_one_allowed: false,
        account_status: 'guest',
        admin_notes: 'Work colleague'
      },
      {
        first_name: 'Michael',
        last_name: 'Chen',
        plus_one_allowed: true,
        account_status: 'guest',
        admin_notes: 'Childhood friend - can bring plus one'
      },
      
      // Test user for registration
      {
        first_name: 'Test',
        last_name: 'User',
        plus_one_allowed: false,
        account_status: 'guest',
        admin_notes: 'Test user for registration testing'
      }
    ];
    
    // Insert users
    for (const user of users) {
      await client.query(`
        INSERT INTO users (first_name, last_name, plus_one_allowed, account_status, admin_notes)
        VALUES ($1, $2, $3, $4, $5)
      `, [user.first_name, user.last_name, user.plus_one_allowed, user.account_status, user.admin_notes]);
    }
    
    // Step 4: Set up partner relationships
    console.log('📋 Step 4: Setting up partner relationships...');
    
    // Get user IDs
    const alfredoResult = await client.query('SELECT id FROM users WHERE first_name = $1 AND last_name = $2', ['Alfredo', 'Lopez']);
    const taraResult = await client.query('SELECT id FROM users WHERE first_name = $1 AND last_name = $2', ['Tara', 'Folenta']);
    const cordeliaResult = await client.query('SELECT id FROM users WHERE first_name = $1 AND last_name = $2', ['Cordelia', 'Reynolds']);
    const marcusResult = await client.query('SELECT id FROM users WHERE first_name = $1 AND last_name = $2', ['Marcus', 'Reynolds']);
    
    if (alfredoResult.rows.length > 0 && taraResult.rows.length > 0) {
      const alfredoId = alfredoResult.rows[0].id;
      const taraId = taraResult.rows[0].id;
      
      // Set Alfredo and Tara as partners
      await client.query('UPDATE users SET partner_id = $1 WHERE id = $2', [taraId, alfredoId]);
      await client.query('UPDATE users SET partner_id = $1 WHERE id = $2', [alfredoId, taraId]);
      console.log('   ✅ Set Alfredo & Tara as partners');
    }
    
    if (cordeliaResult.rows.length > 0 && marcusResult.rows.length > 0) {
      const cordeliaId = cordeliaResult.rows[0].id;
      const marcusId = marcusResult.rows[0].id;
      
      // Set Cordelia and Marcus as partners
      await client.query('UPDATE users SET partner_id = $1 WHERE id = $2', [marcusId, cordeliaId]);
      await client.query('UPDATE users SET partner_id = $1 WHERE id = $2', [cordeliaId, marcusId]);
      console.log('   ✅ Set Cordelia & Marcus as partners');
    }
    
    // Step 5: Verify the reset
    console.log('📋 Step 5: Verifying reset...');
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    const partnerCount = await client.query('SELECT COUNT(*) FROM users WHERE partner_id IS NOT NULL');
    
    console.log(`   📊 Total users: ${userCount.rows[0].count}`);
    console.log(`   👥 Users with partners: ${partnerCount.rows[0].count}`);
    
    // Show the seeded users
    const seededUsers = await client.query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.plus_one_allowed,
        u.account_status,
        p.first_name as partner_first_name,
        p.last_name as partner_last_name
      FROM users u
      LEFT JOIN users p ON u.partner_id = p.id
      ORDER BY u.last_name, u.first_name
    `);
    
    console.log('\n📋 Seeded Users:');
    seededUsers.rows.forEach(user => {
      const partnerInfo = user.partner_first_name ? ` (partner: ${user.partner_first_name} ${user.partner_last_name})` : '';
      const plusOneInfo = user.plus_one_allowed ? ' [can bring plus one]' : '';
      console.log(`   • ${user.first_name} ${user.last_name}${partnerInfo}${plusOneInfo}`);
    });
    
    console.log('\n✅ Users table reset successfully!');
    console.log('🎯 Ready for testing:');
    console.log('   • Register new users');
    console.log('   • Submit RSVPs');
    console.log('   • Test partner relationships');
    console.log('   • Test plus-one functionality');
    
  } catch (error) {
    console.error('❌ Reset failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the reset
if (require.main === module) {
  resetUsers()
    .then(() => {
      console.log('\n🎉 Reset completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Reset failed:', error);
      process.exit(1);
    });
}

module.exports = { resetUsers };
