const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

/**
 * POST /api/rsvps
 * Submit a new RSVP with dynamic plus-one creation
 */
router.post('/', async (req, res) => {
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
  } = req.body;

  // Basic validation
  if (!guest_id || !user_id || !response_status) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required RSVP fields.' 
    });
  }

  if (!rsvp_for_self && !rsvp_for_partner) {
    return res.status(400).json({ 
      success: false, 
      message: 'Must RSVP for self, partner, or both.' 
    });
  }

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
            first_name, last_name, email, is_primary_guest, 
            plus_one_allowed, admin_notes
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [
          plus_one_name.split(' ')[0],
          plus_one_name.split(' ').slice(1).join(' '),
          plus_one_email,
          false, // Not primary guest
          false, // Plus-ones can't bring their own plus-ones
          `Plus-one of ${req.body.guest_name || 'unknown guest'}`
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

        console.log(`✅ Created plus-one guest: ${plus_one_name}`);
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
          plus_one_name = $6,
          plus_one_email = $7,
          dietary_restrictions = $8, 
          song_requests = $9, 
          message = $10,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $11
        RETURNING *;
      `, [
        response_status, 
        rsvp_for_self,
        rsvp_for_partner,
        partner_attending,
        plus_one_attending,
        plus_one_name,
        plus_one_email,
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
          partner_attending, plus_one_attending, plus_one_name, plus_one_email,
          dietary_restrictions, song_requests, message
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *;
      `, [
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
      ]);
    }

    // Commit transaction
    await query('COMMIT');
    
    res.status(201).json({
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
    });

  } catch (error) {
    // Rollback transaction on error
    await query('ROLLBACK');
    console.error('Error submitting RSVP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit RSVP',
      error: error.message
    });
  }
});

/**
 * GET /api/rsvps/:guest_id
 * Get RSVP details for a specific guest
 */
router.get('/:guest_id', async (req, res) => {
  try {
    const { guest_id } = req.params;

    const result = await query(`
      SELECT 
        r.*,
        g.first_name,
        g.last_name,
        g.full_name,
        g.email as guest_email,
        g.plus_one_allowed,
        p.first_name as partner_first_name,
        p.last_name as partner_last_name,
        p.full_name as partner_full_name,
        p.email as partner_email
      FROM rsvps r
      JOIN guests g ON r.guest_id = g.id
      LEFT JOIN guests p ON g.partner_id = p.id
      WHERE r.guest_id = $1
      ORDER BY r.created_at DESC
      LIMIT 1
    `, [guest_id]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No RSVP found for this guest'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching RSVP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch RSVP',
      error: error.message
    });
  }
});

/**
 * GET /api/rsvps/summary
 * Get RSVP summary for admin (requires authentication in production)
 */
router.get('/summary', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        g.id,
        g.first_name,
        g.last_name,
        g.full_name,
        g.email,
        g.plus_one_allowed,
        r.response_status,
        r.rsvp_for_self,
        r.rsvp_for_partner,
        r.partner_attending,
        r.plus_one_attending,
        r.plus_one_name,
        r.plus_one_email,
        r.responded_at,
        p.first_name as partner_first_name,
        p.last_name as partner_last_name,
        p.full_name as partner_full_name,
        CASE 
          WHEN r.rsvp_for_self = true AND r.rsvp_for_partner = true AND r.partner_attending = true AND r.plus_one_attending = true THEN 3
          WHEN r.rsvp_for_self = true AND r.rsvp_for_partner = true AND r.partner_attending = true THEN 2
          WHEN r.rsvp_for_self = true AND r.plus_one_attending = true THEN 2
          WHEN r.rsvp_for_self = true THEN 1
          ELSE 0
        END as total_attending
      FROM guests g
      LEFT JOIN rsvps r ON g.id = r.guest_id
      LEFT JOIN guests p ON g.partner_id = p.id
      WHERE g.is_primary_guest = true
      ORDER BY g.last_name, g.first_name
    `);

    // Calculate summary statistics
    const totalGuests = result.rows.length;
    const responded = result.rows.filter(r => r.response_status).length;
    const attending = result.rows.filter(r => r.response_status === 'attending').length;
    const totalAttending = result.rows.reduce((sum, r) => sum + (r.total_attending || 0), 0);

    res.json({
      success: true,
      data: {
        summary: {
          total_guests: totalGuests,
          responded: responded,
          attending: attending,
          not_attending: responded - attending,
          total_attending_count: totalAttending
        },
        guests: result.rows
      }
    });

  } catch (error) {
    console.error('Error fetching RSVP summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch RSVP summary',
      error: error.message
    });
  }
});

module.exports = router;
