#!/usr/bin/env node

/**
 * Security Scan Test
 * Performs comprehensive security scanning of the PERN setup
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

class SecurityScanner {
  constructor() {
    this.results = {
      vulnerabilities: [],
      warnings: [],
      passed: [],
      score: 0
    };
  }

  async scan(context = {}) {
    console.log('🔍 Starting comprehensive security scan...');

    // 1. File system security
    await this.scanFileSystem();

    // 2. Configuration security
    await this.scanConfiguration();

    // 3. Dependency security
    await this.scanDependencies();

    // 4. Code security
    await this.scanCodeSecurity();

    // 5. Environment security
    await this.scanEnvironment();

    // Calculate security score
    this.calculateSecurityScore();

    return this.results;
  }

  async scanFileSystem() {
    console.log('📁 Scanning file system security...');

    const sensitiveFiles = [
      '.env',
      '.env.local',
      '.env.production',
      'config/secrets.json',
      'secrets/',
      'private/'
    ];

    for (const file of sensitiveFiles) {
      const filePath = path.join(process.cwd(), file);

      if (await fs.pathExists(filePath)) {
        const stats = await fs.stat(filePath);
        const permissions = stats.mode.toString(8);

        // Check if file is world-readable
        if (permissions.endsWith('4') || permissions.endsWith('5') || permissions.endsWith('6') || permissions.endsWith('7')) {
          this.results.vulnerabilities.push({
            type: 'file_permissions',
            severity: 'high',
            file: file,
            message: `File ${file} has overly permissive permissions: ${permissions}`
          });
        } else {
          this.results.passed.push(`File permissions secure: ${file}`);
        }
      }
    }
  }

  async scanConfiguration() {
    console.log('⚙️  Scanning configuration security...');

    // Check for hardcoded secrets
    const configFiles = [
      'package.json',
      'src/**/*.js',
      'tests/**/*.js'
    ];

    const secretPatterns = [
      /password\s*[:=]\s*['"][^'"]*['"]/gi,
      /secret\s*[:=]\s*['"][^'"]*['"]/gi,
      /token\s*[:=]\s*['"][^'"]*['"]/gi,
      /api[_-]?key\s*[:=]\s*['"][^'"]*['"]/gi
    ];

    // Simple check - in real implementation, would scan all files
    const packageJson = path.join(process.cwd(), 'package.json');
    if (await fs.pathExists(packageJson)) {
      const content = await fs.readFile(packageJson, 'utf8');

      secretPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          this.results.warnings.push({
            type: 'hardcoded_secrets',
            severity: 'medium',
            file: 'package.json',
            message: 'Potential hardcoded secrets found in package.json'
          });
        }
      });
    }
  }

  async scanDependencies() {
    console.log('📦 Scanning dependency security...');

    // Check for known vulnerable packages
    const packageJson = path.join(process.cwd(), 'package.json');
    if (await fs.pathExists(packageJson)) {
      const pkg = JSON.parse(await fs.readFile(packageJson, 'utf8'));

      const riskyPackages = ['express', 'lodash', 'moment']; // Simplified check

      Object.keys(pkg.dependencies || {}).forEach(dep => {
        if (riskyPackages.includes(dep)) {
          this.results.warnings.push({
            type: 'vulnerable_dependency',
            severity: 'low',
            package: dep,
            message: `Package ${dep} may have known vulnerabilities`
          });
        }
      });
    }
  }

  async scanCodeSecurity() {
    console.log('💻 Scanning code security...');

    // Check for common security issues
    const sourceFiles = await this.getSourceFiles();

    for (const file of sourceFiles) {
      const content = await fs.readFile(file, 'utf8');

      // Check for eval usage
      if (content.includes('eval(')) {
        this.results.vulnerabilities.push({
          type: 'code_injection',
          severity: 'high',
          file: file,
          message: 'Use of eval() detected - potential code injection vulnerability'
        });
      }

      // Check for innerHTML usage
      if (content.includes('innerHTML')) {
        this.results.warnings.push({
          type: 'xss_vulnerability',
          severity: 'medium',
          file: file,
          message: 'Use of innerHTML detected - potential XSS vulnerability'
        });
      }

      // Check for console.log in production code
      if (content.includes('console.log') && !file.includes('test')) {
        this.results.warnings.push({
          type: 'information_disclosure',
          severity: 'low',
          file: file,
          message: 'console.log found in production code'
        });
      }
    }
  }

  async scanEnvironment() {
    console.log('🌍 Scanning environment security...');

    // Check environment variables
    const envVars = process.env;

    // Check for sensitive data in environment
    const sensitiveEnvVars = ['PASSWORD', 'SECRET', 'KEY', 'TOKEN'];

    Object.keys(envVars).forEach(key => {
      if (sensitiveEnvVars.some(sensitive => key.toUpperCase().includes(sensitive))) {
        if (envVars[key] && envVars[key].length < 20) {
          this.results.warnings.push({
            type: 'weak_secret',
            severity: 'medium',
            variable: key,
            message: `Environment variable ${key} appears to contain a weak secret`
          });
        }
      }
    });

    // Check Node.js version
    const nodeVersion = process.version;
    if (!nodeVersion.startsWith('v18') && !nodeVersion.startsWith('v20')) {
      this.results.warnings.push({
        type: 'outdated_nodejs',
        severity: 'low',
        version: nodeVersion,
        message: `Node.js version ${nodeVersion} may be outdated or unsupported`
      });
    }
  }

  async getSourceFiles() {
    const srcDir = path.join(process.cwd(), 'src');
    const files = [];

    if (await fs.pathExists(srcDir)) {
      const items = await fs.readdir(srcDir, { recursive: true });
      for (const item of items) {
        if (item.endsWith('.js')) {
          files.push(path.join(srcDir, item));
        }
      }
    }

    return files;
  }

  calculateSecurityScore() {
    const vulnerabilities = this.results.vulnerabilities.length;
    const warnings = this.results.warnings.length;
    const passed = this.results.passed.length;

    // Scoring algorithm: vulnerabilities are critical, warnings reduce score
    const baseScore = 100;
    const vulnerabilityPenalty = vulnerabilities * 20; // -20 points per vulnerability
    const warningPenalty = warnings * 5; // -5 points per warning

    this.results.score = Math.max(0, baseScore - vulnerabilityPenalty - warningPenalty);

    // Determine security level
    if (this.results.score >= 90) {
      this.results.level = 'excellent';
    } else if (this.results.score >= 80) {
      this.results.level = 'good';
    } else if (this.results.score >= 70) {
      this.results.level = 'fair';
    } else if (this.results.score >= 60) {
      this.results.level = 'poor';
    } else {
      this.results.level = 'critical';
    }
  }

  printReport() {
    console.log('\n🔒 Security Scan Results:');
    console.log('=' .repeat(40));
    console.log(`Security Score: ${this.results.score}/100 (${this.results.level.toUpperCase()})`);

    if (this.results.vulnerabilities.length > 0) {
      console.log(`\n🚨 Vulnerabilities (${this.results.vulnerabilities.length}):`);
      this.results.vulnerabilities.forEach(vuln => {
        console.log(`  🔴 ${vuln.severity.toUpperCase()}: ${vuln.message}`);
      });
    }

    if (this.results.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${this.results.warnings.length}):`);
      this.results.warnings.forEach(warning => {
        console.log(`  🟡 ${warning.severity.toUpperCase()}: ${warning.message}`);
      });
    }

    if (this.results.passed.length > 0) {
      console.log(`\n✅ Passed Checks (${this.results.passed.length}):`);
      this.results.passed.slice(0, 5).forEach(passed => {
        console.log(`  🟢 ${passed}`);
      });
      if (this.results.passed.length > 5) {
        console.log(`  ... and ${this.results.passed.length - 5} more`);
      }
    }
  }
}

// Run the scan if called directly
if (require.main === module) {
  const scanner = new SecurityScanner();

  scanner.scan().then((results) => {
    scanner.printReport();

    // Exit with appropriate code
    const passed = results.score >= 70; // 70+ is acceptable
    process.exit(passed ? 0 : 1);
  }).catch((error) => {
    console.error('Security scan failed:', error);
    process.exit(1);
  });
}

module.exports = SecurityScanner;