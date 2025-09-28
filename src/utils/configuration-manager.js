/**
 * PERN Setup Tool - Configuration Manager
 * Centralized configuration management with validation and environment support
 */

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const Joi = require('joi');

/**
 * Configuration Manager Class
 * Handles all configuration operations with validation and persistence
 */
class ConfigurationManager {
  constructor() {
    this.configDir = path.join(os.homedir(), '.pern-setup');
    this.configFile = path.join(this.configDir, 'config.json');
    this.envFile = '.env';
    this.config = new Map();
    this.validationSchemas = this.initializeSchemas();
    this.environment = process.env.NODE_ENV || 'development';
  }

  /**
   * Initialize validation schemas for different configuration sections
   */
  initializeSchemas() {
    return {
      system: Joi.object({
        nodeVersion: Joi.string().pattern(/^v?\d+\.\d+\.\d+/).required(),
        platform: Joi.string().valid('linux', 'darwin', 'win32').required(),
        architecture: Joi.string().valid('x64', 'arm64', 'ia32').required(),
        memory: Joi.number().min(1024 * 1024 * 1024).required(),
        diskSpace: Joi.number().min(5 * 1024 * 1024 * 1024).required()
      }),

      database: Joi.object({
        type: Joi.string().valid('postgresql', 'mysql', 'sqlite').default('postgresql'),
        host: Joi.string().hostname().default('localhost'),
        port: Joi.number().integer().min(1024).max(65535).default(5432),
        name: Joi.string().min(1).max(63).required(),
        username: Joi.string().alphanum().min(1).max(63).required(),
        password: Joi.string().min(8).max(128).required(),
        ssl: Joi.boolean().default(false),
        connectionTimeout: Joi.number().integer().min(1000).max(60000).default(5000)
      }),

      redis: Joi.object({
        host: Joi.string().hostname().default('localhost'),
        port: Joi.number().integer().min(1024).max(65535).default(6379),
        password: Joi.string().allow('').optional(),
        database: Joi.number().integer().min(0).max(15).default(0),
        maxMemory: Joi.string().pattern(/^\d+[kmg]?b?$/i).default('256mb'),
        persistence: Joi.string().valid('rdb', 'aof', 'both', 'none').default('aof')
      }),

      docker: Joi.object({
        networks: Joi.array().items(Joi.string()).default(['pern_network']),
        volumes: Joi.array().items(Joi.string()).default([]),
        composeFile: Joi.string().default('docker-compose.yml'),
        registry: Joi.string().hostname().optional(),
        buildContext: Joi.string().default('.')
      }),

      project: Joi.object({
        name: Joi.string().pattern(/^[a-zA-Z0-9-_]+$/).min(1).max(50).required(),
        type: Joi.string().valid('basic', 'fullstack', 'backend', 'frontend', 'microservices').required(),
        location: Joi.string().min(1).max(500).required(),
        template: Joi.string().optional(),
        features: Joi.array().items(Joi.string()).default([]),
        structure: Joi.object({
          client: Joi.boolean().default(true),
          server: Joi.boolean().default(true),
          database: Joi.boolean().default(true),
          docker: Joi.boolean().default(false),
          tests: Joi.boolean().default(true)
        })
      }),

      security: Joi.object({
        jwtSecret: Joi.string().min(32).max(128).required(),
        bcryptRounds: Joi.number().integer().min(10).max(15).default(12),
        sessionTimeout: Joi.number().integer().min(300).max(86400).default(3600),
        corsOrigins: Joi.array().items(Joi.string()).default(['http://localhost:3000']),
        rateLimiting: Joi.object({
          windowMs: Joi.number().integer().default(900000),
          maxRequests: Joi.number().integer().default(100)
        })
      }),

      performance: Joi.object({
        caching: Joi.boolean().default(true),
        parallelProcessing: Joi.boolean().default(true),
        maxConcurrency: Joi.number().integer().min(1).max(16).default(4),
        cacheSize: Joi.number().integer().min(1024).max(10 * 1024 * 1024).default(1024 * 1024),
        monitoring: Joi.boolean().default(true)
      })
    };
  }

  /**
   * Load configuration from file and environment
   */
  async load() {
    try {
      // Load from file if exists
      if (await fs.pathExists(this.configFile)) {
        const fileConfig = await fs.readFile(this.configFile, 'utf8');
        const parsed = JSON.parse(fileConfig);

        // Convert to Map
        Object.entries(parsed).forEach(([key, value]) => {
          this.config.set(key, value);
        });
      }

      // Load from environment variables
      this.loadFromEnvironment();

      // Validate configuration
      await this.validate();

      // Set defaults for missing values
      this.setDefaults();

      console.log('✅ Configuration loaded successfully');
    } catch (error) {
      console.error('❌ Configuration loading failed:', error.message);
      throw error;
    }
  }

