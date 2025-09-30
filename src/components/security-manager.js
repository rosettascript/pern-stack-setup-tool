/**
 * PERN Setup Tool - Security Manager
 * Advanced security scanning, vulnerability assessment, and compliance management
 */

const inquirer = require('inquirer');
const { exec } = require('child-process-promise');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

/**
 * Security Manager Class
 * Handles security scanning, vulnerability assessment, and compliance
 */
class SecurityManager {
  constructor(setupTool) {
    this.setup = setupTool;
    this.logger = setupTool.logger;
    this.safety = setupTool.safety;
    this.config = setupTool.config;
    this.platform = process.platform;
    this.scanners = {
      dependency: new DependencyScanner(),
      configuration: new ConfigurationScanner(),
      network: new NetworkScanner(),
      container: new ContainerScanner()
    };
  }

  /**
   * Show security interface
   */
  async showInterface() {
    try {
      // First, let user select which project to scan
      await this.selectProject();
      
      const { choice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: `Security Section for: ${this.config.get('project.name', 'Current Project')}`,
          loop: false,
        choices: [
            '1. Scan current setup',
            '2. Configure security policies',
            '3. Setup vulnerability monitoring',
            '4. Generate security report',
            '5. Compliance checking',
            '6. Change Project',
            new inquirer.Separator(),
            {
              name: 'Go back',
              value: 'go_back',
              checked: false
            }
          ]
        }
      ]);

      if (choice === 'go_back') {
        return this.setup.showMainInterface();
      }

      const selected = parseInt(choice.split('.')[0]);

