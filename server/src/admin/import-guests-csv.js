/**
 * CSV Import Script for Guest List
 * 
 * This script imports guests from a CSV file with the following format:
 * first_name,last_name,plus_one_allowed,partner_first_name,partner_last_name,admin_notes
 * 
 * Example CSV content:
 * Cordelia,Reynolds,false,,,Individual guest, no plus-one
 * Tara,Folenta,false,Brenda,Bedell,Partner of Brenda Bedell
 * Brenda,Bedell,false,Tara,Folenta,Partner of Tara Folenta
 * Alfredo,Lopez,true,,,Individual guest, plus-one allowed
 */

require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const { query } = require('../config/db');

/**
 * Parse CSV file and return array of guest objects
 */
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const guests = [];
    
    fs.createReadStream(filePath)
      .pipe(csv({
        headers: ['first_name', 'last_name', 'plus_one_allowed', 'partner_first_name', 'partner_last_name', 'admin_notes'],
        skipEmptyLines: true
      }))
      .on('data', (row) => {
        // Clean up the data
        const guest = {
          first_name: row.first_name?.trim(),
          last_name: row.last_name?.trim(),
          plus_one_allowed: row.plus_one_allowed?.toLowerCase() === 'true',
          partner_first_name: row.partner_first_name?.trim() || null,
          partner_last_name: row.partner_last_name?.trim() || null,
          admin_notes: row.admin_notes?.trim() || null
        };
        
        // Validate required fields
        if (!guest.first_name || !guest.last_name) {
          console.warn(`⚠️  Skipping invalid row: ${JSON.stringify(row)}`);
          return;
        }
        
        guests.push(guest);
      })
      .on('end', () => {
        resolve(guests);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Insert a single guest into the database
 */
async function insertGuest(guestData) {
  try {
    const result = await query(`
      INSERT INTO guests (
        first_name, last_name, 
        plus_one_allowed, admin_notes
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [
      guestData.first_name,
      guestData.last_name,
      guestData.plus_one_allowed,
      guestData.admin_notes
    ]);
    
    console.log(`✅ Inserted guest: ${guestData.first_name} ${guestData.last_name}`);
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      console.log(`⚠️  Guest already exists: ${guestData.first_name} ${guestData.last_name}`);
      // Return existing guest
      const existing = await query(
        'SELECT * FROM guests WHERE first_name = $1 AND last_name = $2', 
        [guestData.first_name, guestData.last_name]
      );
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
 * Import guests from CSV file
 */
async function importGuestsFromCSV(csvFilePath) {
  try {
    console.log(`📁 Reading CSV file: ${csvFilePath}`);
    
    // Check if file exists
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV file not found: ${csvFilePath}`);
    }
    
    // Parse CSV
    const guests = await parseCSV(csvFilePath);
    console.log(`📊 Found ${guests.length} guests in CSV`);
    
    // Process guests in two passes:
    // Pass 1: Insert all guests
    // Pass 2: Link partners
    
    console.log('\n🔄 Pass 1: Inserting guests...');
    const guestMap = new Map(); // Map full names to guest IDs
    
    for (const guest of guests) {
      const guestRecord = await insertGuest(guest);
      
      const fullName = `${guest.first_name} ${guest.last_name}`;
      guestMap.set(fullName, guestRecord);
    }
    
    console.log('\n🔄 Pass 2: Linking partners...');
    for (const guest of guests) {
      if (guest.partner_first_name && guest.partner_last_name) {
        const partnerFullName = `${guest.partner_first_name} ${guest.partner_last_name}`;
        const partnerGuest = guestMap.get(partnerFullName);
        
        if (partnerGuest) {
          const primaryGuest = guestMap.get(`${guest.first_name} ${guest.last_name}`);
          
          // Link them as partners
          await linkPartners(primaryGuest.id, partnerGuest.id);
          
          // Partners are automatically linked, no need to mark as non-primary
          
          console.log(`✅ Linked ${guest.first_name} ${guest.last_name} with ${guest.partner_first_name} ${guest.partner_last_name}`);
        } else {
          console.warn(`⚠️  Partner not found: ${partnerFullName}`);
        }
      }
    }
    
    console.log('\n🎉 CSV import completed!');
    
    // Show summary
    const summary = await query(`
      SELECT 
        COUNT(*) as total_guests,
        COUNT(CASE WHEN partner_id IS NOT NULL THEN 1 END) as guests_with_partners,
        COUNT(CASE WHEN plus_one_allowed = true THEN 1 END) as plus_one_allowed
      FROM guests
    `);
    
    console.log('\n📊 Import Summary:');
    console.log(`Total guests: ${summary.rows[0].total_guests}`);
    console.log(`Guests with partners: ${summary.rows[0].guests_with_partners}`);
    console.log(`Plus-one allowed: ${summary.rows[0].plus_one_allowed}`);
    
    // Show guest pairs
    const pairs = await query(`
      SELECT 
        g1.first_name || ' ' || g1.last_name as guest1,
        g2.first_name || ' ' || g2.last_name as guest2,
        g1.plus_one_allowed
      FROM guests g1
      LEFT JOIN guests g2 ON g1.partner_id = g2.id
      WHERE g1.partner_id IS NULL OR g1.id < g2.id
      ORDER BY g1.last_name, g1.first_name
    `);
    
    console.log('\n👥 Guest Relationships:');
    pairs.rows.forEach(pair => {
      if (pair.guest2) {
        console.log(`  ${pair.guest1} + ${pair.guest2} (Plus-one: ${pair.plus_one_allowed ? 'Yes' : 'No'})`);
      } else {
        console.log(`  ${pair.guest1} (Plus-one: ${pair.plus_one_allowed ? 'Yes' : 'No'})`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error importing guests:', error.message);
    throw error;
  }
}

/**
 * Create a sample CSV file
 */
function createSampleCSV(filePath) {
  const sampleData = [
    'first_name,last_name,plus_one_allowed,partner_first_name,partner_last_name,admin_notes',
    'Cordelia,Reynolds,false,,,Individual guest, no plus-one',
    'Tara,Folenta,false,Brenda,Bedell,Partner of Brenda Bedell',
    'Brenda,Bedell,false,Tara,Folenta,Partner of Tara Folenta',
    'Alfredo,Lopez,true,,,Individual guest, plus-one allowed'
  ].join('\n');
  
  fs.writeFileSync(filePath, sampleData);
  console.log(`📝 Created sample CSV file: ${filePath}`);
}

// Command line interface
const command = process.argv[2];
const csvFile = process.argv[3];

switch (command) {
  case 'import':
    if (!csvFile) {
      console.error('❌ Please provide CSV file path');
      console.log('Usage: node import-guests-csv.js import <csv-file-path>');
      process.exit(1);
    }
    importGuestsFromCSV(csvFile);
    break;
  case 'sample':
    const sampleFile = csvFile || 'sample-guests.csv';
    createSampleCSV(sampleFile);
    break;
  default:
    console.log('Usage:');
    console.log('  node import-guests-csv.js import <csv-file-path>  - Import guests from CSV');
    console.log('  node import-guests-csv.js sample [filename]       - Create sample CSV file');
    console.log('');
    console.log('CSV Format:');
    console.log('  first_name,last_name,plus_one_allowed,partner_first_name,partner_last_name,admin_notes');
    console.log('');
    console.log('Example:');
    console.log('  Cordelia,Reynolds,false,,,Individual guest, no plus-one');
    console.log('  Tara,Folenta,false,Brenda,Bedell,Partner of Brenda Bedell');
    break;
}
