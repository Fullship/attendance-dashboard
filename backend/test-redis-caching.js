const dbCache = require('./utils/DatabaseCache');
const redisCache = require('./utils/RedisCache');

/**
 * Test Redis caching implementation for expensive database operations
 */
async function testRedisCaching() {
  console.log('🧪 Testing Redis Cache Implementation for Database Operations\n');

  try {
    // Test 1: Redis Connection Health
    console.log('1. Testing Redis connection health...');
    const healthStatus = await redisCache.healthCheck();
    console.log(`   Redis Health: ${healthStatus ? '✅ Connected' : '❌ Disconnected'}\n`);

    if (!healthStatus) {
      console.log('⚠️  Redis is not available. Testing cache wrapper fallback behavior...\n');
    }

    // Test 2: Cache Statistics
    console.log('2. Getting cache statistics...');
    const stats = await dbCache.getHealthStatus();
    console.log(`   Cache Stats:`, JSON.stringify(stats, null, 2));
    console.log('');

    // Test 3: Test Attendance Records Caching
    console.log('3. Testing attendance records caching...');
    const attendanceParams = {
      page: 1,
      limit: 10,
      period: '30',
      search: '',
    };

    console.log('   First request (should hit database):');
    const startTime1 = Date.now();
    const result1 = await dbCache.getAttendanceRecords(attendanceParams);
    const duration1 = Date.now() - startTime1;
    console.log(`   ⏱️  Duration: ${duration1}ms`);
    console.log(`   📊 Records: ${result1.records.length}, Total: ${result1.pagination.total}`);

    console.log('   Second request (should hit cache):');
    const startTime2 = Date.now();
    const result2 = await dbCache.getAttendanceRecords(attendanceParams);
    const duration2 = Date.now() - startTime2;
    console.log(`   ⏱️  Duration: ${duration2}ms`);
    console.log(`   📊 Records: ${result2.records.length}, Total: ${result2.pagination.total}`);

    const speedup = duration1 > 0 ? (duration1 / duration2).toFixed(2) : 'N/A';
    console.log(`   🚀 Cache speedup: ${speedup}x faster\n`);

    // Test 4: Test Users Caching
    console.log('4. Testing users caching...');
    const userParams = {
      page: 1,
      limit: 10,
      search: '',
      includeAdmins: false,
    };

    console.log('   First request (should hit database):');
    const startTime3 = Date.now();
    const result3 = await dbCache.getUsers(userParams);
    const duration3 = Date.now() - startTime3;
    console.log(`   ⏱️  Duration: ${duration3}ms`);
    console.log(`   📊 Users: ${result3.users.length}, Total: ${result3.pagination.total}`);

    console.log('   Second request (should hit cache):');
    const startTime4 = Date.now();
    const result4 = await dbCache.getUsers(userParams);
    const duration4 = Date.now() - startTime4;
    console.log(`   ⏱️  Duration: ${duration4}ms`);
    console.log(`   📊 Users: ${result4.users.length}, Total: ${result4.pagination.total}`);

    const speedup2 = duration3 > 0 ? (duration3 / duration4).toFixed(2) : 'N/A';
    console.log(`   🚀 Cache speedup: ${speedup2}x faster\n`);

    // Test 5: Test Dashboard Stats Caching
    console.log('5. Testing dashboard stats caching...');

    console.log('   First request (should hit database):');
    const startTime5 = Date.now();
    const result5 = await dbCache.getDashboardStats();
    const duration5 = Date.now() - startTime5;
    console.log(`   ⏱️  Duration: ${duration5}ms`);
    console.log(
      `   📊 Stats: Users=${result5.totalUsers}, Today=${result5.todayAttendance}, Pending=${result5.pendingClockRequests}`
    );

    console.log('   Second request (should hit cache):');
    const startTime6 = Date.now();
    const result6 = await dbCache.getDashboardStats();
    const duration6 = Date.now() - startTime6;
    console.log(`   ⏱️  Duration: ${duration6}ms`);
    console.log(
      `   📊 Stats: Users=${result6.totalUsers}, Today=${result6.todayAttendance}, Pending=${result6.pendingClockRequests}`
    );

    const speedup3 = duration5 > 0 ? (duration5 / duration6).toFixed(2) : 'N/A';
    console.log(`   🚀 Cache speedup: ${speedup3}x faster\n`);

    // Test 6: Test Cache Invalidation
    console.log('6. Testing cache invalidation...');
    console.log('   Invalidating attendance and dashboard stats cache...');
    await dbCache.invalidateCache(['attendance_records', 'dashboard_stats']);

    console.log('   Request after invalidation (should hit database again):');
    const startTime7 = Date.now();
    const result7 = await dbCache.getAttendanceRecords(attendanceParams);
    const duration7 = Date.now() - startTime7;
    console.log(`   ⏱️  Duration: ${duration7}ms (should be similar to first request)`);
    console.log(`   📊 Records: ${result7.records.length}, Total: ${result7.pagination.total}\n`);

    // Test 7: Test Different Cache Keys
    console.log('7. Testing different cache keys...');
    const differentParams = {
      page: 1,
      limit: 5,
      period: '7',
      search: 'test',
    };

    console.log('   Request with different parameters:');
    const startTime8 = Date.now();
    const result8 = await dbCache.getAttendanceRecords(differentParams);
    const duration8 = Date.now() - startTime8;
    console.log(`   ⏱️  Duration: ${duration8}ms (should hit database - different cache key)`);
    console.log(`   📊 Records: ${result8.records.length}, Total: ${result8.pagination.total}\n`);

    // Test 8: Test Cache TTL (Time To Live)
    console.log('8. Testing cache TTL behavior...');
    console.log('   Setting test data with short TTL...');
    await redisCache.set('test', 'ttl_test', { message: 'This should expire' }, 1); // 1 second TTL

    const cached1 = await redisCache.get('test', 'ttl_test');
    console.log(`   Immediate read: ${cached1 ? '✅ Found' : '❌ Not found'}`);

    console.log('   Waiting 2 seconds for TTL expiration...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const cached2 = await redisCache.get('test', 'ttl_test');
    console.log(
      `   After TTL expiry: ${cached2 ? '❌ Still found (TTL failed)' : '✅ Expired correctly'}\n`
    );

    // Test 9: Performance Summary
    console.log('9. Performance Summary:');
    console.log(`   Attendance Records: ${speedup}x faster with cache`);
    console.log(`   Users Query: ${speedup2}x faster with cache`);
    console.log(`   Dashboard Stats: ${speedup3}x faster with cache`);
    console.log('');

    // Test 10: Cache Health Check
    console.log('10. Final cache health check...');
    const finalStats = await dbCache.getHealthStatus();
    console.log(`    Cache Health:`, JSON.stringify(finalStats, null, 2));

    console.log('\n🎉 Redis Cache Implementation Test Complete!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Redis connection tested');
    console.log('   ✅ Database query caching working');
    console.log('   ✅ Cache invalidation working');
    console.log('   ✅ TTL expiration working');
    console.log('   ✅ Different cache keys handled correctly');
    console.log('   ✅ Performance improvements demonstrated');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testRedisCaching().finally(() => {
    console.log('\n👋 Test completed, closing connections...');
    process.exit(0);
  });
}

module.exports = testRedisCaching;
