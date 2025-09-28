/**
 * Admin Script: Populate Guest List
 * 
 * This script helps populate the guest list with proper relationships
 * for couples, individuals, and plus-one permissions.
 */

require('dotenv').config();
const { query } = require('../config/db');

/**
 * Guest data structure for easy population
 * Modify this array with your actual guest list
 */
const guestData = [
  // Individual guests
  {
    first_name: 'Sarah',
    last_name: 'Johnson',
    email: 'sarah@example.com',
    phone: '+1-555-0101',
    plus_one_allowed: true,
    admin_notes: 'College friend, single'
  },
  
  {
    first_name: 'Mike',
    last_name: 'Wilson',
    email: 'mike@example.com',
    phone: '+1-555-0102',
    plus_one_allowed: false,
    admin_notes: 'Work colleague, no plus-one needed'
  },
  
  // Couples - Primary guests
  {
    first_name: 'Maria',
    last_name: 'Garcia',
    email: 'maria@example.com',
    phone: '+1-555-0103',
    plus_one_allowed: true,
    admin_notes: 'College roommate, married',
    partner: {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '+1-555-0104',
      admin_notes: 'Maria\'s husband'
    }
  },
  
  {
    first_name: 'Emily',
    last_name: 'Davis',
    email: 'emily@example.com',
    phone: '+1-555-0105',
    plus_one_allowed: false,
    admin_notes: 'Childhood friend, in relationship',
    partner: {
      first_name: 'David',
      last_name: 'Brown',
      email: 'david@example.com',
      phone: '+1-555-0106',
      admin_notes: 'Emily\'s boyfriend'
    }
  },
  
  // Family members
  {
    first_name: 'Patricia',
    last_name: 'Garcia',
    email: 'patricia@example.com',
    phone: '+1-555-0107',
    plus_one_allowed: false,
    admin_notes: 'Bride - no plus-one needed'
  },
  
  {
    first_name: 'James',
    last_name: 'Smith',
    email: 'james@example.com',
    phone: '+1-555-0108',
    plus_one_allowed: false,
    admin_notes: 'Groom - no plus-one needed'
  }
];

/**
 * Insert a single guest into the database
 */
async function insertGuest(guestData) {
  try {
    const result = await query(`
      INSERT INTO guests (
        first_name, last_name, email, phone, 
        plus_one_allowed, admin_notes
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      guestData.first_name,
      guestData.last_name,
      guestData.email,
      guestData.phone || null,
      guestData.plus_one_allowed,
      guestData.admin_notes || null
    ]);
    
    console.log(`✅ Inserted guest: ${guestData.first_name} ${guestData.last_name}`);
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      console.log(`⚠️  Guest already exists: ${guestData.first_name} ${guestData.last_name}`);
      // Return existing guest
      const existing = await query('SELECT * FROM guests WHERE email = $1', [guestData.email]);
      return existing.rows[0];
    }
    throw error;
  }
}

/**
 * Link two guests as partners
 */
async function linkPartners(primaryGuestId, partnerGuestId) {
  try {
    // Link primary guest to partner
    await query(`
      UPDATE guests 
      SET partner_id = $2 
      WHERE id = $1
    `, [primaryGuestId, partnerGuestId]);
    
    // Link partner to primary guest
    await query(`
      UPDATE guests 
      SET partner_id = $2 
      WHERE id = $1
    `, [partnerGuestId, primaryGuestId]);
    
    console.log(`✅ Linked guests as partners`);
  } catch (error) {
    console.error('❌ Error linking partners:', error.message);
    throw error;
  }
}

/**
 * Populate the entire guest list
 */
async function populateGuestList() {
  try {
    console.log('🚀 Starting guest list population...');
    
    // Clear existing data (optional - comment out if you want to keep existing data)
    // await query('DELETE FROM guests');
    // console.log('🗑️  Cleared existing guest data');
    
    for (const guest of guestData) {
      // Insert primary guest
      const primaryGuest = await insertGuest(guest);
      
      // Insert partner if exists
      if (guest.partner) {
        const partnerGuest = await insertGuest({
          ...guest.partner,
          plus_one_allowed: false
        });
        
        // Link them as partners
        await linkPartners(primaryGuest.id, partnerGuest.id);
      }
    }
    
    console.log('🎉 Guest list population completed!');
    
    // Show summary
    const summary = await query(`
      SELECT 
        COUNT(*) as total_guests,
        COUNT(CASE WHEN partner_id IS NULL THEN 1 END) as primary_guests,
        COUNT(CASE WHEN partner_id IS NOT NULL THEN 1 END) as partners,
        COUNT(CASE WHEN plus_one_allowed = true THEN 1 END) as plus_one_allowed
      FROM guests
    `);
    
    console.log('\n📊 Guest List Summary:');
    console.log(`Total guests: ${summary.rows[0].total_guests}`);
    console.log(`Primary guests: ${summary.rows[0].primary_guests}`);
    console.log(`Partners: ${summary.rows[0].partners}`);
    console.log(`Plus-one allowed: ${summary.rows[0].plus_one_allowed}`);
    
    // Show guest pairs
    const pairs = await query(`
      SELECT 
        g1.first_name || ' ' || g1.last_name as primary_guest,
        g2.first_name || ' ' || g2.last_name as partner,
        g1.plus_one_allowed
      FROM guests g1
      LEFT JOIN guests g2 ON g1.partner_id = g2.id
      WHERE g1.partner_id IS NULL
      ORDER BY g1.last_name, g1.first_name
    `);
    
    console.log('\n👥 Guest Relationships:');
    pairs.rows.forEach(pair => {
      if (pair.partner) {
        console.log(`  ${pair.primary_guest} + ${pair.partner} (Plus-one: ${pair.plus_one_allowed ? 'Yes' : 'No'})`);
      } else {
        console.log(`  ${pair.primary_guest} (Plus-one: ${pair.plus_one_allowed ? 'Yes' : 'No'})`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error populating guest list:', error.message);
    throw error;
  }
}

/**
 * Show current guest list
 */
async function showGuestList() {
  try {
    const guests = await query(`
      SELECT 
        g1.id,
        g1.first_name,
        g1.last_name,
        g1.email,
        g1.plus_one_allowed,
        g2.first_name as partner_first_name,
        g2.last_name as partner_last_name,
        g1.admin_notes
      FROM guests g1
      LEFT JOIN guests g2 ON g1.partner_id = g2.id
      ORDER BY g1.last_name, g1.first_name
    `);
    
    console.log('\n📋 Current Guest List:');
    guests.rows.forEach(guest => {
      const type = guest.partner_first_name ? 'Primary' : 'Single';
      const plusOne = guest.plus_one_allowed ? ' (Plus-one allowed)' : '';
      const partner = guest.partner_first_name ? ` + ${guest.partner_first_name} ${guest.partner_last_name}` : '';
      
      console.log(`  ${type}: ${guest.first_name} ${guest.last_name}${partner}${plusOne}`);
      if (guest.admin_notes) {
        console.log(`    Notes: ${guest.admin_notes}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error showing guest list:', error.message);
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'populate':
    populateGuestList();
    break;
  case 'show':
    showGuestList();
    break;
  default:
    console.log('Usage:');
    console.log('  node populate-guests.js populate  - Populate guest list');
    console.log('  node populate-guests.js show      - Show current guest list');
    break;
}
