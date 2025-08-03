#!/usr/bin/env node

/**
 * Compression Test Script
 * Tests gzip compression on the Express server
 */

const http = require('http');
const zlib = require('zlib');

const testCompression = () => {
  console.log('🧪 Testing gzip compression on Express server...\n');

  const options = {
    hostname: 'localhost',
    port: 3002, // Adjust if your server runs on a different port
    path: '/api/compression-test',
    method: 'GET',
    headers: {
      'Accept-Encoding': 'gzip, deflate, br',
      Accept: 'application/json',
      'User-Agent': 'Compression-Test-Script/1.0',
    },
  };

  const req = http.request(options, res => {
    console.log('📡 Response Status:', res.statusCode);
    console.log('📋 Response Headers:');
    Object.keys(res.headers).forEach(key => {
      if (
        key.toLowerCase().includes('encoding') ||
        key.toLowerCase().includes('length') ||
        key.toLowerCase().includes('type') ||
        key.toLowerCase().includes('vary')
      ) {
        console.log(`   ${key}: ${res.headers[key]}`);
      }
    });

    const isCompressed = res.headers['content-encoding'] === 'gzip';
    console.log(
      `\n🗜️  Compression Status: ${isCompressed ? '✅ ENABLED (gzip)' : '❌ NOT COMPRESSED'}`
    );

    let rawData = '';
    let compressedSize = 0;

    res.on('data', chunk => {
      rawData += chunk;
      compressedSize += chunk.length;
    });

    res.on('end', () => {
      try {
        // If compressed, decompress to get actual size
        if (isCompressed) {
          const decompressData = (compressedData) => {
            const encoding = res.headers['content-encoding'];
            
            if (encoding === 'gzip') {
              zlib.gunzip(compressedData, handleDecompressed);
            } else if (encoding === 'br') {
              zlib.brotliDecompress(compressedData, handleDecompressed);
            } else if (encoding === 'deflate') {
              zlib.inflate(compressedData, handleDecompressed);
            } else {
              console.error('❌ Unsupported compression encoding:', encoding);
            }
          };

          const handleDecompressed = (err, decompressed) => {
            if (err) {
              console.error('❌ Error decompressing:', err.message);
              return;
            }

            const originalSize = decompressed.length;
            const compressionRatio = (
              ((originalSize - compressedSize) / originalSize) *
              100
            ).toFixed(2);

            console.log('\n📊 Compression Statistics:');
            console.log(`   Original Size: ${(originalSize / 1024).toFixed(2)} KB`);
            console.log(`   Compressed Size: ${(compressedSize / 1024).toFixed(2)} KB`);
            console.log(`   Compression Ratio: ${compressionRatio}%`);
            console.log(
              `   Space Saved: ${((originalSize - compressedSize) / 1024).toFixed(2)} KB`
            );

            // Test JSON parsing
            try {
              const data = JSON.parse(decompressed.toString());
              console.log(`\n✅ JSON Response parsed successfully`);
              console.log(`   Message: ${data.message}`);
              console.log(`   Test Data Items: ${data.largeData.length}`);
            } catch (parseErr) {
              console.error('❌ Error parsing JSON:', parseErr.message);
            }
          });
        } else {
          console.log(`\n📏 Uncompressed Size: ${(rawData.length / 1024).toFixed(2)} KB`);

          try {
            const data = JSON.parse(rawData);
            console.log(`\n✅ JSON Response parsed successfully`);
            console.log(`   Message: ${data.message}`);
          } catch (parseErr) {
            console.error('❌ Error parsing JSON:', parseErr.message);
          }
        }
      } catch (error) {
        console.error('❌ Error processing response:', error.message);
      }
    });
  });

  req.on('error', error => {
    console.error('❌ Request failed:', error.message);
    console.log('\n💡 Make sure the server is running on port 3002');
    console.log('   Start the server with: npm start or node server.js');
  });

  req.end();
};

// Also test with curl command suggestion
console.log('🚀 Compression Test for Express Server');
console.log('=====================================\n');

console.log('📝 You can also test manually with curl:');
console.log('curl -H "Accept-Encoding: gzip" -v http://localhost:3002/api/compression-test\n');

testCompression();

setTimeout(() => {
  console.log('\n🔍 Additional Tests:');
  console.log('===================');
  console.log('1. Check Network tab in browser DevTools');
  console.log('2. Look for "Content-Encoding: gzip" header');
  console.log('3. Compare transfer size vs actual size');
  console.log('4. Test with different endpoints returning JSON');

  process.exit(0);
}, 2000);
