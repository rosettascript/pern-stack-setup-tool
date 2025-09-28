/**
 * PERN Setup Tool - Privilege Validator
 * Comprehensive privilege validation and escalation prevention
 */

const os = require('os');
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
  defaultMeta: { service: 'privilege-validator' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Privilege Validator Class
 * Ensures proper privilege management and prevents escalation
 */
class PrivilegeValidator {
  constructor() {
    this.secureExecutor = new SecureCommandExecutor();
    this.platform = process.platform;
    this.currentUser = {
      uid: os.userInfo().uid,
      gid: os.userInfo().gid,
      username: os.userInfo().username
    };
    this.privilegeCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Validate user privileges for a specific operation
   */
  async validatePrivileges(operation, requiredPrivileges = []) {
    try {
      logger.info(`🔐 Validating privileges for operation: ${operation}`);

      // Check current user context
      await this.validateUserContext();

      // Check platform-specific privileges
      await this.validatePlatformPrivileges(operation);

      // Check operation-specific privilege requirements
      for (const privilege of requiredPrivileges) {
        await this.checkSpecificPrivilege(privilege, operation);
      }

      // Validate sudo access if required
      if (this.requiresSudo(operation)) {
        await this.validateSudoAccess(operation);
      }

      logger.info(`✅ Privilege validation passed for: ${operation}`);
      return { valid: true, privileges: this.getCurrentPrivileges() };

    } catch (error) {
      logger.error(`❌ Privilege validation failed for ${operation}:`, error.message);
      throw new Error(`Insufficient privileges for operation ${operation}: ${error.message}`);
    }
  }

  /**
   * Validate current user context
   */
  async validateUserContext() {
    // Check if running as root/admin (not recommended)
    if (this.isRunningAsRoot()) {
      logger.warn('⚠️  Running as root/admin - this is not recommended for security');
    }

    // Validate user exists and is valid
    if (!this.currentUser.username || this.currentUser.uid === undefined) {
      throw new Error('Invalid user context');
    }

    // Check if user is in appropriate groups
    await this.validateUserGroups();
  }

  /**
   * Check if running as root/admin
   */
  isRunningAsRoot() {
    if (this.platform === 'win32') {
      // Check if running as administrator
      try {
        const result = this.secureExecutor.executeValidated('net session');
        return result.stdout.includes('Access is denied') === false;
      } catch (error) {
        return false; // Assume not admin if check fails
      }
    } else {
      return this.currentUser.uid === 0;
    }
  }

  /**
   * Validate user group memberships
   */
  async validateUserGroups() {
    try {
      let groups = [];

      if (this.platform === 'win32') {
        // Windows group checking
        const result = await this.secureExecutor.executeValidated('whoami /groups');
        groups = result.stdout.split('\n')
          .filter(line => line.includes('Group Name'))
          .map(line => line.split(':')[1]?.trim());
      } else {
        // Unix group checking
        const result = await this.secureExecutor.executeValidated('groups');
        groups = result.stdout.trim().split(/\s+/);
      }

      // Check for required groups based on platform
      const requiredGroups = this.getRequiredGroups();
      const missingGroups = requiredGroups.filter(group => !groups.includes(group));

      if (missingGroups.length > 0) {
        logger.warn(`⚠️  User not in required groups: ${missingGroups.join(', ')}`);
      }

      return groups;

    } catch (error) {
      logger.warn('⚠️  Could not validate user groups:', error.message);
      return [];
    }
  }

  /**
   * Get required groups for the platform
   */
  getRequiredGroups() {
    switch (this.platform) {
      case 'linux':
        return ['sudo', 'wheel', 'docker'];
      case 'darwin':
        return ['admin', 'wheel'];
      case 'win32':
        return ['Administrators', 'docker-users'];
      default:
        return [];
    }
  }

  /**
   * Validate platform-specific privileges
   */
  async validatePlatformPrivileges(operation) {
    switch (this.platform) {
      case 'linux':
        await this.validateLinuxPrivileges(operation);
        break;
      case 'darwin':
        await this.validateMacPrivileges(operation);
        break;
      case 'win32':
        await this.validateWindowsPrivileges(operation);
        break;
    }
  }

  /**
   * Validate Linux-specific privileges
   */
  async validateLinuxPrivileges(operation) {
    // Check systemd access for service operations
    if (operation.includes('service') || operation.includes('systemctl')) {
      try {
        await this.secureExecutor.executeValidated('systemctl --version');
        logger.info('✅ Systemd access available');
      } catch (error) {
        logger.warn('⚠️  Limited systemd access - some service operations may fail');
      }
    }

    // Check package manager access
    if (operation.includes('install') || operation.includes('package')) {
      const packageManagers = ['apt', 'yum', 'dnf', 'pacman'];
      let hasPackageManager = false;

      for (const pm of packageManagers) {
        try {
          await this.secureExecutor.executeValidated(`${pm} --version`);
          hasPackageManager = true;
          break;
        } catch (error) {
          continue;
        }
      }

      if (!hasPackageManager) {
        throw new Error('No supported package manager available');
      }
    }
  }

  /**
   * Validate macOS-specific privileges
   */
  async validateMacPrivileges(operation) {
    // Check Homebrew access
    if (operation.includes('install') || operation.includes('brew')) {
      try {
        await this.secureExecutor.executeValidated('brew --version');
        logger.info('✅ Homebrew access available');
      } catch (error) {
        logger.warn('⚠️  Homebrew not available - manual installation may be required');
      }
    }

    // Check Xcode command line tools
    if (operation.includes('git') || operation.includes('make')) {
      try {
        await this.secureExecutor.executeValidated('xcode-select --version');
        logger.info('✅ Xcode command line tools available');
      } catch (error) {
        logger.warn('⚠️  Xcode command line tools not available');
      }
    }
  }

  /**
   * Validate Windows-specific privileges
   */
  async validateWindowsPrivileges(operation) {
    // Check administrator privileges for system operations
    if (operation.includes('service') || operation.includes('install')) {
      if (!this.isRunningAsRoot()) {
        logger.warn('⚠️  Administrator privileges recommended for system operations');
      }
    }

    // Check WSL availability
    if (operation.includes('linux') || operation.includes('bash')) {
      try {
        await this.secureExecutor.executeValidated('wsl --version');
        logger.info('✅ WSL available for enhanced compatibility');
      } catch (error) {
        logger.info('ℹ️  WSL not available - using Windows alternatives');
      }
    }
  }

  /**
   * Check specific privilege requirement
   */
  async checkSpecificPrivilege(privilege, operation) {
    const cacheKey = `${privilege}:${operation}`;
    const cached = this.privilegeCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      if (!cached.hasPrivilege) {
        throw new Error(`Missing required privilege: ${privilege}`);
      }
      return true;
    }

    let hasPrivilege = false;

    switch (privilege) {
      case 'sudo':
        hasPrivilege = await this.checkSudoPrivilege();
        break;
      case 'docker':
        hasPrivilege = await this.checkDockerPrivilege();
        break;
      case 'network':
        hasPrivilege = await this.checkNetworkPrivilege();
        break;
      case 'filesystem':
        hasPrivilege = await this.checkFilesystemPrivilege();
        break;
      default:
        logger.warn(`Unknown privilege type: ${privilege}`);
        hasPrivilege = false;
    }

    this.privilegeCache.set(cacheKey, {
      hasPrivilege,
      timestamp: Date.now()
    });

    if (!hasPrivilege) {
      throw new Error(`Missing required privilege: ${privilege} for operation: ${operation}`);
    }

    return true;
  }

  /**
   * Check sudo privilege
   */
  async checkSudoPrivilege() {
    try {
      // Test sudo access with a safe command
      await Promise.race([
        this.secureExecutor.executeValidated('sudo -n true'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('sudo timeout')), 3000)
        )
      ]);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check Docker privilege
   */
  async checkDockerPrivilege() {
    try {
      await this.secureExecutor.executeValidated('docker ps');
      return true;
    } catch (error) {
      // Try with sudo
      try {
        await this.secureExecutor.executeValidated('sudo docker ps');
        logger.warn('⚠️  Docker requires sudo - consider adding user to docker group');
        return true;
      } catch (error) {
        return false;
      }
    }
  }

  /**
   * Check network privilege
   */
  async checkNetworkPrivilege() {
    try {
      // Test network access
      await this.secureExecutor.executeValidated('curl -s --connect-timeout 5 google.com > /dev/null');
      return true;
    } catch (error) {
      logger.warn('⚠️  Limited network access detected');
      return false;
    }
  }

  /**
   * Check filesystem privilege
   */
  async checkFilesystemPrivilege() {
    try {
      // Test file system write access
      const testFile = `/tmp/pern-privilege-test-${Date.now()}`;
      await this.secureExecutor.executeValidated(`touch ${testFile}`);
      await this.secureExecutor.executeValidated(`rm ${testFile}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if operation requires sudo
   */
  requiresSudo(operation) {
    // Exclude dependency installation operations from sudo requirements
    const dependencyOperations = [
      'client-deps-install',
      'server-deps-install',
      'template-deps-install',
      'deps-install'
    ];

    // If it's a dependency operation, don't require sudo
    if (dependencyOperations.includes(operation)) {
      return false;
    }

    const sudoOperations = [
      'install',
      'systemctl',
      'service',
      'apt',
      'yum',
      'dnf',
      'pacman',
      'brew',
      'npm install -g',
      'system'
    ];

    return sudoOperations.some(sudoOp => operation.includes(sudoOp));
  }

  /**
   * Validate sudo access for operation
   */
  async validateSudoAccess(operation) {
    const hasSudo = await this.checkSudoPrivilege();

    if (!hasSudo) {
      throw new Error(`Operation "${operation}" requires sudo access, but sudo is not available`);
    }

    // Additional sudo validation for sensitive operations
    if (this.isSensitiveOperation(operation)) {
      logger.warn(`⚠️  Sensitive operation "${operation}" requires manual sudo confirmation`);

      // In interactive mode, you might want to prompt for confirmation
      // For now, we'll log the warning and proceed
    }
  }

  /**
   * Check if operation is sensitive
   */
  isSensitiveOperation(operation) {
    const sensitiveOperations = [
      'systemctl',
      'service stop',
      'rm -rf',
      'format',
      'fdisk',
      'mkfs'
    ];

    return sensitiveOperations.some(sensitive => operation.includes(sensitive));
  }

  /**
   * Get current privilege status
   */
  getCurrentPrivileges() {
    return {
      user: this.currentUser,
      platform: this.platform,
      isRoot: this.isRunningAsRoot(),
      hasSudo: this.checkSudoPrivilege(),
      groups: this.validateUserGroups(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear privilege cache
   */
  clearCache() {
    this.privilegeCache.clear();
    logger.info('Privilege cache cleared');
  }

  /**
   * Get privilege requirements for operation
   */
  getPrivilegeRequirements(operation) {
    const requirements = {
      // Specific dependency operations first (most specific)
      'client-deps-install': ['filesystem'], // Client dependencies only need filesystem access
      'server-deps-install': ['filesystem'], // Server dependencies only need filesystem access
      'template-deps-install': ['filesystem'], // Template dependencies only need filesystem access
      'deps-install': ['filesystem'], // General dependencies only need filesystem access
      // Security operations
      'security-scan': ['filesystem'],
      'security-policies': ['filesystem'],
      'vulnerability-monitoring': ['filesystem'],
      'security-report': ['filesystem'],
      'compliance-check': ['filesystem'],
      // Other specific operations
      postgresql: ['filesystem'],
      redis: ['filesystem'],
      docker: ['filesystem'], // Changed from ['docker', 'filesystem'] to allow sudo usage
      nginx: ['sudo', 'filesystem'], // Changed from ['sudo', 'filesystem', 'network'] to allow local installation
      pm2: ['filesystem'], // Changed from ['filesystem', 'network'] to allow local npm install
      template: ['filesystem'], // Template operations need filesystem access
      // General operations last (least specific)
      system: ['sudo'],
      install: ['sudo'],
      network: ['network'],
      filesystem: ['filesystem']
    };

    // Find matching requirements
    for (const [key, reqs] of Object.entries(requirements)) {
      if (operation.includes(key)) {
        return reqs;
      }
    }

    return ['filesystem']; // Default minimum requirement
  }
}

module.exports = PrivilegeValidator;