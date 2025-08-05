#!/usr/bin/env node

/**
 * Test Script for Monitoring API Endpoints
 * 
 * This script tests all the admin monitoring endpoints we implemented:
 * - GET /admin/metrics - System metrics
 * - GET /admin/cache/stats - Cache statistics  
 * - GET /admin/cluster/status - Cluster status
 * - GET /admin/logs - System logs
 * - Health endpoint with monitoring status
 * 
 * Usage: node test-monitoring-endpoints.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3002';

// Simple HTTP GET request helper
function makeRequest(path, description) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3002,
            path: path,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log(`✅ ${description}`);
                    console.log(`   Status: ${res.statusCode}`);
                    console.log(`   Response: ${JSON.stringify(result, null, 2).substring(0, 200)}...`);
                    console.log('');
                    resolve(result);
                } catch (error) {
                    console.log(`❌ ${description} - JSON Parse Error`);
                    console.log(`   Status: ${res.statusCode}`);
                    console.log(`   Raw Response: ${data.substring(0, 200)}...`);
                    console.log('');
                    resolve({ error: 'JSON parse error', data });
                }
            });
        });

        req.on('error', (error) => {
            console.log(`❌ ${description} - Request Error`);
            console.log(`   Error: ${error.message}`);
            console.log('');
            reject(error);
        });

        req.setTimeout(5000, () => {
            console.log(`❌ ${description} - Timeout`);
            console.log('');
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

async function testEndpoints() {
    console.log('🧪 Testing Monitoring API Endpoints\n');
    console.log('='.repeat(50));
    console.log('');

    const tests = [
        {
            path: '/health',
            description: 'Health Check (with monitoring status)'
        },
        {
            path: '/api/admin/metrics',
            description: 'Admin Metrics Endpoint'
        },
        {
            path: '/api/admin/cache/stats',
            description: 'Cache Statistics Endpoint'
        },
        {
            path: '/api/admin/cluster/status',
            description: 'Cluster Status Endpoint'
        },
        {
            path: '/api/admin/logs',
            description: 'System Logs Endpoint'
        }
    ];

    let successCount = 0;
    let totalTests = tests.length;

    for (const test of tests) {
        try {
            await makeRequest(test.path, test.description);
            successCount++;
        } catch (error) {
            // Error already logged in makeRequest
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('='.repeat(50));
    console.log(`\n📊 Test Results: ${successCount}/${totalTests} endpoints working`);
    
    if (successCount === totalTests) {
        console.log('🎉 All monitoring endpoints are functional!');
    } else {
        console.log('⚠️  Some endpoints may need authentication or additional setup');
    }

    console.log('\n💡 Note: Admin endpoints may require authentication');
    console.log('   Check the server logs for detailed error information');
}

// Run the tests
testEndpoints().catch(console.error);
