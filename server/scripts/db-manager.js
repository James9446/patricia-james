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
  console.log('⚠️  WARNING: This will reset the database to initial seeded state!');
  console.log('This action cannot be undone.');
  console.log('To proceed, run: node db-manager.js reset --confirm');
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
  
  if (command === 'reset' && process.argv[3] !== '--confirm') {
    await commands[command]();
    return;
  }
  
  if (command === 'reset' && process.argv[3] === '--confirm') {
    console.log('🔄 Resetting database...');
    const { exec } = require('child_process');
    exec('node src/admin/reset-users.js', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Reset failed:', error);
        return;
      }
      console.log(stdout);
    });
    return;
  }
  
  await commands[command]();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { commands };
