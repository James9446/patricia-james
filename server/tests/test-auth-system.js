#!/usr/bin/env node

/**
 * Authentication System Test Script
 * 
 * Tests the complete authentication flow including:
 * - Guest lookup
 * - User registration
 * - Login/logout
 * - Session management
 * - Protected route access
 */

require('dotenv').config();

// Test configuration
const API_BASE = 'http://localhost:5001/api';
const TEST_GUEST = {
  first_name: 'John',
  last_name: 'Smith'
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Session management for tests
let sessionCookies = '';

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warning: '\x1b[33m', // Yellow
    reset: '\x1b[0m'
  };
  
  console.log(`${colors[type]}${message}${colors.reset}`);
}

function logTest(testName, passed, message = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const color = passed ? 'success' : 'error';
  
  log(`${status} ${testName}${message ? ': ' + message : ''}`, color);
  
  testResults.tests.push({ name: testName, passed, message });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

async function makeRequest(endpoint, options = {}) {
  try {
    const { default: fetch } = await import('node-fetch');
    const url = `${API_BASE}${endpoint}`;
    
    // Add session cookies to headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (sessionCookies) {
      headers['Cookie'] = sessionCookies;
    }
    
    const response = await fetch(url, {
      credentials: 'include', // Include cookies for session management
      headers,
      ...options
    });
    
    // Extract cookies from response for session management
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      sessionCookies = setCookieHeader;
    }
    
    const data = await response.json();
    return { response, data };
  } catch (error) {
    return { error: error.message };
  }
}

async function testServerConnection() {
  log('\n🔍 Testing Server Connection...', 'info');
  
  const { response, data, error } = await makeRequest('/health');
  
  if (error) {
    logTest('Server Connection', false, `Connection failed: ${error}`);
    return false;
  }
  
  if (response.ok && data.status === 'UP') {
    logTest('Server Connection', true, 'Server is running');
    return true;
  } else {
    logTest('Server Connection', false, 'Server health check failed');
    return false;
  }
}

async function testGuestLookup() {
  log('\n👤 Testing Guest Lookup...', 'info');
  
  const { response, data, error } = await makeRequest('/auth/check-guest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_GUEST)
  });
  
  if (error) {
    logTest('Guest Lookup', false, `Request failed: ${error}`);
    return null;
  }
  
  if (response.ok && data.success) {
    logTest('Guest Lookup', true, `Found guest: ${data.data.full_name}`);
    return data.data;
  } else {
    logTest('Guest Lookup', false, data.message || 'Guest not found');
    return null;
  }
}

async function testUserRegistration(guestData) {
  log('\n📝 Testing User Registration...', 'info');
  
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  const { response, data, error } = await makeRequest('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: guestData.user_id,
      email: testEmail,
      password: testPassword,
      first_name: guestData.first_name,
      last_name: guestData.last_name
    })
  });
  
  if (error) {
    logTest('User Registration', false, `Request failed: ${error}`);
    return null;
  }
  
  if (response.ok && data.success) {
    logTest('User Registration', true, `User created: ${data.data.email}`);
    return { email: testEmail, password: testPassword, userData: data.data };
  } else {
    logTest('User Registration', false, data.message || 'Registration failed');
    return null;
  }
}

async function testLogin(credentials) {
  log('\n🔐 Testing User Login...', 'info');
  
  const { response, data, error } = await makeRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password
    })
  });
  
  if (error) {
    logTest('User Login', false, `Request failed: ${error}`);
    return null;
  }
  
  if (response.ok && data.success) {
    logTest('User Login', true, `Logged in as: ${data.data.first_name} ${data.data.last_name}`);
    return data.data;
  } else {
    logTest('User Login', false, data.message || 'Login failed');
    return null;
  }
}

async function testAuthStatus() {
  log('\n📊 Testing Authentication Status...', 'info');
  
  const { response, data, error } = await makeRequest('/auth/status');
  
  if (error) {
    logTest('Auth Status Check', false, `Request failed: ${error}`);
    return false;
  }
  
  if (response.ok && data.success && data.authenticated) {
    logTest('Auth Status Check', true, `User authenticated: ${data.userId}`);
    return true;
  } else {
    logTest('Auth Status Check', false, 'User not authenticated');
    return false;
  }
}

async function testGetCurrentUser() {
  log('\n👤 Testing Get Current User...', 'info');
  
  const { response, data, error } = await makeRequest('/auth/me');
  
  if (error) {
    logTest('Get Current User', false, `Request failed: ${error}`);
    return null;
  }
  
  if (response.ok && data.success) {
    logTest('Get Current User', true, `User data retrieved: ${data.data.first_name} ${data.data.last_name}`);
    return data.data;
  } else {
    logTest('Get Current User', false, data.message || 'Failed to get user data');
    return null;
  }
}

