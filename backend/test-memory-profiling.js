/**
 * Memory Profiling Test Script
 * Demonstrates heapdump integration and memory analysis features
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const memoryProfiler = require('./utils/MemoryProfiler');

async function runMemoryProfileTests() {
  console.log('🧠 Starting Memory Profiling Tests\n');

  try {
    // Test 1: Check if profiler is available
    console.log('1. Checking Memory Profiler Availability...');
    const isAvailable = memoryProfiler.isAvailable();
    console.log(`   Profiler Available: ${isAvailable ? '✅ Yes' : '❌ No'}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'undefined'}`);

    if (!isAvailable) {
      console.log('\n⚠️  Memory profiler not available.');
      console.log('   Ensure NODE_ENV=development and heapdump is installed.');
      console.log('   This test will demonstrate fallback behavior.\n');
    }

    // Test 2: Get memory statistics
    console.log('\n2. Getting Current Memory Statistics...');
    const stats = memoryProfiler.getMemoryStats();
    console.log(`   Heap Used: ${stats.memory.heapUsed} (${stats.memory.heapUsedPercentage})`);
    console.log(`   Heap Total: ${stats.memory.heapTotal}`);
    console.log(`   RSS: ${stats.memory.rss}`);
    console.log(`   Process Uptime: ${stats.process.uptime.toFixed(2)}s`);
    console.log(`   System Memory: ${stats.system.freeMemory} / ${stats.system.totalMemory} free`);

    // Test 3: Create some objects to increase memory usage
    console.log('\n3. Creating Memory Load...');
    const testData = [];
    for (let i = 0; i < 10000; i++) {
      testData.push({
        id: i,
        data: `This is test data item ${i}`.repeat(10),
        timestamp: new Date(),
        nested: {
          level1: { level2: { level3: { value: i * 100 } } },
        },
      });
    }
    console.log(`   Created ${testData.length} test objects`);

    // Test 4: Get updated memory statistics
    console.log('\n4. Memory Statistics After Load...');
    const statsAfterLoad = memoryProfiler.getMemoryStats();
    console.log(
      `   Heap Used: ${statsAfterLoad.memory.heapUsed} (${statsAfterLoad.memory.heapUsedPercentage})`
    );
    console.log(`   Heap Total: ${statsAfterLoad.memory.heapTotal}`);

    // Test 5: Attempt to take snapshot (only if available)
    if (isAvailable) {
      console.log('\n5. Taking Memory Snapshot...');
      try {
        const snapshot = await memoryProfiler.takeSnapshot('test-run');
        console.log(`   ✅ Snapshot taken: ${snapshot.filename}`);
        console.log(`   File size: ${snapshot.fileSize}`);
        console.log(`   Location: ${snapshot.filepath}`);
      } catch (error) {
        console.log(`   ❌ Snapshot failed: ${error.message}`);
      }
    } else {
      console.log('\n5. Skipping Snapshot (profiler not available)');
    }

    // Test 6: Force garbage collection if available
    console.log('\n6. Testing Garbage Collection...');
    const gcResult = memoryProfiler.forceGC();
    if (gcResult.freed) {
      console.log(`   ✅ GC successful - freed ${gcResult.freed}`);
      console.log(`   Before: ${gcResult.before.heapUsed}`);
      console.log(`   After: ${gcResult.after.heapUsed}`);
    } else {
      console.log(`   ℹ️  ${gcResult.message}`);
      console.log(`   💡 ${gcResult.example || 'Start with --expose-gc to enable'}`);
    }

    // Test 7: Clear test data and check memory again
    console.log('\n7. Clearing Test Data...');
    testData.length = 0; // Clear array

    // Force GC if available
    if (global.gc) {
      global.gc();
      console.log('   Forced garbage collection');
    }

    const statsAfterCleanup = memoryProfiler.getMemoryStats();
    console.log(
      `   Heap Used After Cleanup: ${statsAfterCleanup.memory.heapUsed} (${statsAfterCleanup.memory.heapUsedPercentage})`
    );

    // Test 8: List snapshots
    if (isAvailable) {
      console.log('\n8. Listing Available Snapshots...');
      try {
        const { snapshots, count } = await memoryProfiler.listSnapshots();
        console.log(`   Found ${count} snapshots:`);
        snapshots.slice(0, 3).forEach(snapshot => {
          console.log(`   - ${snapshot.filename} (${snapshot.size})`);
        });
        if (count > 3) {
          console.log(`   ... and ${count - 3} more`);
        }
      } catch (error) {
        console.log(`   ❌ Failed to list snapshots: ${error.message}`);
      }
    }

    // Test 9: Get profiling instructions
    console.log('\n9. Getting Profiling Instructions...');
    const instructions = memoryProfiler.getInstructions();
    console.log('   📋 Setup Instructions:');
    console.log(`   - Install: ${instructions.setup.install}`);
    console.log(`   - Environment: ${instructions.setup.environment}`);
    console.log(`   - Optional: ${instructions.setup.optional}`);
    console.log('\n   🔧 API Endpoints:');
    Object.entries(instructions.usage).forEach(([action, endpoint]) => {
      console.log(`   - ${action}: ${endpoint}`);
    });

    console.log('\n✅ Memory Profiling Tests Completed Successfully!');

    // Final summary
    console.log('\n📊 Test Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Environment: ${process.env.NODE_ENV || 'undefined'}`);
    console.log(`   Profiler Available: ${isAvailable ? 'Yes' : 'No'}`);
    console.log(`   Final Heap Usage: ${statsAfterCleanup.memory.heapUsed}`);
    console.log(`   Snapshots Directory: ${instructions.files.location}`);

    if (isAvailable) {
      console.log('\n🎯 Next Steps:');
      console.log('   1. Start the server: npm run dev');
      console.log('   2. Make requests to /api/admin/dev/memory/* endpoints');
      console.log('   3. Analyze snapshots in Chrome DevTools');
      console.log('   4. Monitor memory usage during operations');
    } else {
      console.log('\n💡 To Enable Full Profiling:');
      console.log('   1. Set NODE_ENV=development');
      console.log('   2. Ensure heapdump is installed');
      console.log('   3. Restart the application');
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
  }
}

// Run the tests
if (require.main === module) {
  runMemoryProfileTests().catch(console.error);
}

module.exports = runMemoryProfileTests;
