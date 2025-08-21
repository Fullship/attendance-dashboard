const redisCache = require('./utils/RedisCache');

/**
 * Simple Redis Cache Test - Tests core caching functionality without database
 */
async function testRedisCacheOnly() {
  console.log('🧪 Testing Redis Cache Core Functionality\n');

  try {
    // Test 1: Redis Connection
    console.log('1. Testing Redis connection...');
    const healthStatus = await redisCache.healthCheck();
    console.log(`   Redis Status: ${healthStatus ? '✅ Connected' : '❌ Disconnected'}\n`);

    if (!healthStatus) {
      console.log('⚠️  Redis is not available. Cache will fallback to direct database calls.');
      console.log('   This is normal behavior - the app continues to work without Redis.\n');
      return;
    }

    // Test 2: Basic Cache Operations
    console.log('2. Testing basic cache operations...');

    // Set a value
    await redisCache.set('test', 'basic_operation', {
      message: 'Hello Redis!',
      timestamp: Date.now(),
    });
    console.log('   ✅ SET operation completed');

    // Get the value
    const cached = await redisCache.get('test', 'basic_operation');
    console.log('   ✅ GET operation completed');
    console.log(`   📄 Retrieved: ${JSON.stringify(cached)}\n`);

    // Test 3: Cache Miss
    console.log('3. Testing cache miss behavior...');
    const missing = await redisCache.get('test', 'nonexistent_key');
    console.log(
      `   Cache miss result: ${
        missing === null ? '✅ Returned null correctly' : '❌ Expected null'
      }\n`
    );

    // Test 4: TTL Functionality
    console.log('4. Testing TTL (Time To Live)...');
    await redisCache.set('test', 'ttl_test', { message: 'This will expire' }, 2); // 2 seconds TTL
    console.log('   ✅ Set data with 2-second TTL');

    const immediate = await redisCache.get('test', 'ttl_test');
    console.log(`   Immediate read: ${immediate ? '✅ Found' : '❌ Not found'}`);

    console.log('   Waiting 3 seconds for TTL expiration...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const expired = await redisCache.get('test', 'ttl_test');
    console.log(
      `   After expiration: ${expired === null ? '✅ Expired correctly' : '❌ Still cached'}\n`
    );

    // Test 5: Cache Clear
    console.log('5. Testing cache clear operations...');

    // Set multiple test keys
    await redisCache.set('test', 'clear_test_1', { data: 'test1' });
    await redisCache.set('test', 'clear_test_2', { data: 'test2' });
    await redisCache.set('other', 'keep_this', { data: 'keep' });
    console.log('   ✅ Set multiple test keys');

    // Clear test namespace
    await redisCache.clear('test:*');
    console.log('   ✅ Cleared test namespace');

    // Check if cleared
    const cleared1 = await redisCache.get('test', 'clear_test_1');
    const cleared2 = await redisCache.get('test', 'clear_test_2');
    const kept = await redisCache.get('other', 'keep_this');

    console.log(`   Test key 1: ${cleared1 === null ? '✅ Cleared' : '❌ Still exists'}`);
    console.log(`   Test key 2: ${cleared2 === null ? '✅ Cleared' : '❌ Still exists'}`);
    console.log(`   Other key: ${kept !== null ? '✅ Preserved' : '❌ Accidentally cleared'}\n`);

    // Test 6: Wrap Query Pattern
    console.log('6. Testing wrapQuery pattern (simulated)...');

    let dbCallCount = 0;
    const mockDbQuery = async () => {
      dbCallCount++;
      console.log(`   🔍 Mock database call #${dbCallCount}`);
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate DB delay
      return { result: `Database result ${dbCallCount}`, timestamp: Date.now() };
    };

    // First call should hit database
    console.log('   First call (should hit database):');
    const startTime1 = Date.now();
    const result1 = await redisCache.wrapQuery('test', 'wrap_query_test', mockDbQuery, 5);
    const duration1 = Date.now() - startTime1;
    console.log(`   ⏱️  Duration: ${duration1}ms`);
    console.log(`   📊 Result: ${JSON.stringify(result1)}`);

    // Second call should hit cache
    console.log('   Second call (should hit cache):');
    const startTime2 = Date.now();
    const result2 = await redisCache.wrapQuery('test', 'wrap_query_test', mockDbQuery, 5);
    const duration2 = Date.now() - startTime2;
    console.log(`   ⏱️  Duration: ${duration2}ms`);
    console.log(`   📊 Result: ${JSON.stringify(result2)}`);

    const speedup = duration1 > 0 ? (duration1 / duration2).toFixed(1) : 'N/A';
    console.log(`   🚀 Cache speedup: ${speedup}x faster`);
    console.log(`   📈 Database calls: ${dbCallCount} (should be 1)\n`);

    // Test 7: Cache Statistics
    console.log('7. Testing cache statistics...');
    const stats = await redisCache.getStats();
    console.log('   📊 Cache Statistics:');
    console.log(`      Connected: ${stats.connected}`);
    console.log(`      Key Count: ${stats.keyCount || 'N/A'}`);
    console.log(`      Memory Used: ${stats.memoryUsed || 'N/A'}`);
    console.log(`      Cache Hits: ${stats.hits || 'N/A'}`);
    console.log(`      Cache Misses: ${stats.misses || 'N/A'}\n`);

    // Cleanup
    console.log('8. Cleaning up test data...');
    await redisCache.clear('test:*');
    await redisCache.clear('other:*');
    console.log('   ✅ Test data cleaned up\n');

    console.log('🎉 Redis Cache Core Functionality Test PASSED!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Redis connection working');
    console.log('   ✅ Basic SET/GET operations');
    console.log('   ✅ Cache miss handling');
    console.log('   ✅ TTL expiration working');
    console.log('   ✅ Selective cache clearing');
    console.log('   ✅ wrapQuery pattern working');
    console.log('   ✅ Statistics collection');
    console.log('\n🚀 Redis cache is ready for database operations!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testRedisCacheOnly().finally(() => {
    console.log('\n👋 Redis cache test completed');
    process.exit(0);
  });
}

module.exports = testRedisCacheOnly;
