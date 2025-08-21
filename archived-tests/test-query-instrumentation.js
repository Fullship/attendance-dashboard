const pool = require('./config/database');

/**
 * Test script for PostgreSQL query instrumentation
 * This script tests the slow query monitoring system
 */

async function testQueryInstrumentation() {
  console.log('🧪 Testing PostgreSQL Query Instrumentation\n');

  try {
    // Test 1: Fast query
    console.log('1. Testing fast query...');
    const result1 = await pool.query('SELECT 1 as test_value, NOW() as current_time');
    console.log(`   ✅ Fast query completed. Result: ${result1.rows[0].test_value}\n`);

    // Test 2: Slow query (using pg_sleep to simulate)
    console.log('2. Testing slow query (simulated with pg_sleep)...');
    const start = Date.now();
    const result2 = await pool.query("SELECT pg_sleep(0.3), 'slow_query' as test_type");
    const duration = Date.now() - start;
    console.log(`   ⏱️  Slow query completed in ${duration}ms\n`);

    // Test 3: Query with parameters
    console.log('3. Testing parameterized query...');
    const result3 = await pool.query(
      'SELECT $1 as param1, $2 as param2, COUNT(*) as count FROM (SELECT generate_series(1, $3)) as series',
      ['test_param', 42, 1000]
    );
    console.log(`   📊 Parameterized query completed. Count: ${result3.rows[0].count}\n`);

    // Test 4: Error query
    console.log('4. Testing error handling...');
    try {
      await pool.query('SELECT * FROM non_existent_table');
    } catch (error) {
      console.log(`   ❌ Error query handled correctly: ${error.message.substring(0, 50)}...\n`);
    }

    // Show current statistics
    console.log('5. Current query statistics:');
    if (typeof pool.getQueryStats === 'function') {
      const stats = pool.getQueryStats();
      console.log(`   📈 Total Queries: ${stats.totalQueries}`);
      console.log(`   🐌 Slow Queries: ${stats.slowQueries}`);
      console.log(`   ⏱️  Average Duration: ${Math.round(stats.averageDuration)}ms`);
      console.log(`   📊 Slow Query %: ${stats.slowQueryPercentage}%`);
    } else {
      console.log('   ⚠️  Query statistics not available');
    }

    console.log('\n✅ All tests completed successfully!');
    console.log('\n📁 Check the logs/ directory for generated slow query logs.');
    console.log('🔍 Run "node slow-query-cli.js report" to see the analysis.');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Close the pool
    await pool.end();
    console.log('\n🔌 Database connection closed.');
  }
}

// Run the test
if (require.main === module) {
  testQueryInstrumentation().catch(console.error);
}

module.exports = testQueryInstrumentation;
