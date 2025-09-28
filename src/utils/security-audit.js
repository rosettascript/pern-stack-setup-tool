#!/usr/bin/env node

/**
 * PERN Setup Tool - Security Audit
 * Comprehensive security analysis and vulnerability assessment
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

class SecurityAuditor {
  constructor() {
    this.projectRoot = path.join(__dirname, '..', '..');
    this.auditResults = {
      critical: [],
      high: [],
      medium: [],
      low: [],
      info: []
    };
    this.score = 0;
    this.maxScore = 100;
  }

  async performSecurityAudit() {
    console.log('🔍 Performing comprehensive security audit...');

    try {
      // Run various security checks
      await this.checkDependencies();
      await this.checkConfigurationFiles();
      await this.checkEnvironmentVariables();
      await this.checkFilePermissions();
      await this.checkCodeSecurity();
      await this.checkNetworkSecurity();
      await this.checkAuthenticationSecurity();

      // Calculate security score
      this.calculateSecurityScore();

      // Generate report
      await this.generateSecurityReport();

      console.log('✅ Security audit completed');
      console.log(`📊 Security Score: ${this.score}/${this.maxScore} (${Math.round((this.score/this.maxScore)*100)}%)`);

      if (this.auditResults.critical.length > 0 || this.auditResults.high.length > 0) {
        console.log('🚨 Critical or high-severity issues found!');
        console.log('   Run: npm run security:audit -- --detailed');
      }

    } catch (error) {
      console.error('❌ Security audit failed:', error.message);
      process.exit(1);
    }
  }

  async checkDependencies() {
    console.log('📦 Checking dependencies for vulnerabilities...');

    try {
      // Run npm audit
      const auditOutput = execSync('npm audit --json', { encoding: 'utf8' });
      const auditData = JSON.parse(auditOutput);

      if (auditData.vulnerabilities) {
        Object.entries(auditData.vulnerabilities).forEach(([pkg, vuln]) => {
          const severity = vuln.severity;
          const issue = {
            type: 'dependency-vulnerability',
            package: pkg,
            severity,
            title: vuln.title,
            recommendation: 'Update to latest secure version'
          };

          this.auditResults[severity].push(issue);
        });
      }

      // Check for outdated packages
      const outdatedOutput = execSync('npm outdated --json', { encoding: 'utf8' });
      const outdatedData = JSON.parse(outdatedOutput);

      Object.keys(outdatedData).forEach(pkg => {
        this.auditResults.info.push({
          type: 'outdated-package',
          package: pkg,
          severity: 'info',
          title: 'Package is outdated',
          recommendation: 'Update to latest version'
        });
      });

    } catch (error) {
      this.auditResults.medium.push({
        type: 'audit-failure',
        severity: 'medium',
        title: 'Could not run dependency audit',
        recommendation: 'Manually run npm audit and fix vulnerabilities'
      });
    }
  }

  async checkConfigurationFiles() {
    console.log('⚙️  Checking configuration files...');

    const configFiles = [
      '.env',
      '.env.local',
      '.env.production',
      'config.json',
      'config.js',
      'package.json'
    ];

    for (const file of configFiles) {
      const filePath = path.join(this.projectRoot, file);

      if (await fs.pathExists(filePath)) {
        // Check for sensitive data in config files
        const content = await fs.readFile(filePath, 'utf8');

        // Check for hardcoded secrets
        if (content.includes('password') || content.includes('secret') || content.includes('key')) {
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            if (line.includes('password') || line.includes('secret') || line.includes('key')) {
              // Check if it's properly using environment variables
              if (!line.includes('process.env') && !line.includes('=') && !line.startsWith('#')) {
                this.auditResults.high.push({
                  type: 'hardcoded-secret',
                  file,
                  line: index + 1,
                  severity: 'high',
                  title: 'Potential hardcoded secret detected',
                  recommendation: 'Use environment variables for sensitive data'
                });
              }
            }
          });
        }

        // Check file permissions
        try {
          const stats = await fs.stat(filePath);
          const permissions = (stats.mode & parseInt('777', 8)).toString(8);

          if (permissions !== '600' && file.startsWith('.env')) {
            this.auditResults.medium.push({
              type: 'insecure-file-permissions',
              file,
              severity: 'medium',
              title: 'Environment file has insecure permissions',
              recommendation: 'Set permissions to 600 (owner read/write only)'
            });
          }
        } catch (error) {
          // Ignore permission check errors
        }
      }
    }
  }

  async checkEnvironmentVariables() {
    console.log('🌍 Checking environment variables...');

    const envFiles = ['.env', '.env.local', '.env.production'];

    for (const envFile of envFiles) {
      const envPath = path.join(this.projectRoot, envFile);

      if (await fs.pathExists(envPath)) {
        const content = await fs.readFile(envPath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          if (line.trim() && !line.startsWith('#')) {
            const [key, value] = line.split('=');

            if (key && value) {
              // Check for weak passwords
              if (key.toLowerCase().includes('password') && value.length < 8) {
                this.auditResults.medium.push({
                  type: 'weak-password',
                  file: envFile,
                  line: index + 1,
                  severity: 'medium',
                  title: 'Weak password detected',
                  recommendation: 'Use strong passwords with 12+ characters'
                });
              }

              // Check for default values
              if (value === 'password' || value === '123456' || value === 'admin') {
                this.auditResults.high.push({
                  type: 'default-credentials',
                  file: envFile,
                  line: index + 1,
                  severity: 'high',
                  title: 'Default or weak credentials detected',
                  recommendation: 'Change to strong, unique credentials'
                });
              }
            }
          }
        });
      }
    }
  }

  async checkFilePermissions() {
    console.log('🔒 Checking file permissions...');

    const sensitiveFiles = [
      '.env',
      '.env.local',
      '.env.production',
      'config/database.json',
      'config/secrets.json'
    ];

    for (const file of sensitiveFiles) {
      const filePath = path.join(this.projectRoot, file);

      if (await fs.pathExists(filePath)) {
        try {
          const stats = await fs.stat(filePath);
          const permissions = (stats.mode & parseInt('777', 8)).toString(8);

          // Check if file is world-readable
          if (permissions.endsWith('4') || permissions.endsWith('5') || permissions.endsWith('6') || permissions.endsWith('7')) {
            this.auditResults.medium.push({
              type: 'world-readable-sensitive-file',
              file,
              severity: 'medium',
              title: 'Sensitive file is world-readable',
              recommendation: 'Restrict file permissions to owner only (600)'
            });
          }
        } catch (error) {
          // Ignore permission check errors
        }
      }
    }
  }

  async checkCodeSecurity() {
    console.log('💻 Checking code for security issues...');

    const sourceFiles = await this.findSourceFiles();

    for (const file of sourceFiles) {
      const content = await fs.readFile(file, 'utf8');

      // Check for dangerous patterns
      const dangerousPatterns = [
        { pattern: /eval\s*\(/g, severity: 'critical', title: 'Use of eval() function' },
        { pattern: /innerHTML\s*=/g, severity: 'high', title: 'Direct innerHTML assignment' },
        { pattern: /document\.write\s*\(/g, severity: 'high', title: 'Use of document.write()' },
        { pattern: /console\.log\s*\(/g, severity: 'low', title: 'Console.log in production code' },
        { pattern: /process\.env\./g, severity: 'info', title: 'Environment variable access' }
      ];

      dangerousPatterns.forEach(({ pattern, severity, title }) => {
        const matches = content.match(pattern);
        if (matches) {
          this.auditResults[severity].push({
            type: 'dangerous-code-pattern',
            file,
            severity,
            title,
            count: matches.length,
            recommendation: 'Review and sanitize code patterns'
          });
        }
      });

      // Check for SQL injection patterns
      if (content.includes('SELECT') || content.includes('INSERT') || content.includes('UPDATE')) {
        const sqlInjectionPatterns = [
          /\${\w+}/g,  // Template literal interpolation
          /\+.*\+/g,   // String concatenation
          /%s/g        // sprintf style
        ];

        sqlInjectionPatterns.forEach(pattern => {
          if (pattern.test(content)) {
            this.auditResults.high.push({
              type: 'potential-sql-injection',
              file,
              severity: 'high',
              title: 'Potential SQL injection vulnerability',
              recommendation: 'Use parameterized queries or ORM'
            });
          }
        });
      }
    }
  }

  async checkNetworkSecurity() {
    console.log('🌐 Checking network security...');

    // Check for HTTPS configuration
    const packageJson = await fs.readFile(path.join(this.projectRoot, 'package.json'), 'utf8');
    const pkg = JSON.parse(packageJson);

    if (!pkg.scripts || !pkg.scripts.start) {
      this.auditResults.medium.push({
        type: 'missing-start-script',
        severity: 'medium',
        title: 'Missing start script in package.json',
        recommendation: 'Add proper start script'
      });
    }

    // Check for security headers in main server file
    const serverFiles = await this.findServerFiles();
    let hasSecurityHeaders = false;

    for (const file of serverFiles) {
      const content = await fs.readFile(file, 'utf8');
      if (content.includes('helmet') || content.includes('security')) {
        hasSecurityHeaders = true;
        break;
      }
    }

    if (!hasSecurityHeaders) {
      this.auditResults.medium.push({
        type: 'missing-security-headers',
        severity: 'medium',
        title: 'Security headers not configured',
        recommendation: 'Add helmet.js or configure security headers'
      });
    }
  }

  async checkAuthenticationSecurity() {
    console.log('🔐 Checking authentication security...');

    const sourceFiles = await this.findSourceFiles();

    for (const file of sourceFiles) {
      const content = await fs.readFile(file, 'utf8');

      // Check for JWT usage
      if (content.includes('jsonwebtoken') || content.includes('jwt')) {
        // Check for proper JWT configuration
        if (!content.includes('expiresIn') && !content.includes('maxAge')) {
          this.auditResults.medium.push({
            type: 'jwt-no-expiration',
            file,
            severity: 'medium',
            title: 'JWT tokens may not have expiration',
            recommendation: 'Set proper token expiration times'
          });
        }
      }

      // Check for password hashing
      if (content.includes('password') && content.includes('hash')) {
        if (!content.includes('bcrypt') && !content.includes('argon2')) {
          this.auditResults.medium.push({
            type: 'weak-password-hashing',
            file,
            severity: 'medium',
            title: 'Weak password hashing detected',
            recommendation: 'Use bcrypt or argon2 for password hashing'
          });
        }
      }
    }
  }

  async findSourceFiles() {
    const sourceFiles = [];
    const dirs = ['src', 'server', 'client/src'];

    for (const dir of dirs) {
      const dirPath = path.join(this.projectRoot, dir);
      if (await fs.pathExists(dirPath)) {
        const files = await this.getFilesRecursively(dirPath);
        sourceFiles.push(...files.filter(file => file.endsWith('.js') || file.endsWith('.jsx')));
      }
    }

    return sourceFiles;
  }

  async findServerFiles() {
    const serverFiles = [];
    const dirs = ['src', 'server'];

    for (const dir of dirs) {
      const dirPath = path.join(this.projectRoot, dir);
      if (await fs.pathExists(dirPath)) {
        const files = await this.getFilesRecursively(dirPath);
        serverFiles.push(...files.filter(file => file.endsWith('.js')));
      }
    }

    return serverFiles;
  }

  async getFilesRecursively(dir) {
    const files = [];

    async function traverse(currentDir) {
      const items = await fs.readdir(currentDir);

      for (const item of items) {
        const itemPath = path.join(currentDir, item);
        const stat = await fs.stat(itemPath);

        if (stat.isDirectory()) {
          await traverse(itemPath);
        } else {
          files.push(itemPath);
        }
      }
    }

    await traverse(dir);
    return files;
  }

  calculateSecurityScore() {
    const weights = {
      critical: 10,
      high: 7,
      medium: 4,
      low: 2,
      info: 1
    };

    let penalty = 0;

    Object.entries(this.auditResults).forEach(([severity, issues]) => {
      penalty += issues.length * weights[severity];
    });

    // Cap penalty at max score
    penalty = Math.min(penalty, this.maxScore);

    this.score = this.maxScore - penalty;
  }

  async generateSecurityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      score: this.score,
      maxScore: this.maxScore,
      percentage: Math.round((this.score / this.maxScore) * 100),
      issues: this.auditResults,
      summary: {
        critical: this.auditResults.critical.length,
        high: this.auditResults.high.length,
        medium: this.auditResults.medium.length,
        low: this.auditResults.low.length,
        info: this.auditResults.info.length,
        total: Object.values(this.auditResults).reduce((sum, issues) => sum + issues.length, 0)
      }
    };

    const reportPath = path.join(this.projectRoot, 'security-audit-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log(`📄 Security report saved: ${reportPath}`);

    // Print summary
    console.log('\n📊 Security Audit Summary:');
    console.log(`   Critical Issues: ${report.summary.critical}`);
    console.log(`   High Issues: ${report.summary.high}`);
    console.log(`   Medium Issues: ${report.summary.medium}`);
    console.log(`   Low Issues: ${report.summary.low}`);
    console.log(`   Info Items: ${report.summary.info}`);

    return report;
  }
}

// Run security audit if called directly
if (require.main === module) {
  const auditor = new SecurityAuditor();
  auditor.performSecurityAudit().catch(console.error);
}

module.exports = SecurityAuditor;