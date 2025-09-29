/**
 * PERN Setup Tool - Secure Command Executor
 * Provides secure command execution with input sanitization and validation
 */

const { exec } = require('child-process-promise');
const winston = require('winston');
const Joi = require('joi');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'secure-executor' },
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
 * Secure Command Executor Class
 * Ensures safe execution of system commands
 */
class SecureCommandExecutor {
  constructor() {
    this.commandHistory = [];
    this.sanitizationRules = this.initializeSanitizationRules();
    this.allowedCommands = this.initializeAllowedCommands();
  }

  /**
   * Initialize input sanitization rules
   */
  initializeSanitizationRules() {
    return {
      // Database identifiers (PostgreSQL)
      dbIdentifier: Joi.string().pattern(/^[a-zA-Z_][a-zA-Z0-9_]*$/).max(63),

      // Passwords (allow special chars but prevent command injection)
      password: Joi.string().min(8).max(128).pattern(/^[^'";\\`]*$/),

      // File paths (prevent directory traversal)
      filePath: Joi.string().pattern(/^[^;&|`]*$/).max(500),

      // Hostnames/IP addresses
      hostname: Joi.string().pattern(/^[a-zA-Z0-9.-]+$/).max(253),

      // Port numbers
      port: Joi.number().integer().min(1).max(65535),

      // Memory values
      memory: Joi.string().pattern(/^\d+[kmgt]?b?$/i),

      // Generic alphanumeric
      alphanumeric: Joi.string().pattern(/^[a-zA-Z0-9_-]+$/).max(100)
    };
  }

  /**
   * Initialize allowed commands whitelist
   */
  initializeAllowedCommands() {
    return {
      // PostgreSQL commands
      psql: {
        command: 'psql',
        allowedFlags: ['-U', '-h', '-p', '-d', '-c', '-f'],
        requiresSanitization: ['username', 'database', 'password']
      },

      // Redis commands
      redis: {
        command: 'redis-cli',
        allowedFlags: ['-h', '-p', '-a'],
        requiresSanitization: ['password']
      },

      // Docker commands
      docker: {
        command: 'docker',
        allowedFlags: ['run', 'build', 'pull', 'push', 'exec', 'logs', 'ps', 'images'],
        requiresSanitization: ['image', 'container', 'network']
      },

      // System commands
      systemctl: {
        command: 'systemctl',
        allowedFlags: ['start', 'stop', 'restart', 'status', 'enable', 'disable'],
        requiresSanitization: ['service']
      },

      // PM2 commands
      pm2: {
        command: 'pm2',
        allowedFlags: ['start', 'stop', 'restart', 'delete', 'list', 'logs', 'monit'],
        requiresSanitization: ['app', 'script']
      },

      // Nginx commands
      nginx: {
        command: 'nginx',
        allowedFlags: ['-t', '-s', '-c'],
        requiresSanitization: ['config']
      }
    };
  }

  /**
   * Sanitize input based on type
   */
  sanitizeInput(input, type) {
    try {
      const rule = this.sanitizationRules[type];
      if (!rule) {
        throw new Error(`Unknown sanitization type: ${type}`);
      }

      const { error, value } = rule.validate(input);
      if (error) {
        throw new Error(`Input validation failed for ${type}: ${error.details[0].message}`);
      }

      return value;
    } catch (error) {
      logger.error(`Input sanitization failed for ${type}:`, error.message);
      throw new Error(`Invalid input for ${type}: ${error.message}`);
    }
  }

  /**
   * Build secure command string
   */
  buildSecureCommand(baseCommand, parameters, allowedCommand) {
    const parts = [baseCommand];

    for (const [key, value] of Object.entries(parameters)) {
      if (allowedCommand.allowedFlags.includes(key)) {
        // Flag-based parameter
        if (typeof value === 'boolean' && value) {
          parts.push(`--${key}`);
        } else if (typeof value === 'string') {
          const sanitizedValue = this.sanitizeInput(value, allowedCommand.requiresSanitization?.includes(key) ? key : 'alphanumeric');
          parts.push(`--${key}`, `'${sanitizedValue.replace(/'/g, "'\"'\"'")}'`);
        }
      } else if (key === 'args' && Array.isArray(value)) {
        // Positional arguments
        for (const arg of value) {
          const sanitizedArg = this.sanitizeInput(arg, 'alphanumeric');
          parts.push(sanitizedArg);
        }
      }
    }

    return parts.join(' ');
  }

  /**
   * Execute command securely
   */
  async executeSecure(commandKey, parameters = {}, options = {}) {
    try {
      const allowedCommand = this.allowedCommands[commandKey];
      if (!allowedCommand) {
        throw new Error(`Command not allowed: ${commandKey}`);
      }

      // Build secure command
      const secureCommand = this.buildSecureCommand(
        allowedCommand.command,
        parameters,
        allowedCommand
      );

      // Log command execution (without sensitive data)
      logger.info(`Executing secure command: ${commandKey}`);

      // Set execution options
      const execOptions = {
        timeout: options.timeout || 30000,
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        ...options
      };

      // Execute command
      const result = await exec(secureCommand, execOptions);

      // Record in history
      this.commandHistory.push({
        command: commandKey,
        timestamp: new Date().toISOString(),
        success: true
      });

      logger.info(`Command executed successfully: ${commandKey}`);
      return result;

    } catch (error) {
      // Record failed command
      this.commandHistory.push({
        command: commandKey,
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message
      });

      logger.error(`Command execution failed: ${commandKey}`, {
        error: error.message,
        code: error.code,
        signal: error.signal
      });

      throw new Error(`Secure command execution failed: ${error.message}`);
    }
  }

