/**
 * Rate Limiting Middleware
 *
 * Provides rate limiting to protect against brute force attacks and abuse.
 * Uses express-rate-limit to limit requests per IP address.
 */

const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

/**
 * Strict rate limiter for authentication endpoints
 * 5 attempts per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Trust proxy headers (required for Render, Heroku, etc.)
  trustProxy: true,
  // Use X-Forwarded-For header to get real client IP
  keyGenerator: (req) => {
    // Get IP from X-Forwarded-For header or fallback to req.ip
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;
    logger.debug(`Rate limiter using IP: ${ip} for ${req.path}`);
    return ip;
  },
  handler: (req, res) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;
    logger.warn(`Rate limit exceeded for IP: ${ip} on ${req.path}`);
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again in 15 minutes.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
});

/**
 * Moderate rate limiter for general API endpoints
 * 100 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  keyGenerator: (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;
    return ip;
  },
  handler: (req, res) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;
    logger.warn(`API rate limit exceeded for IP: ${ip} on ${req.path}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
});

/**
 * Lenient rate limiter for photo uploads
 * 20 uploads per hour per IP (reasonable for wedding guests)
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 uploads per hour
  message: {
    success: false,
    message: 'Upload limit reached. Please try again later.',
    code: 'UPLOAD_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  keyGenerator: (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;
    return ip;
  },
  handler: (req, res) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;
    logger.warn(`Upload rate limit exceeded for IP: ${ip}`);
    res.status(429).json({
      success: false,
      message: 'Upload limit reached. Please try again later.',
      code: 'UPLOAD_LIMIT_EXCEEDED'
    });
  }
});

module.exports = {
  authLimiter,
  apiLimiter,
  uploadLimiter
};
