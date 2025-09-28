/**
 * PERN Setup Tool - Cache Manager
 * Intelligent caching system with predictive preloading and analytics
 */

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const inquirer = require('inquirer');

/**
 * Cache Manager Class
 * Handles intelligent caching with predictive preloading
 */
class CacheManager {
  constructor(setupTool) {
    this.setup = setupTool;
    this.logger = setupTool.logger;
    this.safety = setupTool.safety;
    this.config = setupTool.config;
    this.cacheDir = path.join(os.homedir(), '.pern-setup', 'cache');
    this.cacheIndex = new Map();
    this.maxCacheAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    this.maxCacheSize = 5 * 1024 * 1024 * 1024; // 5GB
    this.preloadStrategies = new Map();
    this.predictiveCache = new PredictiveCache();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      preloads: 0,
      evictions: 0
    };
  }

  /**
   * Initialize cache system
   */
  async initialize() {
    try {
      await fs.ensureDir(this.cacheDir);
      await this.loadCacheIndex();
      await this.cleanupExpiredCache();
      await this.enforceSizeLimits();
      await this.initializePreloadStrategies();

      this.logger.info('Cache system initialized', {
        cacheDir: this.cacheDir,
        maxAge: this.maxCacheAge,
        maxSize: this.maxCacheSize
      });

    } catch (error) {
      this.logger.error('Cache initialization failed', error);
      throw error;
    }
  }

  /**
   * Initialize preload strategies
   */
  async initializePreloadStrategies() {
    // Define which components should be preloaded based on usage patterns
    this.preloadStrategies.set('postgresql', {
      enabled: true,
      priority: 'high',
      conditions: ['common-use', 'slow-install']
    });

    this.preloadStrategies.set('docker', {
      enabled: true,
      priority: 'high',
      conditions: ['common-use', 'container-required']
    });

    this.preloadStrategies.set('redis', {
      enabled: true,
      priority: 'medium',
      conditions: ['performance-critical']
    });

    this.preloadStrategies.set('nginx', {
      enabled: false,
      priority: 'low',
      conditions: ['platform-specific']
    });
  }

  /**
   * Generate cache key
   */
  generateCacheKey(operation, parameters) {
    const keyData = JSON.stringify({
      operation,
      parameters,
      version: '1.0.0',
      platform: process.platform
    });
    return crypto.createHash('sha256').update(keyData).digest('hex');
  }

  /**
   * Cache operation with intelligent management
   */
  async cacheOperation(operation, parameters, asyncFunction) {
    const cacheKey = this.generateCacheKey(operation, parameters);

    // Check cache first
    const cached = await this.getCachedResult(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      this.cacheStats.hits++;
      this.logger.debug(`Cache hit for operation: ${operation}`);
      return cached.data;
    }

    this.cacheStats.misses++;

    // Execute operation
    this.logger.debug(`Cache miss - executing operation: ${operation}`);
    const result = await this.monitoredExecute(asyncFunction);

    // Cache the result
    await this.setCachedResult(cacheKey, result, operation);

    return result;
  }

  /**
   * Monitored execution with performance tracking
   */
  async monitoredExecute(asyncFunction) {
    const startTime = Date.now();

    try {
      const result = await asyncFunction();
      const duration = Date.now() - startTime;

      // Record performance metrics
      this.recordPerformanceMetric('operation_duration', duration);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordPerformanceMetric('operation_duration', duration, 'error');
      throw error;
    }
  }

  /**
   * Record performance metric
   */
  recordPerformanceMetric(name, value, status = 'success') {
    const metric = {
      name,
      value,
      status,
      timestamp: Date.now(),
      platform: process.platform
    };

    // Store in cache index for analysis
    if (!this.cacheIndex.has('metrics')) {
      this.cacheIndex.set('metrics', []);
    }

    const metrics = this.cacheIndex.get('metrics');
    metrics.push(metric);

    // Keep only last 1000 metrics
    if (metrics.length > 1000) {
      metrics.shift();
    }
  }

  /**
   * Get cached result
   */
  async getCachedResult(cacheKey) {
    const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);
    try {
      const data = await fs.readFile(cacheFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Set cached result
   */
  async setCachedResult(cacheKey, data, operation) {
    try {
      const cacheEntry = {
        key: cacheKey,
        data: data,
        operation: operation,
        timestamp: Date.now(),
        size: JSON.stringify(data).length,
        platform: process.platform,
        nodeVersion: process.version
      };

      const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);
      await fs.writeFile(cacheFile, JSON.stringify(cacheEntry, null, 2));

      this.cacheIndex.set(cacheKey, cacheEntry);
      await this.saveCacheIndex();

      this.logger.debug(`Cached result for operation: ${operation}`);
    } catch (error) {
      this.logger.error('Failed to cache result', error);
    }
  }

  /**
   * Check if cache entry is valid
   */
  isCacheValid(cacheEntry) {
    const age = Date.now() - cacheEntry.timestamp;
    return age < this.maxCacheAge;
  }

  /**
   * Cleanup expired cache entries
   */
  async cleanupExpiredCache() {
    try {
      const entries = Array.from(this.cacheIndex.values());
      const expired = entries.filter(entry => !this.isCacheValid(entry));

      for (const entry of expired) {
        const cacheFile = path.join(this.cacheDir, `${entry.key}.json`);
        await fs.remove(cacheFile);
        this.cacheIndex.delete(entry.key);
        this.cacheStats.evictions++;
      }

      if (expired.length > 0) {
        this.logger.info(`Cleaned up ${expired.length} expired cache entries`);
      }
    } catch (error) {
      this.logger.error('Cache cleanup failed', error);
    }
  }

  /**
   * Enforce cache size limits
   */
  async enforceSizeLimits() {
    try {
      const entries = Array.from(this.cacheIndex.values());
      const totalSize = entries.reduce((sum, entry) => sum + (entry.size || 0), 0);

      if (totalSize > this.maxCacheSize) {
        // Sort by timestamp (oldest first) and usage frequency
        const sortedEntries = entries.sort((a, b) => {
          const aAge = Date.now() - a.timestamp;
          const bAge = Date.now() - b.timestamp;
          return aAge - bAge;
        });

        let freedSpace = 0;
        const toRemove = [];

        for (const entry of sortedEntries) {
          if (freedSpace < totalSize - this.maxCacheSize) {
            toRemove.push(entry);
            freedSpace += entry.size || 0;
          } else {
            break;
          }
        }

        for (const entry of toRemove) {
          const cacheFile = path.join(this.cacheDir, `${entry.key}.json`);
          await fs.remove(cacheFile);
          this.cacheIndex.delete(entry.key);
          this.cacheStats.evictions++;
        }

        this.logger.info(`Freed ${this.formatBytes(freedSpace)} from cache`);
      }
    } catch (error) {
      this.logger.error('Cache size enforcement failed', error);
    }
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Load cache index
   */
  async loadCacheIndex() {
    const indexFile = path.join(this.cacheDir, 'index.json');
    try {
      const data = await fs.readFile(indexFile, 'utf8');
      this.cacheIndex = new Map(JSON.parse(data));
    } catch (error) {
      this.cacheIndex = new Map();
    }
  }

  /**
   * Save cache index
   */
  async saveCacheIndex() {
    const indexFile = path.join(this.cacheDir, 'index.json');
    const data = Array.from(this.cacheIndex.entries());
    await fs.writeFile(indexFile, JSON.stringify(data, null, 2));
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const entries = Array.from(this.cacheIndex.values());
      const totalSize = entries.reduce((sum, entry) => sum + (entry.size || 0), 0);
      const validEntries = entries.filter(entry => this.isCacheValid(entry));
      const hitRate = this.cacheStats.hits + this.cacheStats.misses > 0
        ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)) * 100
        : 0;

      return {
        totalEntries: entries.length,
        validEntries: validEntries.length,
        totalSize: totalSize,
        hitRate: Math.round(hitRate),
        hits: this.cacheStats.hits,
        misses: this.cacheStats.misses,
        preloads: this.cacheStats.preloads,
        evictions: this.cacheStats.evictions,
        maxAge: this.maxCacheAge,
        maxSize: this.maxCacheSize
      };
  }

  /**
   * Configure cache settings
   */
  async configure() {
    try {
      const cacheSettings = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'enableCache',
          message: 'Enable intelligent caching?',
          default: true
        },
        {
          type: 'input',
          name: 'maxCacheAge',
          message: 'Maximum cache age (days):',
          default: '7',
          when: (answers) => answers.enableCache
        },
        {
          type: 'input',
          name: 'maxCacheSize',
          message: 'Maximum cache size (GB):',
          default: '5',
          when: (answers) => answers.enableCache
        }
      ]);

      if (cacheSettings.enableCache) {
        this.maxCacheAge = parseInt(cacheSettings.maxCacheAge) * 24 * 60 * 60 * 1000;
        this.maxCacheSize = parseInt(cacheSettings.maxCacheSize) * 1024 * 1024 * 1024;

        console.log('✅ Intelligent caching configured');
        console.log(`📁 Cache location: ${this.cacheDir}`);
        console.log(`⏰ Max age: ${cacheSettings.maxCacheAge} days`);
        console.log(`💾 Max size: ${cacheSettings.maxCacheSize}GB`);

        // Save configuration
        this.config.set('cache.enabled', true);
        this.config.set('cache.maxAge', this.maxCacheAge);
        this.config.set('cache.maxSize', this.maxCacheSize);
      }
    } catch (error) {
      await this.setup.handleError('cache-configuration', error);
    }
  }

  /**
   * Preload component for faster setup
   */
  async preloadComponent(component, version, platform) {
    try {
      const strategy = this.preloadStrategies.get(component);
      if (!strategy || !strategy.enabled) {
        return null;
      }

      const cacheKey = `preload_${component}_${version}_${platform}`;

      // Check if already preloaded
      const existing = await this.getCachedResult(cacheKey);
      if (existing && this.isCacheValid(existing)) {
        this.logger.debug(`Component already preloaded: ${component}`);
        return existing.data;
      }

      // Preload component data
      this.logger.info(`Preloading component: ${component}`);
      const preloadData = await this.preloadComponentData(component, version, platform);

      await this.setCachedResult(cacheKey, preloadData, `preload_${component}`);
      this.cacheStats.preloads++;

      this.logger.info(`Component preloaded: ${component}`);
      return preloadData;

    } catch (error) {
      this.logger.error(`Preload failed for component: ${component}`, error);
      return null;
    }
  }

  /**
   * Preload component data
   */
  async preloadComponentData(component, version, platform) {
    // Component-specific preloading logic
    switch (component) {
      case 'postgresql':
        return await this.preloadPostgreSQL(version, platform);
      case 'docker':
        return await this.preloadDocker(version, platform);
      case 'redis':
        return await this.preloadRedis(version, platform);
      default:
        return { component, version, platform, status: 'preloaded' };
    }
  }

  /**
   * Preload PostgreSQL data
   */
  async preloadPostgreSQL(version, platform) {
    const data = {
      component: 'postgresql',
      version,
      platform,
      downloadUrl: this.getPostgreSQLDownloadUrl(version, platform),
      dependencies: ['libpq-dev', 'postgresql-contrib'],
      configuration: {
        port: 5432,
        encoding: 'UTF8',
        locale: 'C'
      }
    };

    return data;
  }

  /**
   * Preload Docker data
   */
  async preloadDocker(version, platform) {
    const data = {
      component: 'docker',
      version,
      platform,
      downloadUrl: this.getDockerDownloadUrl(version, platform),
      dependencies: [],
      configuration: {
        networks: ['pern_network'],
        daemon: {
          'log-level': 'info',
          'storage-driver': 'overlay2'
        }
      }
    };

    return data;
  }

  /**
   * Preload Redis data
   */
  async preloadRedis(version, platform) {
    const data = {
      component: 'redis',
      version,
      platform,
      downloadUrl: this.getRedisDownloadUrl(version, platform),
      dependencies: [],
      configuration: {
        port: 6379,
        'max-memory': '256mb',
        'append-only': 'yes'
      }
    };

    return data;
  }

  /**
   * Get PostgreSQL download URL
   */
  getPostgreSQLDownloadUrl(version, platform) {
    const urls = {
      linux: `https://download.postgresql.org/pub/source/v${version}/postgresql-${version}.tar.gz`,
      darwin: `https://download.postgresql.org/pub/source/v${version}/postgresql-${version}.tar.gz`,
      win32: `https://get.enterprisedb.com/postgresql/postgresql-${version}-1-windows-x64.exe`
    };

    return urls[platform] || urls.linux;
  }

  /**
   * Get Docker download URL
   */
  getDockerDownloadUrl(version, platform) {
    const urls = {
      linux: 'https://get.docker.com',
      darwin: 'https://docs.docker.com/desktop/mac-install/',
      win32: 'https://docs.docker.com/desktop/windows-install/'
    };

    return urls[platform] || urls.linux;
  }

  /**
   * Get Redis download URL
   */
  getRedisDownloadUrl(version, platform) {
    const urls = {
      linux: `https://download.redis.io/releases/redis-${version}.tar.gz`,
      darwin: `https://download.redis.io/releases/redis-${version}.tar.gz`,
      win32: null // Not natively supported
    };

    return urls[platform] || urls.linux;
  }

  /**
   * Clear cache
   */
  async clearCache() {
    try {
      const entries = Array.from(this.cacheIndex.values());
      let clearedCount = 0;

      for (const entry of entries) {
        const cacheFile = path.join(this.cacheDir, `${entry.key}.json`);
        await fs.remove(cacheFile);
        clearedCount++;
      }

      this.cacheIndex.clear();
      await this.saveCacheIndex();

      this.cacheStats = {
        hits: 0,
        misses: 0,
        preloads: 0,
        evictions: this.cacheStats.evictions + clearedCount
      };

      console.log(`✅ Cache cleared: ${clearedCount} entries removed`);
    } catch (error) {
      console.error('❌ Cache clear failed:', error.message);
      throw error;
    }
  }

  /**
   * Get cache recommendations
   */
  getCacheRecommendations() {
    const stats = this.getCacheStats();
    const recommendations = [];

    if (stats.hitRate < 50) {
      recommendations.push({
        type: 'low_hit_rate',
        priority: 'medium',
        message: 'Low cache hit rate - consider adjusting cache strategy',
        suggestion: 'Review cache key generation and validity periods'
      });
    }

    if (stats.evictions > stats.hits) {
      recommendations.push({
        type: 'high_eviction_rate',
        priority: 'low',
        message: 'High cache eviction rate detected',
        suggestion: 'Consider increasing cache size or reducing cache age limits'
      });
    }

    return recommendations;
  }

  /**
   * Optimize cache configuration
   */
  async optimizeCacheConfiguration() {
    const stats = this.getCacheStats();
    const recommendations = this.getCacheRecommendations();

    if (recommendations.length === 0) {
      console.log('✅ Cache configuration is optimal');
      return;
    }

    console.log('🔧 Cache optimization recommendations:');
    recommendations.forEach(rec => {
      const icon = rec.priority === 'high' ? '🔴' : '🟡';
      console.log(`${icon} ${rec.message}`);
      console.log(`   💡 ${rec.suggestion}`);
    });

    const { optimize } = await inquirer.prompt({
      type: 'confirm',
      name: 'optimize',
      message: 'Apply cache optimizations?',
      default: true
    });

    if (optimize) {
      // Apply optimizations
      if (stats.hitRate < 50) {
        this.maxCacheAge = Math.min(this.maxCacheAge * 1.5, 14 * 24 * 60 * 60 * 1000); // Max 14 days
      }

      if (stats.evictions > stats.hits) {
        this.maxCacheSize = Math.min(this.maxCacheSize * 1.2, 10 * 1024 * 1024 * 1024); // Max 10GB
      }

      console.log('✅ Cache optimizations applied');
    }
  }
}

