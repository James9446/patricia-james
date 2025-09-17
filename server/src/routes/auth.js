const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

/**
 * POST /api/auth/check-guest
 * Check if a guest exists by name (for authentication)
 */
router.post('/check-guest', async (req, res) => {
  try {
    const { first_name, last_name } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: 'First name and last name are required'
      });
    }

    // Look up guest by name
    const result = await query(`
      SELECT 
        g.id,
        g.first_name,
        g.last_name,
        g.full_name,
        g.email,
        g.partner_id,
        g.is_primary_guest,
        g.plus_one_allowed,
        p.first_name as partner_first_name,
        p.last_name as partner_last_name,
        p.full_name as partner_full_name,
        p.email as partner_email
      FROM guests g
      LEFT JOIN guests p ON g.partner_id = p.id
      WHERE g.first_name ILIKE $1 AND g.last_name ILIKE $2
      AND g.is_primary_guest = true
    `, [first_name.trim(), last_name.trim()]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found. Please check your name spelling or contact us.'
      });
    }

    const guest = result.rows[0];

    res.json({
      success: true,
      data: {
        guest_id: guest.id,
        first_name: guest.first_name,
        last_name: guest.last_name,
        full_name: guest.full_name,
        email: guest.email,
        has_partner: !!guest.partner_id,
        partner: guest.partner_id ? {
          first_name: guest.partner_first_name,
          last_name: guest.partner_last_name,
          full_name: guest.partner_full_name,
          email: guest.partner_email
        } : null,
        plus_one_allowed: guest.plus_one_allowed,
        needs_email: !guest.email
      }
    });

  } catch (error) {
    console.error('Error checking guest:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check guest information',
      error: error.message
    });
  }
});

/**
 * POST /api/auth/register
 * Register a user account for a guest
 */
router.post('/register', async (req, res) => {
  try {
    const { 
      guest_id, 
      email, 
      password, 
      first_name, 
      last_name 
    } = req.body;

    // Basic validation
    if (!guest_id || !email || !password || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if guest exists
    const guestResult = await query(
      'SELECT * FROM guests WHERE id = $1',
      [guest_id]
    );

    if (guestResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found'
      });
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 OR guest_id = $2',
      [email, guest_id]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User account already exists for this guest or email'
      });
    }

    // For now, we'll use a simple password hash
    // In production, use bcrypt or similar
    const password_hash = Buffer.from(password).toString('base64'); // Simple encoding for demo

    // Create user account
    const userResult = await query(`
      INSERT INTO users (
        guest_id, username, email, password_hash, 
        first_name, last_name
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, username, email, first_name, last_name, created_at
    `, [
      guest_id,
      `${first_name} ${last_name}`, // Username is full name
      email,
      password_hash,
      first_name,
      last_name
    ]);

    // Update guest email if not already set
    if (!guestResult.rows[0].email) {
      await query(
        'UPDATE guests SET email = $1 WHERE id = $2',
        [email, guest_id]
      );
    }

    res.status(201).json({
      success: true,
      message: 'User account created successfully',
      data: {
        user_id: userResult.rows[0].id,
        username: userResult.rows[0].username,
        email: userResult.rows[0].email,
        first_name: userResult.rows[0].first_name,
        last_name: userResult.rows[0].last_name
      }
    });

  } catch (error) {
    console.error('Error creating user account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user account',
      error: error.message
    });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Simple password check (in production, use proper hashing)
    const password_hash = Buffer.from(password).toString('base64');

    const result = await query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        u.guest_id,
        g.first_name as guest_first_name,
        g.last_name as guest_last_name,
        g.full_name as guest_full_name,
        g.partner_id,
        g.plus_one_allowed,
        p.first_name as partner_first_name,
        p.last_name as partner_last_name,
        p.full_name as partner_full_name,
        p.email as partner_email
      FROM users u
      JOIN guests g ON u.guest_id = g.id
      LEFT JOIN guests p ON g.partner_id = p.id
      WHERE u.email = $1 AND u.password_hash = $2 AND u.is_active = true
    `, [email, password_hash]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    // Update last login
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user_id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        guest_id: user.guest_id,
        guest: {
          first_name: user.guest_first_name,
          last_name: user.guest_last_name,
          full_name: user.guest_full_name,
          plus_one_allowed: user.plus_one_allowed
        },
        partner: user.partner_id ? {
          first_name: user.partner_first_name,
          last_name: user.partner_last_name,
          full_name: user.partner_full_name,
          email: user.partner_email
        } : null
      }
    });

  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login',
      error: error.message
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user information (requires authentication middleware in production)
 */
router.get('/me', async (req, res) => {
  try {
    // In production, this would use authentication middleware
    // For now, we'll accept a user_id parameter
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const result = await query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        u.guest_id,
        g.first_name as guest_first_name,
        g.last_name as guest_last_name,
        g.full_name as guest_full_name,
        g.partner_id,
        g.plus_one_allowed,
        p.first_name as partner_first_name,
        p.last_name as partner_last_name,
        p.full_name as partner_full_name,
        p.email as partner_email
      FROM users u
      JOIN guests g ON u.guest_id = g.id
      LEFT JOIN guests p ON g.partner_id = p.id
      WHERE u.id = $1 AND u.is_active = true
    `, [user_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        user_id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        guest_id: user.guest_id,
        guest: {
          first_name: user.guest_first_name,
          last_name: user.guest_last_name,
          full_name: user.guest_full_name,
          plus_one_allowed: user.plus_one_allowed
        },
        partner: user.partner_id ? {
          first_name: user.partner_first_name,
          last_name: user.partner_last_name,
          full_name: user.partner_full_name,
          email: user.partner_email
        } : null
      }
    });

  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user information',
      error: error.message
    });
  }
});

module.exports = router;
