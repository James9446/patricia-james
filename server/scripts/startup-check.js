#!/usr/bin/env node

/**
 * Wedding App Startup Verification Script
 * 
 * This script performs a comprehensive check of the application state
 * to ensure everything is working correctly before development begins.
 * 
 * Usage: node scripts/startup-check.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`  ${title}`, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function checkEnvironment() {
  logSection('ENVIRONMENT CHECK');
  
  try {
    // Check if we're in the right directory
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('package.json not found. Are you in the server directory?');
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    logSuccess(`Found package.json: ${packageJson.name}`);
    
    // Check .env file
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
      throw new Error('.env file not found');
    }
    logSuccess('Found .env file');
    
    // Check required environment variables
    require('dotenv').config();
    const requiredEnvVars = [
      'DATABASE_URL',
      'DATABASE_ADMIN_URL',
      'PORT'
    ];
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }
    logSuccess('All required environment variables present');
    
    return true;
  } catch (error) {
    logError(`Environment check failed: ${error.message}`);
    return false;
  }
}

async function checkDatabase() {
  logSection('DATABASE CHECK');
  
  try {
    // Test admin database connection
    logInfo('Testing admin database connection...');
    const { execSync } = require('child_process');
    
    const result = execSync('node tests/test-admin-access.js', { 
      encoding: 'utf8',
      cwd: process.cwd()
    });
    
    if (result.includes('✅ All admin access tests passed successfully!')) {
      logSuccess('Admin database access verified');
    } else {
      throw new Error('Admin database access test failed');
    }
    
    return true;
  } catch (error) {
    logError(`Database check failed: ${error.message}`);
    logInfo('Try running: node src/database/migrate.js reset');
    return false;
  }
}

async function checkRSVPSystem() {
  logSection('RSVP SYSTEM CHECK');
  
  try {
    logInfo('Running RSVP system tests...');
    const { execSync } = require('child_process');
    
    const result = execSync('node tests/test-rsvp-system.js', { 
      encoding: 'utf8',
      cwd: process.cwd()
    });
    
    if (result.includes('✅ All tests completed successfully!')) {
      logSuccess('RSVP system tests passed');
    } else {
      throw new Error('RSVP system tests failed');
    }
    
    return true;
  } catch (error) {
    logError(`RSVP system check failed: ${error.message}`);
    return false;
  }
}

async function checkServer() {
  logSection('SERVER CHECK');
  
  try {
    logInfo('Testing server startup...');
    
    // Start server in background
    const { spawn } = require('child_process');
    const serverProcess = spawn('node', ['src/index.js'], {
      cwd: process.cwd(),
      stdio: 'pipe'
    });
    
    // Wait for server to start
    await new Promise((resolve, reject) => {
      let output = '';
      let resolved = false;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          serverProcess.kill();
          reject(new Error('Server startup timeout'));
        }
      }, 10000);
      
      serverProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Server is running on port') && !resolved) {
          clearTimeout(timeout);
          resolved = true;
          resolve();
        }
      });
      
      serverProcess.stderr.on('data', (data) => {
        if (!resolved) {
          clearTimeout(timeout);
          resolved = true;
          serverProcess.kill();
          reject(new Error(`Server error: ${data.toString()}`));
        }
      });
    });
    
    logSuccess('Server started successfully');
    
    // Test API endpoint
    logInfo('Testing API health endpoint...');
    const { execSync } = require('child_process');
    
    try {
      const healthCheck = execSync('curl -s http://localhost:5001/api/health', { 
        encoding: 'utf8',
        timeout: 5000
      });
      
      if (healthCheck.includes('"status":"UP"')) {
        logSuccess('API health check passed');
      } else {
        throw new Error('Health check response invalid');
      }
    } catch (curlError) {
      logWarning('Could not test API endpoint (curl not available or server not responding)');
    }
    
    // Kill server
    serverProcess.kill();
    logSuccess('Server stopped cleanly');
    
    return true;
  } catch (error) {
    logError(`Server check failed: ${error.message}`);
    return false;
  }
}

async function checkDependencies() {
  logSection('DEPENDENCIES CHECK');
  
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const requiredDeps = [
      'express',
      'pg',
      'dotenv',
      'bcrypt'
    ];
    
    for (const dep of requiredDeps) {
      if (!packageJson.dependencies[dep]) {
        throw new Error(`Missing required dependency: ${dep}`);
      }
    }
    
    logSuccess('All required dependencies present');
    
    // Check if node_modules exists
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      logWarning('node_modules not found. Run: npm install');
      return false;
    }
    
    logSuccess('Dependencies installed');
    return true;
  } catch (error) {
    logError(`Dependencies check failed: ${error.message}`);
    return false;
  }
}

async function main() {
  log('\n🚀 WEDDING APP STARTUP VERIFICATION', 'bright');
  log('=====================================\n', 'bright');
  
  const checks = [
    { name: 'Environment', fn: checkEnvironment },
    { name: 'Dependencies', fn: checkDependencies },
    { name: 'Database', fn: checkDatabase },
    { name: 'RSVP System', fn: checkRSVPSystem },
    { name: 'Server', fn: checkServer }
  ];
  
  const results = [];
  
  for (const check of checks) {
    try {
      const result = await check.fn();
      results.push({ name: check.name, passed: result });
    } catch (error) {
      logError(`${check.name} check crashed: ${error.message}`);
      results.push({ name: check.name, passed: false });
    }
  }
  
  // Summary
  logSection('STARTUP SUMMARY');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  for (const result of results) {
    if (result.passed) {
      logSuccess(`${result.name}: PASSED`);
    } else {
      logError(`${result.name}: FAILED`);
    }
  }
  
  log(`\n${'='.repeat(60)}`, 'cyan');
  if (passed === total) {
    log(`🎉 ALL CHECKS PASSED (${passed}/${total})`, 'green');
    log('✅ System is ready for development!', 'green');
    process.exit(0);
  } else {
    log(`⚠️  SOME CHECKS FAILED (${passed}/${total})`, 'yellow');
    log('❌ Please fix the issues above before continuing', 'red');
    process.exit(1);
  }
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  logError(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logError(`Unhandled rejection: ${error.message}`);
  process.exit(1);
});

// Run the startup check
main().catch((error) => {
  logError(`Startup check failed: ${error.message}`);
  process.exit(1);
});
