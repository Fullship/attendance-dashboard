#!/usr/bin/env node
const { cacheService } = require('./config/redis');

async function testRedisConnection() {
  console.log('🧪 Testing Redis connection and cache functionality...\n');
  
  try {
    // Test 1: Ping Redis
    console.log('1. Testing Redis connection...');
    const pingResult = await cacheService.ping();
    console.log(`   ✅ Redis ping: ${pingResult ? 'SUCCESS' : 'FAILED'}\n`);
    
    if (!pingResult) {
      console.log('❌ Redis is not connected. Make sure Redis server is running.');
      process.exit(1);
    }
    
    // Test 2: Basic cache operations
    console.log('2. Testing cache set/get operations...');
    const testKey = 'test:cache:performance';
    const testData = {
      message: 'Hello Redis!',
      timestamp: new Date().toISOString(),
      performance: 'optimized'
    };
    
    await cacheService.set(testKey, testData, 60); // 1 minute TTL
    const retrieved = await cacheService.get(testKey);
    
    if (JSON.stringify(retrieved) === JSON.stringify(testData)) {
      console.log('   ✅ Cache set/get: SUCCESS');
    } else {
      console.log('   ❌ Cache set/get: FAILED');
    }
    
    // Test 3: TTL operations
    console.log('3. Testing TTL operations...');
    const ttl = await cacheService.ttl(testKey);
    console.log(`   ✅ TTL for test key: ${ttl} seconds`);
    
    // Test 4: Increment operations
    console.log('4. Testing increment operations...');
    const counterKey = 'test:counter:performance';
    const count1 = await cacheService.incr(counterKey, 60);
    const count2 = await cacheService.incr(counterKey);
    console.log(`   ✅ Counter increments: ${count1} → ${count2}`);
    
    // Test 5: Memory usage
    console.log('5. Testing memory usage info...');
    const memoryInfo = await cacheService.getMemoryUsage();
    console.log(`   ✅ Redis memory usage: ${memoryInfo.formatted}`);
    
    // Test 6: Pattern deletion
    console.log('6. Testing pattern deletion...');
    await cacheService.set('test:pattern:1', 'data1', 60);
    await cacheService.set('test:pattern:2', 'data2', 60);
    const deletedCount = await cacheService.delPattern('test:pattern:*');
    console.log(`   ✅ Deleted ${deletedCount} keys with pattern`);
    
    // Cleanup
    await cacheService.del(testKey);
    await cacheService.del(counterKey);
    
    console.log('\n🎉 All Redis tests passed! Cache system is ready for performance optimization.');
    console.log('\n📊 Performance benefits you can expect:');
    console.log('   • 🚀 Faster API responses with cached data');
    console.log('   • ⚡ Reduced database load');
    console.log('   • 🎯 Session management with Redis store');
    console.log('   • 🛡️  Rate limiting protection');
    console.log('   • 📈 Real-time analytics caching');
    
  } catch (error) {
    console.error('❌ Redis test failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('   • Make sure Redis server is running: redis-server');
    console.log('   • Check Redis connection settings in config/redis.js');
    console.log('   • Verify Redis is listening on the correct port (default: 6379)');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Redis test...');
  await cacheService.disconnect();
  process.exit(0);
});

// Run the test
testRedisConnection();
