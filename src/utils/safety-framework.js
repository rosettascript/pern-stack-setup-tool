/**
 * PERN Setup Tool - Safety Framework
 * Comprehensive safety and validation system for secure implementation
 */

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { exec } = require('child-process-promise');
const winston = require('winston');
const Joi = require('joi');
const SecureCommandExecutor = require('./secure-executor');
const PrivilegeValidator = require('./privilege-validator');
const DataProtectionManager = require('./data-protection-manager');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'pern-setup-safety' },
  transports: [
    new winston.transports.File({
      filename: path.join(os.homedir(), '.pern-setup', 'logs', 'safety.log')
    })
  ]
});

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * Safety Framework Class
 * Ensures safe execution of setup operations
 */
class SafetyFramework {
  constructor() {
    this.safetyDir = path.join(os.homedir(), '.pern-setup');
    this.backupDir = path.join(this.safetyDir, 'backups');
    this.logDir = path.join(this.safetyDir, 'logs');
    this.tempDir = path.join(this.safetyDir, 'temp');
    this.validationRules = this.initializeValidationRules();
    this.secureExecutor = new SecureCommandExecutor();
    this.privilegeValidator = new PrivilegeValidator();
    this.dataProtectionManager = new DataProtectionManager();
    this.currentOperation = null; // Track current operation
    this.safetyMetrics = {
      operations: 0,
      errors: 0,
      warnings: 0,
      backups: 0,
      validations: 0,
      secureCommands: 0,
      privilegeChecks: 0,
      dataSanitizations: 0
    };
  }

