/**
 * Run a specific migration file
 * Usage: node server/scripts/run-migration.js <migration-number>
 * Example: node server/scripts/run-migration.js 010
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs').promises;
const path = require('path');
const { query, pool } = require('../src/config/db');
const logger = require('../src/config/logger');

async function runMigration() {
  const migrationNumber = process.argv[2];

  if (!migrationNumber) {
    console.error('❌ Error: Please specify a migration number');
    console.log('Usage: node server/scripts/run-migration.js <number>');
    console.log('Example: node server/scripts/run-migration.js 010');
    process.exit(1);
  }

  try {
    // Find migration file
    const migrationsDir = path.join(__dirname, '../database/migrations');
    const files = await fs.readdir(migrationsDir);
    const migrationFile = files.find(f => f.startsWith(migrationNumber));

    if (!migrationFile) {
      console.error(`❌ Migration ${migrationNumber} not found`);
      console.log('Available migrations:');
      files.forEach(f => console.log(`  - ${f}`));
      process.exit(1);
    }

    console.log(`📂 Found migration: ${migrationFile}`);
    console.log(`📁 Running migration from: ${path.join(migrationsDir, migrationFile)}`);

    // Read migration SQL
    const migrationPath = path.join(migrationsDir, migrationFile);
    const sql = await fs.readFile(migrationPath, 'utf8');

    console.log('\n🚀 Executing migration...\n');

    // Run migration
    const result = await query(sql);

    console.log('\n✅ Migration completed successfully!');

    // If there's a SELECT in the migration, show results
    if (sql.toLowerCase().includes('select')) {
      console.log('\n📊 Query results:');
      console.table(result.rows);
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    logger.error(`Migration ${migrationNumber} failed`, { error: error.stack });
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
