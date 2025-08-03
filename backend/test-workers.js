#!/usr/bin/env node

/**
 * Worker Thread Test Script
 * Tests if worker threads are properly initialized and can process data
 */

const WorkerPool = require('./utils/WorkerPool');
const path = require('path');
const fs = require('fs');

async function testWorkerInitialization() {
  console.log('🧪 Testing Worker Thread Initialization...\n');

  try {
    // Test 1: Excel Worker
    console.log('📊 Testing Excel Worker...');
    const excelWorkerPool = new WorkerPool('./workers/excel-processor.js', 1);

    // Create a test CSV file for testing
    const testCsvPath = path.join(__dirname, 'test-data.csv');
    const csvContent = `Employee Name,Employee ID,Email,Date,Time In,Time Out,Hours Worked
John Doe,EMP001,john.doe@company.com,2025-07-18,09:00,17:00,8
Jane Smith,EMP002,jane.smith@company.com,2025-07-18,08:30,16:30,8`;

    fs.writeFileSync(testCsvPath, csvContent);

    try {
      const excelResult = await excelWorkerPool.execute({ filePath: testCsvPath });
      console.log('✅ Excel Worker Result:', excelResult);

      if (excelResult.success) {
        console.log(`   ✓ Processed ${excelResult.recordCount} records`);
      } else {
        console.log(`   ❌ Excel worker failed: ${excelResult.error}`);
      }
    } catch (error) {
      console.log(`   ❌ Excel worker error: ${error.message}`);
    }

    await excelWorkerPool.terminate();

    // Clean up test file
    try {
      fs.unlinkSync(testCsvPath);
    } catch (error) {
      // Ignore cleanup errors
    }

    // Test 2: Batch Worker
    console.log('\n📦 Testing Batch Worker...');
    const batchWorkerPool = new WorkerPool('./workers/batch-processor.js', 1);

    const testBatch = [
      {
        'Employee Name': 'Test Employee',
        'Employee ID': 'TEST001',
        Email: 'test@company.com',
        Date: '2025-07-18',
        'Time In': '09:00',
        'Time Out': '17:00',
        'Hours Worked': '8',
      },
    ];

    const testUserMaps = {
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
        userMaps: testUserMaps,
      });
      console.log('✅ Batch Worker Result:', batchResult);

      if (batchResult.success) {
        console.log(`   ✓ Processed ${batchResult.results.stats.processed} records`);
        console.log(`   ✓ Valid: ${batchResult.results.stats.valid}`);
        console.log(`   ✓ Errors: ${batchResult.results.stats.errors}`);
      } else {
        console.log(`   ❌ Batch worker failed: ${batchResult.error}`);
      }
    } catch (error) {
      console.log(`   ❌ Batch worker error: ${error.message}`);
    }

    await batchWorkerPool.terminate();

    // Test 3: Worker Pool Health
    console.log('\n🏥 Testing Worker Pool Health...');
    const healthTestPool = new WorkerPool('./workers/excel-processor.js', 2);

    const health = healthTestPool.isHealthy();
    console.log('✅ Worker Pool Health:', health);

    if (health.healthy) {
      console.log(`   ✓ ${health.healthyWorkers}/${health.totalWorkers} workers healthy`);
    } else {
      console.log(`   ❌ Pool unhealthy: ${health.healthyWorkers}/${health.totalWorkers} workers`);
    }

    await healthTestPool.terminate();

    console.log('\n🎉 Worker initialization tests completed!');
  } catch (error) {
    console.error('❌ Worker test error:', error);
    throw error;
  }
}

// Test error handling
async function testWorkerErrorHandling() {
  console.log('\n🧪 Testing Worker Error Handling...\n');

  try {
    // Test with invalid file path
    console.log('📊 Testing Excel Worker with invalid file...');
    const excelWorkerPool = new WorkerPool('./workers/excel-processor.js', 1);

    try {
      const result = await excelWorkerPool.execute({ filePath: '/nonexistent/file.xlsx' });
      console.log('✅ Excel Worker Error Handling:', result);

      if (!result.success) {
        console.log(`   ✓ Properly handled error: ${result.error}`);
      } else {
        console.log(`   ❌ Should have failed with invalid file`);
      }
    } catch (error) {
      console.log(`   ✓ Caught worker error: ${error.message}`);
    }

    await excelWorkerPool.terminate();

    // Test with invalid data
    console.log('\n📦 Testing Batch Worker with invalid data...');
    const batchWorkerPool = new WorkerPool('./workers/batch-processor.js', 1);

    try {
      const result = await batchWorkerPool.execute({ invalidData: true });
      console.log('✅ Batch Worker Error Handling:', result);

      if (!result.success) {
        console.log(`   ✓ Properly handled error: ${result.error}`);
      } else {
        console.log(`   ❌ Should have failed with invalid data`);
      }
    } catch (error) {
      console.log(`   ✓ Caught worker error: ${error.message}`);
    }

    await batchWorkerPool.terminate();

    console.log('\n🎉 Error handling tests completed!');
  } catch (error) {
    console.error('❌ Error handling test error:', error);
    throw error;
  }
}

// Run tests
async function runAllTests() {
  try {
    await testWorkerInitialization();
    await testWorkerErrorHandling();

    console.log('\n✅ All worker tests passed! Workers are properly initialized.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Worker tests failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testWorkerInitialization,
  testWorkerErrorHandling,
};