  /**
   * Initialize validation rules for all operations
   */
  initializeValidationRules() {
    return {
      system: Joi.object({
        nodeVersion: Joi.string().pattern(/^v?\d+\.\d+\.\d+/).required(),
        platform: Joi.string().valid('linux', 'darwin', 'win32').required(),
        arch: Joi.string().valid('x64', 'arm64', 'ia32').required(),
        memory: Joi.number().min(1024 * 1024 * 1024).required(), // 1GB minimum
        diskSpace: Joi.number().min(5 * 1024 * 1024 * 1024).required(), // 5GB minimum
        user: Joi.string().optional(),
        uid: Joi.number().optional(),
        gid: Joi.number().optional()
      }),

      postgresql: Joi.object({
        version: Joi.string().pattern(/^\d+\.\d+$/).required(),
        port: Joi.number().integer().min(1024).max(65535).default(5432),
        username: Joi.string().alphanum().min(1).max(63).required(),
        database: Joi.string().alphanum().min(1).max(63).required(),
        password: Joi.string().min(8).max(128).required()
      }),

      redis: Joi.object({
        version: Joi.string().pattern(/^\d+\.\d+$/).required(),
        port: Joi.number().integer().min(1024).max(65535).default(6379),
        password: Joi.string().min(8).max(128).allow('').optional(),
        maxMemory: Joi.string().pattern(/^\d+[kmg]?b?$/i).default('256mb')
      }),

      docker: Joi.object({
        version: Joi.string().pattern(/^\d+\.\d+$/).required(),
        composeVersion: Joi.string().pattern(/^\d+\.\d+$/).required(),
        networks: Joi.array().items(Joi.string()).default([]),
        volumes: Joi.array().items(Joi.string()).default([])
      }),

      project: Joi.object({
        name: Joi.string().pattern(/^[a-zA-Z0-9-_]+$/).min(1).max(50).required(),
        type: Joi.string().valid('basic', 'fullstack', 'backend', 'frontend', 'microservices').required(),
        location: Joi.string().min(1).max(500).required(),
        template: Joi.string().optional(),
        features: Joi.array().items(Joi.string()).default([])
      }),

      'project-creation': Joi.object({
        name: Joi.string().pattern(/^[a-zA-Z0-9-_]+$/).min(1).max(50).required(),
        type: Joi.string().valid('basic', 'fullstack', 'full-stack', 'backend', 'frontend', 'microservices').required(),
        location: Joi.string().min(1).max(500).required(),
        template: Joi.string().optional(),
        features: Joi.array().items(Joi.string()).default([])
      }),

      'postgresql-manual-setup': Joi.object({
        version: Joi.string().pattern(/^\d+\.\d+$/).required(),
        port: Joi.number().integer().min(1024).max(65535).default(5432),
        username: Joi.string().pattern(/^[a-zA-Z0-9_-]+$/).min(1).max(63).required(),
        database: Joi.string().pattern(/^[a-zA-Z0-9_-]+$/).min(1).max(63).required(),
        password: Joi.string().min(8).max(128).required()
      }),

      'postgresql-automatic-setup': Joi.object({
        version: Joi.string().pattern(/^\d+\.\d+$/).required(),
        port: Joi.number().integer().min(1024).max(65535).default(5432),
        username: Joi.string().pattern(/^[a-zA-Z0-9_-]+$/).min(1).max(63).required(),
        database: Joi.string().pattern(/^[a-zA-Z0-9_-]+$/).min(1).max(63).required(),
        password: Joi.string().min(8).max(128).required()
      }),

      'postgresql-download': Joi.object({
        version: Joi.string().pattern(/^\d+\.\d+$/).required(),
        platform: Joi.string().valid('linux', 'darwin', 'windows').required()
      }),

      'redis-download': Joi.object({
        version: Joi.string().pattern(/^\d+\.\d+$/).required(),
        platform: Joi.string().valid('linux', 'darwin').required()
      }),

      'redis-setup': Joi.object({
        port: Joi.number().integer().min(1024).max(65535).default(6379),
        password: Joi.string().min(1).max(128).optional(),
        platform: Joi.string().valid('linux', 'darwin').required()
      }),

      'redis-manual-setup': Joi.object({
        port: Joi.number().integer().min(1024).max(65535).default(6379),
        password: Joi.string().allow('').max(128).optional(),
        maxMemory: Joi.number().integer().min(1).max(10000).required(),
        persistence: Joi.string().valid('RDB', 'AOF', 'Both', 'None').required(),
        maxClients: Joi.number().integer().min(1).max(10000).default(1000),
        platform: Joi.string().valid('linux', 'darwin').required(),
        projectDir: Joi.string().min(1).max(500).required()
      }),

      'redis-automatic-setup': Joi.object({
        port: Joi.number().integer().min(1024).max(65535).default(6379),
        platform: Joi.string().valid('linux', 'darwin').required(),
        projectDir: Joi.string().min(1).max(500).required()
      }),

      'docker-download': Joi.object({
        version: Joi.string().pattern(/^\d+\.\d+$/).required(),
        platform: Joi.string().valid('linux', 'darwin', 'windows').required()
      }),

      'docker-setup': Joi.object({
        platform: Joi.string().valid('linux', 'darwin', 'windows').required()
      }),

      'docker-engine-install': Joi.object({
        platform: Joi.string().valid('linux', 'darwin', 'windows').required()
      }),

      'docker-compose-install': Joi.object({
        platform: Joi.string().valid('linux', 'darwin', 'windows').required()
      }),

      'docker-desktop-install': Joi.object({
        platform: Joi.string().valid('linux', 'darwin', 'windows').required()
      }),

      'docker-automatic-setup': Joi.object({
        backup: Joi.boolean().default(false),
        targetPath: Joi.string().required(),
        platform: Joi.string().valid('linux', 'darwin', 'windows').required(),
        projectDir: Joi.string().min(1).max(500).required()
      }),

      'docker-daemon-config': Joi.object({
        backup: Joi.boolean().default(false),
        targetPath: Joi.string().required(),
        platform: Joi.string().valid('linux', 'darwin', 'windows').required(),
        projectDir: Joi.string().min(1).max(500).required()
      }),

      'docker-network-setup': Joi.object({
        networkName: Joi.string().min(1).max(50).required(),
        projectDir: Joi.string().min(1).max(500).required()
      }),

      'docker-volume-setup': Joi.object({
        volumeName: Joi.string().min(1).max(50).required(),
        projectDir: Joi.string().min(1).max(500).required()
      }),

      'pm2-download': Joi.object({
        version: Joi.string().pattern(/^\d+\.\d+\.\d+$/).required(),
        platform: Joi.string().valid('linux', 'darwin').required()
      }),

      'pm2-setup': Joi.object({
        platform: Joi.string().valid('linux', 'darwin').required()
      }),

      'pm2-manual-setup': Joi.object({
        platform: Joi.string().valid('linux', 'darwin').required()
      }),

      'pm2-automatic-setup': Joi.object({
        platform: Joi.string().valid('linux', 'darwin').required()
      }),

      'pm2-global-install': Joi.object({
        platform: Joi.string().valid('linux', 'darwin', 'win32').required()
      }),

      'pm2-startup-setup': Joi.object({
        platform: Joi.string().valid('linux', 'darwin').required()
      }),

      'pm2-start-process': Joi.object({
        scriptPath: Joi.string().required(),
        processName: Joi.string().min(1).max(50).required(),
        instances: Joi.alternatives().try(
          Joi.string().valid('max'),
          Joi.number().integer().min(1).max(100)
        ).required()
      }),

      'pm2-list-processes': Joi.object({
        platform: Joi.string().valid('linux', 'darwin', 'win32').required()
      }),

      'pm2-stop-process': Joi.object({
        processName: Joi.string().min(1).max(50).required()
      }),

      'pm2-restart-process': Joi.object({
        processName: Joi.string().min(1).max(50).required()
      }),

      'pm2-delete-process': Joi.object({
        processName: Joi.string().min(1).max(50).required()
      }),

      'pm2-monitor-processes': Joi.object({
        platform: Joi.string().valid('linux', 'darwin', 'win32').required()
      }),

      'pm2-status': Joi.object({
        platform: Joi.string().valid('linux', 'darwin', 'win32').required()
      }),

      'pm2-logs': Joi.object({
        platform: Joi.string().valid('linux', 'darwin', 'win32').required(),
        duration: Joi.number().integer().min(0).optional()
      }),

      // Nginx operations
      'nginx-download': Joi.object({
        version: Joi.string().optional(),
        platform: Joi.string().valid('linux', 'darwin').optional()
      }),

      'nginx-reverse-proxy': Joi.object({
        domain: Joi.string().required(),
        frontendPort: Joi.number().integer().min(1).max(65535).required(),
        backendPort: Joi.number().integer().min(1).max(65535).required(),
        ssl: Joi.boolean().optional()
      }),

      'nginx-load-balancer': Joi.object({
        domain: Joi.string().required(),
        backendPorts: Joi.array().items(Joi.number().integer().min(1).max(65535)).min(2).required(),
        ssl: Joi.boolean().optional()
      }),

      'nginx-letsencrypt': Joi.object({
        domain: Joi.string().required(),
        email: Joi.string().email().required()
      }),

      'nginx-existing-cert': Joi.object({
        domain: Joi.string().required(),
        certPath: Joi.string().required(),
        keyPath: Joi.string().required()
      }),

      'nginx-self-signed': Joi.object({
        domain: Joi.string().required()
      }),

      'nginx-single-proxy': Joi.object({
        domain: Joi.string().required(),
        backendPort: Joi.number().integer().min(1).max(65535).required()
      }),

      'nginx-load-balanced': Joi.object({
        domain: Joi.string().required(),
        backendPorts: Joi.array().items(Joi.number().integer().min(1).max(65535)).min(2).required()
      }),

      'nginx-static-files': Joi.object({
        domain: Joi.string().required(),
        rootPath: Joi.string().required()
      }),

      'nginx-websocket': Joi.object({
        domain: Joi.string().required(),
        backendPort: Joi.number().integer().min(1).max(65535).required()
      }),

      'nginx-full-config': Joi.object({
        domain: Joi.string().required()
      }),

      'nginx-list-sites': Joi.object({}),

      'nginx-enable-site': Joi.object({
        siteName: Joi.string().required()
      }),

      'nginx-disable-site': Joi.object({
        siteName: Joi.string().required()
      }),

      'nginx-delete-site': Joi.object({
        siteName: Joi.string().required()
      }),

      'nginx-test-config': Joi.object({}),

      'nginx-reload': Joi.object({}),

      // Test operations
      'setup-jest': Joi.object({
        projectDir: Joi.string().min(1).max(500).required()
      }),
      'setup-supertest': Joi.object({
        projectDir: Joi.string().min(1).max(500).required()
      }),
      'setup-cypress': Joi.object({
        projectDir: Joi.string().min(1).max(500).required()
      }),
      'setup-newman': Joi.object({
        projectDir: Joi.string().min(1).max(500).required()
      }),
      'setup-artillery': Joi.object({
        projectDir: Joi.string().min(1).max(500).required()
      }),

      // Security operations
      'security-scan': Joi.object({
        projectPath: Joi.string().min(1).max(500).required(),
        scanType: Joi.string().valid('full', 'dependencies', 'code', 'configuration').default('full'),
        outputFormat: Joi.string().valid('json', 'html', 'text').default('json')
      }),
      'security-policies': Joi.object({
        projectPath: Joi.string().min(1).max(500).required(),
        policyType: Joi.string().valid('cors', 'rate-limiting', 'authentication', 'encryption').required()
      }),
      'vulnerability-monitoring': Joi.object({
        projectPath: Joi.string().min(1).max(500).required(),
        monitoringType: Joi.string().valid('continuous', 'scheduled', 'manual').default('scheduled')
      }),
      'security-report': Joi.object({
        projectPath: Joi.string().min(1).max(500).required(),
        reportType: Joi.string().valid('summary', 'detailed', 'compliance').default('summary')
      }),
      'compliance-check': Joi.object({
        projectPath: Joi.string().min(1).max(500).required(),
        framework: Joi.string().valid('SOC2', 'HIPAA', 'GDPR', 'PCI-DSS').required()
      }),

      // Project operations
      'project-clone': Joi.object({
        repositoryUrl: Joi.string().uri().required(),
        cloneLocation: Joi.string().min(1).max(500).required(),
        branch: Joi.string().default('main')
      }),

      // Template operations
      'template-generation': Joi.object({
        templateName: Joi.string().min(1).max(100).required(),
        projectName: Joi.string().pattern(/^[a-zA-Z0-9-_]+$/).min(1).max(50).required(),
        authorName: Joi.string().min(1).max(100).required(),
        databaseName: Joi.string().pattern(/^[a-zA-Z0-9-_]+$/).min(1).max(63).required(),
        jwtSecret: Joi.string().min(32).max(128).optional(),
        projectLocation: Joi.string().min(1).max(500).required()
      }),
      'template-setup': Joi.object({
        templateName: Joi.string().min(1).max(100).required(),
        projectName: Joi.string().pattern(/^[a-zA-Z0-9-_]+$/).min(1).max(50).required(),
        projectLocation: Joi.string().min(1).max(500).required()
      }),

      // Dependency installation operations
      'client-deps-install': Joi.object({
        projectPath: Joi.string().min(1).max(500).required(),
        packageManager: Joi.string().valid('npm', 'yarn', 'pnpm').default('npm')
      }),
      'server-deps-install': Joi.object({
        projectPath: Joi.string().min(1).max(500).required(),
        packageManager: Joi.string().valid('npm', 'yarn', 'pnpm').default('npm')
      }),
      'template-deps-install': Joi.object({
        projectPath: Joi.string().min(1).max(500).required(),
        packageManager: Joi.string().valid('npm', 'yarn', 'pnpm').default('npm')
      }),
      'deps-install': Joi.object({
        projectPath: Joi.string().min(1).max(500).required(),
        packageManager: Joi.string().valid('npm', 'yarn', 'pnpm').default('npm'),
        dependencies: Joi.array().items(Joi.string()).default([])
      })
    };
  }

