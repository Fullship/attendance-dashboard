/**
 * DEMONSTRATION: Async Performance Optimization Implementation
 *
 * This file shows how to replace synchronous, blocking operations
 * with asynchronous, worker thread-based alternatives in admin.js
 */

const express = require('express');
const multer = require('multer');
const { promises: fs } = require('fs');
const WorkerPool = require('../utils/WorkerPool');
const path = require('path');

// Initialize worker pools for different types of CPU-intensive operations
const excelWorkerPool = new WorkerPool('./workers/excel-processor.js', 2);
const batchWorkerPool = new WorkerPool('./workers/batch-processor.js', 4);

// BEFORE: Synchronous file operations (BLOCKING)
const oldFileUploadHandler = async (req, res) => {
  try {
    const uploadDir = './uploads';

    // ❌ BLOCKING: Synchronous file system check
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = req.file.path;

    // ❌ BLOCKING: Synchronous Excel reading (can take 2-5 seconds)
    const workbook = xlsx.readFile(filePath, {
      cellDates: true,
      cellNF: false,
      cellText: false,
      sheetStubs: false,
    });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const records = xlsx.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: '',
    });

    // ❌ BLOCKING: CPU-intensive batch processing
    const BATCH_SIZE = 500;
    const batches = [];

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      batches.push(records.slice(i, i + BATCH_SIZE));
    }

    // Process batches - still blocks main thread during processing
    const results = [];
    for (const batch of batches) {
      const batchResult = await processBatch(batch); // CPU-intensive
      results.push(batchResult);
    }

    res.json({ success: true, processed: results.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// AFTER: Asynchronous, worker thread-based operations (NON-BLOCKING)
const newFileUploadHandler = async (req, res) => {
  try {
    const uploadDir = './uploads';

    // ✅ NON-BLOCKING: Async file system operations
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }

    const filePath = req.file.path;
    const startTime = Date.now();

    // ✅ NON-BLOCKING: Excel processing in worker thread
    console.log('📊 Starting Excel processing in worker thread...');
    const excelResult = await excelWorkerPool.execute({ filePath });

    if (!excelResult.success) {
      throw new Error(`Excel processing failed: ${excelResult.error}`);
    }

    const records = excelResult.data;
    console.log(`✅ Excel processed in ${Date.now() - startTime}ms: ${records.length} records`);

    // Prepare user maps for batch processing
    const userMaps = await getUserMaps(); // Assume this function exists

    // ✅ NON-BLOCKING: Split into batches for worker processing
    const BATCH_SIZE = 100; // Smaller batches for better distribution
    const batches = [];

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      batches.push({
        batch: records.slice(i, i + BATCH_SIZE),
        userMaps,
        batchIndex: Math.floor(i / BATCH_SIZE),
      });
    }

    console.log(`📦 Split ${records.length} records into ${batches.length} batches`);

    // ✅ NON-BLOCKING: Process all batches concurrently using worker pool
    const batchStartTime = Date.now();
    const batchResults = await batchWorkerPool.executeAll(batches, 4); // Process 4 batches concurrently

    console.log(`✅ Batch processing completed in ${Date.now() - batchStartTime}ms`);

    // Combine results from all batches
    const combinedResults = {
      validRecords: [],
      duplicates: [],
      newEmployees: [],
      errors: [],
      stats: {
        processed: 0,
        valid: 0,
        duplicates: 0,
        errors: 0,
        newEmployees: 0,
      },
    };

    // Process successful batch results
    batchResults.results.forEach(({ result }) => {
      if (result.success && result.results) {
        const batchData = result.results;
        combinedResults.validRecords.push(...batchData.validRecords);
        combinedResults.duplicates.push(...batchData.duplicates);
        combinedResults.newEmployees.push(...batchData.newEmployees);
        combinedResults.errors.push(...batchData.errors);

        // Combine stats
        Object.keys(combinedResults.stats).forEach(key => {
          combinedResults.stats[key] += batchData.stats[key] || 0;
        });
      }
    });

    // Handle batch processing errors
    if (batchResults.errors.length > 0) {
      console.warn(`⚠️  ${batchResults.errors.length} batches failed processing`);
      batchResults.errors.forEach(({ error, index }) => {
        combinedResults.errors.push({
          type: 'batch_processing_error',
          batchIndex: index,
          error: error.message,
        });
      });
    }

    const totalTime = Date.now() - startTime;

    res.json({
      success: true,
      message: `File processed successfully in ${totalTime}ms`,
      statistics: {
        totalRecords: records.length,
        validRecords: combinedResults.validRecords.length,
        duplicates: combinedResults.duplicates.length,
        newEmployees: combinedResults.newEmployees.length,
        errors: combinedResults.errors.length,
        processingTime: totalTime,
        performance: {
          excelProcessingTime: excelResult.memoryUsage
            ? `Memory: ${Math.round(excelResult.memoryUsage.heapUsed / 1024 / 1024)}MB`
            : 'N/A',
          batchProcessingTime: `${Date.now() - batchStartTime}ms`,
          workerPoolStats: batchWorkerPool.getStats(),
        },
      },
      results: {
        validRecords: combinedResults.validRecords.slice(0, 10), // Return first 10 for preview
        duplicates: combinedResults.duplicates.slice(0, 5),
        newEmployees: combinedResults.newEmployees.slice(0, 5),
        errors: combinedResults.errors.slice(0, 10),
      },
    });
  } catch (error) {
    console.error('❌ File upload processing error:', error);
    res.status(500).json({
      error: error.message,
      workerPoolHealth: {
        excel: excelWorkerPool.isHealthy(),
        batch: batchWorkerPool.isHealthy(),
      },
    });
  }
};

