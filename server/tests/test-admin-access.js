#!/usr/bin/env node

/**
 * Test Admin Database Access
 * 
 * This script tests the admin database user access and privileges
 */

// Load environment variables
require('dotenv').config();

const { query } = require('../src/config/db-admin.js');

async function testAdminAccess() {
  try {
    console.log('🔐 Testing Admin Database Access...\n');
    
    // Test 1: Basic connection
    console.log('📊 Test 1: Database Connection');
    const connectionTest = await query('SELECT current_user, current_database(), version()');
    console.log(`   ✅ Connected as: ${connectionTest.rows[0].current_user}`);
    console.log(`   ✅ Database: ${connectionTest.rows[0].current_database}`);
    console.log(`   ✅ PostgreSQL Version: ${connectionTest.rows[0].version.split(' ')[0]} ${connectionTest.rows[0].version.split(' ')[1]}\n`);
    
    // Test 2: Table access
    console.log('📋 Test 2: Table Access');
    const tables = await query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('   Available tables:');
    tables.rows.forEach(table => {
      console.log(`   - ${table.table_name} (${table.table_type})`);
    });
    console.log('');
    
    // Test 3: Data access
    console.log('📊 Test 3: Data Access');
    const guestCount = await query('SELECT COUNT(*) as count FROM guests');
    const rsvpCount = await query('SELECT COUNT(*) as count FROM rsvps');
    const userCount = await query('SELECT COUNT(*) as count FROM users');
    
    console.log(`   ✅ Guests: ${guestCount.rows[0].count}`);
    console.log(`   ✅ RSVPs: ${rsvpCount.rows[0].count}`);
    console.log(`   ✅ Users: ${userCount.rows[0].count}\n`);
    
    // Test 4: Admin privileges
    console.log('🔑 Test 4: Admin Privileges');
    const privileges = await query(`
      SELECT 
        grantee, 
        table_name, 
        privilege_type
      FROM information_schema.table_privileges 
      WHERE grantee = 'patricia_james_admin' 
      AND table_schema = 'public'
      ORDER BY table_name, privilege_type
    `);
    
    console.log('   Admin privileges:');
    const privilegesByTable = {};
    privileges.rows.forEach(priv => {
      if (!privilegesByTable[priv.table_name]) {
        privilegesByTable[priv.table_name] = [];
      }
      privilegesByTable[priv.table_name].push(priv.privilege_type);
    });
    
    Object.keys(privilegesByTable).forEach(table => {
      console.log(`   - ${table}: ${privilegesByTable[table].join(', ')}`);
    });
    console.log('');
    
    // Test 5: Sample data query
    console.log('👥 Test 5: Sample Data Query');
    const sampleGuests = await query(`
      SELECT 
        g.first_name, 
        g.last_name, 
        g.plus_one_allowed,
        r.response_status,
        r.plus_one_attending
      FROM guests g
      LEFT JOIN rsvps r ON g.id = r.guest_id
      WHERE g.partner_id IS NULL OR g.id < g.partner_id
      ORDER BY g.last_name
      LIMIT 5
    `);
    
    console.log('   Sample guest data:');
    sampleGuests.rows.forEach(guest => {
      console.log(`   - ${guest.first_name} ${guest.last_name}: ${guest.response_status || 'No response'} (Plus-one: ${guest.plus_one_attending ? 'Yes' : 'No'})`);
    });
    console.log('');
    
    console.log('✅ All admin access tests passed successfully!');
    console.log('🔐 Admin user has full database access and privileges.');
    
  } catch (error) {
    console.error('❌ Admin access test failed:', error.message);
    throw error;
  }
}

// Run the test
testAdminAccess()
  .then(() => {
    console.log('\n🎉 Admin database setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Admin database setup failed:', error.message);
    process.exit(1);
  });