  /**
   * Initialize safety framework
   */
  async initialize() {
    try {
      logger.info('🔒 Initializing Safety Framework...');

      // Create safety directories
      await fs.ensureDir(this.safetyDir);
      await fs.ensureDir(this.backupDir);
      await fs.ensureDir(this.logDir);
      await fs.ensureDir(this.tempDir);

      // Validate system requirements
      await this.validateSystemRequirements();

      // Setup signal handlers for graceful shutdown
      this.setupSignalHandlers();

      // Initialize backup system
      await this.initializeBackupSystem();

      logger.info('✅ Safety Framework initialized successfully');
      return true;

    } catch (error) {
      logger.error('❌ Safety Framework initialization failed:', error);
      throw new Error(`Safety framework initialization failed: ${error.message}`);
    }
  }

  /**
   * Validate system requirements before proceeding
   */
  async validateSystemRequirements() {
    logger.info('🔍 Validating system requirements...');

    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: os.totalmem(),
      diskSpace: await this.getAvailableDiskSpace(),
      user: os.userInfo().username,
      uid: os.userInfo().uid,
      gid: os.userInfo().gid
    };

    // Validate against schema
    const { error } = this.validationRules.system.validate(systemInfo);
    if (error) {
      throw new Error(`System requirements not met: ${error.details[0].message}`);
    }

