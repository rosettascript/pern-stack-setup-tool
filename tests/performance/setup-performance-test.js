#!/usr/bin/env node

/**
 * Setup Performance Test
 * Tests the performance of the PERN setup tool itself
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

class SetupPerformanceTest {
  constructor() {
    this.results = {
      startTime: null,
      endTime: null,
      duration: 0,
      memoryUsage: [],
      cpuUsage: [],
      errors: [],
      success: false
    };
  }

  async run(iterations = 10) {
    console.log(`🚀 Running PERN Setup Performance Test (${iterations} iterations)`);
    console.log('=' .repeat(60));

    const results = [];

    for (let i = 0; i < iterations; i++) {
      console.log(`\n📊 Iteration ${i + 1}/${iterations}`);

      const result = await this.runSingleSetup();
      results.push(result);

      // Clean up between iterations
      await this.cleanup();
    }

    // Analyze results
    this.analyzeResults(results);

    return this.results;
  }

  async runSingleSetup() {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const startMemory = process.memoryUsage();

      // Spawn setup process
      const setupProcess = spawn('node', [path.join(__dirname, '../../src/index.js'), '--test-mode'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          TEST_MODE: 'true'
        }
      });

      let output = '';
      let errorOutput = '';

      setupProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      setupProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      setupProcess.on('close', (code) => {
        const endTime = Date.now();
        const endMemory = process.memoryUsage();

        const result = {
          duration: endTime - startTime,
          exitCode: code,
          memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
          output: output,
          errors: errorOutput,
          success: code === 0
        };

        resolve(result);
      });

      setupProcess.on('error', (error) => {
        reject(error);
      });

      // Simulate user input for automated testing
      setTimeout(() => {
        // Send "end" command to exit setup
        setupProcess.stdin.write('10\n'); // Select "End" option
      }, 1000);
    });
  }

  async cleanup() {
    // Clean up any test artifacts
    try {
      await fs.remove(path.join(process.cwd(), 'test-output'));
      await fs.remove(path.join(process.cwd(), 'test-config.json'));
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  analyzeResults(results) {
    const successfulRuns = results.filter(r => r.success);
    const failedRuns = results.filter(r => !r.success);

    const avgDuration = successfulRuns.reduce((sum, r) => sum + r.duration, 0) / successfulRuns.length;
    const minDuration = Math.min(...successfulRuns.map(r => r.duration));
    const maxDuration = Math.max(...successfulRuns.map(r => r.duration));

    const avgMemoryDelta = successfulRuns.reduce((sum, r) => sum + r.memoryDelta, 0) / successfulRuns.length;

    console.log('\n📈 Performance Test Results:');
    console.log('=' .repeat(40));
    console.log(`Total Runs: ${results.length}`);
    console.log(`Successful: ${successfulRuns.length}`);
    console.log(`Failed: ${failedRuns.length}`);
    console.log(`Success Rate: ${((successfulRuns.length / results.length) * 100).toFixed(1)}%`);

    if (successfulRuns.length > 0) {
      console.log(`\n⏱️  Duration (ms):`);
      console.log(`  Average: ${avgDuration.toFixed(0)}`);
      console.log(`  Min: ${minDuration}`);
      console.log(`  Max: ${maxDuration}`);

      console.log(`\n💾 Memory Usage:`);
      console.log(`  Average Delta: ${(avgMemoryDelta / 1024 / 1024).toFixed(2)} MB`);
    }

    // Performance benchmarks
    const benchmarks = {
      maxDuration: 30000, // 30 seconds
      maxMemoryDelta: 100 * 1024 * 1024, // 100MB
      minSuccessRate: 0.9 // 90%
    };

    const passed = successfulRuns.length / results.length >= benchmarks.minSuccessRate &&
                   avgDuration <= benchmarks.maxDuration &&
                   avgMemoryDelta <= benchmarks.maxMemoryDelta;

    console.log(`\n✅ Performance Test: ${passed ? 'PASSED' : 'FAILED'}`);

    if (!passed) {
      console.log('❌ Failed benchmarks:');
      if (successfulRuns.length / results.length < benchmarks.minSuccessRate) {
        console.log('  - Success rate too low');
      }
      if (avgDuration > benchmarks.maxDuration) {
        console.log('  - Average duration too high');
      }
      if (avgMemoryDelta > benchmarks.maxMemoryDelta) {
        console.log('  - Memory usage too high');
      }
    }

    this.results = {
      totalRuns: results.length,
      successfulRuns: successfulRuns.length,
      failedRuns: failedRuns.length,
      successRate: successfulRuns.length / results.length,
      avgDuration,
      minDuration,
      maxDuration,
      avgMemoryDelta,
      passed,
      benchmarks
    };
  }
}

// Run the test if called directly
if (require.main === module) {
  const test = new SetupPerformanceTest();
  const iterations = parseInt(process.argv[2]) || 5;

  test.run(iterations).then((results) => {
    process.exit(results.passed ? 0 : 1);
  }).catch((error) => {
    console.error('Performance test failed:', error);
    process.exit(1);
  });
}

module.exports = SetupPerformanceTest;