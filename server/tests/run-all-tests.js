#!/usr/bin/env node

/**
 * Test Runner for Patricia & James Wedding App
 * Runs all test suites in the correct order
 */

const { spawn } = require('child_process');
const path = require('path');

class TestRunner {
  constructor() {
    this.testSuites = [
      'comprehensive-test-suite.js',
      'test-auth-system.js',
      'test-rsvp-system.js',
      'test-api.js',
      'test-admin-simple.js'
    ];
    this.results = {
      passed: 0,
      failed: 0,
      suites: []
    };
  }

  async run() {
    console.log('🧪 Running All Test Suites');
    console.log('==========================');
    console.log('');

    for (const testSuite of this.testSuites) {
      await this.runTestSuite(testSuite);
    }

    this.printResults();
  }

  async runTestSuite(testFile) {
    return new Promise((resolve) => {
      console.log(`\n📋 Running ${testFile}...`);
      console.log('─'.repeat(50));

      const testPath = path.join(__dirname, testFile);
      const child = spawn('node', [testPath], {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });

      child.on('close', (code) => {
        const result = {
          name: testFile,
          passed: code === 0,
          exitCode: code
        };
        
        this.results.suites.push(result);
        
        if (code === 0) {
          this.results.passed++;
          console.log(`✅ ${testFile} completed successfully`);
        } else {
          this.results.failed++;
          console.log(`❌ ${testFile} failed with exit code ${code}`);
        }
        
        resolve();
      });

      child.on('error', (error) => {
        console.error(`❌ Error running ${testFile}:`, error);
        this.results.failed++;
        this.results.suites.push({
          name: testFile,
          passed: false,
          error: error.message
        });
        resolve();
      });
    });
  }

  printResults() {
    console.log('\n📊 All Test Results Summary');
    console.log('============================');
    console.log(`✅ Passed Suites: ${this.results.passed}`);
    console.log(`❌ Failed Suites: ${this.results.failed}`);
    console.log(`📈 Total Suites: ${this.results.passed + this.results.failed}`);
    console.log('');

    if (this.results.failed > 0) {
      console.log('❌ Failed Test Suites:');
      this.results.suites
        .filter(suite => !suite.passed)
        .forEach(suite => {
          console.log(`   - ${suite.name} (exit code: ${suite.exitCode || 'error'})`);
        });
      console.log('');
    }

    const successRate = ((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1);
    console.log(`🎯 Success Rate: ${successRate}%`);
    
    if (this.results.failed === 0) {
      console.log('🎉 All test suites passed! System is ready for cleanup.');
      process.exit(0);
    } else {
      console.log('⚠️ Some test suites failed. Please fix issues before cleanup.');
      process.exit(1);
    }
  }
}

// Run all tests
if (require.main === module) {
  const runner = new TestRunner();
  runner.run().catch(console.error);
}

module.exports = TestRunner;