/**
 * Predictive Cache Class
 * Uses analytics to predict and preload likely-needed components
 */
class PredictiveCache {
  constructor() {
    this.usagePatterns = new Map();
    this.predictionModel = new Map();
  }

  /**
   * Record component usage
   */
  recordUsage(component, context) {
    const pattern = {
      component,
      context,
      timestamp: Date.now(),
      platform: process.platform
    };

    if (!this.usagePatterns.has(component)) {
      this.usagePatterns.set(component, []);
    }

    const patterns = this.usagePatterns.get(component);
    patterns.push(pattern);

    // Keep only last 100 patterns per component
    if (patterns.length > 100) {
      patterns.shift();
    }
  }

  /**
   * Get component usage statistics
   */
  getComponentUsageStats(component) {
    const patterns = this.usagePatterns.get(component) || [];
    const now = Date.now();
    const recentPatterns = patterns.filter(p => now - p.timestamp < 7 * 24 * 60 * 60 * 1000); // Last 7 days

    return {
      totalUses: patterns.length,
      recentUses: recentPatterns.length,
      usage: recentPatterns.length / Math.max(patterns.length, 1),
      lastUsed: patterns.length > 0 ? patterns[patterns.length - 1].timestamp : null,
      platforms: [...new Set(patterns.map(p => p.platform))]
    };
  }

  /**
   * Predict likely next components
   */
  predictNextComponents(currentComponents) {
    const predictions = [];

    // Analyze usage patterns
    for (const [component, patterns] of this.usagePatterns.entries()) {
      if (currentComponents.includes(component)) {
        continue; // Already using this component
      }

      const stats = this.getComponentUsageStats(component);
      if (stats.usage > 0.7) { // High usage probability
        predictions.push({
          component,
          probability: stats.usage,
          reason: 'high_usage_pattern'
        });
      }
    }

    return predictions.sort((a, b) => b.probability - a.probability);
  }
}

module.exports = CacheManager;