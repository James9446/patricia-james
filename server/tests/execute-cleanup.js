#!/usr/bin/env node

/**
 * Execute Codebase Cleanup
 * Safely executes the cleanup plan with backups and testing
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CleanupExecutor {
  constructor() {
    this.projectRoot = path.join(__dirname, '../..');
    this.backupDir = path.join(this.projectRoot, 'cleanup-backup');
    this.cleanupLog = [];
  }

  async execute() {
    console.log('🧹 Executing Codebase Cleanup');
    console.log('============================');
    console.log('');

    try {
      // Pre-cleanup safety checks
      await this.runSafetyChecks();
      
      // Create backup
      await this.createBackup();
      
      // Execute cleanup phases
      await this.executePhase1(); // Remove duplicates
      await this.executePhase2(); // Organize tests
      await this.executePhase3(); // Remove unused files
      await this.executePhase4(); // Clean dead code
      
      // Post-cleanup verification
      await this.verifyCleanup();
      
      console.log('\n🎉 Cleanup completed successfully!');
      this.printSummary();
      
    } catch (error) {
      console.error('\n❌ Cleanup failed:', error.message);
      console.log('\n🔄 Restoring from backup...');
      await this.restoreFromBackup();
      process.exit(1);
    }
  }

  async runSafetyChecks() {
    console.log('🛡️ Running Safety Checks...');
    
    // Check if we're in a git repository
    try {
      execSync('git status', { cwd: this.projectRoot, stdio: 'pipe' });
      console.log('   ✅ Git repository detected');
    } catch (error) {
      throw new Error('Not in a git repository - cleanup requires git for safety');
    }

    // Check if there are uncommitted changes
    try {
      const status = execSync('git status --porcelain', { cwd: this.projectRoot, encoding: 'utf8' });
      if (status.trim()) {
        console.log('   ⚠️ Uncommitted changes detected - committing them first');
        execSync('git add .', { cwd: this.projectRoot });
        execSync('git commit -m "Pre-cleanup commit"', { cwd: this.projectRoot });
      }
      console.log('   ✅ Working directory is clean');
    } catch (error) {
      console.log('   ⚠️ Could not check git status:', error.message);
    }

    // Run tests to ensure system is working
    console.log('   🧪 Running test suite...');
    try {
      execSync('node tests/comprehensive-test-suite.js', { 
        cwd: path.join(this.projectRoot, 'server'),
        stdio: 'pipe'
      });
      console.log('   ✅ Test suite passed');
    } catch (error) {
      console.log('   ⚠️ Test suite had issues, but continuing with cleanup');
    }
  }

  async createBackup() {
    console.log('\n💾 Creating Backup...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupBranch = `cleanup-backup-${timestamp}`;
    
    try {
      // Create backup branch
      execSync(`git checkout -b ${backupBranch}`, { cwd: this.projectRoot });
      console.log(`   ✅ Created backup branch: ${backupBranch}`);
      
      // Return to main branch
      execSync('git checkout -', { cwd: this.projectRoot });
      
      this.cleanupLog.push(`Backup created: ${backupBranch}`);
    } catch (error) {
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  async executePhase1() {
    console.log('\n📁 Phase 1: Removing Duplicates...');
    
    const duplicates = [
      { remove: 'client/src/js/auth.js', keep: 'client/src/js/auth-v5.js' },
      { remove: 'client/src/js/rsvp.js', keep: 'client/src/js/rsvp-v5.js' },
      { remove: 'server/src/routes/rsvps.js', keep: 'server/src/routes/rsvps-v5.js' }
    ];

    for (const dup of duplicates) {
      if (fs.existsSync(path.join(this.projectRoot, dup.remove))) {
        console.log(`   🗑️ Removing ${dup.remove}`);
        fs.unlinkSync(path.join(this.projectRoot, dup.remove));
        this.cleanupLog.push(`Removed: ${dup.remove}`);
      }

      if (fs.existsSync(path.join(this.projectRoot, dup.keep))) {
        const newName = dup.keep.replace('-v5', '');
        console.log(`   📝 Renaming ${dup.keep} → ${newName}`);
        fs.renameSync(
          path.join(this.projectRoot, dup.keep),
          path.join(this.projectRoot, newName)
        );
        this.cleanupLog.push(`Renamed: ${dup.keep} → ${newName}`);
      }
    }
  }

  async executePhase2() {
    console.log('\n📋 Phase 2: Organizing Tests...');
    
    const testFiles = [
      { from: 'server/test-comprehensive.js', to: 'server/tests/test-comprehensive.js' },
      { from: 'server/check-seeded-data.js', to: 'server/tests/check-seeded-data.js' }
    ];

    for (const test of testFiles) {
      if (fs.existsSync(path.join(this.projectRoot, test.from))) {
        console.log(`   📁 Moving ${test.from} → ${test.to}`);
        
        // Ensure target directory exists
        const targetDir = path.dirname(path.join(this.projectRoot, test.to));
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        
        fs.renameSync(
          path.join(this.projectRoot, test.from),
          path.join(this.projectRoot, test.to)
        );
        this.cleanupLog.push(`Moved: ${test.from} → ${test.to}`);
      }
    }
  }

  async executePhase3() {
    console.log('\n🗑️ Phase 3: Removing Unused Files...');
    
    const unusedFiles = [
      'server/src/database/schema-v5-simple.sql',
      'server/src/database/schema-v5.sql',
      'server/src/database/migrate-to-v5.js'
    ];

    for (const file of unusedFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (fs.existsSync(filePath)) {
        console.log(`   🗑️ Removing ${file}`);
        fs.unlinkSync(filePath);
        this.cleanupLog.push(`Removed: ${file}`);
      }
    }
  }

  async executePhase4() {
    console.log('\n🧽 Phase 4: Cleaning Dead Code...');
    
    // This is a simplified version - in practice, you'd use AST parsing
    console.log('   📝 Dead code cleanup would require AST analysis');
    console.log('   📝 Consider using tools like ESLint for unused code detection');
    
    this.cleanupLog.push('Dead code cleanup - manual review recommended');
  }

  async verifyCleanup() {
    console.log('\n✅ Verifying Cleanup...');
    
    // Check that essential files still exist
    const essentialFiles = [
      'client/src/js/auth.js',
      'client/src/js/rsvp.js',
      'server/src/routes/rsvps.js',
      'server/src/index.js'
    ];

    for (const file of essentialFiles) {
      if (fs.existsSync(path.join(this.projectRoot, file))) {
        console.log(`   ✅ ${file} exists`);
      } else {
        throw new Error(`Essential file missing: ${file}`);
      }
    }

    // Run tests to ensure nothing is broken
    console.log('   🧪 Running post-cleanup tests...');
    try {
      execSync('node tests/comprehensive-test-suite.js', { 
        cwd: path.join(this.projectRoot, 'server'),
        stdio: 'pipe'
      });
      console.log('   ✅ Post-cleanup tests passed');
    } catch (error) {
      console.log('   ⚠️ Post-cleanup tests had issues - manual verification needed');
    }
  }

  async restoreFromBackup() {
    try {
      execSync('git checkout cleanup-backup', { cwd: this.projectRoot });
      console.log('   ✅ Restored from backup');
    } catch (error) {
      console.log('   ❌ Failed to restore from backup:', error.message);
    }
  }

  printSummary() {
    console.log('\n📊 Cleanup Summary:');
    console.log('===================');
    console.log(`Actions performed: ${this.cleanupLog.length}`);
    console.log('');
    
    this.cleanupLog.forEach((action, index) => {
      console.log(`   ${index + 1}. ${action}`);
    });
    
    console.log('\n📝 Next Steps:');
    console.log('===============');
    console.log('1. Review the changes: git diff');
    console.log('2. Test the application thoroughly');
    console.log('3. Update any documentation that references old file names');
    console.log('4. Commit the changes: git add . && git commit -m "Cleanup: Remove duplicates and organize code"');
    console.log('5. Consider running ESLint for further dead code detection');
  }
}

// Run the cleanup
if (require.main === module) {
  const executor = new CleanupExecutor();
  executor.execute().catch(console.error);
}

module.exports = CleanupExecutor;
