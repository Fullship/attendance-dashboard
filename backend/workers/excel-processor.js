const { parentPort, workerData } = require('worker_threads');
const xlsx = require('xlsx');
const fs = require('fs');

/**
 * Excel Processing Worker Thread
 * Handles CPU-intensive Excel file reading and parsing
 * to prevent blocking the main event loop
 */

const processExcelFile = filePath => {
  try {
    // Verify file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Read Excel file with optimized settings
    const workbook = xlsx.readFile(filePath, {
      cellDates: true,
      cellNF: false,
      cellText: false,
      sheetStubs: false, // Skip empty cells for better performance
      bookVBA: false, // Skip VBA for security and performance
      bookSheets: false, // Don't read sheet info
      bookProps: false, // Don't read document properties
    });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('No sheets found in Excel file');
    }

    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON with optimized settings
    const jsonData = xlsx.utils.sheet_to_json(worksheet, {
      raw: false, // Don't parse dates as numbers
      defval: '', // Default value for empty cells
      blankrows: false, // Skip blank rows
      header: 1, // Use first row as header
    });

    // Basic validation
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      throw new Error('No data found in Excel file');
    }

    // Return processed data with metadata
    return {
      success: true,
      data: jsonData,
      recordCount: jsonData.length,
      sheetName: sheetName,
      processedAt: new Date().toISOString(),
      memoryUsage: process.memoryUsage(),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stack: error.stack,
      processedAt: new Date().toISOString(),
      memoryUsage: process.memoryUsage(),
    };
  }
};

// Process the file and send result back to main thread
if (parentPort) {
  // Listen for messages from the main thread
  parentPort.on('message', data => {
    if (data && data.filePath) {
      const result = processExcelFile(data.filePath);
      parentPort.postMessage(result);
      // Don't exit here - let the parent terminate the worker
    } else {
      parentPort.postMessage({
        success: false,
        error: 'Invalid data received: filePath is required',
        processedAt: new Date().toISOString(),
      });
    }
  });

  // Handle initial workerData if provided (for backward compatibility)
  if (workerData && workerData.filePath) {
    const result = processExcelFile(workerData.filePath);
    parentPort.postMessage(result);
    // Don't exit here - let the parent terminate the worker
  }
} else {
  console.error('Worker thread not properly initialized: parentPort is not available');
  process.exit(1);
}
