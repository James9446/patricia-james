#!/usr/bin/env node

/**
 * Seed Script for Schema v5 (Combined Table Approach)
 * 
 * This script populates the users table with sample data for testing.
 * Creates couples, individuals, and users with plus-one permissions.
 */

const { query } = require('../config/db');
require('dotenv').config();

async function seedUsers() {
  const { pool } = require('../config/db');
  const client = await pool.connect();
  
  try {
    console.log('🌱 Seeding users for Schema v5...');
    
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await client.query('DELETE FROM rsvps');
    await client.query('DELETE FROM users');
    
    // Sample user data
    const userData = [
      // Couple 1: John and Jane Smith
      {
        first_name: 'John',
        last_name: 'Smith',
        plus_one_allowed: false,
        admin_notes: 'Primary guest in couple'
      },
      {
        first_name: 'Jane',
        last_name: 'Smith',
        plus_one_allowed: false,
        admin_notes: 'John\'s wife'
      },
      
      // Individual with plus-one: Mike Jones
      {
        first_name: 'Mike',
        last_name: 'Jones',
        plus_one_allowed: true,
        admin_notes: 'Individual guest with plus-one permission'
      },
      
      // Individual without plus-one: Sarah Wilson
      {
        first_name: 'Sarah',
        last_name: 'Wilson',
        plus_one_allowed: false,
        admin_notes: 'Individual guest, no plus-one'
      },
      
      // Another couple: David and Lisa Brown
      {
        first_name: 'David',
        last_name: 'Brown',
        plus_one_allowed: false,
        admin_notes: 'Primary guest in couple'
      },
      {
        first_name: 'Lisa',
        last_name: 'Brown',
        plus_one_allowed: false,
        admin_notes: 'David\'s wife'
      },
      
      // Individual with plus-one: Alex Garcia
      {
        first_name: 'Alex',
        last_name: 'Garcia',
        plus_one_allowed: true,
        admin_notes: 'Individual guest with plus-one permission'
      }
    ];
    
    // Insert users
    console.log('👥 Creating users...');
    const insertedUsers = [];
    
    for (const user of userData) {
      const result = await client.query(`
        INSERT INTO users (first_name, last_name, plus_one_allowed, admin_notes)
        VALUES ($1, $2, $3, $4)
        RETURNING id, first_name, last_name, full_name
      `, [user.first_name, user.last_name, user.plus_one_allowed, user.admin_notes]);
      
      insertedUsers.push(result.rows[0]);
      console.log(`   ✅ Created: ${result.rows[0].full_name}`);
    }
    
    // Link couples
    console.log('💕 Linking couples...');
    
    // John and Jane Smith
    const john = insertedUsers.find(u => u.first_name === 'John' && u.last_name === 'Smith');
    const jane = insertedUsers.find(u => u.first_name === 'Jane' && u.last_name === 'Smith');
    if (john && jane) {
      await client.query('UPDATE users SET partner_id = $1 WHERE id = $2', [jane.id, john.id]);
      await client.query('UPDATE users SET partner_id = $1 WHERE id = $2', [john.id, jane.id]);
      console.log('   ✅ Linked: John Smith ↔ Jane Smith');
    }
    
    // David and Lisa Brown
    const david = insertedUsers.find(u => u.first_name === 'David' && u.last_name === 'Brown');
    const lisa = insertedUsers.find(u => u.first_name === 'Lisa' && u.last_name === 'Brown');
    if (david && lisa) {
      await client.query('UPDATE users SET partner_id = $1 WHERE id = $2', [lisa.id, david.id]);
      await client.query('UPDATE users SET partner_id = $1 WHERE id = $2', [david.id, lisa.id]);
      console.log('   ✅ Linked: David Brown ↔ Lisa Brown');
    }
    
    // Show summary
    console.log('\n📊 Seeding Summary:');
    const totalUsers = await client.query('SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL');
    const couples = await client.query('SELECT COUNT(*) as count FROM users WHERE partner_id IS NOT NULL AND deleted_at IS NULL');
    const individuals = await client.query('SELECT COUNT(*) as count FROM users WHERE partner_id IS NULL AND deleted_at IS NULL');
    const plusOneAllowed = await client.query('SELECT COUNT(*) as count FROM users WHERE plus_one_allowed = true AND deleted_at IS NULL');
    
    console.log(`   👥 Total users: ${totalUsers.rows[0].count}`);
    console.log(`   💕 Couples: ${couples.rows[0].count / 2} (${couples.rows[0].count} people)`);
    console.log(`   👤 Individuals: ${individuals.rows[0].count}`);
    console.log(`   ➕ Plus-one allowed: ${plusOneAllowed.rows[0].count}`);
    
    console.log('\n🎯 Next Steps:');
    console.log('   1. Test user registration with these names');
    console.log('   2. Test RSVP submission for individuals and couples');
    console.log('   3. Test plus-one creation for eligible users');
    console.log('   4. Test partner RSVP functionality');
    
    console.log('\n✅ Schema v5 seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'seed':
    seedUsers()
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Seeding failed:', error);
        process.exit(1);
      });
    break;
    
  default:
    console.log('Schema v5 User Seeding Tool');
    console.log('');
    console.log('Usage:');
    console.log('  node seed-v5-users.js seed  - Seed the database with sample users');
    console.log('');
    console.log('🌱 This will create:');
    console.log('   - 2 couples (John & Jane Smith, David & Lisa Brown)');
    console.log('   - 3 individuals (Mike Jones, Sarah Wilson, Alex Garcia)');
    console.log('   - 2 users with plus-one permissions (Mike Jones, Alex Garcia)');
    console.log('');
    console.log('⚠️  WARNING: This will clear existing user data!');
    process.exit(0);
}
