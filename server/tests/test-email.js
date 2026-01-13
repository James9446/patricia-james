/**
 * Email Configuration Test Script
 *
 * Test your Gmail SMTP configuration by sending a test email
 *
 * Usage:
 *   node tests/test-email.js your-email@example.com
 */

require('dotenv').config();
const { sendEmail, verifyEmailConfig } = require('../src/config/email');
const { getTestEmail } = require('../src/utils/emailTemplates');

async function testEmail() {
  console.log('🧪 Testing Email Configuration...\n');

  // Get recipient email from command line argument
  const recipientEmail = process.argv[2];

  if (!recipientEmail) {
    console.error('❌ Error: Please provide a recipient email address');
    console.log('\nUsage: node tests/test-email.js your-email@example.com\n');
    process.exit(1);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipientEmail)) {
    console.error('❌ Error: Invalid email address format');
    process.exit(1);
  }

  console.log('📧 Recipient:', recipientEmail);
  console.log('📤 Sender:', process.env.GMAIL_USER || 'Not configured');
  console.log('');

  // Step 1: Verify configuration
  console.log('Step 1: Verifying email configuration...');
  const isConfigValid = await verifyEmailConfig();

  if (!isConfigValid) {
    console.error('\n❌ Email configuration verification failed!');
    console.log('\nPlease check:');
    console.log('  1. GMAIL_USER is set in server/.env');
    console.log('  2. GMAIL_APP_PASSWORD is set in server/.env');
    console.log('  3. App password is correct (16 characters, no spaces)');
    console.log('  4. 2-Step Verification is enabled on your Google Account');
    console.log('\nSee admin_notes.md for detailed setup instructions.');
    process.exit(1);
  }

  console.log('✅ Configuration verified\n');

  // Step 2: Send test email
  console.log('Step 2: Sending test email...');

  try {
    const htmlContent = getTestEmail(recipientEmail);

    await sendEmail({
      to: recipientEmail,
      subject: '✅ Email Configuration Test - Patricia & James Wedding',
      html: htmlContent,
      text: `Email Configuration Test\n\nThis is a test email to verify your email configuration is working correctly.\n\nSent to: ${recipientEmail}\n\nIf you received this email, your Gmail SMTP configuration is working properly!`
    });

    console.log('✅ Test email sent successfully!\n');
    console.log('📬 Please check your inbox at:', recipientEmail);
    console.log('📁 If you don\'t see it, check your Spam/Junk folder\n');
    console.log('✨ Email configuration is working correctly!');

  } catch (error) {
    console.error('\n❌ Failed to send test email');
    console.error('Error:', error.message);

    if (error.message.includes('Invalid login')) {
      console.log('\n💡 Tip: Make sure you\'re using a Gmail App Password, not your regular password');
      console.log('   See admin_notes.md for setup instructions');
    }

    process.exit(1);
  }
}

// Run test
testEmail().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
