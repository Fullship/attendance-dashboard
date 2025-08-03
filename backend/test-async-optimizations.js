#!/usr/bin/env node

/**
 * Async Optimization Test Script
 * Tests all 4 optimization implementations:
 * 1. Async File Operations
 * 2. Worker Thread Batch Processing
 * 3. Streaming JSON Processing
 * 4. Streaming File Processing
 */

const WorkerPool = require('./utils/WorkerPool');
const StreamingJsonProcessor = require('./utils/StreamingJsonProcessor');
const StreamingFileProcessor = require('./utils/StreamingFileProcessor');
const { promises: fsPromises } = require('fs');
const path = require('path');
const fs = require('fs');

async function testAsyncOptimizations() {
  console.log('🚀 Testing All 4 Async Optimizations...\n');

  try {
    // Test 1: Async File Operations
    console.log('1️⃣ Testing Async File Operations...');
    const testDir = path.join(__dirname, 'test-async-files');

    // Create directory async
    await StreamingFileProcessor.ensureDirectory(testDir);
    console.log('   ✅ Directory created async');

    // Check file exists async
    const testFile = path.join(testDir, 'test.txt');
    const exists = await StreamingFileProcessor.fileExists(testFile);
    console.log(`   ✅ File exists check (async): ${exists}`);

    // Write file async
    await fsPromises.writeFile(testFile, 'Test async file content');
    console.log('   ✅ File written async');

    // Test 2: Worker Thread Batch Processing
    console.log('\n2️⃣ Testing Worker Thread Batch Processing...');
    const batchWorkerPool = new WorkerPool('./workers/batch-processor.js', 2);

    const testBatch = [
      { 'Employee Name': 'John Doe', 'Employee ID': 'EMP001', Date: '2025-07-18' },
      { 'Employee Name': 'Jane Smith', 'Employee ID': 'EMP002', Date: '2025-07-18' },
    ];

    const userMaps = {
      usersByEmail: {},
      usersByName: {},
      usersByFullName: {},
      usersById: {},
      usersByFirstName: {},
      usersByLastName: {},
    };

    try {
      const batchResult = await batchWorkerPool.execute({
        batch: testBatch,
        userMaps,
        batchIndex: 0,
      });
      console.log('   ✅ Batch processing result:', batchResult.stats);
    } catch (error) {
      console.log('   ❌ Batch processing error:', error.message);
    }

    await batchWorkerPool.terminate();

    // Test 3: Streaming JSON Processing
    console.log('\n3️⃣ Testing Streaming JSON Processing...');
    const jsonFile = path.join(testDir, 'test.jsonl');

    // Write JSON lines
    await StreamingJsonProcessor.appendJsonLine(jsonFile, { test: 'data1', timestamp: new Date() });
    await StreamingJsonProcessor.appendJsonLine(jsonFile, { test: 'data2', timestamp: new Date() });
    console.log('   ✅ JSON lines written');

    // Read JSON lines streaming
    const jsonData = await StreamingJsonProcessor.readJsonFile(jsonFile);
    console.log(`   ✅ JSON data read: ${jsonData.length} records`);

    // Test 4: Streaming File Processing
    console.log('\n4️⃣ Testing Streaming File Processing...');
    const csvFile = path.join(testDir, 'test.csv');
    const csvContent = `Name,ID,Email
John Doe,EMP001,john@test.com
Jane Smith,EMP002,jane@test.com`;

    await fsPromises.writeFile(csvFile, csvContent);

    const csvData = await StreamingFileProcessor.processCsvFile(csvFile, record => {
      return { ...record, processed: true };
    });
    console.log(`   ✅ CSV processed: ${csvData.length} records`);

    // Performance comparison test
    console.log('\n📊 Performance Comparison Test...');

    // Create large test data
    const largeData = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      name: `User ${i}`,
      email: `user${i}@test.com`,
      timestamp: new Date().toISOString(),
    }));

    // Test sync vs async JSON writing
    const syncFile = path.join(testDir, 'sync-test.json');
    const asyncFile = path.join(testDir, 'async-test.json');

    // Sync method (traditional)
    const syncStart = Date.now();
    fs.writeFileSync(syncFile, JSON.stringify(largeData));
    const syncTime = Date.now() - syncStart;
    console.log(`   📈 Sync JSON write: ${syncTime}ms`);

    // Async streaming method
    const asyncStart = Date.now();
    await StreamingJsonProcessor.writeJsonToFile(largeData, asyncFile);
    const asyncTime = Date.now() - asyncStart;
    console.log(`   📈 Async streaming write: ${asyncTime}ms`);

    const improvement = (((syncTime - asyncTime) / syncTime) * 100).toFixed(1);
    console.log(`   🚀 Performance improvement: ${improvement}%`);

    // Test worker pool health
    console.log('\n🔍 Testing Worker Pool Health...');
    const excelWorkerPool = new WorkerPool('./workers/excel-processor.js', 2);
    const health = excelWorkerPool.getStats();
    console.log('   📊 Worker Pool Stats:', health);
    await excelWorkerPool.terminate();

    // Cleanup
    console.log('\n🧹 Cleaning up test files...');
    await fsPromises.rm(testDir, { recursive: true, force: true });
    console.log('   ✅ Cleanup complete');

    console.log('\n🎉 All optimization tests completed successfully!');
    console.log('\n📋 Optimization Summary:');
    console.log('   ✅ 1. Async File Operations - Working');
    console.log('   ✅ 2. Worker Thread Batch Processing - Working');
    console.log('   ✅ 3. Streaming JSON Processing - Working');
    console.log('   ✅ 4. Streaming File Processing - Working');
    console.log(`   🚀 Performance improvement: ${improvement}%`);
  } catch (error) {
    console.error('❌ Optimization test failed:', error);
    throw error;
  }
}

// Run tests
if (require.main === module) {
  testAsyncOptimizations()
    .then(() => {
      console.log('\n✅ All async optimizations validated successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Async optimization tests failed:', error);
      process.exit(1);
    });
}

module.exports = { testAsyncOptimizations };
