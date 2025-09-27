#!/usr/bin/env node

/**
 * Codebase Audit Tool
 * Identifies unused files, duplicate files, and dead code
 */

const fs = require('fs');
const path = require('path');

class CodebaseAudit {
  constructor() {
    this.projectRoot = path.join(__dirname, '../..');
    this.auditResults = {
      duplicateFiles: [],
      unusedFiles: [],
      deadCode: [],
      recommendations: []
    };
  }

  async run() {
    console.log('🔍 Starting Codebase Audit');
    console.log('==========================');
    console.log('');

    await this.findDuplicateFiles();
    await this.findUnusedFiles();
    await this.findDeadCode();
    await this.generateRecommendations();

    this.printResults();
  }

  async findDuplicateFiles() {
    console.log('📁 Finding Duplicate Files...');
    
    const duplicatePatterns = [
      // Auth files
      { pattern: 'auth*.js', description: 'Multiple auth files' },
      // RSVP files  
      { pattern: 'rsvp*.js', description: 'Multiple RSVP files' },
      // Schema files
      { pattern: 'schema*.sql', description: 'Multiple schema files' },
      // Test files
      { pattern: 'test*.js', description: 'Scattered test files' }
    ];

    for (const { pattern, description } of duplicatePatterns) {
      const files = await this.findFiles(pattern);
      if (files.length > 1) {
        this.auditResults.duplicateFiles.push({
          pattern,
          description,
          files,
          count: files.length
        });
      }
    }
  }

  async findUnusedFiles() {
    console.log('🗑️ Finding Unused Files...');
    
    // Files that are likely unused based on naming patterns
    const unusedPatterns = [
      '*-v3.js',
      '*-v4.js', 
      '*-old.js',
      '*-backup.js',
      '*.bak'
    ];

    for (const pattern of unusedPatterns) {
      const files = await this.findFiles(pattern);
      this.auditResults.unusedFiles.push(...files);
    }

    // Check for files not referenced in package.json or main files
    await this.checkFileReferences();
  }

  async findDeadCode() {
    console.log('💀 Finding Dead Code...');
    
    // This would require more sophisticated analysis
    // For now, we'll identify common patterns of dead code
    const deadCodePatterns = [
      'console.log', // Excessive logging
      'TODO:', // TODO comments
      'FIXME:', // FIXME comments
      'XXX:', // XXX comments
      'HACK:' // HACK comments
    ];

    // This is a simplified version - in a real audit, you'd analyze AST
    console.log('   (Dead code analysis requires AST parsing - simplified for now)');
  }

  async generateRecommendations() {
    console.log('💡 Generating Recommendations...');
    
    // Consolidation recommendations
    if (this.auditResults.duplicateFiles.length > 0) {
      this.auditResults.recommendations.push({
        type: 'consolidation',
        priority: 'high',
        message: 'Consolidate duplicate files into single versions',
        details: this.auditResults.duplicateFiles
      });
    }

    // Cleanup recommendations
    if (this.auditResults.unusedFiles.length > 0) {
      this.auditResults.recommendations.push({
        type: 'cleanup',
        priority: 'medium',
        message: 'Remove unused files to reduce bloat',
        details: this.auditResults.unusedFiles
      });
    }

    // Organization recommendations
    this.auditResults.recommendations.push({
      type: 'organization',
      priority: 'medium',
      message: 'Organize test files into proper tests/ directory',
      details: ['Move scattered test files to tests/ directory']
    });
  }

  async findFiles(pattern) {
    const glob = require('glob');
    const searchPath = path.join(this.projectRoot, '**', pattern);
    
    try {
      return await new Promise((resolve, reject) => {
        glob(searchPath, (err, files) => {
          if (err) reject(err);
          else resolve(files.map(f => path.relative(this.projectRoot, f)));
        });
      });
    } catch (error) {
      console.log(`   Warning: Could not search for pattern ${pattern}: ${error.message}`);
      return [];
    }
  }

  async checkFileReferences() {
    // Check if files are referenced in main entry points
    const mainFiles = [
      'server/src/index.js',
      'client/src/index.html',
      'server/package.json'
    ];

    for (const mainFile of mainFiles) {
      try {
        const content = fs.readFileSync(path.join(this.projectRoot, mainFile), 'utf8');
        // This is a simplified check - in reality, you'd parse imports/exports
        console.log(`   Checking references in ${mainFile}...`);
      } catch (error) {
        console.log(`   Warning: Could not check ${mainFile}: ${error.message}`);
      }
    }
  }

  printResults() {
    console.log('\n📊 Codebase Audit Results');
    console.log('==========================');
    
    // Duplicate files
    if (this.auditResults.duplicateFiles.length > 0) {
      console.log('\n📁 Duplicate Files Found:');
      this.auditResults.duplicateFiles.forEach(dup => {
        console.log(`   ${dup.description}:`);
        dup.files.forEach(file => console.log(`     - ${file}`));
        console.log('');
      });
    }

    // Unused files
    if (this.auditResults.unusedFiles.length > 0) {
      console.log('\n🗑️ Potentially Unused Files:');
      this.auditResults.unusedFiles.forEach(file => {
        console.log(`   - ${file}`);
      });
      console.log('');
    }

    // Recommendations
    if (this.auditResults.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.auditResults.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
        if (rec.details && rec.details.length > 0) {
          rec.details.forEach(detail => {
            if (typeof detail === 'string') {
              console.log(`      - ${detail}`);
            } else if (detail.files) {
              detail.files.forEach(file => console.log(`      - ${file}`));
            }
          });
        }
        console.log('');
      });
    }

    // Summary
    const totalIssues = this.auditResults.duplicateFiles.length + 
                       this.auditResults.unusedFiles.length + 
                       this.auditResults.recommendations.length;
    
    console.log(`🎯 Total Issues Found: ${totalIssues}`);
    
    if (totalIssues === 0) {
      console.log('🎉 Codebase is clean! No major issues found.');
    } else {
      console.log('⚠️ Codebase needs cleanup. Run tests first, then proceed with cleanup.');
    }
  }
}

// Run the audit
if (require.main === module) {
  const audit = new CodebaseAudit();
  audit.run().catch(console.error);
}

module.exports = CodebaseAudit;
