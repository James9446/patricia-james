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
        g.plus_one_allowed,
        p.first_name as partner_first_name,
        p.last_name as partner_last_name,
        p.full_name as partner_full_name,
        p.email as partner_email
      FROM guests g
      LEFT JOIN guests p ON g.partner_id = p.id
      WHERE g.first_name ILIKE $1 AND g.last_name ILIKE $2
    `, [first_name.trim(), last_name.trim()]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found. Please check your name spelling or contact us.'
      });
    }

    const guest = result.rows[0];

    // Check if user account already exists for this guest
    const userAccount = await query(
      'SELECT id, email FROM users WHERE guest_id = $1',
      [guest.id]
    );

    const hasUserAccount = userAccount.rows.length > 0;
    const userEmail = hasUserAccount ? userAccount.rows[0].email : null;

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
        needs_email: !guest.email,
        has_user_account: hasUserAccount,
        user_email: userEmail
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

    // Check if user already exists for this specific guest
    const existingUserForGuest = await query(
      'SELECT id, email FROM users WHERE guest_id = $1',
      [guest_id]
    );

    if (existingUserForGuest.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account already exists for this guest. Please try logging in instead.'
      });
    }

    // Check if email is already used by another user
    const existingUserWithEmail = await query(
      'SELECT id, guest_id FROM users WHERE email = $1',
      [email]
    );

    if (existingUserWithEmail.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This email address is already registered. Please use a different email or try logging in.'
      });
    }

    // For now, we'll use a simple password hash
    // In production, use bcrypt or similar
    const password_hash = Buffer.from(password).toString('base64'); // Simple encoding for demo

    // Create user account
    const userResult = await query(`
      INSERT INTO users (
        guest_id, email, password_hash, 
        first_name, last_name
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, first_name, last_name, created_at
    `, [
      guest_id,
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

    // Create session
    req.session.userId = user.id;
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to create session',
          error: err.message
        });
      }

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user_id: user.id,
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
 * Get current user information from session
 */
router.get('/me', async (req, res) => {
  try {
    // Check if user is in session
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const result = await query(`
      SELECT 
        u.id,
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
    `, [req.session.userId]);

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

/**
 * POST /api/auth/logout
 * Logout and destroy session
 */
router.post('/logout', (req, res) => {
  try {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
          return res.status(500).json({
            success: false,
            message: 'Failed to logout',
            error: err.message
          });
        }
        
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.json({
          success: true,
          message: 'Logout successful'
        });
      });
    } else {
      res.json({
        success: true,
        message: 'Already logged out'
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
});

/**
 * GET /api/auth/status
 * Check authentication status
 */
router.get('/status', (req, res) => {
  try {
    if (req.session && req.session.userId) {
      res.json({
        success: true,
        authenticated: true,
        userId: req.session.userId
      });
    } else {
      res.json({
        success: true,
        authenticated: false
      });
    }
  } catch (error) {
    console.error('Auth status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check authentication status',
      error: error.message
    });
  }
});

module.exports = router;
