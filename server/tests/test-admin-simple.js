#!/usr/bin/env node

/**
 * Simple Admin Database Test
 * 
 * This script tests the admin database user directly
 */

const { Pool } = require('pg');

// Direct admin connection
const adminPool = new Pool({
  user: 'patricia_james_admin',
  password: 'WeddingAdmin2024!',
  host: 'localhost',
  port: 5432,
  database: 'patricia_james_wedding_dev'
});

async function testAdminAccess() {
  try {
    console.log('🔐 Testing Admin Database Access...\n');
    
    // Test 1: Basic connection
    console.log('📊 Test 1: Database Connection');
    const connectionTest = await adminPool.query('SELECT current_user, current_database(), version()');
    console.log(`   ✅ Connected as: ${connectionTest.rows[0].current_user}`);
    console.log(`   ✅ Database: ${connectionTest.rows[0].current_database}`);
    console.log(`   ✅ PostgreSQL Version: ${connectionTest.rows[0].version.split(' ')[0]} ${connectionTest.rows[0].version.split(' ')[1]}\n`);
    
    // Test 2: Table access
    console.log('📋 Test 2: Table Access');
    const tables = await adminPool.query(`
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
    const guestCount = await adminPool.query('SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL');
    const rsvpCount = await adminPool.query('SELECT COUNT(*) as count FROM rsvps');
    const userCount = await adminPool.query('SELECT COUNT(*) as count FROM users');
    
    console.log(`   ✅ Guests: ${guestCount.rows[0].count}`);
    console.log(`   ✅ RSVPs: ${rsvpCount.rows[0].count}`);
    console.log(`   ✅ Users: ${userCount.rows[0].count}\n`);
    
    // Test 4: Admin privileges
    console.log('🔑 Test 4: Admin Privileges');
    const privileges = await adminPool.query(`
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
    const sampleGuests = await adminPool.query(`
      SELECT 
        u.first_name, 
        u.last_name, 
        u.plus_one_allowed,
        r.response_status
      FROM users u
      LEFT JOIN rsvps r ON u.id = r.user_id
      WHERE u.deleted_at IS NULL
      ORDER BY u.last_name
      LIMIT 5
    `);
    
    console.log('   Sample guest data:');
    sampleGuests.rows.forEach(guest => {
      console.log(`   - ${guest.first_name} ${guest.last_name}: ${guest.response_status || 'No response'} (Plus-one allowed: ${guest.plus_one_allowed ? 'Yes' : 'No'})`);
    });
    console.log('');
    
    console.log('✅ All admin access tests passed successfully!');
    console.log('🔐 Admin user has full database access and privileges.');
    
    // Close the connection
    await adminPool.end();
    
  } catch (error) {
    console.error('❌ Admin access test failed:', error.message);
    await adminPool.end();
    throw error;
  }
}

// Run the test
testAdminAccess()
  .then(() => {
    console.log('\n🎉 Admin database setup complete!');
    console.log('\n📋 Admin User Details:');
    console.log('   Username: patricia_james_admin');
    console.log('   Password: WeddingAdmin2024!');
    console.log('   Database: patricia_james_wedding_dev');
    console.log('   Host: localhost:5432');
    console.log('\n🔗 Connection String:');
    console.log('   postgresql://patricia_james_admin:WeddingAdmin2024!@localhost:5432/patricia_james_wedding_dev');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Admin database setup failed:', error.message);
    process.exit(1);
  });
