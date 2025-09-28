#!/usr/bin/env node

/**
 * Database Manager Script
 * Provides safe database operations with proper environment variable loading
 * Usage: node db-manager.js [command] [options]
 */

require('dotenv').config();
const { query } = require('../src/config/db');

const commands = {
  'users': () => showUsers(),
  'rsvps': () => showRSVPs(),
  'reset': () => resetDatabase(),
  'stats': () => showStats(),
  'help': () => showHelp()
};

async function showUsers() {
  try {
    const result = await query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.account_status,
        u.plus_one_allowed,
        u.partner_id,
        p.first_name as partner_first_name,
        p.last_name as partner_last_name
      FROM users u
      LEFT JOIN users p ON u.partner_id = p.id
      WHERE u.deleted_at IS NULL
      ORDER BY u.last_name, u.first_name;
    `);
    
    console.log('👥 Users in Database:');
    console.log('='.repeat(80));
    console.table(result.rows);
    console.log(`\n📊 Total users: ${result.rows.length}`);
    
  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
  }
}

async function showRSVPs() {
  try {
    const result = await query(`
      SELECT 
        r.id as rsvp_id,
        u.first_name,
        u.last_name,
        u.email,
        r.response_status,
        r.dietary_restrictions,
        r.message,
        r.responded_at,
        p.first_name as partner_first_name,
        p.last_name as partner_last_name
      FROM rsvps r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN users p ON r.partner_id = p.id
      WHERE u.deleted_at IS NULL
      ORDER BY r.responded_at DESC;
    `);
    
    console.log('📝 RSVPs in Database:');
    console.log('='.repeat(80));
    console.table(result.rows);
    console.log(`\n📊 Total RSVPs: ${result.rows.length}`);
    
  } catch (error) {
    console.error('❌ Error fetching RSVPs:', error.message);
  }
}

async function showStats() {
  try {
    const usersResult = await query('SELECT COUNT(*) as total FROM users WHERE deleted_at IS NULL;');
    const registeredResult = await query('SELECT COUNT(*) as registered FROM users WHERE account_status = \'registered\' AND deleted_at IS NULL;');
    const rsvpsResult = await query('SELECT COUNT(*) as total FROM rsvps;');
    const attendingResult = await query('SELECT COUNT(*) as attending FROM rsvps WHERE response_status = \'attending\';');
    const couplesResult = await query('SELECT COUNT(*) as couples FROM users WHERE partner_id IS NOT NULL AND deleted_at IS NULL;');
    
    console.log('📊 Database Statistics:');
    console.log('='.repeat(40));
    console.log(`👥 Total Users: ${usersResult.rows[0].total}`);
    console.log(`✅ Registered Users: ${registeredResult.rows[0].registered}`);
    console.log(`💑 Couples: ${couplesResult.rows[0].couples}`);
    console.log(`📝 Total RSVPs: ${rsvpsResult.rows[0].total}`);
    console.log(`🎉 Attending: ${attendingResult.rows[0].attending}`);
    
  } catch (error) {
    console.error('❌ Error fetching stats:', error.message);
  }
}

async function resetDatabase() {
  const confirmFlag = process.argv.includes('--confirm');
  
  if (!confirmFlag) {
    console.log('⚠️  WARNING: This will reset the database to initial seeded state!');
    console.log('This action cannot be undone.');
    console.log('To proceed, run: node db-manager.js reset --confirm');
    return;
  }
  
  try {
    console.log('🔄 Resetting database...');
    
    // Clear all data
    await query('TRUNCATE TABLE rsvps CASCADE;');
    await query('TRUNCATE TABLE users CASCADE;');
    await query('TRUNCATE TABLE user_sessions CASCADE;');
    
    console.log('✅ Database cleared.');
    console.log('🌱 Re-seeding with initial data...');
    
    // Re-seed with initial data
    console.log('🌱 Seeding initial users...');
    
    // Insert initial seeded users
    const initialUsers = [
      // Individual users
      {
        first_name: 'Michael',
        last_name: 'Chen',
        plus_one_allowed: true,
        account_status: 'guest',
        admin_notes: 'College friend - can bring plus-one'
      },
      {
        first_name: 'Sarah',
        last_name: 'Johnson',
        plus_one_allowed: false,
        account_status: 'guest',
        admin_notes: 'Work colleague'
      },
      // Couple 1: Tara & Alfredo
      {
        first_name: 'Tara',
        last_name: 'Folenta',
        plus_one_allowed: false,
        account_status: 'guest',
        admin_notes: 'College friend - part of couple'
      },
      {
        first_name: 'Alfredo',
        last_name: 'Lopez',
        plus_one_allowed: false,
        account_status: 'guest',
        admin_notes: 'Tara\'s partner'
      },
      // Couple 2: Cordelia & Marcus
      {
        first_name: 'Cordelia',
        last_name: 'Reynolds',
        plus_one_allowed: false,
        account_status: 'guest',
        admin_notes: 'College friend - part of couple'
      },
      {
        first_name: 'Marcus',
        last_name: 'Reynolds',
        plus_one_allowed: false,
        account_status: 'guest',
        admin_notes: 'Cordelia\'s partner'
      }
    ];
    
    // Insert users
    for (const user of initialUsers) {
      await query(`
        INSERT INTO users (first_name, last_name, plus_one_allowed, account_status, admin_notes)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        user.first_name,
        user.last_name,
        user.plus_one_allowed,
        user.account_status,
        user.admin_notes
      ]);
    }
    
    // Set up partner relationships
    const couples = [
      ['Tara', 'Folenta', 'Alfredo', 'Lopez'],
      ['Alfredo', 'Lopez', 'Tara', 'Folenta'],
      ['Cordelia', 'Reynolds', 'Marcus', 'Reynolds'],
      ['Marcus', 'Reynolds', 'Cordelia', 'Reynolds']
    ];
    
    for (const [first1, last1, first2, last2] of couples) {
      // Get user IDs
      const user1 = await query('SELECT id FROM users WHERE first_name = $1 AND last_name = $2', [first1, last1]);
      const user2 = await query('SELECT id FROM users WHERE first_name = $1 AND last_name = $2', [first2, last2]);
      
      if (user1.rows.length > 0 && user2.rows.length > 0) {
        await query('UPDATE users SET partner_id = $1 WHERE id = $2', [user2.rows[0].id, user1.rows[0].id]);
      }
    }
    
    console.log('✅ Database reset to seeded state complete!');
    
  } catch (error) {
    console.error('❌ Reset failed:', error.message);
    throw error;
  }
}

async function showHelp() {
  console.log('📖 Database Manager Commands:');
  console.log('='.repeat(40));
  console.log('node db-manager.js users     - Show all users');
  console.log('node db-manager.js rsvps     - Show all RSVPs');
  console.log('node db-manager.js stats     - Show database statistics');
  console.log('node db-manager.js reset     - Reset database (with confirmation)');
  console.log('node db-manager.js help      - Show this help');
  console.log('');
  console.log('🔧 Direct SQL queries:');
  console.log('node db-helper.js "SELECT * FROM users;"');
}

async function main() {
  const command = process.argv[2];
  
  if (!command || !commands[command]) {
    console.log('❌ Invalid command. Use "help" to see available commands.');
    process.exit(1);
  }
  
  await commands[command]();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { commands };
