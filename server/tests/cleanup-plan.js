#!/usr/bin/env node

/**
 * Codebase Cleanup Plan
 * Provides a step-by-step plan for cleaning up the codebase
 */

const fs = require('fs');
const path = require('path');

class CleanupPlan {
  constructor() {
    this.projectRoot = path.join(__dirname, '../..');
    this.cleanupSteps = [];
  }

  async generate() {
    console.log('🧹 Codebase Cleanup Plan');
    console.log('========================');
    console.log('');

    await this.analyzeCurrentState();
    this.generateCleanupSteps();
    this.printPlan();
  }

  async analyzeCurrentState() {
    console.log('🔍 Analyzing Current Codebase State...');
    
    // Check for duplicate files
    const duplicateFiles = await this.findDuplicateFiles();
    if (duplicateFiles.length > 0) {
      this.cleanupSteps.push({
        phase: 'Phase 1: Remove Duplicates',
        priority: 'high',
        steps: this.generateDuplicateRemovalSteps(duplicateFiles)
      });
    }

    // Check for scattered test files
    const scatteredTests = await this.findScatteredTests();
    if (scatteredTests.length > 0) {
      this.cleanupSteps.push({
        phase: 'Phase 2: Organize Tests',
        priority: 'high',
        steps: this.generateTestOrganizationSteps(scatteredTests)
      });
    }

    // Check for unused files
    const unusedFiles = await this.findUnusedFiles();
    if (unusedFiles.length > 0) {
      this.cleanupSteps.push({
        phase: 'Phase 3: Remove Unused Files',
        priority: 'medium',
        steps: this.generateUnusedFileRemovalSteps(unusedFiles)
      });
    }

    // Check for dead code
    this.cleanupSteps.push({
      phase: 'Phase 4: Clean Dead Code',
      priority: 'low',
      steps: this.generateDeadCodeCleanupSteps()
    });
  }

  async findDuplicateFiles() {
    const duplicates = [];
    
    // Auth files
    const authFiles = [
      'client/src/js/auth.js',
      'client/src/js/auth-v5.js'
    ];
    if (authFiles.every(f => this.fileExists(f))) {
      duplicates.push({
        type: 'auth',
        files: authFiles,
        keep: 'auth-v5.js',
        remove: 'auth.js'
      });
    }

    // RSVP files
    const rsvpFiles = [
      'client/src/js/rsvp.js',
      'client/src/js/rsvp-v5.js'
    ];
    if (rsvpFiles.every(f => this.fileExists(f))) {
      duplicates.push({
        type: 'rsvp',
        files: rsvpFiles,
        keep: 'rsvp-v5.js',
        remove: 'rsvp.js'
      });
    }

    // Server RSVP routes
    const serverRsvpFiles = [
      'server/src/routes/rsvps.js',
      'server/src/routes/rsvps-v5.js'
    ];
    if (serverRsvpFiles.every(f => this.fileExists(f))) {
      duplicates.push({
        type: 'server-rsvp',
        files: serverRsvpFiles,
        keep: 'rsvps-v5.js',
        remove: 'rsvps.js'
      });
    }

    return duplicates;
  }

  async findScatteredTests() {
    const testFiles = [
      'server/test-comprehensive.js',
      'server/check-seeded-data.js'
    ];
    
    return testFiles.filter(f => this.fileExists(f));
  }

  async findUnusedFiles() {
    const unusedFiles = [
      'server/src/database/schema-v5-simple.sql',
      'server/src/database/schema-v5.sql',
      'server/src/database/migrate-to-v5.js'
    ];
    
    return unusedFiles.filter(f => this.fileExists(f));
  }

  fileExists(filePath) {
    return fs.existsSync(path.join(this.projectRoot, filePath));
  }

  generateDuplicateRemovalSteps(duplicates) {
    const steps = [];
    
    duplicates.forEach(dup => {
      steps.push({
        action: 'remove',
        file: dup.remove,
        reason: `Duplicate of ${dup.keep}`,
        backup: true
      });
      
      steps.push({
        action: 'rename',
        from: dup.keep,
        to: dup.keep.replace('-v5', ''),
        reason: 'Remove version suffix from active file'
      });
    });

    return steps;
  }

  generateTestOrganizationSteps(scatteredTests) {
    const steps = [];
    
    scatteredTests.forEach(test => {
      const newPath = test.replace('server/', 'server/tests/');
      steps.push({
        action: 'move',
        from: test,
        to: newPath,
        reason: 'Organize test files in tests/ directory'
      });
    });

    return steps;
  }

  generateUnusedFileRemovalSteps(unusedFiles) {
    return unusedFiles.map(file => ({
      action: 'remove',
      file: file,
      reason: 'Unused file - no references found',
      backup: true
    }));
  }

  generateDeadCodeCleanupSteps() {
    return [
      {
        action: 'cleanup',
        type: 'console-logs',
        description: 'Remove excessive console.log statements',
        files: ['server/src/**/*.js', 'client/src/js/**/*.js']
      },
      {
        action: 'cleanup',
        type: 'comments',
        description: 'Clean up TODO/FIXME comments',
        files: ['**/*.js', '**/*.html', '**/*.css']
      },
      {
        action: 'cleanup',
        type: 'unused-imports',
        description: 'Remove unused imports and requires',
        files: ['server/src/**/*.js']
      }
    ];
  }

  generateCleanupSteps() {
    // This method is called after analyzeCurrentState
    // The steps are already generated in the analysis phase
  }

  printPlan() {
    console.log('\n📋 Cleanup Plan:');
    console.log('================');
    
    this.cleanupSteps.forEach((phase, index) => {
      console.log(`\n${index + 1}. ${phase.phase} [${phase.priority.toUpperCase()}]`);
      console.log('─'.repeat(50));
      
      phase.steps.forEach((step, stepIndex) => {
        console.log(`   ${stepIndex + 1}. ${this.formatStep(step)}`);
      });
    });

    console.log('\n🛡️ Safety Measures:');
    console.log('===================');
    console.log('1. Run comprehensive test suite before cleanup');
    console.log('2. Create backup branch: git checkout -b cleanup-backup');
    console.log('3. Test after each phase');
    console.log('4. Commit changes incrementally');
    console.log('5. Update documentation after cleanup');

    console.log('\n📊 Summary:');
    console.log('============');
    const totalSteps = this.cleanupSteps.reduce((sum, phase) => sum + phase.steps.length, 0);
    console.log(`Total cleanup steps: ${totalSteps}`);
    console.log(`Phases: ${this.cleanupSteps.length}`);
    console.log(`High priority: ${this.cleanupSteps.filter(p => p.priority === 'high').length}`);
  }

  formatStep(step) {
    switch (step.action) {
      case 'remove':
        return `Remove ${step.file} (${step.reason})`;
      case 'move':
        return `Move ${step.from} → ${step.to} (${step.reason})`;
      case 'rename':
        return `Rename ${step.from} → ${step.to} (${step.reason})`;
      case 'cleanup':
        return `Clean up ${step.type} in ${step.files.join(', ')} (${step.description})`;
      default:
        return `${step.action}: ${step.description || step.reason}`;
    }
  }
}

// Run the cleanup plan generator
if (require.main === module) {
  const plan = new CleanupPlan();
  plan.generate().catch(console.error);
}

module.exports = CleanupPlan;
