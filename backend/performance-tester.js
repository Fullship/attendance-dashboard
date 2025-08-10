#!/usr/bin/env node

/**
 * Performance Testing Script
 * Tests synchronous vs asynchronous implementations
 * Measures CPU usage, memory consumption, and response times
 */

const { performance } = require('perf_hooks');
const { Worker } = require('worker_threads');
const WorkerPool = require('./utils/WorkerPool');
const fs = require('fs');
const path = require('path');

class PerformanceTester {
  constructor() {
    this.results = {
      sync: {},
      async: {},
      comparison: {},
    };
  }

  /**
   * Test synchronous Excel processing
   */
  async testSyncExcelProcessing(filePath, iterations = 5) {
    console.log('🔄 Testing synchronous Excel processing...');
    const xlsx = require('xlsx');
    const times = [];
    const memoryUsage = [];

    for (let i = 0; i < iterations; i++) {
      const startMemory = process.memoryUsage();
      const start = performance.now();

      // Simulate blocking Excel processing
      const workbook = xlsx.readFile(filePath, {
        cellDates: true,
        cellNF: false,
        cellText: false,
        sheetStubs: false,
      });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const records = xlsx.utils.sheet_to_json(worksheet, {
        raw: false,
        defval: '',
      });

      const end = performance.now();
      const endMemory = process.memoryUsage();

      times.push(end - start);
      memoryUsage.push({
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      });

      console.log(`  Iteration ${i + 1}: ${(end - start).toFixed(2)}ms, ${records.length} records`);
    }

    this.results.sync.excel = {
      averageTime: times.reduce((a, b) => a + b) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      averageMemory: memoryUsage.reduce((acc, mem) => acc + mem.heapUsed, 0) / memoryUsage.length,
      iterations,
      blocking: true,
    };

    console.log(`✅ Sync Excel avg: ${this.results.sync.excel.averageTime.toFixed(2)}ms\n`);
  }

  /**
   * Test asynchronous Excel processing with worker threads
   */
  async testAsyncExcelProcessing(filePath, iterations = 5) {
    console.log('🔄 Testing asynchronous Excel processing...');
    const workerPool = new WorkerPool('./workers/excel-processor.js', 1);
    const times = [];
    const memoryUsage = [];

    for (let i = 0; i < iterations; i++) {
      const startMemory = process.memoryUsage();
      const start = performance.now();

      try {
        const result = await workerPool.execute({ filePath });

        const end = performance.now();
        const endMemory = process.memoryUsage();

        if (result.success) {
          times.push(end - start);
          memoryUsage.push({
            heapUsed: endMemory.heapUsed - startMemory.heapUsed,
            heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          });

          console.log(
            `  Iteration ${i + 1}: ${(end - start).toFixed(2)}ms, ${result.recordCount} records`
          );
        } else {
          console.error(`  Iteration ${i + 1} failed: ${result.error}`);
        }
      } catch (error) {
        console.error(`  Iteration ${i + 1} error: ${error.message}`);
      }
    }

    await workerPool.terminate();

    this.results.async.excel = {
      averageTime: times.reduce((a, b) => a + b) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      averageMemory: memoryUsage.reduce((acc, mem) => acc + mem.heapUsed, 0) / memoryUsage.length,
      iterations: times.length,
      blocking: false,
    };

    console.log(`✅ Async Excel avg: ${this.results.async.excel.averageTime.toFixed(2)}ms\n`);
  }

