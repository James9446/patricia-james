const express = require('express');
const { query } = require('../config/db');
const router = express.Router();

/**
 * GET /api/rsvps
 * Get all RSVPs (for admin purposes)
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        r.id, r.response_status, r.party_size, r.dietary_restrictions,
        r.song_requests, r.message, r.responded_at, r.created_at,
        g.first_name, g.last_name, g.email, g.phone
      FROM rsvps r
      JOIN guests g ON r.guest_id = g.id
      ORDER BY r.responded_at DESC
    `);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching RSVPs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch RSVPs',
      error: error.message
    });
  }
});

/**
 * GET /api/rsvps/stats
 * Get RSVP statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await query(`
      SELECT 
        response_status,
        COUNT(*) as count,
        SUM(party_size) as total_guests
      FROM rsvps 
      GROUP BY response_status
    `);
    
    const totalGuests = await query(`
      SELECT COUNT(*) as total_invited FROM guests WHERE is_invited = true
    `);
    
    const totalResponses = await query(`
      SELECT COUNT(*) as total_responses FROM rsvps
    `);
    
    res.json({
      success: true,
      data: {
        by_status: stats.rows,
        total_invited: parseInt(totalGuests.rows[0].total_invited),
        total_responses: parseInt(totalResponses.rows[0].total_responses)
      }
    });
  } catch (error) {
    console.error('Error fetching RSVP stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch RSVP statistics',
      error: error.message
    });
  }
});

/**
 * GET /api/rsvps/guest/:guestId
 * Get RSVP for a specific guest
 */
router.get('/guest/:guestId', async (req, res) => {
  try {
    const { guestId } = req.params;
    
    const result = await query(`
      SELECT 
        r.id, r.response_status, r.party_size, r.dietary_restrictions,
        r.song_requests, r.message, r.responded_at, r.created_at,
        g.first_name, g.last_name, g.email
      FROM rsvps r
      JOIN guests g ON r.guest_id = g.id
      WHERE r.guest_id = $1
    `, [guestId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No RSVP found for this guest'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching guest RSVP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch RSVP',
      error: error.message
    });
  }
});

/**
 * POST /api/rsvps
 * Submit an RSVP
 */
router.post('/', async (req, res) => {
  try {
    const {
      guest_id,
      user_id,
      response_status,
      party_size,
      dietary_restrictions,
      song_requests,
      message
    } = req.body;
    
    // Validate required fields
    if (!guest_id || !response_status) {
      return res.status(400).json({
        success: false,
        message: 'Guest ID and response status are required'
      });
    }
    
    // Validate response status
    const validStatuses = ['attending', 'not_attending', 'pending'];
    if (!validStatuses.includes(response_status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid response status. Must be: attending, not_attending, or pending'
      });
    }
    
    // Check if guest exists and is invited
    const guestCheck = await query(`
      SELECT id, is_invited FROM guests WHERE id = $1
    `, [guest_id]);
    
    if (guestCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found'
      });
    }
    
    if (!guestCheck.rows[0].is_invited) {
      return res.status(403).json({
        success: false,
        message: 'This guest is not invited'
      });
    }
    
    // Check if RSVP already exists
    const existingRsvp = await query(`
      SELECT id FROM rsvps WHERE guest_id = $1
    `, [guest_id]);
    
    if (existingRsvp.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'RSVP already exists for this guest. Use PUT to update.'
      });
    }
    
    // Create the RSVP
    const result = await query(`
      INSERT INTO rsvps (
        guest_id, user_id, response_status, party_size,
        dietary_restrictions, song_requests, message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [guest_id, user_id, response_status, party_size, dietary_restrictions, song_requests, message]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'RSVP submitted successfully'
    });
  } catch (error) {
    console.error('Error creating RSVP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit RSVP',
      error: error.message
    });
  }
});

/**
 * PUT /api/rsvps/:id
 * Update an RSVP
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      response_status,
      party_size,
      dietary_restrictions,
      song_requests,
      message
    } = req.body;
    
    // Validate response status if provided
    if (response_status) {
      const validStatuses = ['attending', 'not_attending', 'pending'];
      if (!validStatuses.includes(response_status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid response status. Must be: attending, not_attending, or pending'
        });
      }
    }
    
    const result = await query(`
      UPDATE rsvps 
      SET 
        response_status = COALESCE($2, response_status),
        party_size = COALESCE($3, party_size),
        dietary_restrictions = COALESCE($4, dietary_restrictions),
        song_requests = COALESCE($5, song_requests),
        message = COALESCE($6, message),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id, response_status, party_size, dietary_restrictions, song_requests, message]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'RSVP not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'RSVP updated successfully'
    });
  } catch (error) {
    console.error('Error updating RSVP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update RSVP',
      error: error.message
    });
  }
});

/**
 * DELETE /api/rsvps/:id
 * Delete an RSVP
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      DELETE FROM rsvps 
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'RSVP not found'
      });
    }
    
    res.json({
      success: true,
      message: 'RSVP deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting RSVP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete RSVP',
      error: error.message
    });
  }
});

module.exports = router;
