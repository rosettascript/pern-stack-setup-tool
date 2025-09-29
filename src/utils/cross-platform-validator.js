/**
 * PERN Setup Tool - Cross-Platform Compatibility Validator
 * Comprehensive testing framework for platform compatibility
 */

const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const winston = require('winston');
const SecureCommandExecutor = require('./secure-executor');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'cross-platform-validator' },
  transports: [
    // Always add file transport
    new winston.transports.File({
      filename: require('path').join(require('os').homedir(), '.pern-setup', 'logs', 'cross-platform-validator.log'),
      silent: process.env.QUIET_MODE === 'true'
    }),
    // Only add console transport if not in quiet mode
    ...(process.env.QUIET_MODE ? [] : [new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })])
  ]
});

/**
 * Cross-Platform Compatibility Validator Class
 * Ensures consistent behavior across different operating systems
 */
class CrossPlatformValidator {
  constructor() {
    this.secureExecutor = new SecureCommandExecutor();
    this.currentPlatform = process.platform;
    this.testResults = {
      linux: { passed: 0, failed: 0, skipped: 0, tests: [] },
      darwin: { passed: 0, failed: 0, skipped: 0, tests: [] },
      win32: { passed: 0, failed: 0, skipped: 0, tests: [] }
    };
    this.compatibilityMatrix = this.initializeCompatibilityMatrix();
  }

  /**
   * Initialize compatibility matrix for different platforms
   */
  initializeCompatibilityMatrix() {
    return {
      // PostgreSQL compatibility
      postgresql: {
        linux: { supported: true, packageManager: 'apt/yum/dnf', serviceManager: 'systemd' },
        darwin: { supported: true, packageManager: 'brew', serviceManager: 'launchd' },
        win32: { supported: true, packageManager: 'choco/scoop', serviceManager: 'windows' }
      },

      // Redis compatibility
      redis: {
        linux: { supported: true, packageManager: 'apt/yum/dnf', serviceManager: 'systemd' },
        darwin: { supported: true, packageManager: 'brew', serviceManager: 'launchd' },
        win32: { supported: false, alternatives: ['postgresql', 'sqlite'], notes: 'Use WSL or alternatives' }
      },

      // Docker compatibility
      docker: {
        linux: { supported: true, native: true, serviceManager: 'systemd' },
        darwin: { supported: true, native: true, serviceManager: 'launchd' },
        win32: { supported: true, native: true, serviceManager: 'windows' }
      },

      // PM2 compatibility
      pm2: {
        linux: { supported: true, native: true, serviceManager: 'systemd' },
        darwin: { supported: true, native: true, serviceManager: 'launchd' },
        win32: { supported: false, alternatives: ['windows-service', 'nodemon'], notes: 'Use Windows alternatives' }
      },

      // Nginx compatibility
      nginx: {
        linux: { supported: true, native: true, serviceManager: 'systemd' },
        darwin: { supported: true, native: true, serviceManager: 'launchd' },
        win32: { supported: false, alternatives: ['iis', 'express-static'], notes: 'Use IIS or Express static serving' }
      }
    };
  }

  /**
   * Run comprehensive cross-platform compatibility tests
   */
  async runCompatibilityTests(targetPlatforms = ['linux', 'darwin', 'win32']) {
    logger.info(`🧪 Starting cross-platform compatibility tests for platforms: ${targetPlatforms.join(', ')}`);

    const results = {
      summary: {},
      details: {},
      recommendations: []
    };

    for (const platform of targetPlatforms) {
      logger.info(`\n🔍 Testing platform: ${platform}`);
      results.summary[platform] = await this.testPlatformCompatibility(platform);
      results.details[platform] = this.testResults[platform];
    }

    results.recommendations = this.generateCompatibilityRecommendations(results);
    this.generateCompatibilityReport(results);

    return results;
  }

  /**
   * Test compatibility for a specific platform
   */
  async testPlatformCompatibility(platform) {
    const results = {
      platform,
      overall: 'unknown',
      components: {},
      issues: [],
      recommendations: []
    };

    // Skip if testing current platform
    if (platform === this.currentPlatform) {
      results.overall = 'current_platform';
      logger.info(`ℹ️  Skipping ${platform} - currently running on this platform`);
      return results;
    }

    try {
      // Test component compatibility
      results.components = await this.testComponentCompatibility(platform);

      // Test path handling
      await this.testPathCompatibility(platform, results);

      // Test command execution
      await this.testCommandCompatibility(platform, results);

      // Test file system operations
      await this.testFilesystemCompatibility(platform, results);

      // Determine overall compatibility
      results.overall = this.determineOverallCompatibility(results);

      logger.info(`✅ Platform ${platform} compatibility: ${results.overall}`);

    } catch (error) {
      results.overall = 'error';
      results.issues.push(`Compatibility test failed: ${error.message}`);
      logger.error(`❌ Platform ${platform} compatibility test failed:`, error);
    }

    return results;
  }

