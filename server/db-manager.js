#!/usr/bin/env node

/**
 * Database Manager Script
 * Provides safe database operations with proper environment variable loading
 * Usage: node db-manager.js [command] [options]
 */

require('dotenv').config();
const { query } = require('./src/config/db');

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
    
    // Re-seed with initial data from CSV
    console.log('🌱 Seeding initial users from CSV...');
    
    const fs = require('fs');
    const path = require('path');
    
    // Read CSV file
    const csvPath = path.join(__dirname, 'test-guests.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.trim().split('\n').filter(line => line.trim());
    
    console.log(`📄 Found ${lines.length} guests in CSV file`);
    
    // Parse CSV and insert users
    const userIds = new Map(); // Store user IDs for partner relationships
    
    for (const line of lines) {
      const [first_name, last_name, plus_one_allowed, partner_first, partner_last, admin_notes] = line.split(',');
      
      if (!first_name || !last_name) continue; // Skip empty lines
      
      const plusOne = plus_one_allowed === 'true';
      const notes = admin_notes || '';
      
      // Insert user
      const result = await query(`
        INSERT INTO users (first_name, last_name, plus_one_allowed, account_status, admin_notes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [first_name, last_name, plusOne, 'guest', notes]);
      
      const userId = result.rows[0].id;
      userIds.set(`${first_name},${last_name}`, userId);
      
      console.log(`  ✅ Added: ${first_name} ${last_name} (ID: ${userId})`);
    }
    
    // Set up partner relationships
    console.log('🔗 Setting up partner relationships...');
    
    for (const line of lines) {
      const [first_name, last_name, plus_one_allowed, partner_first, partner_last, admin_notes] = line.split(',');
      
      if (partner_first && partner_last) {
        const userId = userIds.get(`${first_name},${last_name}`);
        const partnerId = userIds.get(`${partner_first},${partner_last}`);
        
        if (userId && partnerId) {
          await query('UPDATE users SET partner_id = $1 WHERE id = $2', [partnerId, userId]);
          console.log(`  🔗 Linked: ${first_name} ${last_name} ↔ ${partner_first} ${partner_last}`);
        }
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
