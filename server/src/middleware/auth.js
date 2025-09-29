/**
 * Authentication Middleware
 * 
 * Provides authentication and authorization middleware for the wedding app.
 * Handles session-based authentication with guest list validation.
 */

const { query } = require('../config/db');

/**
 * Middleware to check if user is authenticated
 * Sets req.user if authenticated, otherwise returns 401
 */
const requireAuth = async (req, res, next) => {
  try {
    // Check if user is in session
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Get user details from database (schema v5: combined users table)
    const result = await query(`
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.full_name,
        u.partner_id,
        u.plus_one_allowed,
        u.is_admin,
        u.account_status,
        p.first_name as partner_first_name,
        p.last_name as partner_last_name,
        p.full_name as partner_full_name,
        p.email as partner_email
      FROM users u
      LEFT JOIN users p ON u.partner_id = p.id
      WHERE u.id = $1 AND u.account_status = 'registered' AND u.deleted_at IS NULL
    `, [req.session.userId]);

    if (result.rows.length === 0) {
      // User not found or inactive, clear session
      req.session.destroy();
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = result.rows[0];

    // Attach user to request object (schema v5: combined users table)
    req.user = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      full_name: user.full_name,
      partner_id: user.partner_id,
      plus_one_allowed: user.plus_one_allowed,
      is_admin: user.is_admin,
      account_status: user.account_status,
      partner: user.partner_id ? {
        first_name: user.partner_first_name,
        last_name: user.partner_last_name,
        full_name: user.partner_full_name,
        email: user.partner_email
      } : null
    };

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message
    });
  }
};

/**
 * Middleware to check if user is admin
 * Must be used after requireAuth
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  if (!req.user.is_admin) {
    return res.status(403).json({
      success: false,
      message: 'Admin privileges required',
      code: 'ADMIN_REQUIRED'
    });
  }

  next();
};

/**
 * Optional authentication middleware
 * Sets req.user if authenticated, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      // Try to get user details (schema v5: combined users table)
      const result = await query(`
        SELECT 
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          u.full_name,
          u.partner_id,
          u.plus_one_allowed,
          u.is_admin,
          u.account_status
        FROM users u
        WHERE u.id = $1 AND u.account_status = 'registered' AND u.deleted_at IS NULL
      `, [req.session.userId]);

      if (result.rows.length > 0) {
        const user = result.rows[0];
        req.user = {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          full_name: user.full_name,
          partner_id: user.partner_id,
          plus_one_allowed: user.plus_one_allowed,
          is_admin: user.is_admin,
          account_status: user.account_status
        };
      } else {
        // User not found, clear session
        req.session.destroy();
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional authentication middleware error:', error);
    // Don't fail the request, just continue without user
    next();
  }
};

/**
 * Middleware to check if user can access a specific guest's data
 * Useful for RSVP endpoints where users should only access their own data
 */
const requireGuestAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  // Admin users can access any guest data
  if (req.user.is_admin) {
    return next();
  }

  // Check if user is trying to access their own data or their partner's data
  const requestedUserId = req.params.userId || req.body.user_id;
  
  if (requestedUserId && requestedUserId !== req.user.id && requestedUserId !== req.user.partner_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: You can only access your own data or your partner\'s data',
      code: 'ACCESS_DENIED'
    });
  }

  next();
};

module.exports = {
  requireAuth,
  requireAdmin,
  optionalAuth,
  requireGuestAccess
};