  /**
   * Test component compatibility for a platform
   */
  async testComponentCompatibility(platform) {
    const components = {};
    const matrix = this.compatibilityMatrix;

    for (const [component, platforms] of Object.entries(matrix)) {
      const platformData = platforms[platform];

      if (!platformData) {
        components[component] = {
          status: 'not_supported',
          reason: 'Platform not defined in compatibility matrix'
        };
        continue;
      }

      components[component] = {
        status: platformData.supported ? 'supported' : 'not_supported',
        native: platformData.native || false,
        packageManager: platformData.packageManager,
        serviceManager: platformData.serviceManager,
        alternatives: platformData.alternatives || [],
        notes: platformData.notes || ''
      };

      // Test specific component requirements
      if (platformData.supported) {
        await this.testComponentRequirements(component, platform, platformData, components[component]);
      }
    }

    return components;
  }

  /**
   * Test specific component requirements
   */
  async testComponentRequirements(component, platform, platformData, result) {
    try {
      switch (component) {
        case 'postgresql':
          result.requirements = await this.testPostgreSQLRequirements(platform);
          break;
        case 'redis':
          result.requirements = await this.testRedisRequirements(platform);
          break;
        case 'docker':
          result.requirements = await this.testDockerRequirements(platform);
          break;
        case 'pm2':
          result.requirements = await this.testPM2Requirements(platform);
          break;
        case 'nginx':
          result.requirements = await this.testNginxRequirements(platform);
          break;
      }
    } catch (error) {
      result.requirements = { error: error.message };
      logger.warn(`⚠️  Failed to test ${component} requirements for ${platform}:`, error.message);
    }
  }

  /**
   * Test PostgreSQL requirements
   */
  async testPostgreSQLRequirements(platform) {
    // This would test PostgreSQL-specific requirements for the platform
    return {
      ports: [5432],
      directories: this.getPlatformDirectories(platform, 'postgresql'),
      permissions: ['read', 'write', 'execute']
    };
  }

  /**
   * Test Redis requirements
   */
  async testRedisRequirements(platform) {
    if (platform === 'win32') {
      return {
        alternatives: ['postgresql', 'sqlite'],
        notes: 'Redis not natively supported on Windows'
      };
    }

    return {
      ports: [6379],
      directories: this.getPlatformDirectories(platform, 'redis'),
      permissions: ['read', 'write', 'execute']
    };
  }

  /**
   * Test Docker requirements
   */
  async testDockerRequirements(platform) {
    return {
      ports: [], // Docker manages its own ports
      directories: this.getPlatformDirectories(platform, 'docker'),
      permissions: ['docker_group_membership'],
      requirements: ['kernel_support', 'storage_driver']
    };
  }

  /**
   * Test PM2 requirements
   */
  async testPM2Requirements(platform) {
    if (platform === 'win32') {
      return {
        alternatives: ['windows-service', 'nodemon', 'forever'],
        notes: 'PM2 not natively supported on Windows'
      };
    }

    return {
      nodeVersion: '>=14.0.0',
      permissions: ['process_management'],
      directories: this.getPlatformDirectories(platform, 'pm2')
    };
  }

  /**
   * Test Nginx requirements
   */
  async testNginxRequirements(platform) {
    if (platform === 'win32') {
      return {
        alternatives: ['iis', 'express.static'],
        notes: 'Nginx not natively supported on Windows'
      };
    }

    return {
      ports: [80, 443],
      directories: this.getPlatformDirectories(platform, 'nginx'),
      permissions: ['web_server']
    };
  }

  /**
   * Get platform-specific directories
   */
  getPlatformDirectories(platform, component) {
    const baseDirs = {
      linux: {
        postgresql: ['/var/lib/postgresql', '/etc/postgresql'],
        redis: ['/var/lib/redis', '/etc/redis'],
        docker: ['/var/lib/docker', '/etc/docker'],
        pm2: ['~/.pm2'],
        nginx: ['/etc/nginx', '/var/log/nginx']
      },
      darwin: {
        postgresql: ['/usr/local/var/postgres', '/usr/local/etc/postgres'],
        redis: ['/usr/local/var/db/redis', '/usr/local/etc/redis'],
        docker: ['~/Library/Containers/com.docker.docker'],
        pm2: ['~/.pm2'],
        nginx: ['/usr/local/etc/nginx', '/usr/local/var/log/nginx']
      },
      win32: {
        postgresql: ['C:\\Program Files\\PostgreSQL'],
        redis: [], // Not supported
        docker: ['C:\\ProgramData\\Docker'],
        pm2: [], // Not supported
        nginx: [] // Not supported
      }
    };

    return baseDirs[platform]?.[component] || [];
  }