  /**
   * Load configuration from environment variables
   */
  loadFromEnvironment() {
    const envMappings = {
      'DATABASE_URL': 'database.url',
      'DATABASE_HOST': 'database.host',
      'DATABASE_PORT': 'database.port',
      'DATABASE_NAME': 'database.name',
      'DATABASE_USERNAME': 'database.username',
      'DATABASE_PASSWORD': 'database.password',
      'REDIS_URL': 'redis.url',
      'REDIS_HOST': 'redis.host',
      'REDIS_PORT': 'redis.port',
      'REDIS_PASSWORD': 'redis.password',
      'JWT_SECRET': 'security.jwtSecret',
      'SESSION_TIMEOUT': 'security.sessionTimeout',
      'NODE_ENV': 'environment',
      'LOG_LEVEL': 'logging.level',
      'CACHE_ENABLED': 'performance.caching',
      'PARALLEL_PROCESSING': 'performance.parallelProcessing'
    };

    Object.entries(envMappings).forEach(([envVar, configPath]) => {
      if (process.env[envVar]) {
        this.set(configPath, process.env[envVar]);
      }
    });
  }

  /**
   * Validate current configuration
   */
  async validate() {
    const configObject = this.toObject();

    // Validate each section
    for (const [section, schema] of Object.entries(this.validationSchemas)) {
      if (configObject[section]) {
        const { error } = schema.validate(configObject[section]);
        if (error) {
          throw new Error(`Configuration validation failed for ${section}: ${error.details[0].message}`);
        }
      }
    }
  }

  /**
   * Set default values for missing configuration
   */
  setDefaults() {
    const defaults = {
      database: {
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        ssl: false
      },
      redis: {
        host: 'localhost',
        port: 6379,
        database: 0,
        maxMemory: '256mb',
        persistence: 'aof'
      },
      docker: {
        networks: ['pern_network'],
        volumes: []
      },
      security: {
        bcryptRounds: 12,
        sessionTimeout: 3600,
        corsOrigins: ['http://localhost:3000']
      },
      performance: {
        caching: true,
        parallelProcessing: true,
        maxConcurrency: 4,
        monitoring: true
      }
    };

    Object.entries(defaults).forEach(([section, values]) => {
      if (!this.config.has(section)) {
        this.config.set(section, {});
      }

      const sectionConfig = this.config.get(section);
      Object.entries(values).forEach(([key, value]) => {
        if (sectionConfig[key] === undefined) {
          sectionConfig[key] = value;
        }
      });
    });
  }

  /**
   * Get configuration value
   */
  get(key, defaultValue = null) {
    const keys = key.split('.');
    let current = this.config;

    for (const k of keys) {
      if (current instanceof Map) {
        current = current.get(k);
      } else if (current && typeof current === 'object') {
        current = current[k];
      } else {
        return defaultValue;
      }

      if (current === undefined) {
        return defaultValue;
      }
    }

    return current;
  }