async function testProtectedRouteAccess() {
  log('\n🛡️ Testing Protected Route Access...', 'info');
  
  // Test RSVP summary endpoint (requires authentication)
  const { response, data, error } = await makeRequest('/rsvps/summary');
  
  if (error) {
    logTest('Protected Route Access', false, `Request failed: ${error}`);
    return false;
  }
  
  if (response.ok && data.success) {
    logTest('Protected Route Access', true, 'Successfully accessed protected route');
    return true;
  } else if (response.status === 401) {
    logTest('Protected Route Access', false, 'Unauthorized access (expected if not logged in)');
    return false;
  } else {
    logTest('Protected Route Access', false, data.message || 'Unexpected response');
    return false;
  }
}

async function testLogout() {
  log('\n🚪 Testing User Logout...', 'info');
  
  const { response, data, error } = await makeRequest('/auth/logout', {
    method: 'POST'
  });
  
  if (error) {
    logTest('User Logout', false, `Request failed: ${error}`);
    return false;
  }
  
  if (response.ok && data.success) {
    // Clear session cookies on successful logout
    sessionCookies = '';
    logTest('User Logout', true, 'Successfully logged out');
    return true;
  } else {
    logTest('User Logout', false, data.message || 'Logout failed');
    return false;
  }
}

async function testPostLogoutAccess() {
  log('\n🔒 Testing Post-Logout Access...', 'info');
  
  // Test that protected routes are no longer accessible
  const { response, data, error } = await makeRequest('/auth/me');
  
  if (error) {
    logTest('Post-Logout Access', false, `Request failed: ${error}`);
    return false;
  }
  
  if (response.status === 401) {
    logTest('Post-Logout Access', true, 'Correctly denied access after logout');
    return true;
  } else {
    logTest('Post-Logout Access', false, 'Still have access after logout');
    return false;
  }
}

async function cleanupTestData() {
  log('\n🧹 Cleaning up test data...', 'info');
  
  try {
    const { query } = require('../src/config/db');
    
    // Clean up test users with test emails (very specific pattern)
    await query("DELETE FROM users WHERE email LIKE 'test-%@example.com'");
    
    // Clear session cookies
    sessionCookies = '';
    
    log('✅ Test data cleaned up', 'success');
  } catch (error) {
    log(`⚠️  Cleanup warning: ${error.message}`, 'warning');
  }
}

async function runAllTests() {
  log('🧪 Starting Authentication System Tests...', 'info');
  log('==========================================', 'info');
  
  // Clean up any existing test data (only test emails)
  await cleanupTestData();
  
  // Test 1: Server Connection
  const serverConnected = await testServerConnection();
  if (!serverConnected) {
    log('\n❌ Server connection failed. Please start the server first.', 'error');
    log('Run: cd server && node src/index.js', 'info');
    return;
  }
  
  // Test 2: Guest Lookup
  const guestData = await testGuestLookup();
  if (!guestData) {
    log('\n❌ Guest lookup failed. Please ensure test data is available.', 'error');
    return;
  }
  
  // Test 3: User Registration
  const credentials = await testUserRegistration(guestData);
  if (!credentials) {
    log('\n❌ User registration failed.', 'error');
    return;
  }
  
  // Test 4: User Login
  const userData = await testLogin(credentials);
  if (!userData) {
    log('\n❌ User login failed.', 'error');
    return;
  }
  
  // Test 5: Authentication Status
  await testAuthStatus();
  
  // Test 6: Get Current User
  await testGetCurrentUser();
  
  // Test 7: Protected Route Access
  await testProtectedRouteAccess();
  
  // Test 8: User Logout
  await testLogout();
  
  // Test 9: Post-Logout Access
  await testPostLogoutAccess();
  
  // Summary
  log('\n📊 Test Summary', 'info');
  log('===============', 'info');
  log(`✅ Passed: ${testResults.passed}`, 'success');
  log(`❌ Failed: ${testResults.failed}`, 'error');
  log(`📈 Total: ${testResults.passed + testResults.failed}`, 'info');
  
  if (testResults.failed === 0) {
    log('\n🎉 All authentication tests passed!', 'success');
    log('✅ Authentication system is working correctly', 'success');
  } else {
    log('\n⚠️ Some tests failed. Please review the issues above.', 'warning');
  }
  
  return testResults.failed === 0;
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.message}`, 'error');
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  log(`Unhandled rejection: ${error.message}`, 'error');
  process.exit(1);
});

// Run the tests
runAllTests().then((success) => {
  process.exit(success ? 0 : 1);
}).catch((error) => {
  log(`Test execution failed: ${error.message}`, 'error');
  process.exit(1);
});
