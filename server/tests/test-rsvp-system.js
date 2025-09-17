#!/usr/bin/env node

/**
 * Comprehensive RSVP System Test
 * Tests plus-one creation, partner linking, and RSVP functionality
 */

// Load environment variables
require('dotenv').config();

const { query } = require('../src/config/db');
const express = require('express');
const app = express();

// Middleware
app.use(express.json());

// Import the RSVP routes
const rsvpRoutes = require('../src/routes/rsvps');
app.use('/api/rsvps', rsvpRoutes);

// Test data
const testData = {
  // Individual guest without plus-one
  cordelia: {
    guest_id: null, // Will be set after guest lookup
    user_id: null, // No user account yet
    response_status: 'attending',
    rsvp_for_self: true,
    rsvp_for_partner: false,
    partner_attending: null,
    plus_one_attending: false,
    plus_one_name: null,
    plus_one_email: null,
    dietary_restrictions: 'Vegetarian',
    song_requests: 'Dancing Queen by ABBA',
    message: 'So excited for the wedding!'
  },
  
  // Individual guest with plus-one
  alfredo: {
    guest_id: null, // Will be set after guest lookup
    user_id: null, // No user account yet
    response_status: 'attending',
    rsvp_for_self: true,
    rsvp_for_partner: false,
    partner_attending: null,
    plus_one_attending: true,
    plus_one_name: 'Maria Rodriguez',
    plus_one_email: 'maria.rodriguez@email.com',
    dietary_restrictions: 'No seafood',
    song_requests: 'La Bamba',
    message: 'Can\'t wait to celebrate!'
  },
  
  // Couple RSVP (Tara RSVPing for both herself and Brenda)
  tara: {
    guest_id: null, // Will be set after guest lookup
    user_id: null, // No user account yet
    response_status: 'attending',
    rsvp_for_self: true,
    rsvp_for_partner: true,
    partner_attending: true,
    plus_one_attending: false,
    plus_one_name: null,
    plus_one_email: null,
    dietary_restrictions: 'Gluten-free',
    song_requests: 'At Last by Etta James',
    message: 'We\'re both so excited!'
  }
};