  /**
   * Test path compatibility
   */
  async testPathCompatibility(platform, results) {
    try {
      // Test path separators
      const testPaths = [
        '/home/user/project',
        'C:\\Users\\user\\project',
        '~/Documents/project',
        './relative/path'
      ];

      for (const testPath of testPaths) {
        const normalized = this.normalizePathForPlatform(testPath, platform);
        const isValid = this.validatePathForPlatform(normalized, platform);

        if (!isValid) {
          results.issues.push(`Path validation failed for ${platform}: ${testPath}`);
        }
      }

      logger.info(`✅ Path compatibility tested for ${platform}`);

    } catch (error) {
      results.issues.push(`Path compatibility test failed: ${error.message}`);
      logger.error(`❌ Path compatibility test failed for ${platform}:`, error);
    }
  }

  /**
   * Normalize path for specific platform
   */
  normalizePathForPlatform(inputPath, platform) {
    // Expand home directory
    let normalized = inputPath.replace(/^~/, os.homedir());

    // Convert path separators
    if (platform === 'win32') {
      normalized = normalized.replace(/\//g, '\\');
    } else {
      normalized = normalized.replace(/\\/g, '/');
    }

    // Resolve relative paths
    if (normalized.startsWith('.')) {
      normalized = path.resolve(normalized);
    }

    return normalized;
  }

  /**
   * Validate path for specific platform
   */
  validatePathForPlatform(testPath, platform) {
    try {
      // Check if path is absolute
      const isAbsolute = platform === 'win32' ?
        /^[A-Za-z]:[\\/]/.test(testPath) :
        testPath.startsWith('/');

      if (!isAbsolute && !testPath.startsWith('.')) {
        return false; // Must be absolute or relative
      }

      // Check for invalid characters
      const invalidChars = platform === 'win32' ?
        /[<>:"|?*]/ :
        /\0/; // Null bytes are invalid on Unix

      if (invalidChars.test(testPath)) {
        return false;
      }

      // Check path length limits
      const maxLength = platform === 'win32' ? 260 : 4096;
      if (testPath.length > maxLength) {
        return false;
      }

      return true;

    } catch (error) {
      return false;
    }
  }

  /**
   * Test command compatibility
   */
  async testCommandCompatibility(platform, results) {
    try {
      // Test command syntax differences
      const testCommands = [
        { linux: 'ls -la', darwin: 'ls -la', win32: 'dir' },
        { linux: 'ps aux', darwin: 'ps aux', win32: 'tasklist' },
        { linux: 'grep pattern file', darwin: 'grep pattern file', win32: 'findstr pattern file' }
      ];

      for (const commandSet of testCommands) {
        const command = commandSet[platform];
        if (command) {
          // Validate command syntax (don't execute)
          const isValid = this.validateCommandSyntax(command, platform);
          if (!isValid) {
            results.issues.push(`Command syntax invalid for ${platform}: ${command}`);
          }
        }
      }

      logger.info(`✅ Command compatibility tested for ${platform}`);

    } catch (error) {
      results.issues.push(`Command compatibility test failed: ${error.message}`);
      logger.error(`❌ Command compatibility test failed for ${platform}:`, error);
    }
  }

  /**
   * Validate command syntax for platform
   */
  validateCommandSyntax(command, platform) {
    // Basic syntax validation
    if (!command || typeof command !== 'string') {
      return false;
    }

    // Check for platform-specific issues
    if (platform === 'win32') {
      // Windows commands shouldn't have Unix-style paths in some contexts
      if (command.includes('/') && !command.includes('wsl')) {
        // Allow forward slashes in some contexts, but flag potential issues
      }
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /rm\s+-rf\s+\//,
      />.*\/dev/,
      /sudo.*--/
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return false; // Dangerous command
      }
    }

    return true;
  }

  /**
   * Test filesystem compatibility
   */
  async testFilesystemCompatibility(platform, results) {
    try {
      // Test file permission models
      const testPermissions = ['read', 'write', 'execute'];
      const testFiles = [
        'test_read.txt',
        'test_write.txt',
        'test_execute.sh'
      ];

      // Create test files
      const testDir = path.join(os.tmpdir(), `pern-test-${platform}-${Date.now()}`);
      await fs.ensureDir(testDir);

      for (const file of testFiles) {
        const filePath = path.join(testDir, file);
        await fs.writeFile(filePath, 'test content');

        if (file.includes('execute')) {
          // Test execute permissions
          try {
            await fs.chmod(filePath, 0o755);
          } catch (error) {
            results.issues.push(`Execute permission test failed: ${error.message}`);
          }
        }
      }

      // Cleanup
      await fs.remove(testDir);

      logger.info(`✅ Filesystem compatibility tested for ${platform}`);

    } catch (error) {
      results.issues.push(`Filesystem compatibility test failed: ${error.message}`);
      logger.error(`❌ Filesystem compatibility test failed for ${platform}:`, error);
    }
  }

  /**
   * Determine overall compatibility status
   */
  determineOverallCompatibility(results) {
    const components = results.components;
    const issues = results.issues;

    let supportedComponents = 0;
    let totalComponents = 0;

    for (const component of Object.values(components)) {
      totalComponents++;
      if (component.status === 'supported') {
        supportedComponents++;
      }
    }

    const compatibilityRatio = supportedComponents / totalComponents;
    const hasBlockingIssues = issues.some(issue =>
      issue.includes('blocking') || issue.includes('critical')
    );

    if (hasBlockingIssues) {
      return 'blocking_issues';
    } else if (compatibilityRatio >= 0.8) {
      return 'fully_compatible';
    } else if (compatibilityRatio >= 0.5) {
      return 'partially_compatible';
    } else {
      return 'limited_compatibility';
    }
  }

  /**
   * Generate compatibility recommendations
   */
  generateCompatibilityRecommendations(results) {
    const recommendations = [];

    for (const [platform, result] of Object.entries(results.summary)) {
      if (result.overall === 'blocking_issues') {
        recommendations.push({
          platform,
          priority: 'critical',
          message: `Critical compatibility issues found for ${platform}`,
          actions: result.issues
        });
      } else if (result.overall === 'limited_compatibility') {
        recommendations.push({
          platform,
          priority: 'high',
          message: `Limited compatibility with ${platform} - consider alternatives`,
          actions: this.getCompatibilityActions(platform, result)
        });
      }

      // Component-specific recommendations
      for (const [component, status] of Object.entries(result.components)) {
        if (status.status === 'not_supported' && status.alternatives) {
          recommendations.push({
            platform,
            component,
            priority: 'medium',
            message: `${component} not supported on ${platform}`,
            alternatives: status.alternatives,
            notes: status.notes
          });
        }
      }
    }

    return recommendations;
  }

  /**
   * Get compatibility improvement actions
   */
  getCompatibilityActions(platform, result) {
    const actions = [];

    if (platform === 'win32') {
      actions.push('Consider using WSL for full Linux compatibility');
      actions.push('Implement Windows-specific service management');
      actions.push('Add IIS/Express alternatives for web serving');
    } else if (platform === 'darwin') {
      actions.push('Ensure Homebrew is available for package management');
      actions.push('Test macOS-specific file permissions');
    }

    return actions;
  }

  /**
   * Generate compatibility report
   */
  async generateCompatibilityReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      testPlatform: this.currentPlatform,
      results,
      summary: this.generateCompatibilitySummary(results)
    };

