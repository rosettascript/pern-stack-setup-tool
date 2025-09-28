/**
 * PERN Setup Tool - Data Protection Manager
 * Comprehensive data sanitization and protection utilities
 */

const winston = require('winston');
const crypto = require('crypto');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'data-protection' },
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
 * Data Protection Manager Class
 * Handles data sanitization, encryption, and protection
 */
class DataProtectionManager {
  constructor() {
    this.sensitivePatterns = this.initializeSensitivePatterns();
    this.encryptionKey = this.generateEncryptionKey();
    this.maskedData = new Map();
    this.sanitizationStats = {
      logsSanitized: 0,
      dataMasked: 0,
      filesEncrypted: 0,
      memoryCleared: 0
    };
  }

  /**
   * Initialize sensitive data patterns
   */
  initializeSensitivePatterns() {
    return {
      // Password patterns
      password: [
        /password["\s]*:[\s"']*([^"'\s]+)/gi,
        /passwd["\s]*:[\s"']*([^"'\s]+)/gi,
        /pwd["\s]*:[\s"']*([^"'\s]+)/gi,
        /secret["\s]*:[\s"']*([^"'\s]+)/gi
      ],

      // API keys and tokens
      apiKey: [
        /api[_-]?key["\s]*:[\s"']*([a-zA-Z0-9_-]+)/gi,
        /token["\s]*:[\s"']*([a-zA-Z0-9_.-]+)/gi,
        /bearer["\s]*:[\s"']*([a-zA-Z0-9_.-]+)/gi,
        /authorization["\s]*:[\s"']*([a-zA-Z0-9_.-]+)/gi
      ],

      // Database credentials
      database: [
        /host["\s]*:[\s"']*([^"'\s]+)/gi,
        /port["\s]*:[\s"']*(\d+)/gi,
        /username["\s]*:[\s"']*([^"'\s]+)/gi,
        /user["\s]*:[\s"']*([^"'\s]+)/gi,
        /database["\s]*:[\s"']*([^"'\s]+)/gi,
        /db["\s]*:[\s"']*([^"'\s]+)/gi
      ],

      // Network information
      network: [
        /ip["\s]*:[\s"']*([\d.]+)/gi,
        /host["\s]*:[\s"']*([^"'\s]+)/gi,
        /url["\s]*:[\s"']*([^"'\s]+)/gi,
        /endpoint["\s]*:[\s"']*([^"'\s]+)/gi
      ],

      // Personal information
      personal: [
        /email["\s]*:[\s"']*([^"'\s@]+@[^"'\s@]+\.[^"'\s@]+)/gi,
        /phone["\s]*:[\s"']*([^"'\s]+)/gi,
        /ssn["\s]*:[\s"']*([^"'\s]+)/gi,
        /name["\s]*:[\s"']*([^"'\s]+)/gi
      ],

      // File paths (sensitive)
      filePath: [
        /\/home\/[^\/\s]+/gi,
        /\/Users\/[^\/\s]+/gi,
        /C:\\Users\\[^\\s]+/gi,
        /\.ssh/gi,
        /\.env/gi,
        /config/gi
      ]
    };
  }

  /**
   * Sanitize data for logging
   */
  sanitizeForLogging(data, context = 'general') {
    try {
      if (!data) return data;

      let sanitized = data;
      let sensitiveFound = false;

      // Apply all sanitization patterns
      for (const [category, patterns] of Object.entries(this.sensitivePatterns)) {
        for (const pattern of patterns) {
          if (pattern.test(sanitized)) {
            sanitized = sanitized.replace(pattern, (match, capture) => {
              const mask = this.generateMask(capture, category);
              this.maskedData.set(mask, { original: capture, category, context, timestamp: Date.now() });
              sensitiveFound = true;
              return match.replace(capture, mask);
            });
          }
        }
      }

      if (sensitiveFound) {
        this.sanitizationStats.logsSanitized++;
        logger.debug(`🔒 Data sanitized for logging in context: ${context}`);
      }

      return sanitized;

    } catch (error) {
      logger.error('❌ Error sanitizing data for logging:', error.message);
      return '[SANITIZATION_ERROR]';
    }
  }

  /**
   * Sanitize error messages for production
   */
  sanitizeErrorMessage(error, production = false) {
    try {
      if (!error) return 'Unknown error';

      let message = error.message || error.toString();

      if (production) {
        // In production, return generic messages
        const genericMessages = {
          'authentication': 'Authentication failed',
          'authorization': 'Access denied',
          'database': 'Database operation failed',
          'network': 'Network operation failed',
          'filesystem': 'File operation failed',
          'validation': 'Input validation failed',
          'system': 'System operation failed'
        };

        // Try to categorize the error
        for (const [category, generic] of Object.entries(genericMessages)) {
          if (message.toLowerCase().includes(category)) {
            logger.warn(`🔒 Error message sanitized: ${category} error`);
            return generic;
          }
        }

        // Default generic message
        logger.warn('🔒 Error message sanitized: generic error');
        return 'Operation failed';
      }

      // In development, sanitize but keep some details
      return this.sanitizeForLogging(message, 'error');

    } catch (error) {
      logger.error('❌ Error sanitizing error message:', error.message);
      return 'Error sanitization failed';
    }
  }

  /**
   * Generate appropriate mask for sensitive data
   */
  generateMask(original, category) {
    const length = original.length;

    switch (category) {
      case 'password':
        return '***';
      case 'apiKey':
      case 'token':
        return `${original.substring(0, 4)}****${original.substring(length - 4)}`;
      case 'email':
        const [user, domain] = original.split('@');
        return `${user.substring(0, 2)}***@${domain}`;
      case 'filePath':
        return '[PATH_SANITIZED]';
      default:
        return `${original.substring(0, 2)}***${original.substring(length - 2)}`;
    }
  }

  /**
   * Encrypt sensitive configuration data
   */
  encryptSensitiveData(data) {
    try {
      if (!data || typeof data !== 'string') {
        return data;
      }

      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      this.sanitizationStats.filesEncrypted++;
      logger.info('🔐 Sensitive data encrypted');

      return {
        encrypted: true,
        data: encrypted,
        iv: iv.toString('hex'),
        timestamp: Date.now()
      };

    } catch (error) {
      logger.error('❌ Error encrypting sensitive data:', error.message);
      throw new Error('Data encryption failed');
    }
  }

  /**
   * Decrypt sensitive configuration data
   */
  decryptSensitiveData(encryptedData) {
    try {
      if (!encryptedData || !encryptedData.encrypted) {
        return encryptedData;
      }

      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      logger.info('🔓 Sensitive data decrypted');
      return decrypted;

    } catch (error) {
      logger.error('❌ Error decrypting sensitive data:', error.message);
      throw new Error('Data decryption failed');
    }
  }

  /**
   * Clear sensitive data from memory
   */
  clearSensitiveData(data) {
    try {
      if (typeof data === 'string') {
        // Overwrite string content
        data = '*'.repeat(data.length);
      } else if (Buffer.isBuffer(data)) {
        // Clear buffer
        data.fill(0);
      } else if (typeof data === 'object' && data !== null) {
        // Clear object properties
        for (const key in data) {
          if (data.hasOwnProperty(key)) {
            data[key] = this.clearSensitiveData(data[key]);
          }
        }
      }

      this.sanitizationStats.memoryCleared++;
      return data;

    } catch (error) {
      logger.error('❌ Error clearing sensitive data from memory:', error.message);
      return null;
    }
  }

  /**
   * Validate data against security policies
   */
  validateDataSecurity(data, context = 'general') {
    try {
      const violations = [];

      // Check for sensitive data patterns
      for (const [category, patterns] of Object.entries(this.sensitivePatterns)) {
        for (const pattern of patterns) {
          if (pattern.test(data)) {
            violations.push({
              category,
              pattern: pattern.toString(),
              context,
              severity: this.getSeverityLevel(category)
            });
          }
        }
      }

      // Check data size limits
      if (data.length > 10000) {
        violations.push({
          category: 'size',
          message: 'Data exceeds recommended size limit',
          severity: 'medium'
        });
      }

      return {
        valid: violations.length === 0,
        violations,
        recommendations: this.generateSecurityRecommendations(violations)
      };

    } catch (error) {
      logger.error('❌ Error validating data security:', error.message);
      return {
        valid: false,
        violations: [{ category: 'validation_error', severity: 'high' }],
        recommendations: ['Manual security review required']
      };
    }
  }

  /**
   * Get severity level for data category
   */
  getSeverityLevel(category) {
    const severityMap = {
      password: 'critical',
      apiKey: 'high',
      token: 'high',
      database: 'high',
      personal: 'high',
      network: 'medium',
      filePath: 'medium',
      size: 'low'
    };

    return severityMap[category] || 'medium';
  }

  /**
   * Generate security recommendations
   */
  generateSecurityRecommendations(violations) {
    const recommendations = [];

    const hasCritical = violations.some(v => v.severity === 'critical');
    const hasHigh = violations.some(v => v.severity === 'high');

    if (hasCritical) {
      recommendations.push('CRITICAL: Immediate security review required');
      recommendations.push('Consider rotating all exposed credentials');
    }

    if (hasHigh) {
      recommendations.push('HIGH: Implement data sanitization before logging');
      recommendations.push('Use encryption for sensitive configuration files');
    }

    if (violations.some(v => v.category === 'size')) {
      recommendations.push('Consider chunking large data operations');
    }

    if (recommendations.length === 0) {
      recommendations.push('Data appears secure, continue monitoring');
    }

    return recommendations;
  }

  /**
   * Generate encryption key
   */
  generateEncryptionKey() {
    // In production, this should be loaded from secure key management
    const key = process.env.DATA_ENCRYPTION_KEY ||
                crypto.randomBytes(32).toString('hex');
    return key.substring(0, 32); // Ensure 32 bytes for AES-256
  }

  /**
   * Get sanitization statistics
   */
  getSanitizationStats() {
    return { ...this.sanitizationStats };
  }

  /**
   * Clear sanitization statistics
   */
  clearStats() {
    this.sanitizationStats = {
      logsSanitized: 0,
      dataMasked: 0,
      filesEncrypted: 0,
      memoryCleared: 0
    };
    logger.info('Sanitization statistics cleared');
  }

  /**
   * Get masked data audit trail
   */
  getMaskedDataAudit() {
    const audit = [];
    for (const [mask, info] of this.maskedData.entries()) {
      audit.push({
        mask,
        category: info.category,
        context: info.context,
        timestamp: new Date(info.timestamp).toISOString()
      });
    }
    return audit;
  }

  /**
   * Clear old masked data (privacy preservation)
   */
  clearOldMaskedData(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    const cutoff = Date.now() - maxAge;
    let cleared = 0;

    for (const [mask, info] of this.maskedData.entries()) {
      if (info.timestamp < cutoff) {
        this.maskedData.delete(mask);
        cleared++;
      }
    }

    if (cleared > 0) {
      logger.info(`🧹 Cleared ${cleared} old masked data entries`);
    }

    return cleared;
  }
}

module.exports = DataProtectionManager;