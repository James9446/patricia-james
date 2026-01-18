/**
 * Password Hashing Utilities
 *
 * Secure password hashing using bcrypt with proper salting.
 * NEVER store passwords in plain text or use reversible encoding.
 */

const bcrypt = require('bcrypt');

// Salt rounds for bcrypt (12 is a good balance of security and performance)
const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 * @param {string} password - Plain text password to verify
 * @param {string} hash - Hashed password from database
 * @returns {Promise<boolean>} - True if password matches, false otherwise
 */
async function verifyPassword(password, hash) {
  if (!password || !hash) {
    return false;
  }

  return await bcrypt.compare(password, hash);
}

/**
 * Check if a password meets minimum requirements (Option A - Strong complexity)
 * @param {string} password - Password to validate
 * @returns {Object} - {valid: boolean, errors: string[]}
 */
function validatePassword(password) {
  const errors = [];

  if (!password) {
    errors.push('Password is required');
    return { valid: false, errors };
  }

  // Length requirements
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }

  // Complexity requirements (Option A)
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  validatePassword
};
