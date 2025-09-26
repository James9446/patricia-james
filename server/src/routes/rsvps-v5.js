const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

/**
 * POST /api/rsvps
 * Submit RSVP(s) - can be for self, partner, or both
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { 
      response_status, 
      dietary_restrictions, 
      message,
      partner_response_status,
      partner_dietary_restrictions,
      partner_message
    } = req.body;

    const userId = req.user.id;
    const user = req.user;

    // Basic validation
    if (!response_status) {
      return res.status(400).json({ 
        success: false, 
        message: 'Response status is required' 
      });
    }

    // Start transaction
    await query('BEGIN');

    try {
      // Check if RSVP already exists for this user
      const existingRsvp = await query(
        'SELECT id FROM rsvps WHERE user_id = $1', 
        [userId]
      );

      let rsvpResult;
      if (existingRsvp.rows.length > 0) {
        // Update existing RSVP
        rsvpResult = await query(`
          UPDATE rsvps
          SET 
            response_status = $1,
            dietary_restrictions = $2,
            message = $3,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $4
          RETURNING *;
        `, [response_status, dietary_restrictions, message, userId]);
      } else {
        // Create new RSVP
        rsvpResult = await query(`
          INSERT INTO rsvps (
            user_id, response_status, dietary_restrictions, message
          )
          VALUES ($1, $2, $3, $4)
          RETURNING *;
        `, [userId, response_status, dietary_restrictions, message]);
      }

      // Handle partner RSVP if user has a partner
      let partnerRsvpResult = null;
      if (user.partner_id && partner_response_status) {
        // Check if partner RSVP already exists
        const existingPartnerRsvp = await query(
          'SELECT id FROM rsvps WHERE user_id = $1', 
          [user.partner_id]
        );

        if (existingPartnerRsvp.rows.length > 0) {
          // Update existing partner RSVP
          partnerRsvpResult = await query(`
            UPDATE rsvps
            SET 
              response_status = $1,
              dietary_restrictions = $2,
              message = $3,
              partner_id = $4,
              updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $5
            RETURNING *;
          `, [partner_response_status, partner_dietary_restrictions, partner_message, userId, user.partner_id]);
        } else {
          // Create new partner RSVP
          partnerRsvpResult = await query(`
            INSERT INTO rsvps (
              user_id, partner_id, response_status, dietary_restrictions, message
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
          `, [user.partner_id, userId, partner_response_status, partner_dietary_restrictions, partner_message]);
        }
      }

      // Commit transaction
      await query('COMMIT');
      
      res.status(201).json({
        success: true,
        message: 'RSVP submitted successfully!',
        data: {
          user_rsvp: rsvpResult.rows[0],
          partner_rsvp: partnerRsvpResult ? partnerRsvpResult.rows[0] : null
        }
      });

    } catch (error) {
      // Rollback transaction on error
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error submitting RSVP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit RSVP',
      error: error.message
    });
  }
});

/**
 * GET /api/rsvps
 * Get RSVP details for the current user (and partner if applicable)
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = req.user;

    // Get user's RSVP
    const userRsvp = await query(`
      SELECT 
        r.*,
        u.first_name,
        u.last_name,
        u.full_name,
        u.email
      FROM rsvps r
      JOIN users u ON r.user_id = u.id
      WHERE r.user_id = $1
    `, [userId]);

    // Get partner's RSVP if user has a partner
    let partnerRsvp = null;
    if (user.partner_id) {
      const partnerRsvpResult = await query(`
        SELECT 
          r.*,
          u.first_name,
          u.last_name,
          u.full_name,
          u.email
        FROM rsvps r
        JOIN users u ON r.user_id = u.id
        WHERE r.user_id = $1
      `, [user.partner_id]);
      
      partnerRsvp = partnerRsvpResult.rows.length > 0 ? partnerRsvpResult.rows[0] : null;
    }

    res.json({
      success: true,
      data: {
        user_rsvp: userRsvp.rows.length > 0 ? userRsvp.rows[0] : null,
        partner_rsvp: partnerRsvp,
        user_info: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          full_name: user.full_name,
          plus_one_allowed: user.plus_one_allowed,
          has_partner: !!user.partner_id
        }
      }
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
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.full_name,
        u.email,
        u.plus_one_allowed,
        u.account_status,
        r.response_status,
        r.dietary_restrictions,
        r.message,
        r.responded_at,
        p.first_name as partner_first_name,
        p.last_name as partner_last_name,
        p.full_name as partner_full_name,
        p.email as partner_email,
        pr.response_status as partner_response_status,
        pr.dietary_restrictions as partner_dietary_restrictions,
        pr.message as partner_message,
        pr.responded_at as partner_responded_at
      FROM users u
      LEFT JOIN rsvps r ON u.id = r.user_id
      LEFT JOIN users p ON u.partner_id = p.id
      LEFT JOIN rsvps pr ON p.id = pr.user_id
      WHERE u.deleted_at IS NULL
      AND (u.partner_id IS NULL OR u.id < u.partner_id) -- Avoid duplicates for couples
      ORDER BY u.last_name, u.first_name
    `);

    // Calculate summary statistics
    const totalUsers = result.rows.length;
    const responded = result.rows.filter(r => r.response_status).length;
    const attending = result.rows.filter(r => r.response_status === 'attending').length;
    
    // Calculate total attending count (including partners)
    let totalAttending = 0;
    result.rows.forEach(row => {
      if (row.response_status === 'attending') {
        totalAttending += 1; // User
        if (row.partner_response_status === 'attending') {
          totalAttending += 1; // Partner
        }
      }
    });

    res.json({
      success: true,
      data: {
        summary: {
          total_users: totalUsers,
          responded: responded,
          attending: attending,
          not_attending: responded - attending,
          total_attending_count: totalAttending
        },
        users: result.rows
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

/**
 * POST /api/rsvps/plus-one
 * Add a plus-one as a new user (if plus_one_allowed is true)
 */
