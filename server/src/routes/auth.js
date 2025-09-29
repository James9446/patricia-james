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

    // Look up user by name (schema v5: combined users table)
    const result = await query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.full_name,
        u.email,
        u.partner_id,
        u.plus_one_allowed,
        u.account_status,
        p.first_name as partner_first_name,
        p.last_name as partner_last_name,
        p.full_name as partner_full_name,
        p.email as partner_email
      FROM users u
      LEFT JOIN users p ON u.partner_id = p.id
      WHERE u.first_name ILIKE $1 AND u.last_name ILIKE $2
      AND u.deleted_at IS NULL
    `, [first_name.trim(), last_name.trim()]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Guest record not found. Please check your name spelling or contact James.'
      });
    }

    const user = result.rows[0];

    // Check if user account is already registered (has email and password)
    const hasUserAccount = user.email !== null && user.account_status === 'registered';
    const userEmail = hasUserAccount ? user.email : null;

    res.json({
      success: true,
      data: {
        user_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: user.full_name,
        email: user.email,
        has_partner: !!user.partner_id,
        partner: user.partner_id ? {
          first_name: user.partner_first_name,
          last_name: user.partner_last_name,
          full_name: user.partner_full_name,
          email: user.partner_email
        } : null,
        plus_one_allowed: user.plus_one_allowed,
        needs_email: !user.email,
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
      user_id, 
      email, 
      password, 
      first_name, 
      last_name 
    } = req.body;

    // Basic validation
    if (!user_id || !email || !password || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if user exists (schema v5: combined users table)
    const userResult = await query(
      'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user already has an account (email and password set)
    if (userResult.rows[0].email !== null && userResult.rows[0].account_status === 'registered') {
      return res.status(409).json({
        success: false,
        message: 'An account already exists for this user. Please try logging in instead.'
      });
    }

    // Check if email is already used by another user
    const existingUserWithEmail = await query(
      'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
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

    // Update user account with email and password (schema v5: update existing user)
    const updatedUser = await query(`
      UPDATE users 
      SET 
        email = $1,
        password_hash = $2,
        account_status = 'registered',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, email, first_name, last_name, account_status, created_at
    `, [email, password_hash, user_id]);

    res.status(201).json({
      success: true,
      message: 'User account created successfully',
      data: {
        user_id: updatedUser.rows[0].id,
        email: updatedUser.rows[0].email,
        first_name: updatedUser.rows[0].first_name,
        last_name: updatedUser.rows[0].last_name,
        account_status: updatedUser.rows[0].account_status
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
        u.full_name,
        u.partner_id,
        u.plus_one_allowed,
        u.account_status,
        p.first_name as partner_first_name,
        p.last_name as partner_last_name,
        p.full_name as partner_full_name,
        p.email as partner_email
      FROM users u
      LEFT JOIN users p ON u.partner_id = p.id
      WHERE u.email = $1 AND u.password_hash = $2 AND u.account_status = 'registered' AND u.deleted_at IS NULL
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
      'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
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
          full_name: user.full_name,
          plus_one_allowed: user.plus_one_allowed,
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
        u.full_name,
        u.partner_id,
        u.plus_one_allowed,
        u.account_status,
        p.first_name as partner_first_name,
        p.last_name as partner_last_name,
        p.full_name as partner_full_name,
        p.email as partner_email
      FROM users u
      LEFT JOIN users p ON u.partner_id = p.id
      WHERE u.id = $1 AND u.deleted_at IS NULL
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
        full_name: user.full_name,
        plus_one_allowed: user.plus_one_allowed,
        account_status: user.account_status,
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
