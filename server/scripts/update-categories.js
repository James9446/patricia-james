/**
 * Update Photo Categories Script
 *
 * - Renames categories to final names
 * - Sets active status (only Engagement and Patricia & James active initially)
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function updateCategories() {
  console.log('==========================================');
  console.log('UPDATING PHOTO CATEGORIES');
  console.log('==========================================\n');

  try {
    // Update category names and active status
    await pool.query(`
      UPDATE photo_categories SET
        name = 'Patricia & James',
        description = 'Photos of Patricia and James throughout their relationship',
        is_active = true
      WHERE slug = 'timeline'
    `);
    console.log('✓ Renamed "Relationship Timeline" to "Patricia & James" (active)');

    await pool.query(`
      UPDATE photo_categories SET
        is_active = true
      WHERE slug = 'engagement'
    `);
    console.log('✓ Set "Engagement" as active');

    await pool.query(`
      UPDATE photo_categories SET
        name = 'Friends & Family',
        description = 'Photos with friends and family members',
        is_active = false
      WHERE slug = 'family'
    `);
    console.log('✓ Renamed "Family" to "Friends & Family" (inactive)');

    await pool.query(`
      UPDATE photo_categories SET
        is_active = false
      WHERE slug = 'childhood'
    `);
    console.log('✓ Set "Childhood" as inactive');

    await pool.query(`
      UPDATE photo_categories SET
        is_active = false
      WHERE slug = 'wedding'
    `);
    console.log('✓ Set "Wedding Day" as inactive');

    // Set all other categories as inactive
    await pool.query(`
      UPDATE photo_categories SET
        is_active = false
      WHERE slug NOT IN ('engagement', 'timeline', 'family', 'childhood', 'wedding')
    `);
    console.log('✓ Set other categories as inactive');

    // Display final state
    const result = await pool.query(`
      SELECT name, slug, is_active,
        (SELECT COUNT(*) FROM photos WHERE category_id = photo_categories.id) as photo_count
      FROM photo_categories
      ORDER BY display_order
    `);

    console.log('\n==========================================');
    console.log('FINAL CATEGORY STATE');
    console.log('==========================================\n');

    result.rows.forEach(cat => {
      const status = cat.is_active ? '✅ ACTIVE' : '⊘  INACTIVE';
      console.log(`${status} | ${cat.name} (${cat.slug}) - ${cat.photo_count} photos`);
    });

    console.log('\n==========================================\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updateCategories();