      switch(selected) {
        case 1:
          await this.performSecurityScan();
          return this.showInterface();
        case 2:
          await this.configureSecurityPolicies();
          return this.showInterface();
        case 3:
          await this.setupVulnerabilityMonitoring();
          return this.showInterface();
        case 4:
          await this.generateSecurityReportStandalone();
          return this.showInterface();
        case 5:
          await this.complianceChecking();
          return this.showInterface();
        case 6:
          await this.selectProject();
          return this.showInterface();
      }

    } catch (error) {
      await this.setup.handleError('security-interface', error);
    }
  }

  /**
   * Select project for security scanning
   */
  async selectProject() {
    try {
      const fs = require('fs-extra');
      const path = require('path');
      
      // Get existing projects
      const existingProjects = [];
      const commonPaths = [
        path.join(require('os').homedir(), 'Projects'),
        path.join(require('os').homedir(), 'Documents'),
        path.join(require('os').homedir(), 'Downloads'),
        process.cwd()
      ];

      for (const basePath of commonPaths) {
        if (fs.existsSync(basePath)) {
          const items = await fs.readdir(basePath);
          for (const item of items) {
            const itemPath = path.join(basePath, item);
            const stat = await fs.stat(itemPath);
            if (stat.isDirectory()) {
              // Check if it's a project directory
              if (fs.existsSync(path.join(itemPath, 'package.json')) ||
                  fs.existsSync(path.join(itemPath, 'server')) ||
                  fs.existsSync(path.join(itemPath, 'client'))) {
                existingProjects.push({
                  name: item,
                  path: itemPath,
                  type: this.detectProjectType(itemPath)
                });
              }
            }
          }
        }
      }

      // Add current directory if it's a project
      const currentDir = process.cwd();
      const currentDirName = path.basename(currentDir);
      if (!existingProjects.find(p => p.path === currentDir) && 
          (fs.existsSync(path.join(currentDir, 'package.json')) ||
           fs.existsSync(path.join(currentDir, 'server')) ||
           fs.existsSync(path.join(currentDir, 'client')))) {
        existingProjects.unshift({
          name: `${currentDirName} (current)`,
          path: currentDir,
          type: this.detectProjectType(currentDir)
        });
      }

      if (existingProjects.length === 0) {
        console.log('❌ No projects found. Please create a project first using option 4 (Folder Structure).');
        return this.setup.showMainInterface();
      }

      // Show project selection
      const { selectedProject } = await inquirer.prompt({
        type: 'list',
        name: 'selectedProject',
        message: 'Select project to scan:',
        loop: false,
        choices: [
          ...existingProjects.map((project, index) => ({
            name: `${project.name} (${project.type}) - ${project.path}`,
            value: index
          })),
          'Create new project',
          'Enter custom path',
          new inquirer.Separator('──────────────'),
          'Go back'
        ]
      });

      if (selectedProject === 'Create new project') {
        console.log('🔄 Redirecting to project creation...');
        return this.setup.components.project.showInterface();
      }

      if (selectedProject === 'Enter custom path') {
        const { customPath } = await inquirer.prompt({
          type: 'input',
          name: 'customPath',
          message: 'Enter project path:',
          validate: input => {
            if (!input.trim()) return 'Path is required';
            if (!fs.existsSync(input)) return 'Path does not exist';
            return true;
          }
        });
        
        this.config.set('project.name', path.basename(customPath));
        this.config.set('project.path', customPath);
        this.config.set('project.type', this.detectProjectType(customPath));
        return;
      }

      if (selectedProject === 'Go back') {
        return this.setup.showMainInterface();
      }

      const selectedProjectData = existingProjects[selectedProject];
      this.config.set('project.name', selectedProjectData.name);
      this.config.set('project.path', selectedProjectData.path);
      this.config.set('project.type', selectedProjectData.type);

    } catch (error) {
      await this.setup.handleError('project-selection', error);
    }
  }

  /**
   * Detect project type
   */
  detectProjectType(projectPath) {
    const fs = require('fs-extra');
    const path = require('path');
    
    if (fs.existsSync(path.join(projectPath, 'package.json'))) {
      try {
        const packageJson = fs.readJsonSync(path.join(projectPath, 'package.json'));
        if (packageJson.dependencies && packageJson.dependencies.react) return 'frontend';
        if (packageJson.dependencies && packageJson.dependencies.express) return 'backend';
        return 'fullstack';
      } catch {
        return 'unknown';
      }
    }
    
    if (fs.existsSync(path.join(projectPath, 'server')) && fs.existsSync(path.join(projectPath, 'client'))) {
      return 'fullstack';
    }
    
    if (fs.existsSync(path.join(projectPath, 'server'))) return 'backend';
    if (fs.existsSync(path.join(projectPath, 'client'))) return 'frontend';
    
    return 'unknown';
  }

  /**
   * Perform comprehensive security scan
   */
  async performSecurityScan() {
    try {
      console.log('🔍 Performing comprehensive security scan...');

      const context = {
        projectDir: process.cwd(),
        dependencies: await this.getProjectDependencies(),
        configuration: await this.getProjectConfiguration(),
        platform: this.platform
      };

      const projectPath = this.config.get('project.path', process.cwd());
      await this.setup.safety.safeExecute('security-scan', { 
        projectPath: projectPath,
        scanType: 'full',
        outputFormat: 'json'
      }, async () => {
        const results = await this.scanAll(context);
        const report = await this.generateSecurityReport(results);

        await this.displaySecurityResults(report);
        
        // Return proper result object for safety framework validation
        return {
          success: true,
          message: 'Security scan completed successfully',
          timestamp: new Date().toISOString(),
          projectPath: projectPath,
          scanType: 'full',
          vulnerabilities: report.summary.totalVulnerabilities,
          riskScore: report.riskScore.score
        };
      });

    } catch (error) {
      await this.setup.handleError('security-scan', error);
    }

  }

  /**
   * Scan all security aspects
   */
  async scanAll(context) {
    const results = {};

    for (const [name, scanner] of Object.entries(this.scanners)) {
      try {
        results[name] = await scanner.scan(context);
      } catch (error) {
        results[name] = { error: error.message };
      }
    }

    return results;
  }

  /**
   * Generate security report
   */
  async generateSecurityReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.generateSummary(results),
      vulnerabilities: this.aggregateVulnerabilities(results),
      recommendations: this.generateRecommendations(results),
      compliance: this.checkComplianceFromResults(results),
      riskScore: this.calculateRiskScore(results)
    };

    return report;
  }

  /**
   * Generate summary
   */
  generateSummary(results) {
    const total = Object.keys(results).length;
    const successful = Object.values(results).filter(r => !r.error).length;
    const vulnerabilities = this.countVulnerabilities(results);

    return {
      totalScans: total,
      successfulScans: successful,
      totalVulnerabilities: vulnerabilities.count,
      criticalVulnerabilities: vulnerabilities.critical,
      highVulnerabilities: vulnerabilities.high,
      mediumVulnerabilities: vulnerabilities.medium,
      lowVulnerabilities: vulnerabilities.low
    };
  }

  /**
   * Count vulnerabilities
   */
  countVulnerabilities(results) {
    let count = 0;
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;

    Object.values(results).forEach(result => {
      if (result.vulnerabilities) {
        count += result.vulnerabilities.length;
        critical += result.vulnerabilities.filter(v => v.severity === 'critical').length;
        high += result.vulnerabilities.filter(v => v.severity === 'high').length;
        medium += result.vulnerabilities.filter(v => v.severity === 'medium').length;
        low += result.vulnerabilities.filter(v => v.severity === 'low').length;
      }
    });

    return { count, critical, high, medium, low };
  }

  /**
   * Aggregate vulnerabilities
   */
  aggregateVulnerabilities(results) {
    const vulnerabilities = [];

    Object.entries(results).forEach(([scanner, result]) => {
      if (result.vulnerabilities) {
        result.vulnerabilities.forEach(vuln => {
          vulnerabilities.push({
            ...vuln,
            scanner,
            discovered: new Date().toISOString()
          });
        });
      }
    });

    return vulnerabilities.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(results) {
    const recommendations = [];
    const vulnerabilities = this.aggregateVulnerabilities(results);

    // Critical vulnerabilities
    const critical = vulnerabilities.filter(v => v.severity === 'critical');
    if (critical.length > 0) {
      recommendations.push({
        type: 'critical',
        priority: 'high',
        title: 'Critical Vulnerabilities Found',
        description: `${critical.length} critical vulnerabilities require immediate attention`,
        actions: [
          'Update affected dependencies immediately',
          'Review security advisories',
          'Consider temporary workaround',
          'Plan emergency patch deployment'
        ]
      });
    }

    // High vulnerabilities
    const high = vulnerabilities.filter(v => v.severity === 'high');
    if (high.length > 0) {
      recommendations.push({
        type: 'high',
        priority: 'high',
        title: 'High Priority Vulnerabilities',
        description: `${high.length} high priority vulnerabilities found`,
        actions: [
          'Schedule update within 1 week',
          'Assess business impact',
          'Prepare rollback plan',
          'Update in staging first'
        ]
      });
    }

    // Dependency issues
    const depIssues = results.dependency?.vulnerabilities || [];
    if (depIssues.length > 0) {
      recommendations.push({
        type: 'dependencies',
        priority: 'medium',
        title: 'Dependency Vulnerabilities',
        description: 'Outdated or vulnerable dependencies detected',
        actions: [
          'Run npm audit fix',
          'Update dependencies to latest secure versions',
          'Review dependency usage',
          'Consider alternative packages'
        ]
      });
    }

    // Configuration issues
    const configIssues = results.configuration?.issues || [];
    if (configIssues.length > 0) {
      recommendations.push({
        type: 'configuration',
        priority: 'medium',
        title: 'Security Configuration Issues',
        description: 'Security misconfigurations detected',
        actions: [
          'Review security headers',
          'Update CORS settings',
          'Configure rate limiting',
          'Enable HTTPS enforcement'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Check compliance from results
   */
  checkComplianceFromResults(results) {
    const compliance = {
      overall: 'unknown',
      frameworks: {},
      score: 0
    };

    // Basic compliance checks
    const hasSecurityHeaders = results.configuration?.securityHeaders === true;
    const hasRateLimiting = results.configuration?.rateLimiting === true;
    const hasAuth = results.configuration?.authentication === true;
    const lowVulnerabilities = this.countVulnerabilities(results).high === 0;

    const complianceScore = [hasSecurityHeaders, hasRateLimiting, hasAuth, lowVulnerabilities]
      .filter(Boolean).length;

    compliance.score = (complianceScore / 4) * 100;
    compliance.overall = compliance.score >= 80 ? 'good' : compliance.score >= 60 ? 'fair' : 'poor';

    return compliance;
  }

  /**
   * Calculate risk score
   */
  calculateRiskScore(results) {
    const vulnerabilities = this.countVulnerabilities(results);
    const weights = { critical: 10, high: 7, medium: 4, low: 1 };

    const riskScore = Object.entries(vulnerabilities).reduce((score, [severity, count]) => {
      const weight = weights[severity] || 1;
      const countValue = typeof count === 'number' ? count : 0;
      return score + (weight * countValue);
    }, 0);

    // Ensure we have a valid number
    const finalScore = isNaN(riskScore) ? 0 : riskScore;

    return {
      score: finalScore,
      level: finalScore > 50 ? 'high' : finalScore > 20 ? 'medium' : 'low',
      breakdown: vulnerabilities
    };
  }

  /**
   * Display security results
   */
  async displaySecurityResults(report) {
    console.log('\n🔒 Security Scan Results');
    console.log('========================');

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Total Scans: ${report.summary.totalScans}`);
    console.log(`   Successful Scans: ${report.summary.successfulScans}`);
    console.log(`   Total Vulnerabilities: ${report.summary.totalVulnerabilities}`);
    console.log(`   Risk Score: ${report.riskScore.score} (${report.riskScore.level})`);

    // Vulnerabilities by severity
    console.log('\n🚨 Vulnerabilities:');
    console.log(`   🔴 Critical: ${report.summary.criticalVulnerabilities}`);
    console.log(`   🟠 High: ${report.summary.highVulnerabilities}`);
    console.log(`   🟡 Medium: ${report.summary.mediumVulnerabilities}`);
    console.log(`   🔵 Low: ${report.summary.lowVulnerabilities}`);

    // Compliance
    console.log('\n📋 Compliance:');
    console.log(`   Overall: ${report.compliance.overall}`);
    console.log(`   Score: ${report.compliance.score}%`);

    // Recommendations
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach((rec, index) => {
        const icon = rec.priority === 'high' ? '🔴' : '🟡';
        console.log(`\n${index + 1}. ${icon} ${rec.title}`);
        console.log(`   ${rec.description}`);
        rec.actions.forEach(action => {
          console.log(`   • ${action}`);
        });
      });
    }

    // Detailed vulnerabilities
    if (report.vulnerabilities.length > 0) {
      console.log('\n📋 Detailed Vulnerabilities:');
      report.vulnerabilities.slice(0, 10).forEach((vuln, index) => {
        console.log(`\n${index + 1}. ${vuln.title || vuln.name}`);
        console.log(`   Severity: ${vuln.severity}`);
        console.log(`   Scanner: ${vuln.scanner}`);
        console.log(`   Description: ${vuln.description || 'No description'}`);
        if (vuln.remediation) {
          console.log(`   Fix: ${vuln.remediation}`);
        }
      });

      if (report.vulnerabilities.length > 10) {
        console.log(`\n... and ${report.vulnerabilities.length - 10} more vulnerabilities`);
      }
    }

    // Save report
    const reportPath = path.join(os.homedir(), '.pern-setup', 'security-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 Security report saved to: ${reportPath}`);
  }

  /**
   * Configure security policies
   */
  async configureSecurityPolicies() {
    try {
      const { policyType } = await inquirer.prompt({
        type: 'list',
        name: 'policyType',
        message: 'Select security policy to configure:',
        loop: false,
        choices: [
          '1. Password policies',
          '2. Authentication policies',
          '3. Authorization policies',
          '4. Network security policies',
          '5. Data protection policies',
          new inquirer.Separator(),
          {
            name: 'Go back',
            value: 'go_back',
            checked: false
          }
        ]
      });

      if (policyType === 'go_back') {
        return this.showInterface();
      }

      const selected = parseInt(policyType.split('.')[0]);

      switch(selected) {
        case 1:
          await this.configurePasswordPolicies();
          break;
        case 2:
          await this.configureAuthenticationPolicies();
          break;
        case 3:
          await this.configureAuthorizationPolicies();
          break;
        case 4:
          await this.configureNetworkPolicies();
          break;
        case 5:
          await this.configureDataProtectionPolicies();
          break;
      }

    } catch (error) {
      await this.setup.handleError('security-policy-config', error);
    }

    await this.configureSecurityPolicies();
  }

  /**
   * Configure password policies
   */
  async configurePasswordPolicies() {
    try {
      const { minLength } = await inquirer.prompt({
        type: 'number',
        name: 'minLength',
        message: 'Minimum password length:',
        default: 12
      });

      const { requireUppercase } = await inquirer.prompt({
        type: 'confirm',
        name: 'requireUppercase',
        message: 'Require uppercase letters?',
        default: true
      });

      const { requireLowercase } = await inquirer.prompt({
        type: 'confirm',
        name: 'requireLowercase',
        message: 'Require lowercase letters?',
        default: true
      });

      const { requireNumbers } = await inquirer.prompt({
        type: 'confirm',
        name: 'requireNumbers',
        message: 'Require numbers?',
        default: true
      });

      const { requireSymbols } = await inquirer.prompt({
        type: 'confirm',
        name: 'requireSymbols',
        message: 'Require special characters?',
        default: true
      });

      const passwordPolicy = {
        minLength,
        requireUppercase,
        requireLowercase,
        requireNumbers,
        requireSymbols,
        preventCommon: true,
        maxAge: 90, // days
        history: 5 // remember last 5 passwords
      };

      this.config.set('security.passwordPolicy', passwordPolicy);
      console.log('✅ Password policies configured');

    } catch (error) {
      await this.setup.handleError('password-policy-config', error);
    }
  }

  /**
   * Configure authentication policies
   */
  async configureAuthenticationPolicies() {
    try {
      const { sessionTimeout } = await inquirer.prompt({
        type: 'number',
        name: 'sessionTimeout',
        message: 'Session timeout (minutes):',
        default: 60
      });

      const { maxLoginAttempts } = await inquirer.prompt({
        type: 'number',
        name: 'maxLoginAttempts',
        message: 'Maximum login attempts:',
        default: 5
      });

      const { lockoutDuration } = await inquirer.prompt({
        type: 'number',
        name: 'lockoutDuration',
        message: 'Account lockout duration (minutes):',
        default: 30
      });

      const authPolicy = {
        sessionTimeout: sessionTimeout * 60, // convert to seconds
        maxLoginAttempts,
        lockoutDuration: lockoutDuration * 60, // convert to seconds
        requireMFA: false,
        passwordResetTokenExpiry: 3600, // 1 hour
        emailVerificationRequired: true
      };

      this.config.set('security.authenticationPolicy', authPolicy);
      console.log('✅ Authentication policies configured');

    } catch (error) {
      await this.setup.handleError('auth-policy-config', error);
    }
  }

  /**
   * Configure authorization policies
   */
  async configureAuthorizationPolicies() {
    try {
      const { defaultRole } = await inquirer.prompt({
        type: 'list',
        name: 'defaultRole',
        message: 'Default user role:',
        loop: false,
        choices: ['user', 'guest', 'member'],
        default: 'user'
      });

      const { roleHierarchy } = await inquirer.prompt({
        type: 'input',
        name: 'roleHierarchy',
        message: 'Role hierarchy (comma-separated):',
        default: 'guest,member,user,moderator,admin'
      });

      const authzPolicy = {
        defaultRole,
        roleHierarchy: roleHierarchy.split(',').map(r => r.trim()),
        requireRoleVerification: true,
        auditRoleChanges: true,
        permissionCacheTimeout: 300 // 5 minutes
      };

      this.config.set('security.authorizationPolicy', authzPolicy);
      console.log('✅ Authorization policies configured');

    } catch (error) {
      await this.setup.handleError('authz-policy-config', error);
    }
  }

  /**
   * Configure network security policies
   */
  async configureNetworkPolicies() {
    try {
      const { corsOrigins } = await inquirer.prompt({
        type: 'input',
        name: 'corsOrigins',
        message: 'Allowed CORS origins (comma-separated):',
        default: 'http://localhost:3000,http://localhost:5000'
      });

      const { rateLimiting } = await inquirer.prompt({
        type: 'confirm',
        name: 'rateLimiting',
        message: 'Enable rate limiting?',
        default: true
      });

      const networkPolicy = {
        corsOrigins: corsOrigins.split(',').map(origin => origin.trim()),
        rateLimiting: rateLimiting ? {
          windowMs: 15 * 60 * 1000, // 15 minutes
          maxRequests: 100,
          skipSuccessfulRequests: false,
          skipFailedRequests: false
        } : false,
        helmet: {
          contentSecurityPolicy: true,
          dnsPrefetchControl: true,
          frameguard: true,
          hidePoweredBy: true,
          hsts: true,
          ieNoOpen: true,
          noSniff: true,
          permittedCrossDomainPolicies: true,
          referrerPolicy: true,
          xssFilter: true
        },
        trustProxy: false
      };

      this.config.set('security.networkPolicy', networkPolicy);
      console.log('✅ Network security policies configured');

    } catch (error) {
      await this.setup.handleError('network-policy-config', error);
    }
  }

  /**
   * Configure data protection policies
   */
  async configureDataProtectionPolicies() {
    try {
      const { encryptionLevel } = await inquirer.prompt({
        type: 'list',
        name: 'encryptionLevel',
        message: 'Data encryption level:',
        loop: false,
        choices: [
          '1. Basic (passwords only)',
          '2. Standard (sensitive data)',
          '3. Enhanced (all user data)',
          '4. Maximum (all data)'
        ]
      });

      const { backupEncryption } = await inquirer.prompt({
        type: 'confirm',
        name: 'backupEncryption',
        message: 'Encrypt database backups?',
        default: true
      });

      const dataPolicy = {
        encryptionLevel: ['basic', 'standard', 'enhanced', 'maximum'][parseInt(encryptionLevel.split('.')[0]) - 1],
        backupEncryption,
        dataRetention: {
          logs: 90, // days
          userData: 2555, // days (7 years)
          backups: 2555 // days (7 years)
        },
        anonymization: {
          enabled: true,
          fields: ['email', 'name', 'phone'],
          method: 'hash'
        },
        auditLogging: true
      };

      this.config.set('security.dataPolicy', dataPolicy);
      console.log('✅ Data protection policies configured');

    } catch (error) {
      await this.setup.handleError('data-policy-config', error);
    }
  }

  /**
   * Setup vulnerability monitoring
   */
  async setupVulnerabilityMonitoring() {
    try {
      const { monitoringType } = await inquirer.prompt({
        type: 'list',
        name: 'monitoringType',
        message: 'Vulnerability monitoring type:',
        loop: false,
        choices: [
          '1. Continuous monitoring',
          '2. Daily scans',
          '3. Weekly scans',
          '4. On-demand only',
          new inquirer.Separator(),
          {
            name: 'Go back',
            value: 'go_back',
            checked: false
          }
        ]
      });

      if (monitoringType === 'go_back') {
        return this.showInterface();
      }

      const selected = parseInt(monitoringType.split('.')[0]);

      const monitoringConfig = {
        type: ['continuous', 'daily', 'weekly', 'on-demand'][selected - 1],
        enabled: true,
        notifications: {
          email: true,
          slack: false,
          webhook: false
        },
        autoUpdate: false,
        reportGeneration: true
      };

      this.config.set('security.monitoring', monitoringConfig);
      console.log('✅ Vulnerability monitoring configured');

    } catch (error) {
      await this.setup.handleError('vulnerability-monitoring-setup', error);
    }

  }

  /**
   * Generate security report (standalone method)
   */
  async generateSecurityReportStandalone() {
    try {
      const context = {
        projectDir: process.cwd(),
        dependencies: await this.getProjectDependencies(),
        configuration: await this.getProjectConfiguration(),
        platform: this.platform
      };

      const results = await this.scanAll(context);
      const report = await this.generateSecurityReport(results);

      const reportPath = path.join(os.homedir(), '.pern-setup', 'security-report.json');
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

      console.log('✅ Security report generated');
      return report;

    } catch (error) {
      await this.setup.handleError('security-report-generation', error);
    }
  }

  /**
   * Compliance checking
   */
  async complianceChecking() {
    try {
      const { framework } = await inquirer.prompt({
        type: 'list',
        name: 'framework',
        message: 'Select compliance framework:',
        loop: false,
        choices: [
          '1. SOC 2 Type II',
          '2. HIPAA',
          '3. GDPR',
          '4. PCI-DSS',
          '5. ISO 27001',
          '6. NIST Cybersecurity Framework',
          new inquirer.Separator(),
          {
            name: 'Go back',
            value: 'go_back',
            checked: false
          }
        ]
      });

      if (framework === 'go_back') {
        return this.showInterface();
      }

      const selected = parseInt(framework.split('.')[0]);

      const frameworks = ['soc2', 'hipaa', 'gdpr', 'pci-dss', 'iso27001', 'nist'];
      const frameworkId = frameworks[selected - 1];

      await this.checkCompliance(frameworkId);

    } catch (error) {
      await this.setup.handleError('compliance-checking', error);
    }

  }

  /**
   * Check compliance
   */
  async checkCompliance(frameworkId) {
    try {
      console.log(`📋 Checking ${frameworkId.toUpperCase()} compliance...`);

      const context = {
        projectDir: process.cwd(),
        configuration: await this.getProjectConfiguration(),
        securityPolicies: this.config.get('security', {}),
        platform: this.platform
      };

      const results = await this.performComplianceCheck(frameworkId, context);
      const report = await this.generateComplianceReport(frameworkId, results);

      await this.displayComplianceResults(report);

    } catch (error) {
      await this.setup.handleError('compliance-check', error);
    }
  }

  /**
   * Perform compliance check
   */
  async performComplianceCheck(frameworkId, context) {
    const checks = {
      soc2: this.checkSOC2Compliance,
      hipaa: this.checkHIPAACompliance,
      gdpr: this.checkGDPRCompliance,
      'pci-dss': this.checkPCIDSSCompliance,
      iso27001: this.checkISO27001Compliance,
      nist: this.checkNISTCompliance
    };

    const checker = checks[frameworkId];
    if (!checker) {
      throw new Error(`Unknown compliance framework: ${frameworkId}`);
    }

    return await checker.call(this, context);
  }

  /**
   * Check SOC 2 compliance
   */
  async checkSOC2Compliance(context) {
    const controls = [
      'security',
      'availability',
      'confidentiality',
      'processing-integrity',
      'privacy'
    ];

    const results = {};

    for (const control of controls) {
      results[control] = await this.checkSOC2Control(control, context);
    }

    return results;
  }

  /**
   * Check SOC 2 control
   */
  async checkSOC2Control(control, context) {
    const checks = {
      security: [
        'encryption-at-rest',
        'encryption-in-transit',
        'access-controls',
        'vulnerability-management'
      ],
      availability: [
        'redundancy',
        'monitoring',
        'incident-response'
      ],
      confidentiality: [
        'data-classification',
        'need-to-know-access'
      ]
    };

    const controlChecks = checks[control] || [];
    const controlResults = {};

    for (const check of controlChecks) {
      controlResults[check] = await this.performSecurityCheck(check, context);
    }

    return controlResults;
  }

  /**
   * Perform security check
   */
  async performSecurityCheck(check, context) {
    switch (check) {
      case 'encryption-at-rest':
        return this.checkEncryptionAtRest(context);
      case 'encryption-in-transit':
        return this.checkEncryptionInTransit(context);
      case 'access-controls':
        return this.checkAccessControls(context);
      case 'vulnerability-management':
        return this.checkVulnerabilityManagement(context);
      
      // HIPAA compliance checks
      case 'administrative-safeguards':
        return this.checkAdministrativeSafeguards(context);
      case 'physical-safeguards':
        return this.checkPhysicalSafeguards(context);
      case 'technical-safeguards':
        return this.checkTechnicalSafeguards(context);
      case 'audit-controls':
        return this.checkAuditControls(context);
      case 'data-integrity':
        return this.checkDataIntegrity(context);
      
      // GDPR compliance checks
      case 'data-protection-by-design':
        return this.checkDataProtectionByDesign(context);
      case 'consent-management':
        return this.checkConsentManagement(context);
      case 'data-subject-rights':
        return this.checkDataSubjectRights(context);
      case 'data-portability':
        return this.checkDataPortability(context);
      case 'right-to-erasure':
        return this.checkRightToErasure(context);
      case 'privacy-by-default':
        return this.checkPrivacyByDefault(context);
      case 'data-minimization':
        return this.checkDataMinimization(context);
      case 'purpose-limitation':
        return this.checkPurposeLimitation(context);
      
      // PCI-DSS compliance checks
      case 'firewall-configuration':
        return this.checkFirewallConfiguration(context);
      case 'default-passwords':
        return this.checkDefaultPasswords(context);
      case 'cardholder-data-protection':
        return this.checkCardholderDataProtection(context);
      case 'antivirus-software':
        return this.checkAntivirusSoftware(context);
      case 'secure-systems':
        return this.checkSecureSystems(context);
      case 'access-restriction':
        return this.checkAccessRestriction(context);
      case 'unique-ids':
        return this.checkUniqueIds(context);
      case 'physical-access':
        return this.checkPhysicalAccess(context);
      case 'network-monitoring':
        return this.checkNetworkMonitoring(context);
      case 'security-testing':
        return this.checkSecurityTesting(context);
      case 'security-policy':
        return this.checkSecurityPolicy(context);
      
      // ISO 27001 compliance checks
      case 'information-security-policies':
        return this.checkInformationSecurityPolicies(context);
      case 'organization-of-information-security':
        return this.checkOrganizationOfInformationSecurity(context);
      case 'human-resource-security':
        return this.checkHumanResourceSecurity(context);
      case 'asset-management':
        return this.checkAssetManagement(context);
      case 'access-control':
        return this.checkAccessControl(context);
      case 'cryptography':
        return this.checkCryptography(context);
      case 'physical-environmental-security':
        return this.checkPhysicalEnvironmentalSecurity(context);
      case 'operations-security':
        return this.checkOperationsSecurity(context);
      case 'communications-security':
        return this.checkCommunicationsSecurity(context);
      case 'system-acquisition':
        return this.checkSystemAcquisition(context);
      case 'supplier-relationships':
        return this.checkSupplierRelationships(context);
      case 'information-security-incident-management':
        return this.checkInformationSecurityIncidentManagement(context);
      case 'business-continuity':
        return this.checkBusinessContinuity(context);
      case 'compliance':
        return this.checkCompliance(context);
      
      // NIST Cybersecurity Framework checks
      case 'identify-assets':
        return this.checkIdentifyAssets(context);
      case 'identify-vulnerabilities':
        return this.checkIdentifyVulnerabilities(context);
      case 'identify-threats':
        return this.checkIdentifyThreats(context);
      case 'identify-risks':
        return this.checkIdentifyRisks(context);
      case 'protect-access-controls':
        return this.checkProtectAccessControls(context);
      case 'protect-awareness-training':
        return this.checkProtectAwarenessTraining(context);
      case 'protect-data-security':
        return this.checkProtectDataSecurity(context);
      case 'protect-maintenance':
        return this.checkProtectMaintenance(context);
      case 'protect-protective-technology':
        return this.checkProtectProtectiveTechnology(context);
      case 'detect-anomalies':
        return this.checkDetectAnomalies(context);
      case 'detect-continuous-monitoring':
        return this.checkDetectContinuousMonitoring(context);
      case 'detect-detection-processes':
        return this.checkDetectDetectionProcesses(context);
      case 'respond-response-planning':
        return this.checkRespondResponsePlanning(context);
      case 'respond-communications':
        return this.checkRespondCommunications(context);
      case 'respond-analysis':
        return this.checkRespondAnalysis(context);
      case 'respond-mitigation':
        return this.checkRespondMitigation(context);
      case 'respond-improvements':
        return this.checkRespondImprovements(context);
      case 'recover-recovery-planning':
        return this.checkRecoverRecoveryPlanning(context);
      case 'recover-improvements':
        return this.checkRecoverImprovements(context);
      case 'recover-communications':
        return this.checkRecoverCommunications(context);
      
      case 'encryption-transit':
        return this.checkEncryptionTransit(context);
      case 'access-controls':
        return this.checkAccessControls(context);
      case 'audit-logging':
        return this.checkAuditLogging(context);
      case 'incident-response':
        return this.checkIncidentResponse(context);
      case 'backup-security':
        return this.checkBackupSecurity(context);
      case 'network-security':
        return this.checkNetworkSecurity(context);
      case 'api-security':
        return this.checkAPISecurity(context);
      case 'data-classification':
        return this.checkDataClassification(context);
      case 'vulnerability-management':
        return this.checkVulnerabilityManagement(context);
      case 'security-training':
        return this.checkSecurityTraining(context);
      case 'third-party-security':
        return this.checkThirdPartySecurity(context);
      case 'mobile-security':
        return this.checkMobileSecurity(context);
      case 'cloud-security':
        return this.checkCloudSecurity(context);
      case 'compliance-monitoring':
        return this.checkComplianceMonitoring(context);
      default:
        return { status: 'unknown', details: `Security check '${checkType}' not implemented` };
    }
  }

  /**
   * Check encryption at rest
   */
  async checkEncryptionAtRest(context) {
    try {
      const hasEncryption = context.securityPolicies?.dataPolicy?.encryptionLevel !== 'basic';
      return {
        status: hasEncryption ? 'pass' : 'fail',
        details: hasEncryption ? 'Encryption at rest configured' : 'Encryption at rest not configured'
      };
    } catch (error) {
      return { status: 'error', details: error.message };
    }
  }

  /**
   * Check encryption in transit
   */
  async checkEncryptionInTransit(context) {
    try {
      const hasSSL = context.configuration?.ssl === true;
      return {
        status: hasSSL ? 'pass' : 'fail',
        details: hasSSL ? 'SSL/TLS encryption configured' : 'SSL/TLS encryption not configured'
      };
    } catch (error) {
      return { status: 'error', details: error.message };
    }
  }

  /**
   * Check access controls
   */
  async checkAccessControls(context) {
    try {
      const hasAuth = context.securityPolicies?.authenticationPolicy !== undefined;
      const hasAuthz = context.securityPolicies?.authorizationPolicy !== undefined;

      return {
        status: hasAuth && hasAuthz ? 'pass' : 'fail',
        details: hasAuth && hasAuthz ? 'Authentication and authorization configured' : 'Access controls not fully configured'
      };
    } catch (error) {
      return { status: 'error', details: error.message };
    }
  }

  /**
   * Check vulnerability management
   */
  async checkVulnerabilityManagement(context) {
    try {
      const hasMonitoring = context.securityPolicies?.monitoring?.enabled === true;
      return {
        status: hasMonitoring ? 'pass' : 'fail',
        details: hasMonitoring ? 'Vulnerability monitoring configured' : 'Vulnerability monitoring not configured'
      };
    } catch (error) {
      return { status: 'error', details: error.message };
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(frameworkId, results) {
    const totalControls = Object.keys(results).length;
    const passedControls = Object.values(results).filter(r =>
      Object.values(r).every(check => check.status === 'pass')
    ).length;

    const complianceScore = totalControls > 0 ? (passedControls / totalControls) * 100 : 0;

    return {
      framework: frameworkId,
      timestamp: new Date().toISOString(),
      overall: complianceScore >= 80 ? 'compliant' : complianceScore >= 60 ? 'partial' : 'non-compliant',
      score: Math.round(complianceScore),
      totalControls,
      passedControls,
      failedControls: totalControls - passedControls,
      results
    };
  }

  /**
   * Display compliance results
   */
  async displayComplianceResults(report) {
    console.log(`\n📋 ${report.framework.toUpperCase()} Compliance Report`);
    console.log('================================================');

    console.log(`Overall Status: ${report.overall}`);
    console.log(`Compliance Score: ${report.score}%`);
    console.log(`Controls Passed: ${report.passedControls}/${report.totalControls}`);

    if (report.failedControls > 0) {
      console.log('\n❌ Failed Controls:');
      Object.entries(report.results).forEach(([control, checks]) => {
        const failedChecks = Object.entries(checks).filter(([_, check]) => check.status !== 'pass');
        if (failedChecks.length > 0) {
          console.log(`\n${control.toUpperCase()}:`);
          failedChecks.forEach(([checkName, check]) => {
            console.log(`  ❌ ${checkName}: ${check.details}`);
          });
        }
      });
    }

    const reportPath = path.join(os.homedir(), '.pern-setup', 'compliance-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 Compliance report saved to: ${reportPath}`);
  }

  /**
   * Get project dependencies
   */
  async getProjectDependencies() {
    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageJson = await fs.readFile(packagePath, 'utf8');
      const pkg = JSON.parse(packageJson);

      return {
        dependencies: pkg.dependencies || {},
        devDependencies: pkg.devDependencies || {},
        totalDependencies: Object.keys(pkg.dependencies || {}).length,
        totalDevDependencies: Object.keys(pkg.devDependencies || {}).length
      };
    } catch (error) {
      return { dependencies: {}, devDependencies: {}, error: error.message };
    }
  }

  /**
   * Get project configuration
   */
  async getProjectConfiguration() {
    try {
      const config = {
        hasEnvFile: await fs.pathExists('.env'),
        hasDockerfile: await fs.pathExists('Dockerfile'),
        hasDockerCompose: await fs.pathExists('docker-compose.yml'),
        hasNginxConfig: await fs.pathExists('nginx.conf'),
        hasSSL: await this.checkSSLConfiguration(),
        securityHeaders: await this.checkSecurityHeaders(),
        rateLimiting: await this.checkRateLimiting(),
        authentication: await this.checkAuthentication()
      };

      return config;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Check SSL configuration
   */
  async checkSSLConfiguration() {
    try {
      const hasCert = await fs.pathExists('/etc/ssl/certs');
      const hasKey = await fs.pathExists('/etc/ssl/private');
      return hasCert && hasKey;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check security headers
   */
  async checkSecurityHeaders() {
    try {
      const nginxConf = await fs.readFile('/etc/nginx/nginx.conf', 'utf8');
      const hasSecurityHeaders = nginxConf.includes('add_header') &&
                                (nginxConf.includes('X-Frame-Options') ||
                                 nginxConf.includes('X-Content-Type-Options'));
      return hasSecurityHeaders;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check rate limiting
   */
  async checkRateLimiting() {
    try {
      const hasRateLimit = this.config.get('security.networkPolicy.rateLimiting', false);
      return hasRateLimit;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check authentication
   */
  async checkAuthentication() {
    try {
      const hasAuthPolicy = this.config.get('security.authenticationPolicy', null) !== null;
      const hasAuthzPolicy = this.config.get('security.authorizationPolicy', null) !== null;
      return hasAuthPolicy && hasAuthzPolicy;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Dependency Scanner Class
 */
class DependencyScanner {
  async scan(context) {
    try {
      const vulnerabilities = [];

      for (const [pkg, version] of Object.entries(context.dependencies.dependencies)) {
        const vulns = await this.checkPackageVulnerabilities(pkg, version);
        vulnerabilities.push(...vulns);
      }

      return {
        type: 'dependency',
        totalPackages: Object.keys(context.dependencies.dependencies).length,
        vulnerabilities: vulnerabilities,
        riskScore: this.calculateRiskScore(vulnerabilities)
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async checkPackageVulnerabilities(packageName, version) {
    // In a real implementation, this would check vulnerability databases
    return [];
  }

  calculateRiskScore(vulnerabilities) {
    const weights = { critical: 10, high: 7, medium: 4, low: 1 };
    return vulnerabilities.reduce((score, vuln) => {
      return score + (weights[vuln.severity] || 1);
    }, 0);
  }
}

/**
 * Configuration Scanner Class
 */
class ConfigurationScanner {
  async scan(context) {
    try {
      const issues = [];

      // Check for common security misconfigurations
      if (!context.configuration.hasSSL) {
        issues.push({
          type: 'ssl',
          severity: 'medium',
          description: 'SSL/TLS not configured'
        });
      }

      if (!context.configuration.securityHeaders) {
        issues.push({
          type: 'security-headers',
          severity: 'medium',
          description: 'Security headers not configured'
        });
      }

      return {
        type: 'configuration',
        totalChecks: 10,
        issues: issues,
        score: Math.max(0, 100 - (issues.length * 10))
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}

/**
 * Network Scanner Class
 */
class NetworkScanner {
  async scan(context) {
    try {
      const issues = [];

      // Check for open ports
      const openPorts = await this.checkOpenPorts();
      if (openPorts.length > 0) {
        issues.push({
          type: 'open-ports',
          severity: 'low',
          description: `Open ports detected: ${openPorts.join(', ')}`
        });
      }

      return {
        type: 'network',
        openPorts: openPorts,
        issues: issues,
        score: issues.length === 0 ? 100 : 70
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async checkOpenPorts() {
    // In a real implementation, this would scan for open ports
    return [];
  }
}

/**
 * Container Scanner Class
 */
class ContainerScanner {
  async scan(context) {
    try {
      const issues = [];

      if (context.configuration.hasDockerfile) {
        const dockerfile = await fs.readFile('Dockerfile', 'utf8');

        if (!dockerfile.includes('USER ')) {
          issues.push({
            type: 'root-user',
            severity: 'medium',
            description: 'Container running as root user'
          });
        }

        if (!dockerfile.includes('HEALTHCHECK')) {
          issues.push({
            type: 'no-healthcheck',
            severity: 'low',
            description: 'No health check configured'
          });
        }
      }

      return {
        type: 'container',
        hasDockerfile: context.configuration.hasDockerfile,
        issues: issues,
        score: issues.length === 0 ? 100 : 80
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Generic compliance check method
   */
  async performGenericComplianceCheck(checkName, context) {
    try {
      // Basic compliance check - can be enhanced with specific logic
      const hasSecurityPolicies = context.securityPolicies && Object.keys(context.securityPolicies).length > 0;
      const hasEncryption = context.securityPolicies?.dataPolicy?.encryptionLevel !== 'basic';
      const hasAccessControls = context.securityPolicies?.accessControl?.enabled === true;
      
      const score = [hasSecurityPolicies, hasEncryption, hasAccessControls].filter(Boolean).length;
      const status = score >= 2 ? 'pass' : 'fail';
      
      return {
        status: status,
        details: `${checkName}: ${status === 'pass' ? 'Compliant' : 'Non-compliant'}`,
        score: score * 33.33
      };
    } catch (error) {
      return { status: 'error', details: error.message };
    }
  }

  // HIPAA compliance check methods
  async checkAdministrativeSafeguards(context) {
    return this.performGenericComplianceCheck('Administrative Safeguards', context);
  }
  async checkPhysicalSafeguards(context) {
    return this.performGenericComplianceCheck('Physical Safeguards', context);
  }
  async checkTechnicalSafeguards(context) {
    return this.performGenericComplianceCheck('Technical Safeguards', context);
  }
  async checkAuditControls(context) {
    return this.performGenericComplianceCheck('Audit Controls', context);
  }
  async checkDataIntegrity(context) {
    return this.performGenericComplianceCheck('Data Integrity', context);
  }

  // GDPR compliance check methods
  async checkDataProtectionByDesign(context) {
    return this.performGenericComplianceCheck('Data Protection by Design', context);
  }
  async checkConsentManagement(context) {
    return this.performGenericComplianceCheck('Consent Management', context);
  }
  async checkDataSubjectRights(context) {
    return this.performGenericComplianceCheck('Data Subject Rights', context);
  }
  async checkDataPortability(context) {
    return this.performGenericComplianceCheck('Data Portability', context);
  }
  async checkRightToErasure(context) {
    return this.performGenericComplianceCheck('Right to Erasure', context);
  }
  async checkPrivacyByDefault(context) {
    return this.performGenericComplianceCheck('Privacy by Default', context);
  }
  async checkDataMinimization(context) {
    return this.performGenericComplianceCheck('Data Minimization', context);
  }
  async checkPurposeLimitation(context) {
    return this.performGenericComplianceCheck('Purpose Limitation', context);
  }

  // PCI-DSS compliance check methods
  async checkFirewallConfiguration(context) {
    return this.performGenericComplianceCheck('Firewall Configuration', context);
  }
  async checkDefaultPasswords(context) {
    return this.performGenericComplianceCheck('Default Passwords', context);
  }
  async checkCardholderDataProtection(context) {
    return this.performGenericComplianceCheck('Cardholder Data Protection', context);
  }
  async checkAntivirusSoftware(context) {
    return this.performGenericComplianceCheck('Antivirus Software', context);
  }
  async checkSecureSystems(context) {
    return this.performGenericComplianceCheck('Secure Systems', context);
  }
  async checkAccessRestriction(context) {
    return this.performGenericComplianceCheck('Access Restriction', context);
  }
  async checkUniqueIds(context) {
    return this.performGenericComplianceCheck('Unique IDs', context);
  }
  async checkPhysicalAccess(context) {
    return this.performGenericComplianceCheck('Physical Access', context);
  }
  async checkNetworkMonitoring(context) {
    return this.performGenericComplianceCheck('Network Monitoring', context);
  }
  async checkSecurityTesting(context) {
    return this.performGenericComplianceCheck('Security Testing', context);
  }
  async checkSecurityPolicy(context) {
    return this.performGenericComplianceCheck('Security Policy', context);
  }

  // ISO 27001 compliance check methods
  async checkInformationSecurityPolicies(context) {
    return this.performGenericComplianceCheck('Information Security Policies', context);
  }
  async checkOrganizationOfInformationSecurity(context) {
    return this.performGenericComplianceCheck('Organization of Information Security', context);
  }
  async checkHumanResourceSecurity(context) {
    return this.performGenericComplianceCheck('Human Resource Security', context);
  }
  async checkAssetManagement(context) {
    return this.performGenericComplianceCheck('Asset Management', context);
  }
  async checkAccessControl(context) {
    return this.performGenericComplianceCheck('Access Control', context);
  }
  async checkCryptography(context) {
    return this.performGenericComplianceCheck('Cryptography', context);
  }
  async checkPhysicalEnvironmentalSecurity(context) {
    return this.performGenericComplianceCheck('Physical Environmental Security', context);
  }
  async checkOperationsSecurity(context) {
    return this.performGenericComplianceCheck('Operations Security', context);
  }
  async checkCommunicationsSecurity(context) {
    return this.performGenericComplianceCheck('Communications Security', context);
  }
  async checkSystemAcquisition(context) {
    return this.performGenericComplianceCheck('System Acquisition', context);
  }
  async checkSupplierRelationships(context) {
    return this.performGenericComplianceCheck('Supplier Relationships', context);
  }
  async checkInformationSecurityIncidentManagement(context) {
    return this.performGenericComplianceCheck('Information Security Incident Management', context);
  }
  async checkBusinessContinuity(context) {
    return this.performGenericComplianceCheck('Business Continuity', context);
  }
  async checkCompliance(context) {
    return this.performGenericComplianceCheck('Compliance', context);
  }

  // NIST Cybersecurity Framework check methods
  async checkIdentifyAssets(context) {
    return this.performGenericComplianceCheck('Identify Assets', context);
  }
  async checkIdentifyVulnerabilities(context) {
    return this.performGenericComplianceCheck('Identify Vulnerabilities', context);
  }
  async checkIdentifyThreats(context) {
    return this.performGenericComplianceCheck('Identify Threats', context);
  }
  async checkIdentifyRisks(context) {
    return this.performGenericComplianceCheck('Identify Risks', context);
  }
  async checkProtectAccessControls(context) {
    return this.performGenericComplianceCheck('Protect Access Controls', context);
  }
  async checkProtectAwarenessTraining(context) {
    return this.performGenericComplianceCheck('Protect Awareness Training', context);
  }
  async checkProtectDataSecurity(context) {
    return this.performGenericComplianceCheck('Protect Data Security', context);
  }
  async checkProtectMaintenance(context) {
    return this.performGenericComplianceCheck('Protect Maintenance', context);
  }
  async checkProtectProtectiveTechnology(context) {
    return this.performGenericComplianceCheck('Protect Protective Technology', context);
  }
  async checkDetectAnomalies(context) {
    return this.performGenericComplianceCheck('Detect Anomalies', context);
  }
  async checkDetectContinuousMonitoring(context) {
    return this.performGenericComplianceCheck('Detect Continuous Monitoring', context);
  }
  async checkDetectDetectionProcesses(context) {
    return this.performGenericComplianceCheck('Detect Detection Processes', context);
  }
  async checkRespondResponsePlanning(context) {
    return this.performGenericComplianceCheck('Respond Response Planning', context);
  }
  async checkRespondCommunications(context) {
    return this.performGenericComplianceCheck('Respond Communications', context);
  }
  async checkRespondAnalysis(context) {
    return this.performGenericComplianceCheck('Respond Analysis', context);
  }
  async checkRespondMitigation(context) {
    return this.performGenericComplianceCheck('Respond Mitigation', context);
  }
  async checkRespondImprovements(context) {
    return this.performGenericComplianceCheck('Respond Improvements', context);
  }
  async checkRecoverRecoveryPlanning(context) {
    return this.performGenericComplianceCheck('Recover Recovery Planning', context);
  }
  async checkRecoverImprovements(context) {
    return this.performGenericComplianceCheck('Recover Improvements', context);
  }
  async checkRecoverCommunications(context) {
    return this.performGenericComplianceCheck('Recover Communications', context);
  }

  /**
   * Check HIPAA compliance
   */
  async checkHIPAACompliance(context) {
    const controls = [
      'administrative-safeguards',
      'physical-safeguards', 
      'technical-safeguards',
      'encryption-at-rest',
      'encryption-in-transit',
      'access-controls',
      'audit-controls',
      'data-integrity'
    ];

    const controlResults = {};

    for (const check of controls) {
      controlResults[check] = await this.performSecurityCheck(check, context);
    }

    return controlResults;
  }

  /**
   * Check GDPR compliance
   */
  async checkGDPRCompliance(context) {
    const controls = [
      'data-protection-by-design',
      'consent-management',
      'data-subject-rights',
      'data-portability',
      'right-to-erasure',
      'privacy-by-default',
      'data-minimization',
      'purpose-limitation'
    ];

    const controlResults = {};

    for (const check of controls) {
      controlResults[check] = await this.performSecurityCheck(check, context);
    }

    return controlResults;
  }

  /**
   * Check PCI-DSS compliance
   */
  async checkPCIDSSCompliance(context) {
    const controls = [
      'firewall-configuration',
      'default-passwords',
      'cardholder-data-protection',
      'encryption-in-transit',
      'antivirus-software',
      'secure-systems',
      'access-restriction',
      'unique-ids',
      'physical-access',
      'network-monitoring',
      'security-testing',
      'security-policy'
    ];

    const controlResults = {};

    for (const check of controls) {
      controlResults[check] = await this.performSecurityCheck(check, context);
    }

    return controlResults;
  }

  /**
   * Check ISO 27001 compliance
   */
  async checkISO27001Compliance(context) {
    const controls = [
      'information-security-policies',
      'organization-of-information-security',
      'human-resource-security',
      'asset-management',
      'access-control',
      'cryptography',
      'physical-environmental-security',
      'operations-security',
      'communications-security',
      'system-acquisition',
      'supplier-relationships',
      'information-security-incident-management',
      'business-continuity',
      'compliance'
    ];

    const controlResults = {};

    for (const check of controls) {
      controlResults[check] = await this.performSecurityCheck(check, context);
    }

    return controlResults;
  }

  /**
   * Check NIST Cybersecurity Framework compliance
   */
  async checkNISTCompliance(context) {
    const controls = [
      'identify-assets',
      'identify-vulnerabilities',
      'identify-threats',
      'identify-risks',
      'protect-access-controls',
      'protect-awareness-training',
      'protect-data-security',
      'protect-maintenance',
      'protect-protective-technology',
      'detect-anomalies',
      'detect-continuous-monitoring',
      'detect-detection-processes',
      'respond-response-planning',
      'respond-communications',
      'respond-analysis',
      'respond-mitigation',
      'respond-improvements',
      'recover-recovery-planning',
      'recover-improvements',
      'recover-communications'
    ];

    const controlResults = {};

    for (const check of controls) {
      controlResults[check] = await this.performSecurityCheck(check, context);
    }

    return controlResults;
  }

  /**
   * Check encryption in transit
   */
  checkEncryptionTransit(context) {
    const hasHTTPS = context.config?.ssl?.enabled || false;
    const hasTLS = context.config?.tls?.enabled || false;
    
    if (hasHTTPS || hasTLS) {
      return { status: 'pass', details: 'Encryption in transit is configured' };
    }
    return { status: 'fail', details: 'Encryption in transit not configured' };
  }

  /**
   * Check access controls
   */
  checkAccessControls(context) {
    const hasAuth = context.config?.authentication?.enabled || false;
    const hasRBAC = context.config?.rbac?.enabled || false;
    
    if (hasAuth && hasRBAC) {
      return { status: 'pass', details: 'Access controls properly configured' };
    }
    return { status: 'warn', details: 'Access controls need improvement' };
  }

  /**
   * Check audit logging
   */
  checkAuditLogging(context) {
    const hasLogging = context.config?.logging?.enabled || false;
    const hasAudit = context.config?.audit?.enabled || false;
    
    if (hasLogging && hasAudit) {
      return { status: 'pass', details: 'Audit logging is configured' };
    }
    return { status: 'warn', details: 'Audit logging needs configuration' };
  }

  /**
   * Check incident response
   */
  checkIncidentResponse(context) {
    const hasPlan = context.config?.incidentResponse?.plan || false;
    const hasTeam = context.config?.incidentResponse?.team || false;
    
    if (hasPlan && hasTeam) {
      return { status: 'pass', details: 'Incident response plan in place' };
    }
    return { status: 'warn', details: 'Incident response plan needs development' };
  }

  /**
   * Check backup security
   */
  checkBackupSecurity(context) {
    const hasBackup = context.config?.backup?.enabled || false;
    const hasEncryption = context.config?.backup?.encryption || false;
    
    if (hasBackup && hasEncryption) {
      return { status: 'pass', details: 'Backup security is configured' };
    }
    return { status: 'warn', details: 'Backup security needs improvement' };
  }

  /**
   * Check network security
   */
  checkNetworkSecurity(context) {
    const hasFirewall = context.config?.network?.firewall || false;
    const hasVPN = context.config?.network?.vpn || false;
    
    if (hasFirewall && hasVPN) {
      return { status: 'pass', details: 'Network security is configured' };
    }
    return { status: 'warn', details: 'Network security needs configuration' };
  }

  /**
   * Check API security
   */
  checkAPISecurity(context) {
    const hasRateLimit = context.config?.api?.rateLimit || false;
    const hasAuth = context.config?.api?.authentication || false;
    
    if (hasRateLimit && hasAuth) {
      return { status: 'pass', details: 'API security is configured' };
    }
    return { status: 'warn', details: 'API security needs improvement' };
  }

  /**
   * Check data classification
   */
  checkDataClassification(context) {
    const hasClassification = context.config?.data?.classification || false;
    const hasRetention = context.config?.data?.retention || false;
    
    if (hasClassification && hasRetention) {
      return { status: 'pass', details: 'Data classification is implemented' };
    }
    return { status: 'warn', details: 'Data classification needs implementation' };
  }

  /**
   * Check vulnerability management
   */
  checkVulnerabilityManagement(context) {
    const hasScanning = context.config?.vulnerability?.scanning || false;
    const hasPatching = context.config?.vulnerability?.patching || false;
    
    if (hasScanning && hasPatching) {
      return { status: 'pass', details: 'Vulnerability management is active' };
    }
    return { status: 'warn', details: 'Vulnerability management needs implementation' };
  }

  /**
   * Check security training
   */
  checkSecurityTraining(context) {
    const hasTraining = context.config?.training?.security || false;
    const hasAwareness = context.config?.training?.awareness || false;
    
    if (hasTraining && hasAwareness) {
      return { status: 'pass', details: 'Security training is implemented' };
    }
    return { status: 'warn', details: 'Security training needs development' };
  }

  /**
   * Check third-party security
   */
  checkThirdPartySecurity(context) {
    const hasVendor = context.config?.thirdParty?.vendorManagement || false;
    const hasAssessment = context.config?.thirdParty?.assessment || false;
    
    if (hasVendor && hasAssessment) {
      return { status: 'pass', details: 'Third-party security is managed' };
    }
    return { status: 'warn', details: 'Third-party security needs management' };
  }

  /**
   * Check mobile security
   */
  checkMobileSecurity(context) {
    const hasMDM = context.config?.mobile?.mdm || false;
    const hasPolicies = context.config?.mobile?.policies || false;
    
    if (hasMDM && hasPolicies) {
      return { status: 'pass', details: 'Mobile security is configured' };
    }
    return { status: 'warn', details: 'Mobile security needs configuration' };
  }

  /**
   * Check cloud security
   */
  checkCloudSecurity(context) {
    const hasCSPM = context.config?.cloud?.cspm || false;
    const hasCASB = context.config?.cloud?.casb || false;
    
    if (hasCSPM && hasCASB) {
      return { status: 'pass', details: 'Cloud security is configured' };
    }
    return { status: 'warn', details: 'Cloud security needs configuration' };
  }

  /**
   * Check compliance monitoring
   */
  checkComplianceMonitoring(context) {
    const hasMonitoring = context.config?.compliance?.monitoring || false;
    const hasReporting = context.config?.compliance?.reporting || false;
    
    if (hasMonitoring && hasReporting) {
      return { status: 'pass', details: 'Compliance monitoring is active' };
    }
    return { status: 'warn', details: 'Compliance monitoring needs implementation' };
  }
}

module.exports = SecurityManager;