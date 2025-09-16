const express = require('express');
const { query } = require('../config/db');
const router = express.Router();

/**
 * GET /api/guests
 * Get all guests (for admin purposes)
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id, first_name, last_name, full_name, email, phone, 
        partner_id, plus_one_allowed, admin_notes,
        created_at, updated_at
      FROM guests 
      ORDER BY last_name, first_name
    `);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching guests:', error);
    
    // If database is not available, return mock data for development
    if (error.code === 'ECONNREFUSED' || error.message.includes('does not exist')) {
      return res.json({
        success: true,
        data: [
          {
            id: 'mock-1',
            first_name: 'Patricia',
            last_name: 'Garcia',
            email: 'patricia@example.com',
            party_size: 1,
            is_invited: true
          },
          {
            id: 'mock-2', 
            first_name: 'James',
            last_name: 'Smith',
            email: 'james@example.com',
            party_size: 1,
            is_invited: true
          }
        ],
        count: 2,
        message: 'Using mock data - database not connected'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch guests',
      error: error.message
    });
  }
});

/**
 * GET /api/guests/:id
 * Get a specific guest by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT 
        id, first_name, last_name, full_name, email, phone,
        partner_id, plus_one_allowed, admin_notes,
        created_at, updated_at
      FROM guests 
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching guest:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch guest',
      error: error.message
    });
  }
});

/**
 * POST /api/guests
 * Create a new guest
 */
router.post('/', async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      plus_one_allowed = false,
      admin_notes
    } = req.body;
    
    // Validate required fields
    if (!first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: 'First name and last name are required'
      });
    }
    
    const result = await query(`
      INSERT INTO guests (
        first_name, last_name, email, phone,
        plus_one_allowed, admin_notes
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [first_name, last_name, email, phone, plus_one_allowed, admin_notes]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Guest created successfully'
    });
  } catch (error) {
    console.error('Error creating guest:', error);
    
    // Handle unique constraint violations
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'A guest with this email already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create guest',
      error: error.message
    });
  }
});

/**
 * PUT /api/guests/:id
 * Update a guest
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      email,
      phone,
      plus_one_allowed,
      admin_notes
    } = req.body;
    
    const result = await query(`
      UPDATE guests 
      SET 
        first_name = COALESCE($2, first_name),
        last_name = COALESCE($3, last_name),
        email = COALESCE($4, email),
        phone = COALESCE($5, phone),
        plus_one_allowed = COALESCE($6, plus_one_allowed),
        admin_notes = COALESCE($7, admin_notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id, first_name, last_name, email, phone, plus_one_allowed, admin_notes]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Guest updated successfully'
    });
  } catch (error) {
    console.error('Error updating guest:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update guest',
      error: error.message
    });
  }
});

/**
 * DELETE /api/guests/:id
 * Delete a guest
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      DELETE FROM guests 
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Guest deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting guest:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete guest',
      error: error.message
    });
  }
});

module.exports = router;