router.post('/plus-one', requireAuth, async (req, res) => {
  try {
    const { first_name, last_name, email, password } = req.body;
    const userId = req.user.id;
    const user = req.user;

    // Check if user is allowed to bring a plus-one
    if (!user.plus_one_allowed) {
      return res.status(403).json({
        success: false,
        message: 'Plus-one not allowed for this user'
      });
    }

    // Basic validation
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required for plus-one'
      });
    }

    // Check if email is already used
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This email address is already registered'
      });
    }

    // Start transaction
    await query('BEGIN');

    try {
      // Create plus-one user
      const password_hash = Buffer.from(password).toString('base64');
      const plusOneUser = await query(`
        INSERT INTO users (
          first_name, last_name, email, password_hash, account_status, plus_one_allowed
        ) VALUES ($1, $2, $3, $4, 'registered', false)
        RETURNING id, first_name, last_name, full_name, email
      `, [first_name, last_name, email, password_hash]);

      // Link plus-one to the original user (as partner)
      await query(`
        UPDATE users 
        SET partner_id = $1 
        WHERE id = $2
      `, [userId, plusOneUser.rows[0].id]);

      // Create RSVP for plus-one
      const plusOneRsvp = await query(`
        INSERT INTO rsvps (
          user_id, partner_id, response_status, dietary_restrictions, message
        ) VALUES ($1, $2, 'attending', '', 'Plus-one RSVP')
        RETURNING *
      `, [plusOneUser.rows[0].id, userId]);

      // Commit transaction
      await query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Plus-one added successfully!',
        data: {
          plus_one_user: plusOneUser.rows[0],
          plus_one_rsvp: plusOneRsvp.rows[0]
        }
      });

    } catch (error) {
      // Rollback transaction on error
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error adding plus-one:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add plus-one',
      error: error.message
    });
  }
});

module.exports = router;