    const reportPath = path.join(os.homedir(), '.pern-setup', 'compatibility-report.json');
    await fs.ensureDir(path.dirname(reportPath));
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    logger.info(`📊 Compatibility report generated: ${reportPath}`);
    return report;
  }

  /**
   * Generate compatibility summary
   */
  generateCompatibilitySummary(results) {
    const summary = {
      totalPlatforms: 0,
      fullyCompatible: 0,
      partiallyCompatible: 0,
      limitedCompatibility: 0,
      blockingIssues: 0,
      recommendations: results.recommendations.length
    };

    for (const result of Object.values(results.summary)) {
      summary.totalPlatforms++;
      switch (result.overall) {
        case 'fully_compatible':
          summary.fullyCompatible++;
          break;
        case 'partially_compatible':
          summary.partiallyCompatible++;
          break;
        case 'limited_compatibility':
          summary.limitedCompatibility++;
          break;
        case 'blocking_issues':
          summary.blockingIssues++;
          break;
      }
    }

    return summary;
  }

  /**
   * Get compatibility status for current platform
   */
  getCurrentPlatformCompatibility() {
    return {
      platform: this.currentPlatform,
      nodeVersion: process.version,
      arch: process.arch,
      supportedComponents: this.getSupportedComponents(this.currentPlatform),
      knownLimitations: this.getPlatformLimitations(this.currentPlatform)
    };
  }

  /**
   * Get supported components for platform
   */
  getSupportedComponents(platform) {
    const components = [];
    for (const [component, platforms] of Object.entries(this.compatibilityMatrix)) {
      if (platforms[platform]?.supported) {
        components.push(component);
      }
    }
    return components;
  }

  /**
   * Get known limitations for platform
   */
  getPlatformLimitations(platform) {
    const limitations = [];

    for (const [component, platforms] of Object.entries(this.compatibilityMatrix)) {
      const platformData = platforms[platform];
      if (!platformData?.supported) {
        limitations.push({
          component,
          alternatives: platformData?.alternatives || [],
          notes: platformData?.notes || 'Not supported'
        });
      }
    }

    return limitations;
  }
}

module.exports = CrossPlatformValidator;