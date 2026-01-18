/**
 * Email Configuration
 *
 * Gmail SMTP setup using nodemailer for transactional emails
 * (verification emails, password resets, etc.)
 */

const nodemailer = require('nodemailer');
const logger = require('./logger');

/**
 * Create email transporter using Gmail SMTP
 *
 * IMPORTANT: You must use a Gmail App Password, not your regular Gmail password
 * To create an App Password:
 * 1. Go to Google Account settings
 * 2. Security → 2-Step Verification (enable if not already)
 * 3. App passwords → Generate new app password
 * 4. Copy the 16-character password
 * 5. Add to .env as GMAIL_APP_PASSWORD
 */
const createTransporter = () => {
  // Check for required environment variables
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    logger.warn('Email configuration incomplete - GMAIL_USER and GMAIL_APP_PASSWORD required');
    return null;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword
    }
  });

  return transporter;
};

// Create transporter instance
const transporter = createTransporter();

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML email body
 * @param {string} [options.text] - Plain text email body (optional)
 * @returns {Promise<Object>} - Email send result
 */
async function sendEmail({ to, subject, html, text }) {
  if (!transporter) {
    logger.error('Email transporter not configured');
    throw new Error('Email service not configured');
  }

  try {
    const fromName = 'Patricia & James';
    const fromEmail = process.env.GMAIL_USER;

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html,
      text: text || '' // Optional plain text version
    };

    logger.info(`Sending email to ${to} with subject: ${subject}`);
    const result = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully to ${to} (Message ID: ${result.messageId})`);

    return {
      success: true,
      messageId: result.messageId
    };
  } catch (error) {
    logger.error(`Failed to send email to ${to}: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Verify email configuration
 * @returns {Promise<boolean>} - True if configuration is valid
 */
async function verifyEmailConfig() {
  if (!transporter) {
    logger.warn('Email transporter not configured');
    return false;
  }

  try {
    await transporter.verify();
    logger.info('✅ Email configuration verified successfully');
    return true;
  } catch (error) {
    logger.error(`❌ Email configuration verification failed: ${error.message}`);
    return false;
  }
}

module.exports = {
  sendEmail,
  verifyEmailConfig
};
