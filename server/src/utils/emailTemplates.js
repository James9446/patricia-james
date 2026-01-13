/**
 * Email Templates
 *
 * HTML templates for transactional emails
 * Beautiful, responsive designs for verification and password reset emails
 */

/**
 * Base email template wrapper
 * Provides consistent styling across all emails
 */
function getEmailWrapper(content) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Patricia & James Wedding</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f7f7f7;
      color: #333333;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }
    .email-header {
      background: linear-gradient(135deg, #4DC5E3 0%, #A084DC 100%);
      padding: 40px 30px;
      text-align: center;
      color: #ffffff;
    }
    .email-header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
      letter-spacing: -0.5px;
    }
    .email-body {
      padding: 40px 30px;
    }
    .email-body h2 {
      color: #1a1a1a;
      font-size: 22px;
      margin: 0 0 20px 0;
      font-weight: 600;
    }
    .email-body p {
      color: #666666;
      font-size: 16px;
      line-height: 1.6;
      margin: 0 0 16px 0;
    }
    .button {
      display: inline-block;
      padding: 16px 32px;
      background: linear-gradient(135deg, #4DC5E3 0%, #A084DC 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 24px 0;
      box-shadow: 0 4px 12px rgba(77, 197, 227, 0.3);
    }
    .button:hover {
      opacity: 0.9;
    }
    .code-box {
      background-color: #f5f5f5;
      border: 2px dashed #cccccc;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin: 24px 0;
    }
    .code {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 4px;
      color: #1a1a1a;
      font-family: 'Courier New', monospace;
    }
    .email-footer {
      background-color: #f7f7f7;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #eeeeee;
    }
    .email-footer p {
      color: #999999;
      font-size: 14px;
      margin: 8px 0;
      line-height: 1.5;
    }
    .email-footer a {
      color: #4DC5E3;
      text-decoration: none;
    }
    .divider {
      height: 1px;
      background-color: #eeeeee;
      margin: 24px 0;
    }
    .small-text {
      font-size: 14px;
      color: #999999;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>Patricia & James</h1>
    </div>
    <div class="email-body">
      ${content}
    </div>
    <div class="email-footer">
      <p>This email was sent from Patricia & James Wedding Website</p>
      <p><a href="https://patriciajames.fyi">patriciajames.fyi</a></p>
      <p class="small-text">If you didn't request this email, you can safely ignore it.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Email Verification Template
 * @param {string} firstName - User's first name
 * @param {string} verificationLink - Full verification URL
 * @returns {string} - HTML email template
 */
function getVerificationEmail(firstName, verificationLink) {
  const content = `
    <h2>Welcome, ${firstName}!</h2>
    <p>Thank you for registering for our wedding website. We're excited to celebrate with you!</p>
    <p>Please verify your email address by clicking the button below:</p>

    <div style="text-align: center;">
      <a href="${verificationLink}" class="button">Verify Email Address</a>
    </div>

    <div class="divider"></div>

    <p class="small-text">Or copy and paste this link into your browser:</p>
    <p class="small-text" style="word-break: break-all;">
      <a href="${verificationLink}" style="color: #4DC5E3;">${verificationLink}</a>
    </p>

    <div class="divider"></div>

    <p class="small-text">This verification link will expire in 24 hours for security reasons.</p>
  `;

  return getEmailWrapper(content);
}

/**
 * Password Reset Template
 * @param {string} firstName - User's first name
 * @param {string} resetLink - Full password reset URL
 * @returns {string} - HTML email template
 */
function getPasswordResetEmail(firstName, resetLink) {
  const content = `
    <h2>Password Reset Request</h2>
    <p>Hi ${firstName},</p>
    <p>We received a request to reset your password for the Patricia & James wedding website.</p>
    <p>Click the button below to create a new password:</p>

    <div style="text-align: center;">
      <a href="${resetLink}" class="button">Reset Password</a>
    </div>

    <div class="divider"></div>

    <p class="small-text">Or copy and paste this link into your browser:</p>
    <p class="small-text" style="word-break: break-all;">
      <a href="${resetLink}" style="color: #4DC5E3;">${resetLink}</a>
    </p>

    <div class="divider"></div>

    <p class="small-text">This password reset link will expire in 1 hour for security reasons.</p>
    <p class="small-text"><strong>If you didn't request a password reset, please ignore this email.</strong> Your password will remain unchanged.</p>
  `;

  return getEmailWrapper(content);
}

/**
 * Welcome Email (sent after email verification)
 * @param {string} firstName - User's first name
 * @returns {string} - HTML email template
 */
function getWelcomeEmail(firstName) {
  const content = `
    <h2>Welcome to Our Wedding Celebration!</h2>
    <p>Hi ${firstName},</p>
    <p>Your email has been verified successfully! You now have full access to our wedding website.</p>

    <p><strong>What you can do now:</strong></p>
    <ul style="color: #666666; font-size: 16px; line-height: 1.8;">
      <li>Submit your RSVP</li>
      <li>View event details and schedule</li>
      <li>Check out accommodations and location</li>
      <li>Share photos from the celebration</li>
    </ul>

    <div style="text-align: center;">
      <a href="https://patriciajames.fyi" class="button">Visit Wedding Website</a>
    </div>

    <div class="divider"></div>

    <p>We can't wait to celebrate with you!</p>
    <p style="margin-top: 24px;">With love,<br><strong>Patricia & James</strong></p>
  `;

  return getEmailWrapper(content);
}

/**
 * Test Email Template
 * Used for testing email configuration
 * @param {string} recipientEmail - Recipient email address
 * @returns {string} - HTML email template
 */
function getTestEmail(recipientEmail) {
  const content = `
    <h2>Email Configuration Test</h2>
    <p>This is a test email to verify your email configuration is working correctly.</p>

    <div class="code-box">
      <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">Sent to:</p>
      <p class="code" style="font-size: 18px; letter-spacing: normal;">${recipientEmail}</p>
    </div>

    <p>✅ If you received this email, your Gmail SMTP configuration is working properly!</p>

    <div class="divider"></div>

    <p class="small-text"><strong>Configuration details:</strong></p>
    <p class="small-text">
      Service: Gmail SMTP<br>
      From: ${process.env.GMAIL_USER || 'Not configured'}<br>
      Date: ${new Date().toLocaleString()}
    </p>
  `;

  return getEmailWrapper(content);
}

module.exports = {
  getVerificationEmail,
  getPasswordResetEmail,
  getWelcomeEmail,
  getTestEmail
};
