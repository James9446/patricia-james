const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query } = require('../config/db');
const { hashPassword, verifyPassword, validatePassword } = require('../utils/password');
const logger = require('../config/logger');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const { sendEmail } = require('../config/email');
const { getPasswordResetEmail } = require('../utils/emailTemplates');

/**
 * POST /api/auth/check-guest
 * Check if a guest exists by name (for authentication)
 */
router.post('/check-guest', authLimiter, async (req, res) => {
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
    logger.error(`Error checking guest: ${error.message}`, { stack: error.stack });
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
router.post('/register', authLimiter, async (req, res) => {
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

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet requirements',
        errors: passwordValidation.errors
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
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

    // Check if email is already used by a DIFFERENT user
    const existingUserWithEmail = await query(
      'SELECT id FROM users WHERE email = $1 AND id != $2 AND deleted_at IS NULL',
      [email, user_id]
    );

    if (existingUserWithEmail.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This email address is already registered. Please use a different email or try logging in.'
      });
    }

    // Hash password securely using bcrypt
    const password_hash = await hashPassword(password);

    // Update user account with email and password (schema v5: update existing user)
    const updatedUser = await query(`
      UPDATE users
      SET
        email = $1,
        password_hash = $2,
        account_status = 'registered',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, email, first_name, last_name, full_name, partner_id, plus_one_allowed, account_status, is_admin
    `, [email, password_hash, user_id]);

    // Get partner info if exists
    let partnerInfo = null;
    if (updatedUser.rows[0].partner_id) {
      const partnerResult = await query(`
        SELECT first_name, last_name, full_name, email
        FROM users
        WHERE id = $1 AND deleted_at IS NULL
      `, [updatedUser.rows[0].partner_id]);

      if (partnerResult.rows.length > 0) {
        const p = partnerResult.rows[0];
        partnerInfo = {
          first_name: p.first_name,
          last_name: p.last_name,
          full_name: p.full_name,
          email: p.email
        };
      }
    }

    // Create session for the newly registered user (auto-login after registration)
    req.session.regenerate((err) => {
      if (err) {
        logger.error(`Session regeneration error during registration: ${err.message}`, { stack: err.stack });
        return res.status(500).json({
          success: false,
          message: 'Registration succeeded but session creation failed',
          error: err.message
        });
      }

      // Set user ID in session
      req.session.userId = updatedUser.rows[0].id;
      req.session.save((saveErr) => {
        if (saveErr) {
          logger.error(`Session save error during registration: ${saveErr.message}`, { stack: saveErr.stack });
          return res.status(500).json({
            success: false,
            message: 'Registration succeeded but session save failed',
            error: saveErr.message
          });
        }

        res.status(201).json({
          success: true,
          message: 'User account created successfully',
          data: {
            user_id: updatedUser.rows[0].id,
            email: updatedUser.rows[0].email,
            first_name: updatedUser.rows[0].first_name,
            last_name: updatedUser.rows[0].last_name,
            full_name: updatedUser.rows[0].full_name,
            plus_one_allowed: updatedUser.rows[0].plus_one_allowed,
            account_status: updatedUser.rows[0].account_status,
            is_admin: updatedUser.rows[0].is_admin || false,
            partner: partnerInfo
          }
        });
      });
    });

  } catch (error) {
    logger.error(`Error creating user account: ${error.message}`, { stack: error.stack });
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
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Get user by email (need to retrieve password_hash for verification)
    const result = await query(`
      SELECT
        u.id,
        u.email,
        u.password_hash,
        u.first_name,
        u.last_name,
        u.full_name,
        u.partner_id,
        u.plus_one_allowed,
        u.account_status,
        u.is_admin,
        p.first_name as partner_first_name,
        p.last_name as partner_last_name,
        p.full_name as partner_full_name,
        p.email as partner_email
      FROM users u
      LEFT JOIN users p ON u.partner_id = p.id
      WHERE u.email = $1 AND u.account_status = 'registered' AND u.deleted_at IS NULL
    `, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    // Verify password using bcrypt
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    await query(
      'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Regenerate session to prevent session fixation and ensure clean session
    req.session.regenerate((err) => {
      if (err) {
        logger.error(`Session regeneration error during login: ${err.message}`, { stack: err.stack });
        return res.status(500).json({
          success: false,
          message: 'Failed to create session',
          error: err.message
        });
      }

      // Create new session with user ID
      req.session.userId = user.id;
      req.session.save((saveErr) => {
        if (saveErr) {
          logger.error(`Session save error during login: ${saveErr.message}`, { stack: saveErr.stack });
          return res.status(500).json({
            success: false,
            message: 'Failed to save session',
            error: saveErr.message
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
            is_admin: user.is_admin || false,
            partner: user.partner_id ? {
              first_name: user.partner_first_name,
              last_name: user.partner_last_name,
              full_name: user.partner_full_name,
              email: user.partner_email
            } : null
          }
        });
      });
    });

  } catch (error) {
    logger.error(`Error during login: ${error.message}`, { stack: error.stack });
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
        u.is_admin,
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
        is_admin: user.is_admin || false,
        partner: user.partner_id ? {
          first_name: user.partner_first_name,
          last_name: user.partner_last_name,
          full_name: user.partner_full_name,
          email: user.partner_email
        } : null
      }
    });

  } catch (error) {
    logger.error(`Error fetching user info: ${error.message}`, { stack: error.stack });
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
          logger.error(`Session destruction error during logout: ${err.message}`, { stack: err.stack });
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
    logger.error(`Logout error: ${error.message}`, { stack: error.stack });
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
    logger.error(`Auth status error: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to check authentication status',
      error: error.message
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 */
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Look up user by email
    const result = await query(
      'SELECT id, email, first_name, last_name FROM users WHERE email = $1 AND account_status = \'registered\' AND deleted_at IS NULL',
      [email]
    );

    // Always return success message (don't reveal if email exists or not - security best practice)
    if (result.rows.length === 0) {
      logger.info(`Password reset requested for non-existent email: ${email}`);
      return res.json({
        success: true,
        message: 'If an account exists with that email, a password reset link has been sent.'
      });
    }

    const user = result.rows[0];

    // Generate secure reset token (32 random bytes = 64 hex characters)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Save token to database
    await query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [resetToken, resetTokenExpires, user.id]
    );

    // Send password reset email
    const resetUrl = `${process.env.SITE_URL || 'https://patriciajames.fyi'}/#reset-password?token=${resetToken}`;
    const emailHtml = getPasswordResetEmail(user.first_name, resetUrl);

    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request - Patricia y James Wedding',
      html: emailHtml
    });

    logger.info(`Password reset email sent to: ${user.email}`);

    res.json({
      success: true,
      message: 'If an account exists with that email, a password reset link has been sent.'
    });

  } catch (error) {
    logger.error(`Error in forgot-password: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request'
    });
  }
});

/**
 * GET /api/auth/verify-reset-token
 * Verify that a reset token is valid and not expired
 */
router.get('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Reset token is required'
      });
    }

    // Look up user by reset token
    const result = await query(
      'SELECT id, email, first_name, reset_token_expires FROM users WHERE reset_token = $1 AND deleted_at IS NULL',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    const user = result.rows[0];

    // Check if token has expired
    if (new Date() > new Date(user.reset_token_expires)) {
      return res.status(400).json({
        success: false,
        message: 'Reset token has expired. Please request a new password reset.'
      });
    }

    // Token is valid
    res.json({
      success: true,
      message: 'Reset token is valid',
      data: {
        email: user.email,
        first_name: user.first_name
      }
    });

  } catch (error) {
    logger.error(`Error verifying reset token: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to verify reset token'
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using valid token
 */
router.post('/reset-password', passwordResetLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet requirements',
        errors: passwordValidation.errors
      });
    }

    // Look up user by reset token
    const result = await query(
      'SELECT id, email, first_name, reset_token_expires FROM users WHERE reset_token = $1 AND deleted_at IS NULL',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    const user = result.rows[0];

    // Check if token has expired
    if (new Date() > new Date(user.reset_token_expires)) {
      return res.status(400).json({
        success: false,
        message: 'Reset token has expired. Please request a new password reset.'
      });
    }

    // Hash the new password
    const password_hash = await hashPassword(password);

    // Update password and clear reset token
    await query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [password_hash, user.id]
    );

    // Create session for the user (auto-login after password reset)
    req.session.userId = user.id;
    req.session.userEmail = user.email;

    logger.info(`Password reset successful for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Password has been reset successfully. You are now logged in.'
    });

  } catch (error) {
    logger.error(`Error resetting password: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

module.exports = router;
