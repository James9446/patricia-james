#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Patricia & James Wedding App
 * Tests all major functionality including authentication, RSVP, and plus-one features
 */

require('dotenv').config();

// Dynamic import for node-fetch
let fetch;

const BASE_URL = 'http://localhost:5001/api';

// Test configuration
const TEST_CONFIG = {
  baseUrl: BASE_URL,
  timeout: 10000,
  verbose: true
};

// Test data
const TEST_USERS = {
  individual: {
    name: 'Test Individual',
    email: 'test-individual@example.com',
    password: 'password123'
  },
  couple_member: {
    name: 'Tara Folenta',
    email: 'tara@example.com', 
    password: 'password123'
  },
  plus_one_user: {
    name: 'Michael Chen',
    email: 'mike@example.com',
    password: 'password123'
  }
};

class TestSuite {
  constructor(config) {
    this.config = config;
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runTest(name, testFn) {
    console.log(`\n🧪 Running test: ${name}`);
    try {
      await testFn();
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASSED' });
      console.log(`✅ ${name} - PASSED`);
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', error: error.message });
      console.log(`❌ ${name} - FAILED: ${error.message}`);
    }
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.config.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  }

  async testServerHealth() {
    // Test basic server connectivity by checking a simple endpoint
    const response = await this.makeRequest('/auth/check-guest', {
      method: 'POST',
      body: JSON.stringify({ first_name: 'Test', last_name: 'User' })
    });
    // We expect this to fail with a specific error, which means server is running
    if (response.success) {
      throw new Error('Expected guest check to fail for test user');
    }
  }

  async testGuestCheck() {
    // Test checking a guest that exists
    const response = await this.makeRequest('/auth/check-guest', {
      method: 'POST',
      body: JSON.stringify({ first_name: 'Tara', last_name: 'Folenta' })
    });

    if (!response.success || !response.data) {
      throw new Error('Guest check failed for existing guest');
    }

    // Test checking a guest that doesn't exist
    const response2 = await this.makeRequest('/auth/check-guest', {
      method: 'POST',
      body: JSON.stringify({ first_name: 'Non', last_name: 'Existent' })
    });

    if (response2.success) {
      throw new Error('Guest check should fail for non-existent guest');
    }
  }

  async testUserRegistration() {
    const userData = TEST_USERS.individual;
    
    // First check if guest exists (using a seeded guest)
    const checkResponse = await this.makeRequest('/auth/check-guest', {
      method: 'POST',
      body: JSON.stringify({ first_name: 'Sarah', last_name: 'Johnson' })
    });

    if (!checkResponse.success) {
      throw new Error('Guest check failed before registration');
    }

    // Register the user
    const registerResponse = await this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        user_id: checkResponse.data.id,
        email: userData.email,
        password: userData.password
      })
    });

    if (!registerResponse.success) {
      throw new Error('User registration failed');
    }

    // Store user data for later tests
    this.registeredUser = {
      ...registerResponse.data,
      email: userData.email,
      password: userData.password
    };
  }

  async testUserLogin() {
    if (!this.registeredUser) {
      throw new Error('No registered user available for login test');
    }

    const loginResponse = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: this.registeredUser.email,
        password: this.registeredUser.password
      })
    });

    if (!loginResponse.success || !loginResponse.data) {
      throw new Error('User login failed');
    }

    // Store session cookie for authenticated requests
    this.sessionCookie = loginResponse.headers?.['set-cookie'] || null;
  }

  async testRSVPSubmission() {
    if (!this.registeredUser) {
      throw new Error('No registered user available for RSVP test');
    }

    const rsvpData = {
      user_id: this.registeredUser.id,
      response_status: 'attending',
      dietary_restrictions: 'No allergies',
      message: 'Looking forward to the wedding!'
    };

    const rsvpResponse = await this.makeRequest('/rsvps', {
      method: 'POST',
      body: JSON.stringify(rsvpData),
      headers: this.sessionCookie ? { 'Cookie': this.sessionCookie } : {}
    });

    if (!rsvpResponse.success) {
      throw new Error('RSVP submission failed');
    }
  }

  async testPlusOneRSVP() {
    // First register a user who can bring a plus-one
    const checkResponse = await this.makeRequest('/auth/check-guest', {
      method: 'POST',
      body: JSON.stringify({ first_name: 'Michael', last_name: 'Chen' })
    });

    if (!checkResponse.success) {
      throw new Error('Guest check failed for plus-one user');
    }

    // Register the user
    const registerResponse = await this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        user_id: checkResponse.data.id,
        email: TEST_USERS.plus_one_user.email,
        password: TEST_USERS.plus_one_user.password
      })
    });

    if (!registerResponse.success) {
      throw new Error('Plus-one user registration failed');
    }

    // Submit RSVP with plus-one
    const rsvpData = {
      user_id: registerResponse.data.id,
      response_status: 'attending',
      dietary_restrictions: 'Vegetarian',
      message: 'Excited to attend!',
      plus_one: {
        first_name: 'Plus One',
        last_name: 'Guest',
        email: 'plusone@example.com',
        dietary_restrictions: 'No restrictions'
      }
    };

    const rsvpResponse = await this.makeRequest('/rsvps', {
      method: 'POST',
      body: JSON.stringify(rsvpData)
    });

    if (!rsvpResponse.success) {
      throw new Error('Plus-one RSVP submission failed');
    }

    // Verify plus-one was created with correct account status
    if (!rsvpResponse.data.plus_one_rsvp) {
      throw new Error('Plus-one RSVP not created');
    }
  }

  async testCoupleRSVP() {
    // Test couple RSVP functionality
    const checkResponse = await this.makeRequest('/auth/check-guest', {
      method: 'POST',
      body: JSON.stringify({ first_name: 'Tara', last_name: 'Folenta' })
    });

    if (!checkResponse.success) {
      throw new Error('Guest check failed for couple member');
    }

    // Register the couple member
    const registerResponse = await this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        user_id: checkResponse.data.id,
        email: TEST_USERS.couple_member.email,
        password: TEST_USERS.couple_member.password
      })
    });

    if (!registerResponse.success) {
      throw new Error('Couple member registration failed');
    }

    // Submit RSVP for couple
    const rsvpData = {
      user_id: registerResponse.data.id,
      response_status: 'attending',
      dietary_restrictions: 'No allergies',
      message: 'Both of us are excited!'
    };

    const rsvpResponse = await this.makeRequest('/rsvps', {
      method: 'POST',
      body: JSON.stringify(rsvpData)
    });

    if (!rsvpResponse.success) {
      throw new Error('Couple RSVP submission failed');
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Test Suite');
    console.log('=====================================');

    await this.runTest('Server Health Check', () => this.testServerHealth());
    await this.runTest('Guest Check Functionality', () => this.testGuestCheck());
    await this.runTest('User Registration', () => this.testUserRegistration());
    await this.runTest('User Login', () => this.testUserLogin());
    await this.runTest('Individual RSVP Submission', () => this.testRSVPSubmission());
    await this.runTest('Plus-One RSVP Functionality', () => this.testPlusOneRSVP());
    await this.runTest('Couple RSVP Functionality', () => this.testCoupleRSVP());

    this.printResults();
  }

  printResults() {
    console.log('\n📊 Test Results Summary');
    console.log('======================');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);

    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`   • ${test.name}: ${test.error}`);
        });
    }

    console.log('\n🎯 Test Suite Complete!');
  }
}

// Run the test suite
async function main() {
  // Import node-fetch dynamically
  const { default: nodeFetch } = await import('node-fetch');
  fetch = nodeFetch;
  
  const testSuite = new TestSuite(TEST_CONFIG);
  await testSuite.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = TestSuite;