  /**
   * Test synchronous batch processing
   */
  async testSyncBatchProcessing(recordCount = 1000, iterations = 3) {
    console.log('🔄 Testing synchronous batch processing...');
    const times = [];
    const memoryUsage = [];

    // Generate test data
    const testRecords = this.generateTestRecords(recordCount);
    const BATCH_SIZE = 100;

    for (let i = 0; i < iterations; i++) {
      const startMemory = process.memoryUsage();
      const start = performance.now();

      // Simulate CPU-intensive synchronous processing
      const results = [];
      for (let j = 0; j < testRecords.length; j += BATCH_SIZE) {
        const batch = testRecords.slice(j, j + BATCH_SIZE);

        // Simulate CPU work
        const batchResult = batch.map(record => {
          // Simulate complex processing
          let result = 0;
          for (let k = 0; k < 1000; k++) {
            result += Math.random() * k;
          }
          return { ...record, processed: true, result };
        });

        results.push(...batchResult);
      }

      const end = performance.now();
      const endMemory = process.memoryUsage();

      times.push(end - start);
      memoryUsage.push({
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      });

      console.log(
        `  Iteration ${i + 1}: ${(end - start).toFixed(2)}ms, ${results.length} records processed`
      );
    }

    this.results.sync.batch = {
      averageTime: times.reduce((a, b) => a + b) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      averageMemory: memoryUsage.reduce((acc, mem) => acc + mem.heapUsed, 0) / memoryUsage.length,
      iterations,
      recordCount,
      blocking: true,
    };

    console.log(`✅ Sync Batch avg: ${this.results.sync.batch.averageTime.toFixed(2)}ms\n`);
  }

  /**
   * Test asynchronous batch processing with worker threads
   */
  async testAsyncBatchProcessing(recordCount = 1000, iterations = 3) {
    console.log('🔄 Testing asynchronous batch processing...');
    const workerPool = new WorkerPool('./workers/batch-processor.js', 1);
    const times = [];
    const memoryUsage = [];

    // Generate test data and user maps
    const testRecords = this.generateTestRecords(recordCount);
    const userMaps = this.generateUserMaps();
    const BATCH_SIZE = 100;

    for (let i = 0; i < iterations; i++) {
      const startMemory = process.memoryUsage();
      const start = performance.now();

      try {
        // Create batches
        const batches = [];
        for (let j = 0; j < testRecords.length; j += BATCH_SIZE) {
          batches.push({
            batch: testRecords.slice(j, j + BATCH_SIZE),
            userMaps,
          });
        }

        // Process batches concurrently
        const results = await workerPool.executeAll(batches, 4);

        const end = performance.now();
        const endMemory = process.memoryUsage();

        if (results.results.length > 0) {
          times.push(end - start);
          memoryUsage.push({
            heapUsed: endMemory.heapUsed - startMemory.heapUsed,
            heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          });

          console.log(
            `  Iteration ${i + 1}: ${(end - start).toFixed(2)}ms, ${
              results.results.length
            } batches processed`
          );
        } else {
          console.error(`  Iteration ${i + 1} failed: No results`);
        }
      } catch (error) {
        console.error(`  Iteration ${i + 1} error: ${error.message}`);
      }
    }

    await workerPool.terminate();

    this.results.async.batch = {
      averageTime: times.reduce((a, b) => a + b) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      averageMemory: memoryUsage.reduce((acc, mem) => acc + mem.heapUsed, 0) / memoryUsage.length,
      iterations: times.length,
      recordCount,
      blocking: false,
    };

    console.log(`✅ Async Batch avg: ${this.results.async.batch.averageTime.toFixed(2)}ms\n`);
  }

  /**
   * Test file I/O operations
   */
  async testFileOperations(iterations = 10) {
    console.log('🔄 Testing file I/O operations...');

    const testFile = path.join(__dirname, 'test-data.json');
    const testData = { records: this.generateTestRecords(1000) };

    // Test synchronous operations
    const syncTimes = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();

      // Synchronous write and read
      fs.writeFileSync(testFile, JSON.stringify(testData));
      const data = fs.readFileSync(testFile, 'utf8');
      JSON.parse(data);

      const end = performance.now();
      syncTimes.push(end - start);
    }

    // Test asynchronous operations
    const asyncTimes = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();

      // Asynchronous write and read
      await fs.promises.writeFile(testFile, JSON.stringify(testData));
      const data = await fs.promises.readFile(testFile, 'utf8');
      JSON.parse(data);

