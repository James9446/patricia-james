/**
 * Authentication Middleware
 * 
 * Handles user authentication and authorization for the wedding website.
 */

const bcrypt = require('bcrypt');
const { query } = require('../config/db');

/**
 * Middleware to require authentication
 */
function requireAuth(req, res, next) {
  // For now, we'll implement a simple session check
  // In a full implementation, this would check JWT tokens or session cookies
  
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  const token = authHeader.substring(7);
  
  // TODO: Implement proper JWT token validation
  // For now, we'll just check if it's a valid user ID
  if (!token || token.length < 10) {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token'
    });
  }
  
  // Add user info to request (this would come from JWT validation)
  req.user = {
    id: token, // This would be extracted from JWT
    isAdmin: false // This would be extracted from JWT
  };
  
  next();
}

/**
 * Middleware to require admin privileges
 */
function requireAdmin(req, res, next) {
  // First check if user is authenticated
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  // Check if user is admin
  if (!req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Admin privileges required'
    });
  }
  
  next();
}

/**
 * Verify user credentials
 */
async function verifyCredentials(email, password) {
  try {
    // Find user by email
    const result = await query(`
      SELECT 
        id, email, password_hash, first_name, last_name, 
        is_admin, is_active, last_login
      FROM users 
      WHERE email = $1
    `, [email]);
    
    if (result.rows.length === 0) {
      return { success: false, message: 'Invalid email or password' };
    }
    
    const user = result.rows[0];
    
    // Check if user is active
    if (!user.is_active) {
      return { success: false, message: 'Account is deactivated' };
    }
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      return { success: false, message: 'Invalid email or password' };
    }
    
    // Update last login
    await query(`
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [user.id]);
    
    // Return user info (without password hash)
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        is_admin: user.is_admin,
        is_active: user.is_active,
        last_login: user.last_login
      }
    };
    
  } catch (error) {
    console.error('Error verifying credentials:', error);
    return { success: false, message: 'Authentication error' };
  }
}

/**
 * Create a new user account
 */
async function createUser(userData) {
  try {
    const { email, password, first_name, last_name, guest_id, is_admin = false } = userData;
    
    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return { success: false, message: 'User with this email already exists' };
    }
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const result = await query(`
      INSERT INTO users (
        email, password_hash, first_name, last_name, 
        guest_id, is_admin, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, first_name, last_name, is_admin, is_active, created_at
    `, [email, passwordHash, first_name, last_name, guest_id, is_admin, true]);
    
    const user = result.rows[0];
    
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        is_admin: user.is_admin,
        is_active: user.is_active,
        created_at: user.created_at
      }
    };
    
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, message: 'Error creating user account' };
  }
}

module.exports = {
  requireAuth,
  requireAdmin,
  verifyCredentials,
  createUser
};