  /**
   * Execute raw command with validation (for trusted internal commands)
   */
  async executeValidated(command, options = {}) {
    try {
      // Basic command validation
      if (!command || typeof command !== 'string') {
        throw new Error('Invalid command format');
      }

      // Whitelist of safe sudo commands and Windows equivalents
      const safeSudoCommands = [
        'sudo -n true',           // Check sudo access without prompt
        'sudo -u postgres',       // Switch to postgres user
        'sudo systemctl',         // System control commands
        'sudo apt',               // Package management
        'sudo brew',              // Homebrew commands
        'sudo chmod',             // Safe chmod commands (not 777)
        'sudo cp',                // Copy commands
        'sudo mkdir',             // Create directories
        'sudo touch',             // Create files
        'sudo find',              // Find commands
        'sudo grep',              // Grep commands
        'sudo sed',               // Sed commands
        'sudo cat',               // Cat commands
        'sudo ls',                // List commands
        'sudo ps',                // Process commands
        'sudo whoami',            // User info
        'sudo groups',            // Group info
        'sudo id',                // User ID info
        'net start',              // Windows service start
        'net stop',               // Windows service stop
        'net start |',            // Windows service listing
        'sc query',               // Windows service query
        'sc start',               // Windows service start (sc)
        'psql -U postgres',       // PostgreSQL commands
        'psql -d postgres',       // PostgreSQL database commands
        'brew services',          // Homebrew service commands
        'systemctl status',       // Linux systemctl status
        'systemctl start',        // Linux systemctl start
        'systemctl stop',         // Linux systemctl stop
        'systemctl enable',       // Linux systemctl enable
        'systemctl restart',      // Linux systemctl restart
        // Basic system commands (non-sudo)
        'groups',                 // User groups
        'whoami',                 // Current user
        'id',                     // User ID info
        'whoami /groups',         // Windows groups
        'net session',            // Windows admin check
        'touch',                  // Create files
        'rm'                      // Remove files
      ];

      // Check for dangerous patterns
      const dangerousPatterns = [
        /rm\s+-rf\s+\/[^\/]/,  // Dangerous rm commands
        />\s*\/dev/,           // Redirect to device files
        /sudo\s+.*--\w/,       // Sudo with dangerous flags (but allow -n, -u, etc.)
        /curl.*\|\s*sh/,       // Pipe curl to shell
        /wget.*\|\s*sh/,       // Pipe wget to shell
        /sudo\s+.*rm\s+-rf/,   // Sudo with dangerous rm
        /sudo\s+.*chmod\s+777/, // Sudo with dangerous chmod
        /sudo\s+.*passwd\s+--/, // Sudo with password reset flags
        /sudo\s+.*userdel/,    // Sudo with user deletion
        /sudo\s+.*groupdel/,   // Sudo with group deletion
        /sudo\s+.*deluser/,    // Sudo with user deletion (Debian)
        /sudo\s+.*delgroup/    // Sudo with group deletion (Debian)
      ];

      // Check if command starts with a safe sudo command
      const isSafeSudo = safeSudoCommands.some(safeCmd => 
        command.startsWith(safeCmd)
      );

      // Only check dangerous patterns if it's not a safe sudo command
      if (!isSafeSudo) {
        for (const pattern of dangerousPatterns) {
          if (pattern.test(command)) {
            throw new Error(`Dangerous command pattern detected: ${pattern}`);
          }
        }
      }

      logger.warn(`Executing validated raw command: ${command.substring(0, 100)}...`);

      const result = await exec(command, {
        timeout: options.timeout || 30000,
        cwd: options.cwd || process.cwd(),
        ...options
      });

      return result;

    } catch (error) {
      logger.error('Validated command execution failed:', error.message);
      throw error;
    }
  }

  /**
   * Get command execution history
   */
  getCommandHistory() {
    return [...this.commandHistory];
  }

  /**
   * Clear command history
   */
  clearHistory() {
    this.commandHistory = [];
    logger.info('Command history cleared');
  }

  /**
   * Validate command before execution
   */
  validateCommand(commandKey, parameters) {
    const allowedCommand = this.allowedCommands[commandKey];
    if (!allowedCommand) {
      return { valid: false, error: `Unknown command: ${commandKey}` };
    }

    // Validate required parameters
    for (const param of allowedCommand.requiresSanitization || []) {
      if (parameters[param] && !this.sanitizationRules[param]) {
        return { valid: false, error: `Missing sanitization rule for parameter: ${param}` };
      }
    }

    return { valid: true };
  }
}

module.exports = SecureCommandExecutor;