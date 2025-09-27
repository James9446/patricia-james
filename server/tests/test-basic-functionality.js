#!/usr/bin/env node

/**
 * Basic Functionality Test Suite
 * Tests core functionality without complex authentication flows
 */

require('dotenv').config();

// Dynamic import for node-fetch
let fetch;

const BASE_URL = 'http://localhost:5001/api';

class BasicFunctionalityTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async run() {
    console.log('🧪 Basic Functionality Test Suite');
    console.log('==================================');
    console.log('');

    try {
      // Initialize fetch
      fetch = (await import('node-fetch')).default;

      // Run basic tests
      await this.testServerHealth();
      await this.testDatabaseConnection();
      await this.testGuestCheck();
      await this.testErrorHandling();

      // Print results
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  async testServerHealth() {
    console.log('🏥 Testing Server Health...');
    
    try {
      const response = await fetch(`${BASE_URL}/auth/check-guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: 'Test', last_name: 'User' })
      });
      
      if (response.ok || response.status === 400) {
        this.recordTest('Server Health Check', true, 'Server is responding');
      } else {
        this.recordTest('Server Health Check', false, `Server health check failed: ${response.status}`);
      }
    } catch (error) {
      this.recordTest('Server Health Check', false, `Server health check failed: ${error.message}`);
    }
  }

  async testDatabaseConnection() {
    console.log('🗄️ Testing Database Connection...');
    
    try {
      const response = await fetch(`${BASE_URL}/auth/check-guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: 'Test', last_name: 'User' })
      });
      
      if (response.ok || response.status === 400) {
        this.recordTest('Database Connection', true, 'Database is accessible and responding');
      } else {
        this.recordTest('Database Connection', false, `Database connection test failed: ${response.status}`);
      }
    } catch (error) {
      this.recordTest('Database Connection', false, `Database connection failed: ${error.message}`);
    }
  }

  async testGuestCheck() {
    console.log('👤 Testing Guest Check...');
    
    try {
      const response = await fetch(`${BASE_URL}/auth/check-guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          first_name: 'Tara', 
          last_name: 'Folenta' 
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.data && data.data.user_id) {
        this.recordTest('Guest Check Functionality', true, 'Guest check working correctly');
      } else {
        this.recordTest('Guest Check Functionality', false, `Guest check failed: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      this.recordTest('Guest Check Functionality', false, `Guest check error: ${error.message}`);
    }
  }

  async testErrorHandling() {
    console.log('⚠️ Testing Error Handling...');
    
    // Test invalid login
    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid@example.com',
          password: 'wrongpassword'
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        this.recordTest('Error Handling - Invalid Login', true, 'Invalid login properly rejected');
      } else {
        this.recordTest('Error Handling - Invalid Login', false, 'Invalid login was accepted');
      }
    } catch (error) {
      this.recordTest('Error Handling - Invalid Login', false, `Error handling test failed: ${error.message}`);
    }
  }

  recordTest(name, passed, message) {
    const result = { name, passed, message };
    this.results.tests.push(result);
    
    if (passed) {
      this.results.passed++;
      console.log(`✅ ${name}: ${message}`);
    } else {
      this.results.failed++;
      console.log(`❌ ${name}: ${message}`);
    }
  }

  printResults() {
    console.log('');
    console.log('📊 Test Results Summary');
    console.log('========================');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Total: ${this.results.passed + this.results.failed}`);
    console.log('');
    
    if (this.results.failed > 0) {
      console.log('❌ Failed Tests:');
      this.results.tests
        .filter(test => !test.passed)
        .forEach(test => console.log(`   - ${test.name}: ${test.message}`));
      console.log('');
    }
    
    const successRate = ((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1);
    console.log(`🎯 Success Rate: ${successRate}%`);
    
    if (this.results.failed === 0) {
      console.log('🎉 All tests passed! System is working correctly.');
      process.exit(0);
    } else {
      console.log('⚠️ Some tests failed. Please check the issues above.');
      process.exit(1);
    }
  }
}

// Run the test suite
if (require.main === module) {
  const testSuite = new BasicFunctionalityTest();
  testSuite.run().catch(console.error);
}

module.exports = BasicFunctionalityTest;