      const end = performance.now();
      asyncTimes.push(end - start);
    }

    // Cleanup
    try {
      fs.unlinkSync(testFile);
    } catch (error) {
      // Ignore cleanup errors
    }

    this.results.sync.fileIO = {
      averageTime: syncTimes.reduce((a, b) => a + b) / syncTimes.length,
      iterations,
      blocking: true,
    };

    this.results.async.fileIO = {
      averageTime: asyncTimes.reduce((a, b) => a + b) / asyncTimes.length,
      iterations,
      blocking: false,
    };

    console.log(`✅ Sync File I/O avg: ${this.results.sync.fileIO.averageTime.toFixed(2)}ms`);
    console.log(`✅ Async File I/O avg: ${this.results.async.fileIO.averageTime.toFixed(2)}ms\n`);
  }

  /**
   * Generate test records
   */
  generateTestRecords(count) {
    const records = [];
    for (let i = 0; i < count; i++) {
      records.push({
        'Employee Name': `Employee ${i}`,
        'Employee ID': `EMP${i.toString().padStart(4, '0')}`,
        Email: `employee${i}@company.com`,
        Date: new Date().toISOString().split('T')[0],
        'Time In': '09:00',
        'Time Out': '17:00',
        'Hours Worked': '8',
      });
    }
    return records;
  }

  /**
   * Generate user maps
   */
  generateUserMaps() {
    return {
      usersByEmail: {},
      usersByName: {},
      usersByFullName: {},
      usersById: {},
      usersByFirstName: {},
      usersByLastName: {},
    };
  }

  /**
   * Calculate performance improvements
   */
  calculateComparison() {
    console.log('📊 Calculating performance improvements...\n');

    const comparisons = {};

    ['excel', 'batch', 'fileIO'].forEach(test => {
      if (this.results.sync[test] && this.results.async[test]) {
        const syncTime = this.results.sync[test].averageTime;
        const asyncTime = this.results.async[test].averageTime;

        comparisons[test] = {
          syncTime: syncTime.toFixed(2),
          asyncTime: asyncTime.toFixed(2),
          improvement: (((syncTime - asyncTime) / syncTime) * 100).toFixed(1),
          speedup: (syncTime / asyncTime).toFixed(2),
        };
      }
    });

    this.results.comparison = comparisons;
  }

  /**
   * Generate performance report
   */
  generateReport() {
    console.log('📋 PERFORMANCE TEST REPORT');
    console.log('='.repeat(50));

    Object.keys(this.results.comparison).forEach(test => {
      const comp = this.results.comparison[test];
      console.log(`\n${test.toUpperCase()} PROCESSING:`);
      console.log(`  Synchronous:  ${comp.syncTime}ms (blocking)`);
      console.log(`  Asynchronous: ${comp.asyncTime}ms (non-blocking)`);
      console.log(`  Improvement:  ${comp.improvement}% faster`);
      console.log(`  Speedup:      ${comp.speedup}x`);
    });

    console.log('\n📈 SUMMARY:');
    const avgImprovement =
      Object.values(this.results.comparison).reduce(
        (acc, comp) => acc + parseFloat(comp.improvement),
        0
      ) / Object.keys(this.results.comparison).length;

    console.log(`  Average Performance Improvement: ${avgImprovement.toFixed(1)}%`);
    console.log('  Benefits: Non-blocking operations, better resource utilization');
    console.log('  Tradeoffs: Slightly more complex code, worker thread overhead');

    // Save results to file
    const reportFile = path.join(__dirname, 'performance-test-results.json');
    fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Detailed results saved to: ${reportFile}`);
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting Performance Testing Suite\n');

    try {
      // Test Excel processing (need a sample file)
      const sampleExcelFile = path.join(__dirname, '..', 'sample-attendance.csv');
      if (fs.existsSync(sampleExcelFile)) {
        await this.testSyncExcelProcessing(sampleExcelFile, 3);
        await this.testAsyncExcelProcessing(sampleExcelFile, 3);
      } else {
        console.log('⚠️  Sample Excel file not found, skipping Excel tests\n');
      }

      // Test batch processing
      await this.testSyncBatchProcessing(500, 3);
      await this.testAsyncBatchProcessing(500, 3);

      // Test file I/O
      await this.testFileOperations(5);

      // Calculate and display results
      this.calculateComparison();
      this.generateReport();
    } catch (error) {
      console.error('❌ Performance test error:', error);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new PerformanceTester();
  tester
    .runAllTests()
    .then(() => {
      console.log('\n✅ Performance testing completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Performance testing failed:', error);
      process.exit(1);
    });
}

module.exports = PerformanceTester;
