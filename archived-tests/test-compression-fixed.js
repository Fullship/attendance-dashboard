#!/usr/bin/env node

/**
 * Compression Test Script
 * Tests compression (gzip, br, deflate) on the Express server
 */

const http = require('http');
const zlib = require('zlib');

const testCompression = () => {
  console.log('🚀 Compression Test for Express Server');
  console.log('=====================================');
  console.log('');
  console.log('📝 You can also test manually with curl:');
  console.log('curl -H "Accept-Encoding: gzip, br" -v http://localhost:3002/api/compression-test');
  console.log('');

  console.log('🧪 Testing compression on Express server...');
  console.log('');

  const options = {
    hostname: 'localhost',
    port: 3002,
    path: '/api/compression-test',
    method: 'GET',
    headers: {
      'Accept-Encoding': 'gzip, br, deflate',
      Accept: 'application/json',
      'User-Agent': 'Compression-Test-Script/1.0',
    },
  };

  const req = http.request(options, res => {
    console.log('📡 Response Status:', res.statusCode);
    console.log('📋 Response Headers:');

    // Show relevant headers
    Object.keys(res.headers).forEach(key => {
      if (
        key.includes('content') ||
        key.includes('encoding') ||
        key.includes('vary') ||
        key.includes('transfer')
      ) {
        console.log(`   ${key}: ${res.headers[key]}`);
      }
    });

    const contentEncoding = res.headers['content-encoding'];
    const isCompressed =
      contentEncoding &&
      (contentEncoding.includes('gzip') ||
        contentEncoding.includes('br') ||
        contentEncoding.includes('deflate'));

    console.log('');
    console.log(
      `🗜️  Compression Status: ${
        isCompressed ? '✅ COMPRESSED with ' + contentEncoding.toUpperCase() : '❌ NOT COMPRESSED'
      }`
    );
    console.log('');

    let rawData = '';
    let compressedSize = 0;

    res.on('data', chunk => {
      rawData += chunk;
      compressedSize += chunk.length;
    });

    res.on('end', () => {
      try {
        if (isCompressed) {
          // Handle different compression formats
          const buffer = Buffer.from(rawData, 'binary');

          const decompressAndAnalyze = (err, decompressed) => {
            if (err) {
              console.error('❌ Error decompressing:', err.message);
              return;
            }

            const originalSize = decompressed.length;
            const compressionRatio = (
              ((originalSize - compressedSize) / originalSize) *
              100
            ).toFixed(2);

            console.log('📊 Compression Statistics:');
            console.log(`   Original Size: ${(originalSize / 1024).toFixed(2)} KB`);
            console.log(`   Compressed Size: ${(compressedSize / 1024).toFixed(2)} KB`);
            console.log(`   Compression Ratio: ${compressionRatio}%`);
            console.log(
              `   Space Saved: ${((originalSize - compressedSize) / 1024).toFixed(2)} KB`
            );

            // Test JSON parsing
            try {
              const data = JSON.parse(decompressed.toString());
              console.log('');
              console.log('✅ JSON Response parsed successfully');
              console.log(`   Message: ${data.message || 'N/A'}`);
              console.log(
                `   Data Size: ${data.largeData ? data.largeData.length + ' items' : 'N/A'}`
              );
            } catch (parseErr) {
              console.error('❌ Error parsing JSON:', parseErr.message);
            }

            showAdditionalTests();
          };

          // Decompress based on encoding
          if (contentEncoding === 'gzip') {
            zlib.gunzip(buffer, decompressAndAnalyze);
          } else if (contentEncoding === 'br') {
            zlib.brotliDecompress(buffer, decompressAndAnalyze);
          } else if (contentEncoding === 'deflate') {
            zlib.inflate(buffer, decompressAndAnalyze);
          }
        } else {
          console.log(`📏 Uncompressed Size: ${(rawData.length / 1024).toFixed(2)} KB`);

          try {
            const data = JSON.parse(rawData);
            console.log('');
            console.log('✅ JSON Response parsed successfully');
            console.log(`   Message: ${data.message || 'N/A'}`);
          } catch (parseErr) {
            console.error('❌ Error parsing JSON:', parseErr.message);
          }

          showAdditionalTests();
        }
      } catch (error) {
        console.error('❌ Error processing response:', error.message);
      }
    });
  });

  req.on('error', err => {
    console.error('❌ Request failed:', err.message);
    console.log('');
    console.log('💡 Make sure the server is running on port 3002');
    console.log('   Start the server with: npm start or node server.js');
  });

  req.end();
};

const showAdditionalTests = () => {
  console.log('');
  console.log('🔍 Additional Tests:');
  console.log('===================');
  console.log('1. Check Network tab in browser DevTools');
  console.log('2. Look for "Content-Encoding: gzip/br" header');
  console.log('3. Compare transfer size vs actual size');
  console.log('4. Test with different endpoints returning JSON');
  console.log('');
  console.log('🌐 Test different endpoints:');
  console.log('   curl -H "Accept-Encoding: gzip, br" http://localhost:3002/api/admin/users');
  console.log(
    '   curl -H "Accept-Encoding: gzip, br" http://localhost:3002/api/attendance/records'
  );
};

// Run the test
testCompression();
