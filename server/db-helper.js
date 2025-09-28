#!/usr/bin/env node

/**
 * Database Helper Script
 * Safely loads environment variables and provides database access
 * Usage: node db-helper.js "SELECT * FROM users;"
 */

require('dotenv').config();
const { query } = require('./src/config/db');

async function runQuery(sqlCommand) {
  try {
    console.log('🔍 Executing query:', sqlCommand);
    console.log('📊 Results:');
    console.log('='.repeat(50));
    
    const result = await query(sqlCommand);
    
    if (result.rows.length === 0) {
      console.log('No results found.');
    } else {
      // Display results in a nice table format
      console.table(result.rows);
    }
    
    console.log(`\n✅ Query completed successfully (${result.rows.length} rows)`);
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Get the SQL command from command line arguments
const sqlCommand = process.argv[2];

if (!sqlCommand) {
  console.log('📖 Database Helper Usage:');
  console.log('node db-helper.js "SELECT * FROM users;"');
  console.log('node db-helper.js "SELECT COUNT(*) FROM users;"');
  console.log('node db-helper.js "SELECT first_name, last_name FROM users WHERE account_status = \'registered\';"');
  process.exit(1);
}

runQuery(sqlCommand);
