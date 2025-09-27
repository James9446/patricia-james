#!/usr/bin/env node

const { query } = require('./src/config/db');
require('dotenv').config();

async function checkSeededData() {
  try {
    console.log('🔍 Checking seeded data...');
    
    const result = await query(`
      SELECT 
        first_name, 
        last_name, 
        email, 
        account_status,
        plus_one_allowed,
        partner_id
      FROM users 
      WHERE deleted_at IS NULL
      ORDER BY first_name;
    `);
    
    console.log('📊 Current users in database:');
    console.log('============================');
    
    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.first_name} ${user.last_name}`);
      console.log(`   Email: ${user.email || 'Not set'}`);
      console.log(`   Status: ${user.account_status}`);
      console.log(`   Plus-one allowed: ${user.plus_one_allowed}`);
      console.log(`   Partner ID: ${user.partner_id || 'None'}`);
      console.log('');
    });
    
    console.log(`Total users: ${result.rows.length}`);
    
  } catch (error) {
    console.error('❌ Error checking seeded data:', error.message);
  } finally {
    process.exit(0);
  }
}

checkSeededData();