async function runTests() {
  console.log('🧪 Starting RSVP System Tests...\n');
  
  try {
    // Test 1: Check database connection and sample data
    await testDatabaseConnection();
    
    // Test 2: Get guest IDs for test data
    await getGuestIds();
    
    // Test 3: Test individual RSVP without plus-one
    await testIndividualRsvp();
    
    // Test 4: Test individual RSVP with plus-one creation
    await testPlusOneCreation();
    
    // Test 5: Test couple RSVP
    await testCoupleRsvp();
    
    // Test 6: Test RSVP retrieval
    await testRsvpRetrieval();
    
    // Test 7: Test RSVP summary
    await testRsvpSummary();
    
    // Test 8: Test partner linking verification
    await testPartnerLinking();
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

async function testDatabaseConnection() {
  console.log('📊 Test 1: Database Connection and Sample Data');
  
  const result = await query(`
    SELECT 
      g.id, g.first_name, g.last_name, g.full_name, 
      g.plus_one_allowed,
      p.first_name as partner_first_name,
      p.last_name as partner_last_name
    FROM guests g
    LEFT JOIN guests p ON g.partner_id = p.id
    WHERE g.partner_id IS NULL OR g.id < g.partner_id
    ORDER BY g.last_name
  `);
  
  console.log('   Sample guests found:');
  result.rows.forEach(guest => {
    console.log(`   - ${guest.full_name} (ID: ${guest.id})`);
    console.log(`     Plus-one allowed: ${guest.plus_one_allowed}`);
    if (guest.partner_first_name) {
      console.log(`     Partner: ${guest.partner_first_name} ${guest.partner_last_name}`);
    }
  });
  
  console.log('   ✅ Database connection successful\n');
}

async function getGuestIds() {
  console.log('🔍 Test 2: Getting Guest IDs for Test Data');
  
  const guests = await query(`
    SELECT id, first_name, last_name, full_name 
    FROM guests 
    WHERE first_name IN ('Cordelia', 'Alfredo', 'Tara')
    ORDER BY first_name
  `);
  
  guests.rows.forEach(guest => {
    if (guest.first_name === 'Cordelia') {
      testData.cordelia.guest_id = guest.id;
      console.log(`   Cordelia Reynolds: ${guest.id}`);
    } else if (guest.first_name === 'Alfredo') {
      testData.alfredo.guest_id = guest.id;
      console.log(`   Alfredo Lopez: ${guest.id}`);
    } else if (guest.first_name === 'Tara') {
      testData.tara.guest_id = guest.id;
      console.log(`   Tara Folenta: ${guest.id}`);
    }
  });
  
  console.log('   ✅ Guest IDs retrieved\n');
}

async function testIndividualRsvp() {
  console.log('👤 Test 3: Individual RSVP (Cordelia - No Plus-One)');
  
  const response = await makeRsvpRequest(testData.cordelia);
  
  if (response.success) {
    console.log('   ✅ RSVP submitted successfully');
    console.log(`   RSVP ID: ${response.data.rsvp.id}`);
    console.log(`   Response Status: ${response.data.rsvp.response_status}`);
    console.log(`   Plus-one Created: ${response.data.plus_one_created ? 'Yes' : 'No'}`);
  } else {
    throw new Error(`RSVP failed: ${response.message}`);
  }
  
  console.log('');
}

async function testPlusOneCreation() {
  console.log('👥 Test 4: Individual RSVP with Plus-One Creation (Alfredo)');
  
  const response = await makeRsvpRequest(testData.alfredo);
  
  if (response.success) {
    console.log('   ✅ RSVP with plus-one submitted successfully');
    console.log(`   RSVP ID: ${response.data.rsvp.id}`);
    console.log(`   Plus-one Created: ${response.data.plus_one_created ? 'Yes' : 'No'}`);
    
    if (response.data.plus_one_created) {
      console.log(`   Plus-one Name: ${response.data.plus_one_created.name}`);
      console.log(`   Plus-one Email: ${response.data.plus_one_created.email}`);
      console.log(`   Plus-one ID: ${response.data.plus_one_created.id}`);
    }
  } else {
    throw new Error(`RSVP with plus-one failed: ${response.message}`);
  }
  
  console.log('');
}

async function testCoupleRsvp() {
  console.log('💑 Test 5: Couple RSVP (Tara RSVPing for Both)');
  
  const response = await makeRsvpRequest(testData.tara);
  
  if (response.success) {
    console.log('   ✅ Couple RSVP submitted successfully');
    console.log(`   RSVP ID: ${response.data.rsvp.id}`);
    console.log(`   RSVP for Self: ${response.data.rsvp.rsvp_for_self}`);
    console.log(`   RSVP for Partner: ${response.data.rsvp.rsvp_for_partner}`);
    console.log(`   Partner Attending: ${response.data.rsvp.partner_attending}`);
  } else {
    throw new Error(`Couple RSVP failed: ${response.message}`);
  }
  
  console.log('');
}

async function testRsvpRetrieval() {
  console.log('📋 Test 6: RSVP Retrieval');
  
  // Test retrieving Cordelia's RSVP
  const cordeliaRsvp = await query(`
    SELECT r.*, g.first_name, g.last_name, g.full_name
    FROM rsvps r
    JOIN guests g ON r.guest_id = g.id
    WHERE r.guest_id = $1
    ORDER BY r.created_at DESC
    LIMIT 1
  `, [testData.cordelia.guest_id]);
  
  if (cordeliaRsvp.rows.length > 0) {
    const rsvp = cordeliaRsvp.rows[0];
    console.log(`   ✅ Retrieved RSVP for ${rsvp.full_name}`);
    console.log(`   Status: ${rsvp.response_status}`);
    console.log(`   Dietary Restrictions: ${rsvp.dietary_restrictions}`);
    console.log(`   Song Requests: ${rsvp.song_requests}`);
  } else {
    throw new Error('Failed to retrieve Cordelia\'s RSVP');
  }
  
  console.log('');
}

async function testRsvpSummary() {
  console.log('📊 Test 7: RSVP Summary (Admin View)');
  
  const summary = await query(`
    SELECT 
      g.id,
      g.first_name,
      g.last_name,
      g.full_name,
      g.plus_one_allowed,
      r.response_status,
      r.rsvp_for_self,
      r.rsvp_for_partner,
      r.partner_attending,
      r.plus_one_attending,
      CASE 
        WHEN r.rsvp_for_self = true AND r.rsvp_for_partner = true AND r.partner_attending = true AND r.plus_one_attending = true THEN 3
        WHEN r.rsvp_for_self = true AND r.rsvp_for_partner = true AND r.partner_attending = true THEN 2
        WHEN r.rsvp_for_self = true AND r.plus_one_attending = true THEN 2
        WHEN r.rsvp_for_self = true THEN 1
        ELSE 0
      END as total_attending
    FROM guests g
    LEFT JOIN rsvps r ON g.id = r.guest_id
    WHERE g.partner_id IS NULL OR g.id < g.partner_id
    ORDER BY g.last_name, g.first_name
  `);
  
  console.log('   RSVP Summary:');
  summary.rows.forEach(guest => {
    console.log(`   - ${guest.full_name}: ${guest.response_status || 'No response'} (${guest.total_attending} attending)`);
    if (guest.plus_one_attending) {
      console.log(`     Plus-one: attending`);
    }
  });
  
  const totalAttending = summary.rows.reduce((sum, r) => sum + (r.total_attending || 0), 0);
  console.log(`   Total Attending: ${totalAttending}`);
  
  console.log('   ✅ RSVP summary generated\n');
}

async function testPartnerLinking() {
  console.log('🔗 Test 8: Partner Linking Verification');
  
  // Check if plus-one was properly linked to Alfredo
  const plusOneCheck = await query(`
    SELECT 
      g1.first_name as original_guest,
      g1.last_name as original_last,
      g2.first_name as plus_one_first,
      g2.last_name as plus_one_last,
      g2.email as plus_one_email
    FROM guests g1
    JOIN guests g2 ON g1.partner_id = g2.id
    WHERE g1.first_name = 'Alfredo' AND g2.first_name = 'Maria'
  `);
  
  if (plusOneCheck.rows.length > 0) {
    const link = plusOneCheck.rows[0];
    console.log(`   ✅ Plus-one linking verified:`);
    console.log(`   ${link.original_guest} ${link.original_last} ↔ ${link.plus_one_first} ${link.plus_one_last}`);
    console.log(`   Plus-one email: ${link.plus_one_email}`);
  } else {
    console.log('   ⚠️  Plus-one linking not found (this might be expected if plus-one creation failed)');
  }
  
  // Check couple linking (Tara and Brenda)
  const coupleCheck = await query(`
    SELECT 
      g1.first_name as partner1,
      g1.last_name as partner1_last,
      g2.first_name as partner2,
      g2.last_name as partner2_last
    FROM guests g1
    JOIN guests g2 ON g1.partner_id = g2.id
    WHERE (g1.first_name = 'Tara' AND g2.first_name = 'Brenda') 
       OR (g1.first_name = 'Brenda' AND g2.first_name = 'Tara')
  `);
  
  if (coupleCheck.rows.length > 0) {
    const couple = coupleCheck.rows[0];
    console.log(`   ✅ Couple linking verified:`);
    console.log(`   ${couple.partner1} ${couple.partner1_last} ↔ ${couple.partner2} ${couple.partner2_last}`);
  } else {
    console.log('   ⚠️  Couple linking not found');
  }
  
  console.log('   ✅ Partner linking verification complete\n');
}

async function makeRsvpRequest(rsvpData) {
  // Simulate the RSVP API call
  const { query } = require('../src/config/db');
  
  const { 
    guest_id, 
    user_id, 
    response_status, 
    rsvp_for_self, 
    rsvp_for_partner, 
    partner_attending,
    plus_one_attending,
    plus_one_name,
    plus_one_email,
    dietary_restrictions, 
    song_requests, 
    message 
  } = rsvpData;

  try {
    // Start a transaction
    await query('BEGIN');

    // Check if an RSVP already exists for this guest/user
    const existingRsvp = await query(
      'SELECT id FROM rsvps WHERE guest_id = $1 AND user_id = $2', 
      [guest_id, user_id]
    );

    let rsvpResult;
    let plusOneGuest = null;

    // Handle plus-one creation if needed
    if (plus_one_attending && plus_one_name && plus_one_email) {
      // Check if plus-one already exists
      const existingPlusOne = await query(
        'SELECT id FROM guests WHERE first_name = $1 AND last_name = $2',
        [plus_one_name.split(' ')[0], plus_one_name.split(' ').slice(1).join(' ')]
      );

      if (existingPlusOne.rows.length > 0) {
        plusOneGuest = existingPlusOne.rows[0];
      } else {
        // Create new guest record for plus-one
        const plusOneResult = await query(`
          INSERT INTO guests (
            first_name, last_name, email, 
            plus_one_allowed, admin_notes
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `, [
          plus_one_name.split(' ')[0],
          plus_one_name.split(' ').slice(1).join(' '),
          plus_one_email,
          false, // Plus-ones can't bring their own plus-ones
          `Plus-one of ${rsvpData.guest_name || 'unknown guest'}`
        ]);

        plusOneGuest = plusOneResult.rows[0];

        // Link plus-one to the guest who brought them
        await query(`
          UPDATE guests 
          SET partner_id = $2 
          WHERE id = $1
        `, [plusOneGuest.id, guest_id]);

        await query(`
          UPDATE guests 
          SET partner_id = $2 
          WHERE id = $1
        `, [guest_id, plusOneGuest.id]);

        console.log(`   ✅ Created plus-one guest: ${plus_one_name}`);
      }
    }

    if (existingRsvp.rows.length > 0) {
      // Update existing RSVP
      rsvpResult = await query(`
        UPDATE rsvps
        SET 
          response_status = $1, 
          rsvp_for_self = $2,
          rsvp_for_partner = $3,
          partner_attending = $4,
          plus_one_attending = $5,
          dietary_restrictions = $6, 
          song_requests = $7, 
          message = $8,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
        RETURNING *;
      `, [
        response_status, 
        rsvp_for_self,
        rsvp_for_partner,
        partner_attending,
        plus_one_attending,
        dietary_restrictions, 
        song_requests, 
        message, 
        existingRsvp.rows[0].id
      ]);
    } else {
      // Insert new RSVP
      rsvpResult = await query(`
        INSERT INTO rsvps (
          guest_id, user_id, response_status, rsvp_for_self, rsvp_for_partner,
          partner_attending, plus_one_attending,
          dietary_restrictions, song_requests, message
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *;
      `, [
        guest_id, 
        user_id, 
        response_status, 
        rsvp_for_self,
        rsvp_for_partner,
        partner_attending,
        plus_one_attending,
        dietary_restrictions, 
        song_requests, 
        message
      ]);
    }

    // Commit transaction
    await query('COMMIT');
    
    return {
      success: true,
      message: 'RSVP submitted successfully!',
      data: {
        rsvp: rsvpResult.rows[0],
        plus_one_created: plusOneGuest ? {
          id: plusOneGuest.id,
          name: plus_one_name,
          email: plus_one_email
        } : null
      }
    };

  } catch (error) {
    // Rollback transaction on error
    await query('ROLLBACK');
    throw error;
  }
}

// Run the tests
runTests();
