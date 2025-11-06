/**
 * Update Photo Categories Script
 *
 * Updates the photo_categories table to contain only the 5 specified categories:
 * 1. Patricia & James
 * 2. Engagement
 * 3. Friends & Family
 * 4. Childhood
 * 5. Wedding Day
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function updateCategories() {
  console.log('==========================================');
  console.log('UPDATE PHOTO CATEGORIES');
  console.log('==========================================\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/008_update_photo_categories.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');

    console.log('📋 Running migration 008...\n');

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✓ Migration completed successfully\n');

    // Verify the results
    const result = await pool.query(`
      SELECT
        name,
        slug,
        description,
        display_order,
        is_active,
        (SELECT COUNT(*) FROM photos WHERE category_id = photo_categories.id) as photo_count
      FROM photo_categories
      ORDER BY display_order
    `);

    console.log('Current categories:');
    console.log('==========================================');
    result.rows.forEach((cat) => {
      const status = cat.is_active ? '✓ Active' : '✗ Inactive';
      const count = cat.photo_count;
      console.log(`${cat.display_order}. ${cat.name} (${cat.slug}) - ${status} - ${count} photos`);
      console.log(`   ${cat.description}`);
      console.log('');
    });

    console.log('==========================================');
    console.log(`Total categories: ${result.rows.length}`);
    console.log(`Active categories: ${result.rows.filter(c => c.is_active).length}`);
    console.log('==========================================\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
updateCategories();
