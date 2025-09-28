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
      const { choice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: 'Security Section',
          choices: [
            '1. Scan current setup',
            '2. Configure security policies',
            '3. Setup vulnerability monitoring',
            '4. Generate security report',
            '5. Compliance checking',
            '6. Go back'
          ]
        }
      ]);

      const selected = parseInt(choice.split('.')[0]);

      switch(selected) {
        case 1:
          await this.performSecurityScan();
          break;
        case 2:
          await this.configureSecurityPolicies();
          break;
        case 3:
          await this.setupVulnerabilityMonitoring();
          break;
        case 4:
          await this.generateSecurityReport();
          break;
        case 5:
          await this.complianceChecking();
          break;
        case 6:
          return this.setup.showMainInterface();
      }

    } catch (error) {
      await this.setup.handleError('security-interface', error);
    }
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

      await this.setup.safety.safeExecute('security-scan', { context }, async () => {
        const results = await this.scanAll(context);
        const report = await this.generateSecurityReport(results);

        await this.displaySecurityResults(report);
      });

    } catch (error) {
      await this.setup.handleError('security-scan', error);
    }

    await this.showInterface();
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
      compliance: this.checkCompliance(results),
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
   * Check compliance
   */
  checkCompliance(results) {
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
      return score + (weights[severity] * count);
    }, 0);

    return {
      score: riskScore,
      level: riskScore > 50 ? 'high' : riskScore > 20 ? 'medium' : 'low',
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
        choices: [
          '1. Password policies',
          '2. Authentication policies',
          '3. Authorization policies',
          '4. Network security policies',
          '5. Data protection policies',
          '6. Go back'
        ]
      });

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
        case 6:
          return this.showInterface();
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
        choices: [
          '1. Continuous monitoring',
          '2. Daily scans',
          '3. Weekly scans',
          '4. On-demand only',
          '5. Go back'
        ]
      });

      const selected = parseInt(monitoringType.split('.')[0]);

      if (selected === 5) {
        return this.showInterface();
      }

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

    await this.showInterface();
  }

  /**
   * Generate security report
   */
  async generateSecurityReport(results = null) {
    try {
      let report;

      if (!results) {
        const context = {
          projectDir: process.cwd(),
          dependencies: await this.getProjectDependencies(),
          configuration: await this.getProjectConfiguration(),
          platform: this.platform
        };

        results = await this.scanAll(context);
        report = await this.generateSecurityReport(results);
      } else {
        report = results;
      }

      const reportPath = path.join(os.homedir(), '.pern-setup', 'security-report.json');
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

      console.log('✅ Security report generated');
      return report;

    } catch (error) {
      await this.setup.handleError('security-report-generation', error);
    }

    await this.showInterface();
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
        choices: [
          '1. SOC 2 Type II',
          '2. HIPAA',
          '3. GDPR',
          '4. PCI-DSS',
          '5. ISO 27001',
          '6. NIST Cybersecurity Framework',
          '7. Go back'
        ]
      });

      const selected = parseInt(framework.split('.')[0]);

      if (selected === 7) {
        return this.showInterface();
      }

      const frameworks = ['soc2', 'hipaa', 'gdpr', 'pci-dss', 'iso27001', 'nist'];
      const frameworkId = frameworks[selected - 1];

      await this.checkCompliance(frameworkId);

    } catch (error) {
      await this.setup.handleError('compliance-checking', error);
    }

    await this.showInterface();
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
      default:
        return { status: 'unknown', details: 'Check not implemented' };
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
}

module.exports = SecurityManager;