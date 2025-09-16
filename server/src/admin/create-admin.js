/**
 * Create Admin User Script
 * 
 * This script creates an admin user for the wedding website.
 * Admin users have special privileges for managing the system.
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { query } = require('../config/db');

/**
 * Create an admin user
 */
async function createAdmin() {
  try {
    console.log('🔐 Creating admin user...');
    
    // Admin user details
    const adminData = {
      email: 'admin@patriciajames.com',
      password: 'admin123', // In production, this should be a strong password
      first_name: 'Admin',
      last_name: 'User',
      is_admin: true
    };
    
    // Check if admin user already exists
    const existingAdmin = await query(
      'SELECT id FROM users WHERE email = $1',
      [adminData.email]
    );
    
    if (existingAdmin.rows.length > 0) {
      console.log('⚠️  Admin user already exists');
      return;
    }
    
    // Hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(adminData.password, saltRounds);
    
    // Create admin user
    const result = await query(`
      INSERT INTO users (
        email, password_hash, first_name, last_name, is_admin, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, first_name, last_name, is_admin, created_at
    `, [
      adminData.email,
      passwordHash,
      adminData.first_name,
      adminData.last_name,
      adminData.is_admin,
      true
    ]);
    
    const admin = result.rows[0];
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', admin.email);
    console.log('👤 Name:', `${admin.first_name} ${admin.last_name}`);
    console.log('🆔 User ID:', admin.id);
    console.log('🔑 Password:', adminData.password);
    console.log('⚠️  Please change the password after first login!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    throw error;
  }
}

/**
 * Update admin password
 */
async function updateAdminPassword(email, newPassword) {
  try {
    console.log(`🔐 Updating password for admin: ${email}`);
    
    // Hash the new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Update the password
    const result = await query(`
      UPDATE users 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE email = $2 AND is_admin = true
      RETURNING id, email, first_name, last_name
    `, [passwordHash, email]);
    
    if (result.rows.length === 0) {
      throw new Error('Admin user not found');
    }
    
    const admin = result.rows[0];
    
    console.log('✅ Admin password updated successfully!');
    console.log('📧 Email:', admin.email);
    console.log('👤 Name:', `${admin.first_name} ${admin.last_name}`);
    console.log('🔑 New Password:', newPassword);
    
  } catch (error) {
    console.error('❌ Error updating admin password:', error.message);
    throw error;
  }
}

/**
 * List all admin users
 */
async function listAdmins() {
  try {
    console.log('👥 Listing all admin users...');
    
    const result = await query(`
      SELECT 
        id, email, first_name, last_name, is_admin, is_active,
        last_login, created_at
      FROM users 
      WHERE is_admin = true
      ORDER BY created_at DESC
    `);
    
    if (result.rows.length === 0) {
      console.log('📭 No admin users found');
      return;
    }
    
    console.log(`📊 Found ${result.rows.length} admin user(s):`);
    console.log('');
    
    result.rows.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.first_name} ${admin.last_name}`);
      console.log(`   📧 Email: ${admin.email}`);
      console.log(`   🆔 ID: ${admin.id}`);
      console.log(`   ✅ Active: ${admin.is_active ? 'Yes' : 'No'}`);
      console.log(`   🕒 Last Login: ${admin.last_login || 'Never'}`);
      console.log(`   📅 Created: ${admin.created_at}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error listing admin users:', error.message);
    throw error;
  }
}

// Command line interface
const command = process.argv[2];
const email = process.argv[3];
const password = process.argv[4];

switch (command) {
  case 'create':
    createAdmin();
    break;
  case 'update-password':
    if (!email || !password) {
      console.log('Usage: node create-admin.js update-password <email> <new-password>');
      process.exit(1);
    }
    updateAdminPassword(email, password);
    break;
  case 'list':
    listAdmins();
    break;
  default:
    console.log('Admin User Management');
    console.log('');
    console.log('Usage:');
    console.log('  node create-admin.js create                    - Create default admin user');
    console.log('  node create-admin.js update-password <email> <password> - Update admin password');
    console.log('  node create-admin.js list                      - List all admin users');
    console.log('');
    console.log('Examples:');
    console.log('  node create-admin.js create');
    console.log('  node create-admin.js update-password admin@patriciajames.com MyNewPassword123!');
    console.log('  node create-admin.js list');
    break;
}
