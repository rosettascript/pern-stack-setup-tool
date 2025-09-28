/**
 * PERN Setup Tool - Enhanced Logging System
 * Comprehensive logging with Winston, performance tracking, and error management
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

/**
 * Enhanced Logger Class
 * Provides comprehensive logging capabilities with performance tracking
 */
class Logger {
  constructor() {
    this.logDir = path.join(os.homedir(), '.pern-setup', 'logs');
    this.performanceMetrics = new Map();
    this.errorCounts = new Map();
    this.startTime = Date.now();

    this.initializeLogger();
  }

  /**
   * Initialize Winston logger with multiple transports
   */
  initializeLogger() {
    // Create log directory
    fs.ensureDirSync(this.logDir);

    // Winston configuration
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'pern-setup',
        version: '2.0.0',
        platform: process.platform,
        nodeVersion: process.version
      },
      transports: [
        // Error log file
        new winston.transports.File({
          filename: path.join(this.logDir, 'error.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        // Combined log file
        new winston.transports.File({
          filename: path.join(this.logDir, 'combined.log'),
          maxsize: 10485760, // 10MB
          maxFiles: 10
        }),
        // Security events log
        new winston.transports.File({
          filename: path.join(this.logDir, 'security.log'),
          level: 'warn'
        })
      ]
    });

    // Console logging in development
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
            return `${timestamp} ${level}: ${message}${metaStr}`;
          })
        )
      }));
    }
  }

  /**
   * Log info message
   */
  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  /**
   * Log warning message
   */
  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  /**
   * Log error message
   */
  error(message, error = null, meta = {}) {
    const errorMeta = {
      ...meta,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    };

    this.logger.error(message, errorMeta);

    // Track error metrics
    const errorKey = error ? error.name : 'Unknown';
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
  }

  /**
   * Log debug message
   */
  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  /**
   * Log security-related events
   */
  security(event, details = {}) {
    this.logger.warn(`Security Event: ${event}`, {
      ...details,
      securityEvent: true,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Start performance timer
   */
  startTimer(name) {
    this.performanceMetrics.set(name, {
      start: Date.now(),
      end: null,
      duration: null
    });
  }

  /**
   * End performance timer
   */
  endTimer(name) {
    const metric = this.performanceMetrics.get(name);
    if (metric) {
      metric.end = Date.now();
      metric.duration = metric.end - metric.start;
      return metric.duration;
    }
    return null;
  }

  /**
   * Record performance metric
   */
  recordMetric(name, value, unit = 'ms') {
    const metric = {
      value,
      unit,
      timestamp: Date.now()
    };

    if (!this.performanceMetrics.has(name)) {
      this.performanceMetrics.set(name, []);
    }

    const history = this.performanceMetrics.get(name);
    history.push(metric);

    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const stats = {};

    this.performanceMetrics.forEach((history, name) => {
      if (history.length > 0) {
        const values = history.map(m => m.value);
        stats[name] = {
          count: values.length,
          average: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          last: values[values.length - 1]
        };
      }
    });

    return stats;
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0);
    const errorTypes = Array.from(this.errorCounts.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / totalErrors) * 100)
    }));

    return {
      totalErrors,
      errorTypes,
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Generate comprehensive log report
   */
  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      performance: this.getPerformanceStats(),
      errors: this.getErrorStats(),
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        memory: process.memoryUsage(),
        pid: process.pid
      }
    };

    // Save report to file
    const reportPath = path.join(this.logDir, 'report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  /**
   * Log operation with performance tracking
   */
  async logOperation(operation, executor) {
    const startTime = Date.now();
    this.startTimer(operation);

    try {
      this.info(`Starting operation: ${operation}`);
      const result = await executor();
      const duration = this.endTimer(operation);

      this.info(`Operation completed: ${operation}`, {
        duration: `${duration}ms`,
        success: true
      });

      return result;
    } catch (error) {
      const duration = this.endTimer(operation);

      this.error(`Operation failed: ${operation}`, error, {
        duration: `${duration}ms`,
        success: false
      });

      throw error;
    }
  }

  /**
   * Log security event
   */
  logSecurityEvent(event, user, details = {}) {
    this.security(event, {
      user,
      ...details,
      severity: this.assessSecuritySeverity(event)
    });
  }

  /**
   * Assess security event severity
   */
  assessSecuritySeverity(event) {
    const highSeverityEvents = [
      'unauthorized_access',
      'privilege_escalation',
      'data_breach',
      'malicious_activity'
    ];

    const mediumSeverityEvents = [
      'failed_login',
      'suspicious_activity',
      'policy_violation'
    ];

    if (highSeverityEvents.includes(event)) return 'high';
    if (mediumSeverityEvents.includes(event)) return 'medium';
    return 'low';
  }

  /**
   * Create operation-specific logger
   */
  createOperationLogger(operation) {
    return {
      info: (message, meta) => this.info(`[${operation}] ${message}`, meta),
      warn: (message, meta) => this.warn(`[${operation}] ${message}`, meta),
      error: (message, error, meta) => this.error(`[${operation}] ${message}`, error, meta),
      debug: (message, meta) => this.debug(`[${operation}] ${message}`, meta)
    };
  }

  /**
   * Log system health check
   */
  async logHealthCheck(healthData) {
    const healthStatus = {
      ...healthData,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime
    };

    this.info('Health check', healthStatus);

    // Log warnings for concerning metrics
    if (healthData.memoryUsage > 80) {
      this.warn('High memory usage detected', { memoryUsage: healthData.memoryUsage });
    }

    if (healthData.errorRate > 5) {
      this.warn('High error rate detected', { errorRate: healthData.errorRate });
    }
  }

  /**
   * Get recent logs for analysis
   */
  async getRecentLogs(hours = 24) {
    try {
      const combinedLogPath = path.join(this.logDir, 'combined.log');
      const logs = await fs.readFile(combinedLogPath, 'utf8');

      const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
      const lines = logs.split('\n');

      return lines
        .filter(line => {
          try {
            const logEntry = JSON.parse(line);
            const logTime = new Date(logEntry.timestamp).getTime();
            return logTime > cutoffTime;
          } catch {
            return false;
          }
        })
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return { raw: line };
          }
        });

    } catch (error) {
      this.error('Failed to read recent logs', error);
      return [];
    }
  }

  /**
   * Archive old logs
   */
  async archiveLogs() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const archiveName = `logs-archive-${timestamp}.tar.gz`;
      const archivePath = path.join(this.logDir, '..', archiveName);

      // Create archive of logs older than 30 days
      const { exec } = require('child-process-promise');
      await exec(`find ${this.logDir} -name "*.log" -mtime +30 -type f | tar -czf ${archivePath} -T -`);

      // Remove archived logs
      await exec(`find ${this.logDir} -name "*.log" -mtime +30 -type f -delete`);

      this.info('Log archive created', { archivePath });
      return archivePath;

    } catch (error) {
      this.error('Log archiving failed', error);
      throw error;
    }
  }

  /**
   * Get log statistics
   */
  async getLogStats() {
    try {
      const files = await fs.readdir(this.logDir);
      let totalSize = 0;
      let totalLines = 0;

      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = path.join(this.logDir, file);
          const stats = await fs.stat(filePath);
          totalSize += stats.size;

          const content = await fs.readFile(filePath, 'utf8');
          totalLines += content.split('\n').length;
        }
      }

      return {
        totalFiles: files.filter(f => f.endsWith('.log')).length,
        totalSize,
        totalLines,
        oldestLog: Math.min(...(await Promise.all(
          files.filter(f => f.endsWith('.log')).map(async f => {
            const stats = await fs.stat(path.join(this.logDir, f));
            return stats.mtime.getTime();
          })
        ))),
        newestLog: Math.max(...(await Promise.all(
          files.filter(f => f.endsWith('.log')).map(async f => {
            const stats = await fs.stat(path.join(this.logDir, f));
            return stats.mtime.getTime();
          })
        )))
      };

    } catch (error) {
      this.error('Failed to get log stats', error);
      return null;
    }
  }
}

module.exports = Logger;