// Helper function to get user maps (would be implemented based on existing code)
const getUserMaps = async () => {
  // This would fetch user data from database and create lookup maps
  // Implementation would be based on existing code in admin.js
  return {
    usersByEmail: {},
    usersByName: {},
    usersByFullName: {},
    usersById: {},
    usersByFirstName: {},
    usersByLastName: {},
  };
};

// BEFORE: Synchronous JSON operations (BLOCKING)
const oldJsonProcessor = (req, res) => {
  try {
    // ❌ BLOCKING: Large JSON parsing can block for 50-200ms
    const largeData = JSON.parse(req.body.largeJsonString);

    // ❌ BLOCKING: Processing large objects
    const processedData = largeData.map(item => {
      // CPU-intensive transformation
      return processComplexItem(item);
    });

    // ❌ BLOCKING: JSON stringification
    const result = JSON.stringify(processedData);

    res.json({ processed: true, size: result.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// AFTER: Streaming JSON processing (NON-BLOCKING)
const newJsonProcessor = async (req, res) => {
  try {
    const { Transform, pipeline } = require('stream');
    const { Readable, Writable } = require('stream');

    const results = [];

    // ✅ NON-BLOCKING: Stream-based JSON processing
    const processStream = new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        // Process each item without blocking
        setImmediate(() => {
          try {
            const processed = processComplexItem(chunk);
            this.push(processed);
            callback();
          } catch (error) {
            callback(error);
          }
        });
      },
    });

    const collectStream = new Writable({
      objectMode: true,
      write(chunk, encoding, callback) {
        results.push(chunk);
        callback();
      },
    });

    // Convert input to stream
    const inputStream = Readable.from(JSON.parse(req.body.largeJsonString));

    // Process using pipeline
    await pipeline(inputStream, processStream, collectStream);

    res.json({
      processed: true,
      count: results.length,
      processingMethod: 'streaming',
      memoryEfficient: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// BEFORE: Synchronous file operations in database config (BLOCKING)
const oldDatabaseLogging = () => {
  const logFile = path.join(__dirname, 'logs', 'slow-queries.log');

  // ❌ BLOCKING: Synchronous file existence check
  if (fs.existsSync(logFile)) {
    // ❌ BLOCKING: Read entire file into memory
    const content = fs.readFileSync(logFile, 'utf8');
    // ❌ BLOCKING: Parse large JSON
    const existingData = JSON.parse(content);
    return existingData;
  }

  return [];
};

// AFTER: Asynchronous file operations (NON-BLOCKING)
const newDatabaseLogging = async () => {
  const logFile = path.join(__dirname, 'logs', 'slow-queries.log');

  try {
    // ✅ NON-BLOCKING: Async file access check
    await fs.access(logFile);

    // ✅ NON-BLOCKING: Stream-based file reading
    const { createReadStream } = require('fs');
    const split = require('split2');
    const { Transform } = require('stream');

    const results = [];

    await pipeline(
      createReadStream(logFile),
      split(),
      new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
          try {
            if (chunk.trim()) {
              const data = JSON.parse(chunk);
              this.push(data);
            }
            callback();
          } catch (error) {
            // Skip invalid lines
            callback();
          }
        },
      }),
      new Transform({
        objectMode: true,
        transform(data, encoding, callback) {
          results.push(data);
          callback();
        },
      })
    );

    return results;
  } catch (error) {
    // File doesn't exist or other error
    return [];
  }
};

// Performance monitoring endpoint
const getPerformanceStats = (req, res) => {
  res.json({
    workerPools: {
      excel: {
        stats: excelWorkerPool.getStats(),
        health: excelWorkerPool.isHealthy(),
      },
      batch: {
        stats: batchWorkerPool.getStats(),
        health: batchWorkerPool.isHealthy(),
      },
    },
    system: {
      cpuCount: require('os').cpus().length,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
    },
    recommendations: [
      'Monitor worker pool health regularly',
      'Adjust worker pool sizes based on CPU cores and workload',
      'Use streaming for large file processing',
      'Implement proper error handling and timeouts',
    ],
  });
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  await Promise.all([excelWorkerPool.terminate(), batchWorkerPool.terminate()]);
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  await Promise.all([excelWorkerPool.terminate(), batchWorkerPool.terminate()]);
  process.exit(0);
});

module.exports = {
  newFileUploadHandler,
  newJsonProcessor,
  newDatabaseLogging,
  getPerformanceStats,
  // Export worker pools for other modules to use
  excelWorkerPool,
  batchWorkerPool,
};