  /**
   * Set configuration value
   */
  set(key, value) {
    const keys = key.split('.');
    let current = this.config;

    // Navigate to the parent object
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!current.has(k) || !(current.get(k) instanceof Object)) {
        current.set(k, new Map());
      }
      current = current.get(k);
    }

    // Set the value
    const lastKey = keys[keys.length - 1];
    if (current instanceof Map) {
      current.set(lastKey, value);
    } else {
      current[lastKey] = value;
    }
  }

  /**
   * Get all configuration as object
   */
  toObject() {
    const result = {};

    this.config.forEach((value, key) => {
      if (value instanceof Map) {
        result[key] = this.mapToObject(value);
      } else {
        result[key] = value;
      }
    });

    return result;
  }

  /**
   * Convert Map to Object recursively
   */
  mapToObject(map) {
    const result = {};

    map.forEach((value, key) => {
      if (value instanceof Map) {
        result[key] = this.mapToObject(value);
      } else {
        result[key] = value;
      }
    });

    return result;
  }

  /**
   * Save configuration to file
   */
  async save() {
    try {
      await fs.ensureDir(this.configDir);

      const configObject = this.toObject();
      await fs.writeFile(this.configFile, JSON.stringify(configObject, null, 2));

      console.log('✅ Configuration saved');
    } catch (error) {
      console.error('❌ Configuration save failed:', error.message);
      throw error;
    }
  }

  /**
   * Export configuration for environment
   */
  async exportEnvironment(targetPath = '.env') {
    try {
      const config = this.toObject();
      let envContent = '';

      // Database configuration
      if (config.database) {
        envContent += `# Database Configuration\n`;
        envContent += `DATABASE_TYPE=${config.database.type || 'postgresql'}\n`;
        envContent += `DATABASE_HOST=${config.database.host || 'localhost'}\n`;
        envContent += `DATABASE_PORT=${config.database.port || 5432}\n`;
        envContent += `DATABASE_NAME=${config.database.name || 'myapp'}\n`;
        envContent += `DATABASE_USERNAME=${config.database.username || 'postgres'}\n`;
        envContent += `DATABASE_PASSWORD=${config.database.password || '1234'}\n`;
        envContent += `DATABASE_SSL=${config.database.ssl || false}\n\n`;
      }

      // Redis configuration
      if (config.redis) {
        envContent += `# Redis Configuration\n`;
        envContent += `REDIS_HOST=${config.redis.host || 'localhost'}\n`;
        envContent += `REDIS_PORT=${config.redis.port || 6379}\n`;
        envContent += `REDIS_PASSWORD=${config.redis.password || ''}\n`;
        envContent += `REDIS_DATABASE=${config.redis.database || 0}\n\n`;
      }

      // Security configuration
      if (config.security) {
        envContent += `# Security Configuration\n`;
        envContent += `JWT_SECRET=${config.security.jwtSecret || 'your-jwt-secret'}\n`;
        envContent += `BCRYPT_ROUNDS=${config.security.bcryptRounds || 12}\n`;
        envContent += `SESSION_TIMEOUT=${config.security.sessionTimeout || 3600}\n`;
        envContent += `CORS_ORIGINS=${(config.security.corsOrigins || ['http://localhost:3000']).join(',')}\n\n`;
      }

      // Application configuration
      envContent += `# Application Configuration\n`;
      envContent += `NODE_ENV=${this.environment}\n`;
      envContent += `PORT=${config.port || 5000}\n`;
      envContent += `LOG_LEVEL=${config.logging?.level || 'info'}\n`;

      await fs.writeFile(targetPath, envContent);
      console.log(`✅ Environment configuration exported to: ${targetPath}`);

    } catch (error) {
      console.error('❌ Environment export failed:', error.message);
      throw error;
    }
  }

  /**
   * Import configuration from file
   */
  async import(configPath) {
    try {
      const configData = await fs.readFile(configPath, 'utf8');
      const importedConfig = JSON.parse(configData);

      // Merge with existing configuration
      Object.entries(importedConfig).forEach(([section, values]) => {
        if (!this.config.has(section)) {
          this.config.set(section, new Map());
        }

        const sectionConfig = this.config.get(section);
        Object.entries(values).forEach(([key, value]) => {
          sectionConfig[key] = value;
        });
      });

      // Validate and save
      await this.validate();
      await this.save();

      console.log('✅ Configuration imported successfully');
    } catch (error) {
      console.error('❌ Configuration import failed:', error.message);
      throw error;
    }
  }

  /**
   * Reset configuration to defaults
   */
  async reset() {
    try {
      this.config.clear();
      this.setDefaults();
      await this.save();

      console.log('✅ Configuration reset to defaults');
    } catch (error) {
      console.error('❌ Configuration reset failed:', error.message);
      throw error;
    }
  }

  /**
   * Get configuration summary
   */
  getSummary() {
    const config = this.toObject();

    return {
      environment: this.environment,
      platform: process.platform,
      sections: Object.keys(config).length,
      hasDatabase: !!config.database,
      hasRedis: !!config.redis,
      hasDocker: !!config.docker,
      hasSecurity: !!config.security,
      hasPerformance: !!config.performance
    };
  }

  /**
   * Validate configuration section
   */
  validateSection(section, data) {
    const schema = this.validationSchemas[section];
    if (!schema) {
      throw new Error(`Unknown configuration section: ${section}`);
    }

    const { error } = schema.validate(data);
    if (error) {
      throw new Error(`Validation failed for ${section}: ${error.details[0].message}`);
    }

    return true;
  }

  /**
   * Get configuration with sensitive data masked
   */
  getMaskedConfig() {
    const config = this.toObject();
    const masked = JSON.parse(JSON.stringify(config));

    // Mask sensitive fields
    if (masked.database?.password) {
      masked.database.password = '***MASKED***';
    }
    if (masked.redis?.password && masked.redis.password !== '') {
      masked.redis.password = '***MASKED***';
    }
    if (masked.security?.jwtSecret) {
      masked.security.jwtSecret = '***MASKED***';
    }

    return masked;
  }

  /**
   * Backup current configuration
   */
  async backup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.configDir, `config-backup-${timestamp}.json`);

      const configObject = this.toObject();
      await fs.writeFile(backupPath, JSON.stringify(configObject, null, 2));

      console.log(`✅ Configuration backed up to: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('❌ Configuration backup failed:', error.message);
      throw error;
    }
  }

  /**
   * List available configuration backups
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.configDir);
      const backupFiles = files
        .filter(file => file.startsWith('config-backup-') && file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(this.configDir, file),
          date: file.match(/config-backup-(.+)\.json/)?.[1]
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      return backupFiles;
    } catch (error) {
      console.error('❌ Failed to list backups:', error.message);
      return [];
    }
  }

  /**
   * Restore configuration from backup
   */
  async restoreFromBackup(backupName) {
    try {
      const backupPath = path.join(this.configDir, backupName);
      await this.import(backupPath);

      console.log(`✅ Configuration restored from: ${backupName}`);
    } catch (error) {
      console.error('❌ Configuration restore failed:', error.message);
      throw error;
    }
  }
}

module.exports = ConfigurationManager;