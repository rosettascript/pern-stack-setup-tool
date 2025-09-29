/**
 * PERN Setup Tool - Performance Monitor
 * Comprehensive performance monitoring and optimization system
 */

const os = require('os');
const fs = require('fs-extra');
const path = require('path');

/**
 * Performance Monitor Class
 * Tracks and analyzes performance metrics across the setup process
 */
class PerformanceMonitor {
  constructor() {
    this.startTime = Date.now();
    this.metrics = new Map();
    this.operations = [];
    this.resourceSnapshots = [];
    this.optimizationSuggestions = [];
    this.monitoringInterval = null;
    this.isMonitoring = false;
  }

  /**
   * Start performance monitoring
   */
  start(interval = 5000) {
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.takeResourceSnapshot();
    }, interval);

    this.takeResourceSnapshot(); // Initial snapshot
    // Only log if not in quiet mode
    if (!process.env.QUIET_MODE) {
      console.log('📊 Performance monitoring started');
    }
  }

  /**
   * Stop performance monitoring
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;

    this.takeResourceSnapshot(); // Final snapshot
    console.log('📊 Performance monitoring stopped');
  }

  /**
   * Start timing an operation
   */
  startTimer(name) {
    const timer = {
      name,
      start: Date.now(),
      end: null,
      duration: null,
      startMemory: process.memoryUsage(),
      startCPU: process.cpuUsage()
    };

    this.metrics.set(name, timer);
    return timer;
  }

  /**
   * End timing an operation
   */
  endTimer(name) {
    const timer = this.metrics.get(name);
    if (!timer) {
      console.warn(`Timer not found: ${name}`);
      return null;
    }

    timer.end = Date.now();
    timer.duration = timer.end - timer.start;
    timer.endMemory = process.memoryUsage();
    timer.endCPU = process.cpuUsage();

    // Calculate differences
    timer.memoryDiff = {
      rss: timer.endMemory.rss - timer.startMemory.rss,
      heapTotal: timer.endMemory.heapTotal - timer.startMemory.heapTotal,
      heapUsed: timer.endMemory.heapUsed - timer.startMemory.heapUsed,
      external: timer.endMemory.external - timer.startMemory.external
    };

    timer.cpuDiff = {
      user: timer.endCPU.user - timer.startCPU.user,
      system: timer.endCPU.system - timer.startCPU.system
    };

    // Add to operations history
    this.operations.push({
      name,
      duration: timer.duration,
      memoryDiff: timer.memoryDiff,
      timestamp: timer.end
    });

    return timer.duration;
  }

  /**
   * Record a custom metric
   */
  recordMetric(name, value, unit = 'count', metadata = {}) {
    const metric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      metadata
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const history = this.metrics.get(name);
    history.push(metric);

    // Keep only last 1000 entries per metric
    if (history.length > 1000) {
      history.shift();
    }
  }

  /**
   * Take a resource snapshot
   */
  takeResourceSnapshot() {
    const snapshot = {
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      system: {
        loadAverage: os.loadavg(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpuCount: os.cpus().length
      },
      process: {
        pid: process.pid,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime()
      }
    };

    this.resourceSnapshots.push(snapshot);
    return snapshot;
  }

  /**
   * Get average metric value
   */
  getAverageMetric(name) {
    const history = this.metrics.get(name);
    if (!history || history.length === 0) {
      return 0;
    }

    const sum = history.reduce((acc, metric) => acc + metric.value, 0);
    return sum / history.length;
  }

  /**
   * Get metric statistics
   */
  getMetricStats(name) {
    const history = this.metrics.get(name);
    if (!history || history.length === 0) {
      return null;
    }

    const values = history.map(m => m.value);
    const sorted = values.sort((a, b) => a - b);

    return {
      count: values.length,
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  /**
   * Get operation statistics
   */
  getOperationStats() {
    if (this.operations.length === 0) {
      return null;
    }

    const durations = this.operations.map(op => op.duration);
    const memoryDiffs = this.operations.map(op => op.memoryDiff.rss);

    return {
      totalOperations: this.operations.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      totalDuration: durations.reduce((a, b) => a + b, 0),
      averageMemoryIncrease: memoryDiffs.reduce((a, b) => a + b, 0) / memoryDiffs.length,
      slowestOperation: Math.max(...durations),
      fastestOperation: Math.min(...durations)
    };
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalDuration: Date.now() - this.startTime,
      uptime: process.uptime(),
      operations: this.getOperationStats(),
      metrics: {},
      resourceUsage: this.analyzeResourceUsage(),
      recommendations: this.generateRecommendations(),
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };

    // Add metric statistics
    this.metrics.forEach((history, name) => {
      if (history.length > 0) {
        report.metrics[name] = this.getMetricStats(name);
      }
    });

    return report;
  }

  /**
   * Analyze resource usage patterns
   */
  analyzeResourceUsage() {
    if (this.resourceSnapshots.length < 2) {
      return null;
    }

    const first = this.resourceSnapshots[0];
    const last = this.resourceSnapshots[this.resourceSnapshots.length - 1];

    const memoryIncrease = last.memory.rss - first.memory.rss;
    const memoryIncreasePercent = (memoryIncrease / first.memory.rss) * 100;

    const cpuIncrease = last.process.cpu.user - first.process.cpu.user;
    const cpuIncreasePercent = (cpuIncrease / (Date.now() - this.startTime)) * 100;

    return {
      memoryIncrease,
      memoryIncreasePercent: Math.round(memoryIncreasePercent * 100) / 100,
      cpuIncrease,
      cpuIncreasePercent: Math.round(cpuIncreasePercent * 100) / 100,
      snapshots: this.resourceSnapshots.length,
      monitoringDuration: last.timestamp - first.timestamp
    };
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const stats = this.getOperationStats();

    if (stats) {
      // Memory recommendations
      const avgMemoryIncrease = stats.averageMemoryIncrease;
      if (avgMemoryIncrease > 50 * 1024 * 1024) { // 50MB
        recommendations.push({
          type: 'memory',
          priority: 'high',
          message: 'High memory usage detected - consider optimizing memory-intensive operations',
          suggestion: 'Review and optimize memory usage in long-running operations'
        });
      }

      // Duration recommendations
      if (stats.averageDuration > 30000) { // 30 seconds
        recommendations.push({
          type: 'performance',
          priority: 'medium',
          message: 'Operations taking longer than expected',
          suggestion: 'Consider enabling parallel processing or optimizing slow operations'
        });
      }

      // Operation count recommendations
      if (stats.totalOperations > 100) {
        recommendations.push({
          type: 'efficiency',
          priority: 'low',
          message: 'High number of operations detected',
          suggestion: 'Consider batching operations or implementing caching'
        });
      }
    }

    // Resource-based recommendations
    const resourceAnalysis = this.analyzeResourceUsage();
    if (resourceAnalysis) {
      if (resourceAnalysis.memoryIncreasePercent > 50) {
        recommendations.push({
          type: 'memory',
          priority: 'high',
          message: 'Significant memory increase detected',
          suggestion: 'Monitor for memory leaks and optimize memory usage'
        });
      }
    }

    return recommendations;
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const stats = this.getOperationStats();
    const resource = this.analyzeResourceUsage();

    return {
      totalDuration: Date.now() - this.startTime,
      operations: stats ? stats.totalOperations : 0,
      averageDuration: stats ? stats.averageDuration : 0,
      memoryIncrease: resource ? resource.memoryIncrease : 0,
      recommendations: this.generateRecommendations().length
    };
  }

  /**
   * Export performance data
   */
  async exportData(format = 'json') {
    const data = {
      metadata: {
        exportTime: new Date().toISOString(),
        monitoringDuration: Date.now() - this.startTime,
        platform: process.platform,
        nodeVersion: process.version
      },
      operations: this.operations,
      metrics: Object.fromEntries(this.metrics),
      resourceSnapshots: this.resourceSnapshots,
      report: this.generateReport()
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return data;
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(data) {
    let csv = '';

    // Operations CSV
    if (data.operations.length > 0) {
      csv += 'Operations\n';
      csv += 'Name,Duration,MemoryIncrease,Timestamp\n';
      data.operations.forEach(op => {
        csv += `${op.name},${op.duration},${op.memoryDiff.rss},${op.timestamp}\n`;
      });
      csv += '\n';
    }

    // Resource snapshots CSV
    if (data.resourceSnapshots.length > 0) {
      csv += 'Resource Usage\n';
      csv += 'Timestamp,MemoryRSS,MemoryHeapUsed,CPUUser,CPUSystem\n';
      data.resourceSnapshots.forEach(snapshot => {
        csv += `${snapshot.timestamp},${snapshot.memory.rss},${snapshot.memory.heapUsed},${snapshot.process.cpu.user},${snapshot.process.cpu.system}\n`;
      });
    }

    return csv;
  }

  /**
   * Save performance report to file
   */
  async saveReport(filePath = null) {
    try {
      const report = this.generateReport();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultPath = path.join(os.homedir(), '.pern-setup', 'reports', `performance-report-${timestamp}.json`);

      const savePath = filePath || defaultPath;
      await fs.ensureDir(path.dirname(savePath));

      await fs.writeFile(savePath, JSON.stringify(report, null, 2));

      console.log(`📊 Performance report saved to: ${savePath}`);
      return savePath;
    } catch (error) {
      console.error('❌ Failed to save performance report:', error.message);
      throw error;
    }
  }

  /**
   * Compare performance with baseline
   */
  async compareWithBaseline(baselinePath) {
    try {
      const baseline = JSON.parse(await fs.readFile(baselinePath, 'utf8'));
      const current = this.generateReport();

      const comparison = {
        baseline: baseline.metadata?.exportTime || 'unknown',
        current: current.timestamp,
        improvements: [],
        regressions: [],
        summary: {}
      };

      // Compare operation durations
      if (baseline.operations && current.operations) {
        const baselineAvg = baseline.operations.averageDuration;
        const currentAvg = current.operations.averageDuration;

        if (currentAvg < baselineAvg) {
          comparison.improvements.push({
            metric: 'average_operation_duration',
            improvement: `${Math.round(((baselineAvg - currentAvg) / baselineAvg) * 100)}% faster`
          });
        } else if (currentAvg > baselineAvg) {
          comparison.regressions.push({
            metric: 'average_operation_duration',
            regression: `${Math.round(((currentAvg - baselineAvg) / baselineAvg) * 100)}% slower`
          });
        }
      }

      return comparison;
    } catch (error) {
      console.error('❌ Performance comparison failed:', error.message);
      throw error;
    }
  }

  /**
   * Get real-time performance metrics
   */
  getRealTimeMetrics() {
    const currentSnapshot = this.takeResourceSnapshot();
    const recentOperations = this.operations.slice(-10); // Last 10 operations

    return {
      current: {
        memoryUsage: currentSnapshot.memory,
        cpuUsage: currentSnapshot.process.cpu,
        uptime: currentSnapshot.uptime
      },
      recent: {
        averageDuration: recentOperations.length > 0
          ? recentOperations.reduce((sum, op) => sum + op.duration, 0) / recentOperations.length
          : 0,
        operationCount: recentOperations.length
      },
      system: {
        loadAverage: currentSnapshot.system.loadAverage,
        freeMemory: currentSnapshot.system.freeMemory,
        totalMemory: currentSnapshot.system.totalMemory
      }
    };
  }

  /**
   * Detect performance anomalies
   */
  detectAnomalies() {
    const anomalies = [];
    const stats = this.getOperationStats();

    if (stats) {
      // Check for unusually slow operations
      const slowOperations = this.operations.filter(op => op.duration > stats.averageDuration * 3);
      if (slowOperations.length > 0) {
        anomalies.push({
          type: 'slow_operations',
          severity: 'medium',
          count: slowOperations.length,
          details: slowOperations.map(op => ({ name: op.name, duration: op.duration }))
        });
      }

      // Check for memory spikes
      const memorySpikes = this.operations.filter(op => op.memoryDiff.rss > 100 * 1024 * 1024); // 100MB
      if (memorySpikes.length > 0) {
        anomalies.push({
          type: 'memory_spikes',
          severity: 'high',
          count: memorySpikes.length,
          details: memorySpikes.map(op => ({ name: op.name, memoryIncrease: op.memoryDiff.rss }))
        });
      }
    }

    return anomalies;
  }

  /**
   * Get performance optimization suggestions
   */
  getOptimizationSuggestions() {
    const suggestions = [];
    const anomalies = this.detectAnomalies();

    if (anomalies.length > 0) {
      suggestions.push({
        type: 'anomaly_detected',
        priority: 'high',
        message: `${anomalies.length} performance anomalies detected`,
        details: anomalies
      });
    }

    // Memory optimization suggestions
    const resourceAnalysis = this.analyzeResourceUsage();
    if (resourceAnalysis && resourceAnalysis.memoryIncreasePercent > 25) {
      suggestions.push({
        type: 'memory_optimization',
        priority: 'medium',
        message: 'Consider memory optimization',
        suggestion: 'Review memory usage patterns and optimize memory-intensive operations'
      });
    }

    // Operation optimization suggestions
    const stats = this.getOperationStats();
    if (stats && stats.averageDuration > 10000) { // 10 seconds
      suggestions.push({
        type: 'operation_optimization',
        priority: 'medium',
        message: 'Operations taking longer than expected',
        suggestion: 'Consider parallel processing or operation batching'
      });
    }

    return suggestions;
  }

  /**
   * Reset performance monitoring
   */
  reset() {
    this.metrics.clear();
    this.operations = [];
    this.resourceSnapshots = [];
    this.optimizationSuggestions = [];
    this.startTime = Date.now();
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      startTime: this.startTime,
      uptime: Date.now() - this.startTime,
      operations: this.operations.length,
      metrics: this.metrics.size,
      snapshots: this.resourceSnapshots.length
    };
  }
}

module.exports = PerformanceMonitor;