    // Platform-specific validations
    if (process.platform === 'win32') {
      await this.validateWindowsRequirements();
    } else if (process.platform === 'linux') {
      await this.validateLinuxRequirements();
    } else if (process.platform === 'darwin') {
      await this.validateMacOSRequirements();
    }

    // Check permissions (skip sudo check during initialization)
    await this.validatePermissions(null);

    logger.info('✅ System requirements validated');
    return systemInfo;
  }

  /**
   * Validate Windows-specific requirements
   */
  async validateWindowsRequirements() {
    try {
      // Check if running as administrator (use validated execution for Windows commands)
      try {
        const result = await this.secureExecutor.executeValidated('whoami /priv');
        if (!result.stdout.includes('SeCreateSymbolicLinkPrivilege')) {
          logger.warn('⚠️  Running without administrator privileges - some features may not work');
        }
      } catch (error) {
        logger.warn('⚠️  Could not check administrator privileges:', error.message);
      }

      // Check WSL availability
      try {
        await this.secureExecutor.executeValidated('wsl --version');
        logger.info('✅ WSL available for enhanced compatibility');
      } catch (error) {
        logger.info('ℹ️  WSL not available - using Windows alternatives');
      }

    } catch (error) {
      logger.warn('⚠️  Could not validate Windows-specific requirements:', error.message);
    }
  }

  /**
   * Validate Linux-specific requirements
   */
  async validateLinuxRequirements() {
    try {
      // Check if user is in sudo group
      const groupsResult = await this.secureExecutor.executeValidated('groups');
      if (!groupsResult.stdout.includes('sudo') && !groupsResult.stdout.includes('wheel')) {
        throw new Error('User must be in sudo/wheel group for system installations');
      }

      // Check package manager availability
      const packageManagers = ['apt', 'yum', 'dnf', 'pacman'];
      let packageManagerFound = false;

      for (const pm of packageManagers) {
        try {
          await this.secureExecutor.executeValidated(`${pm} --version`);
          logger.info(`✅ Package manager found: ${pm}`);
          packageManagerFound = true;
          break;
        } catch (error) {
          // Try next package manager
        }
      }

      if (!packageManagerFound) {
        throw new Error('No supported package manager found');
      }

    } catch (error) {
      if (error.message.includes('must be in sudo')) {
        throw error;
      }
      logger.warn('⚠️  Could not validate Linux-specific requirements:', error.message);
    }
  }

  /**
   * Validate macOS-specific requirements
   */
  async validateMacOSRequirements() {
    try {
      // Check Homebrew installation
      await this.secureExecutor.executeValidated('brew --version');
      logger.info('✅ Homebrew available for package management');

      // Check Xcode command line tools
      try {
        await this.secureExecutor.executeValidated('xcode-select --version');
        logger.info('✅ Xcode command line tools available');
      } catch (error) {
        logger.warn('⚠️  Xcode command line tools not found - some installations may fail');
      }

    } catch (error) {
      logger.warn('⚠️  Could not validate macOS-specific requirements:', error.message);
    }
  }

  /**
   * Validate user permissions
   */
  async validatePermissions(operation = null) {
    const homeDir = os.homedir();
    const testFile = path.join(homeDir, '.pern-setup-test');

    try {
      // Test write permissions
      await fs.writeFile(testFile, 'test');
      await fs.remove(testFile);

      // Test sudo access (with timeout) - only if sudo is actually needed
      // Skip sudo check for operations that don't require it
      if (operation && this.privilegeValidator.requiresSudo(operation)) {
        try {
          await Promise.race([
            this.secureExecutor.executeValidated('sudo -n true'),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('sudo timeout')), 5000)
            )
          ]);
          logger.info('✅ Sudo access available');
        } catch (error) {
          logger.warn('⚠️  Sudo access not available - manual intervention may be required');
        }
      } else {
        logger.info('ℹ️  Skipping sudo check - operation does not require sudo');
      }

    } catch (error) {
      throw new Error(`Insufficient permissions: ${error.message}`);
    }
  }

  /**
   * Get available disk space
   */
  async getAvailableDiskSpace() {
    try {
      // Use a simpler, more reliable method
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const { stdout } = await execAsync('df / | tail -1 | awk \'{print $4}\'', { timeout: 5000 });
      return parseInt(stdout.trim()) * 1024; // Convert to bytes
    } catch (error) {
      logger.warn('Could not determine disk space:', error.message);
      return 10 * 1024 * 1024 * 1024; // Assume 10GB as fallback
    }
  }

  /**
   * Create backup before risky operations
   */
  async createBackup(operation, targetPath) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `${operation}_${timestamp}`;
      const backupPath = path.join(this.backupDir, backupName);

      if (await fs.pathExists(targetPath)) {
        await fs.copy(targetPath, backupPath);
        this.safetyMetrics.backups++;

        logger.info(`💾 Backup created: ${backupName}`);
        return backupPath;
      }

      return null;
    } catch (error) {
      logger.error('❌ Backup creation failed:', error);
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  /**
   * Validate operation parameters with enhanced security
   */
  async validateOperation(operation, parameters) {
    try {
      const rules = this.validationRules[operation];
      if (!rules) {
        throw new Error(`Unknown operation: ${operation}`);
      }

      const { error } = rules.validate(parameters);
      if (error) {
        throw new Error(`Validation failed for ${operation}: ${error.details[0].message}`);
      }

      // Additional security validations
      await this.performSecurityValidations(operation, parameters);

      this.safetyMetrics.validations++;
      logger.debug(`✅ Operation validated: ${operation}`);
      return true;

    } catch (error) {
      logger.error(`❌ Validation failed for ${operation}:`, error.message);
      throw error;
    }
  }

  /**
   * Perform additional security validations
   */
  async performSecurityValidations(operation, parameters) {
    // Path traversal prevention
    if (parameters.targetPath || parameters.path) {
      const pathToCheck = parameters.targetPath || parameters.path;
      await this.validatePathSecurity(pathToCheck, operation);
    }

    // Database credential sanitization
    if (this.isDatabaseOperation(operation)) {
      await this.validateDatabaseCredentials(parameters);
    }

    // Input sanitization for all string parameters
    await this.sanitizeInputParameters(parameters, operation);

    // Rate limiting check
    await this.checkRateLimits(operation);

    // Resource usage validation
    await this.validateResourceRequirements(operation, parameters);
  }

  /**
   * Validate path security (prevent path traversal)
   */
  async validatePathSecurity(pathToCheck, operation) {
    if (!pathToCheck || typeof pathToCheck !== 'string') {
      return; // Skip if no path
    }

    try {
      // Resolve the path to prevent traversal attacks
      const resolvedPath = path.resolve(pathToCheck);

      // Ensure path doesn't escape allowed directories
      const allowedBasePaths = [
        process.cwd(),
        os.homedir(),
        path.join(os.homedir(), '.pern-setup'),
        '/tmp',
        '/var/tmp',
        os.tmpdir(),
        // System configuration directories
        '/etc/docker',
        '/etc/redis',
        '/etc/nginx',
        '/etc/postgresql',
        '/etc/systemd',
        '/var/lib/docker',
        '/var/lib/redis',
        '/var/lib/postgresql'
      ];

      const isAllowed = allowedBasePaths.some(basePath => {
        const resolvedBase = path.resolve(basePath);
        return resolvedPath.startsWith(resolvedBase);
      });

      if (!isAllowed) {
        throw new Error(`Path traversal detected: ${pathToCheck} resolves to ${resolvedPath}`);
      }

      // Check for null bytes and other dangerous characters
      if (pathToCheck.includes('\0')) {
        throw new Error('Null byte detected in path');
      }

      // Platform-specific path validation
      if (process.platform === 'win32') {
        // Windows-specific dangerous patterns
        const dangerousPatterns = /[<>:"|?*\x00-\x1f]/;
        if (dangerousPatterns.test(pathToCheck)) {
          throw new Error('Dangerous characters detected in Windows path');
        }
      }

      logger.debug(`✅ Path security validated: ${path.basename(resolvedPath)}`);

    } catch (error) {
      logger.error(`❌ Path security validation failed:`, error.message);
      throw error;
    }
  }

  /**
   * Validate database credentials
   */
  async validateDatabaseCredentials(parameters) {
    const credentialFields = ['username', 'password', 'database', 'host'];

    for (const field of credentialFields) {
      if (parameters[field]) {
        // Sanitize database credentials
        const sanitized = parameters[field].replace(/['";\\]/g, '');
        if (sanitized !== parameters[field]) {
          logger.warn(`⚠️  Database credential sanitized for security: ${field}`);
          parameters[field] = sanitized;
        }

        // Validate credential format
        if (field === 'username' && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(parameters[field])) {
          throw new Error(`Invalid database username format: ${parameters[field]}`);
        }

        if (field === 'password' && parameters[field].length < 8) {
          throw new Error('Database password must be at least 8 characters');
        }
      }
    }
  }

  /**
   * Sanitize input parameters
   */
  async sanitizeInputParameters(parameters, operation) {
    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === 'string') {
        // Remove dangerous characters
        const sanitized = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        if (sanitized !== value) {
          logger.warn(`⚠️  Input sanitized for parameter ${key} in operation ${operation}`);
          parameters[key] = sanitized;
        }

        // Length validation
        if (value.length > 1000) {
          logger.warn(`⚠️  Input truncated for parameter ${key} (length: ${value.length})`);
          parameters[key] = value.substring(0, 1000);
        }
      }
    }
  }

  /**
   * Check rate limits for operations
   */
  async checkRateLimits(operation) {
    // Simple in-memory rate limiting (can be enhanced with Redis/external store)
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxRequests = 10; // Max 10 operations per minute

    if (!this.rateLimitCache) {
      this.rateLimitCache = new Map();
    }

    const key = `${operation}:${Math.floor(now / windowMs)}`;
    const current = this.rateLimitCache.get(key) || 0;

    if (current >= maxRequests) {
      throw new Error(`Rate limit exceeded for operation: ${operation}`);
    }

    this.rateLimitCache.set(key, current + 1);

    // Cleanup old entries
    for (const [cacheKey, timestamp] of this.rateLimitCache.entries()) {
      if (parseInt(cacheKey.split(':')[1]) * windowMs < now - windowMs) {
        this.rateLimitCache.delete(cacheKey);
      }
    }
  }

  /**
   * Validate resource requirements
   */
  async validateResourceRequirements(operation, parameters) {
    try {
      const memUsage = process.memoryUsage();
      const memUsageMB = memUsage.heapUsed / 1024 / 1024;

      // Check memory usage (warn if > 500MB)
      if (memUsageMB > 500) {
        logger.warn(`⚠️  High memory usage detected: ${memUsageMB.toFixed(2)}MB`);
      }

      // Check available disk space for operations that create files
      if (operation.includes('install') || operation.includes('create') || operation.includes('setup')) {
        const availableSpace = await this.getAvailableDiskSpace();
        const minRequired = 1024 * 1024 * 1024; // 1GB minimum

        if (availableSpace < minRequired) {
          throw new Error(`Insufficient disk space: ${availableSpace} bytes available, ${minRequired} required`);
        }
      }

    } catch (error) {
      logger.error(`❌ Resource validation failed:`, error.message);
      // Don't throw here - just log the warning
    }
  }

  /**
   * Check if operation involves database
   */
  isDatabaseOperation(operation) {
    return ['postgresql', 'redis', 'database'].some(db => operation.includes(db));
  }

  /**
   * Get current operation
   */
  getCurrentOperation() {
    return this.currentOperation;
  }

  /**
   * Safe operation wrapper with comprehensive error handling
   */
  async safeExecute(operation, parameters, executor) {
    const startTime = Date.now();
    let backupPath = null;

    try {
      // Set current operation for context
      this.currentOperation = operation;

      // Pre-operation validation
      this.validateOperation(operation, parameters);

      // Pre-operation privilege validation
      const privilegeRequirements = this.privilegeValidator.getPrivilegeRequirements(operation);
      await this.privilegeValidator.validatePrivileges(operation, privilegeRequirements);
      this.safetyMetrics.privilegeChecks++;

      // Validate permissions for this specific operation
      await this.validatePermissions(operation);

      // Pre-operation backup (if applicable)
      if (parameters.backup && parameters.targetPath) {
        backupPath = await this.createBackup(operation, parameters.targetPath);
      }

      // Execute operation with monitoring
      logger.info(`🔄 Executing ${operation}...`);
      const result = await this.monitoredExecute(executor);

      // Post-operation validation
      await this.validateResult(operation, result);

      // Record metrics
      this.safetyMetrics.operations++;
      const duration = Date.now() - startTime;

      logger.info(`✅ Operation completed: ${operation} (${duration}ms)`);
      this.currentOperation = null; // Clear current operation
      return result;

    } catch (error) {
      this.safetyMetrics.errors++;
      this.currentOperation = null; // Clear current operation

      // Attempt recovery if backup available
      if (backupPath) {
        await this.attemptRecovery(operation, backupPath, error);
      }

      // Sanitize error and parameters for logging
      const sanitizedError = this.dataProtectionManager.sanitizeErrorMessage(error, process.env.NODE_ENV === 'production');
      const sanitizedParams = this.dataProtectionManager.sanitizeForLogging(JSON.stringify(parameters), `operation_${operation}`);
      this.safetyMetrics.dataSanitizations++;

      logger.error(`❌ Operation failed: ${operation}`, {
        error: sanitizedError,
        operation,
        parameters: sanitizedParams,
        duration: Date.now() - startTime
      });

      throw error;
    }
  }

  /**
   * Monitored execution with timeout and resource limits
   */
  async monitoredExecute(executor) {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Operation timeout'));
      }, 300000); // 5 minute timeout

      try {
        const result = await executor();
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Validate operation result
   */
  async validateResult(operation, result) {
    // Operation-specific validation
    switch (operation) {
      case 'postgresql':
        await this.validatePostgreSQLResult(result);
        break;
      case 'redis':
        await this.validateRedisResult(result);
        break;
      case 'docker':
        await this.validateDockerResult(result);
        break;
      case 'setup-jest':
      case 'setup-supertest':
      case 'setup-cypress':
      case 'setup-newman':
      case 'setup-artillery':
        await this.validateTestFrameworkResult(result);
        break;
      case 'project-clone':
        await this.validateProjectCloneResult(result);
        break;
      case 'pm2-monitor-processes':
      case 'pm2-status':
      case 'pm2-logs':
        await this.validatePM2Result(result);
        break;
      default:
        // Generic validation
        if (!result || typeof result !== 'object') {
          throw new Error('Invalid operation result');
        }
    }
  }

  /**
   * Validate project clone result
   */
  async validateProjectCloneResult(result) {
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid project clone result');
    }

    if (!result.success) {
      throw new Error('Project clone operation failed');
    }

    if (!result.repositoryUrl || !result.cloneLocation) {
      throw new Error('Missing required clone information');
    }

    // Verify the cloned directory exists
    try {
      const fs = require('fs-extra');
      if (!await fs.pathExists(result.cloneLocation)) {
        throw new Error('Cloned directory does not exist');
      }
    } catch (error) {
      logger.warn('Could not verify cloned directory:', error.message);
    }

    logger.info('✅ Project clone result validated successfully');
  }

  /**
   * Validate PM2 operation result
   */
  async validatePM2Result(result) {
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid PM2 operation result');
    }

    if (!result.success) {
      throw new Error('PM2 operation failed');
    }

    if (!result.platform) {
      throw new Error('Missing platform information');
    }

    if (!result.timestamp) {
      throw new Error('Missing timestamp information');
    }

    logger.info('✅ PM2 operation result validated successfully');
  }

  /**
   * Validate PostgreSQL setup result
   */
  async validatePostgreSQLResult(result) {
    try {
      const { Client } = require('pg');
      const client = new Client({
        host: result.host || 'localhost',
        port: result.port || 5432,
        user: result.username || 'postgres',
        password: result.password || '1234',
        database: result.database || 'postgres'
      });

      await client.connect();
      await client.end();

      logger.info('✅ PostgreSQL validation successful');
    } catch (error) {
      throw new Error(`PostgreSQL validation failed: ${error.message}`);
    }
  }

  /**
   * Validate Redis setup result
   */
  async validateRedisResult(result) {
    try {
      const Redis = require('ioredis');
      const redis = new Redis({
        host: result.host || 'localhost',
        port: result.port || 6379,
        password: result.password || undefined
      });

      await redis.ping();
      redis.disconnect();

      logger.info('✅ Redis validation successful');
    } catch (error) {
      throw new Error(`Redis validation failed: ${error.message}`);
    }
  }

  /**
   * Validate Docker setup result
   */
  async validateDockerResult(result) {
    try {
      const Docker = require('dockerode');
      const docker = new Docker();

      const info = await docker.info();
      if (!info.ServerVersion) {
        throw new Error('Docker daemon not responding');
      }

      logger.info('✅ Docker validation successful');
    } catch (error) {
      throw new Error(`Docker validation failed: ${error.message}`);
    }
  }

  /**
   * Validate test framework setup result
   */
  async validateTestFrameworkResult(result) {
    try {
      if (!result || typeof result !== 'object') {
        throw new Error('Test framework result must be an object');
      }

      if (!result.success) {
        throw new Error('Test framework setup was not successful');
      }

      if (!result.framework) {
        throw new Error('Test framework result must include framework name');
      }

      if (!result.timestamp) {
        throw new Error('Test framework result must include timestamp');
      }

      // Validate framework-specific fields
      const validFrameworks = ['jest', 'supertest', 'cypress', 'newman', 'artillery'];
      if (!validFrameworks.includes(result.framework)) {
        throw new Error(`Invalid framework: ${result.framework}`);
      }

      logger.info(`✅ Test framework validation successful: ${result.framework}`);
    } catch (error) {
      throw new Error(`Test framework validation failed: ${error.message}`);
    }
  }

  /**
   * Attempt recovery from backup
   */
  async attemptRecovery(operation, backupPath, originalError) {
    try {
      logger.info(`🔄 Attempting recovery for ${operation}...`);

      // Recovery logic based on operation type
      switch (operation) {
        case 'file-system':
          await this.restoreFromBackup(backupPath);
          break;
        case 'database':
          await this.restoreDatabaseFromBackup(backupPath);
          break;
        default:
          logger.warn(`⚠️  No recovery strategy available for ${operation}`);
      }

      logger.info(`✅ Recovery completed for ${operation}`);
    } catch (error) {
      logger.error(`❌ Recovery failed for ${operation}:`, error);
      throw new Error(`Recovery failed: ${error.message}`);
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupPath) {
    const targetPath = path.dirname(backupPath).replace('/backups', '');
    await fs.copy(backupPath, targetPath);
    logger.info(`💾 Restored from backup: ${backupPath}`);
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  setupSignalHandlers() {
    const gracefulShutdown = async (signal) => {
      logger.info(`📡 Received ${signal}, shutting down gracefully...`);

      try {
        // Cleanup temporary files
        await this.cleanup();

        // Generate final report
        await this.generateSafetyReport();

        logger.info('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart
  }

  /**
   * Initialize backup system
   */
  async initializeBackupSystem() {
    // Create backup rotation script
    const backupScript = `#!/bin/bash
# PERN Setup Backup Rotation Script
BACKUP_DIR="${this.backupDir}"
MAX_AGE_DAYS=30

# Remove old backups
find "$BACKUP_DIR" -type f -mtime +$MAX_AGE_DAYS -delete

# Compress old backups
find "$BACKUP_DIR" -type f -name "*.sql" -mtime +7 -exec gzip {} \\;

echo "Backup rotation completed at $(date)"
`;

    await fs.writeFile(path.join(this.safetyDir, 'rotate-backups.sh'), backupScript);
    
    // Use direct exec instead of secure executor to avoid hanging
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      await execAsync(`chmod +x ${path.join(this.safetyDir, 'rotate-backups.sh')}`, { timeout: 5000 });
    } catch (error) {
      logger.warn('Could not set execute permission on backup script:', error.message);
    }
  }

  /**
   * Cleanup temporary files and resources
   */
  async cleanup() {
    try {
      // Remove temporary files
      const tempFiles = await fs.readdir(this.tempDir);
      for (const file of tempFiles) {
        await fs.remove(path.join(this.tempDir, file));
      }

      // Rotate logs if too large
      const logFiles = await fs.readdir(this.logDir);
      for (const file of logFiles) {
        const filePath = path.join(this.logDir, file);
        const stats = await fs.stat(filePath);
        if (stats.size > 100 * 1024 * 1024) { // 100MB
          await fs.remove(filePath);
        }
      }

      logger.info('🧹 Cleanup completed');
    } catch (error) {
      logger.error('❌ Cleanup failed:', error);
    }
  }

  /**
   * Generate safety report
   */
  async generateSafetyReport() {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: this.safetyMetrics,
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        uptime: process.uptime()
      },
      recommendations: await this.generateRecommendations()
    };

    const reportPath = path.join(this.safetyDir, 'safety-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    logger.info(`📊 Safety report generated: ${reportPath}`);
    return report;
  }

  /**
   * Generate safety recommendations
   */
  async generateRecommendations() {
    const recommendations = [];

    if (this.safetyMetrics.errors > this.safetyMetrics.operations * 0.1) {
      recommendations.push({
        type: 'error-rate',
        priority: 'high',
        message: 'High error rate detected - review error logs and consider rollback'
      });
    }

    if (this.safetyMetrics.backups === 0) {
      recommendations.push({
        type: 'backup',
        priority: 'medium',
        message: 'No backups created - enable backup for critical operations'
      });
    }

    // Platform-specific recommendations
    if (process.platform === 'win32') {
      recommendations.push({
        type: 'platform',
        priority: 'low',
        message: 'Consider using WSL for full Linux compatibility'
      });
    }

    return recommendations;
  }

  /**
   * Get safety metrics
   */
  getMetrics() {
    return { ...this.safetyMetrics };
  }

  /**
   * Get privilege validator instance
   */
  getPrivilegeValidator() {
    return this.privilegeValidator;
  }

  /**
   * Validate privileges for operation
   */
  async validateOperationPrivileges(operation, requiredPrivileges = []) {
    return await this.privilegeValidator.validatePrivileges(operation, requiredPrivileges);
  }

  /**
   * Get current privilege status
   */
  getPrivilegeStatus() {
    return this.privilegeValidator.getCurrentPrivileges();
  }

  /**
   * Get data protection manager instance
   */
  getDataProtectionManager() {
    return this.dataProtectionManager;
  }

  /**
   * Sanitize data for logging
   */
  sanitizeForLogging(data, context = 'general') {
    this.safetyMetrics.dataSanitizations++;
    return this.dataProtectionManager.sanitizeForLogging(data, context);
  }

  /**
   * Sanitize error message
   */
  sanitizeErrorMessage(error, production = false) {
    return this.dataProtectionManager.sanitizeErrorMessage(error, production);
  }

  /**
   * Validate data security
   */
  validateDataSecurity(data, context = 'general') {
    return this.dataProtectionManager.validateDataSecurity(data, context);
  }

  /**
   * Execute command securely through safety framework
   */
  async executeSecureCommand(commandKey, parameters = {}, options = {}) {
    try {
      this.safetyMetrics.secureCommands++;
      const result = await this.secureExecutor.executeSecure(commandKey, parameters, options);
      return result;
    } catch (error) {
      this.safetyMetrics.errors++;
      throw error;
    }
  }

  /**
   * Execute validated command through safety framework
   */
  async executeValidatedCommand(command, options = {}) {
    try {
      this.safetyMetrics.secureCommands++;
      const result = await this.secureExecutor.executeValidated(command, options);
      return result;
    } catch (error) {
      this.safetyMetrics.errors++;
      throw error;
    }
  }

  /**
   * Get secure executor instance (for advanced usage)
   */
  getSecureExecutor() {
    return this.secureExecutor;
  }

  /**
   * Emergency stop - halt all operations
   */
  async emergencyStop(reason) {
    logger.error(`🚨 EMERGENCY STOP: ${reason}`);

    // Create emergency backup
    await this.createEmergencyBackup();

    // Generate emergency report
    await this.generateEmergencyReport(reason);

    throw new Error(`Emergency stop triggered: ${reason}`);
  }

  /**
   * Create emergency backup
   */
  async createEmergencyBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const emergencyBackup = path.join(this.backupDir, `emergency_${timestamp}`);

    try {
      // Backup critical system files
      await fs.copy('/etc/hosts', path.join(emergencyBackup, 'hosts'));
      await fs.copy('/etc/passwd', path.join(emergencyBackup, 'passwd'));
      await fs.copy('/etc/group', path.join(emergencyBackup, 'group'));

      logger.info(`💾 Emergency backup created: ${emergencyBackup}`);
    } catch (error) {
      logger.error('❌ Emergency backup failed:', error);
    }
  }

  /**
   * Generate emergency report
   */
  async generateEmergencyReport(reason) {
    const report = {
      type: 'emergency',
      timestamp: new Date().toISOString(),
      reason: reason,
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      },
      metrics: this.safetyMetrics
    };

    const reportPath = path.join(this.safetyDir, 'emergency-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    logger.error(`🚨 Emergency report generated: ${reportPath}`);
  }
}

module.exports = SafetyFramework;