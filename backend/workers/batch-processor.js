const { parentPort, workerData } = require('worker_threads');

/**
 * Batch Processing Worker Thread
 * Handles CPU-intensive batch processing of attendance records
 * to prevent blocking the main event loop
 */

const processBatch = (batch, userMaps) => {
  try {
    const results = {
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

    // Process each record in the batch
    batch.forEach((record, index) => {
      try {
        results.stats.processed++;

        // Basic validation
        if (!record || typeof record !== 'object') {
          results.errors.push({
            record,
            error: 'Invalid record format',
            index,
          });
          results.stats.errors++;
          return;
        }

        // Process attendance record
        const processedRecord = processAttendanceRecord(record, userMaps, index);

        if (processedRecord.isValid) {
          if (processedRecord.isDuplicate) {
            results.duplicates.push(processedRecord);
            results.stats.duplicates++;
          } else {
            results.validRecords.push(processedRecord);
            results.stats.valid++;

            if (processedRecord.isNewEmployee) {
              results.newEmployees.push(processedRecord);
              results.stats.newEmployees++;
            }
          }
        } else {
          results.errors.push(processedRecord);
          results.stats.errors++;
        }
      } catch (error) {
        results.errors.push({
          record,
          error: error.message,
          index,
          stack: error.stack,
        });
        results.stats.errors++;
      }
    });

    return {
      success: true,
      results,
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

/**
 * Process individual attendance record
 */
const processAttendanceRecord = (record, userMaps, index) => {
  const result = {
    originalRecord: record,
    index,
    isValid: false,
    isDuplicate: false,
    isNewEmployee: false,
    errors: [],
    processedData: null,
  };

  try {
    // Extract and normalize data
    const normalizedRecord = normalizeRecord(record);

    // Validate required fields
    const validation = validateRecord(normalizedRecord);
    if (!validation.isValid) {
      result.errors = validation.errors;
      return result;
    }

    // Check for employee
    const employee = findEmployee(normalizedRecord, userMaps);
    if (!employee.found) {
      result.isNewEmployee = true;
      result.processedData = {
        ...normalizedRecord,
        employeeStatus: 'new',
        suggestedEmployee: employee.suggestions,
      };
    } else {
      // Check for duplicates
      const isDuplicate = checkDuplicate(normalizedRecord, employee.data);
      result.isDuplicate = isDuplicate;
      result.processedData = {
        ...normalizedRecord,
        employeeId: employee.data.id,
        employeeStatus: 'existing',
      };
    }

    result.isValid = true;
    return result;
  } catch (error) {
    result.errors.push({
      type: 'processing_error',
      message: error.message,
      stack: error.stack,
    });
    return result;
  }
};

/**
 * Normalize record data
 */
const normalizeRecord = record => {
  // Handle different field name variations
  const fieldMappings = {
    'Employee Name': ['employeeName', 'name', 'employee', 'Employee', 'Name'],
    'Employee ID': ['employeeId', 'id', 'emp_id', 'employee_id', 'ID'],
    Email: ['email', 'Email', 'employee_email', 'employeeEmail'],
    Date: ['date', 'Date', 'attendance_date', 'attendanceDate'],
    'Time In': ['timeIn', 'time_in', 'checkin', 'check_in', 'Time In'],
    'Time Out': ['timeOut', 'time_out', 'checkout', 'check_out', 'Time Out'],
    'Hours Worked': ['hoursWorked', 'hours_worked', 'hours', 'Hours'],
  };

  const normalized = {};

  Object.keys(fieldMappings).forEach(standardField => {
    const possibleFields = fieldMappings[standardField];
    for (const field of possibleFields) {
      if (record[field] !== undefined && record[field] !== null && record[field] !== '') {
        normalized[standardField] = record[field];
        break;
      }
    }
  });

  return normalized;
};

/**
 * Validate record data
 */
const validateRecord = record => {
  const errors = [];
  const requiredFields = ['Employee Name', 'Date'];

  requiredFields.forEach(field => {
    if (!record[field]) {
      errors.push({
        type: 'missing_field',
        field,
        message: `${field} is required`,
      });
    }
  });

  // Validate date format
  if (record['Date']) {
    const date = new Date(record['Date']);
    if (isNaN(date.getTime())) {
      errors.push({
        type: 'invalid_date',
        field: 'Date',
        value: record['Date'],
        message: 'Invalid date format',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Find employee in user maps
 */
const findEmployee = (record, userMaps) => {
  const { usersByEmail, usersByName, usersByFullName, usersById } = userMaps;

  // Try different matching strategies
  const strategies = [
    () => record['Employee ID'] && usersById[record['Employee ID']],
    () => record['Email'] && usersByEmail[record['Email'].toLowerCase()],
    () => record['Employee Name'] && usersByName[record['Employee Name'].toLowerCase()],
    () => record['Employee Name'] && usersByFullName[record['Employee Name'].toLowerCase()],
  ];

  for (const strategy of strategies) {
    const employee = strategy();
    if (employee) {
      return { found: true, data: employee };
    }
  }

  // Generate suggestions for new employees
  const suggestions = generateEmployeeSuggestions(record, userMaps);

  return { found: false, suggestions };
};

/**
 * Generate employee suggestions
 */
const generateEmployeeSuggestions = (record, userMaps) => {
  const suggestions = [];
  const name = record['Employee Name'];

  if (name) {
    const nameParts = name.toLowerCase().split(' ');
    Object.values(userMaps.usersByName).forEach(user => {
      const userNameParts = user.name.toLowerCase().split(' ');
      const similarity = calculateSimilarity(nameParts, userNameParts);
      if (similarity > 0.6) {
        suggestions.push({
          employee: user,
          similarity,
          reason: 'name_similarity',
        });
      }
    });
  }

  return suggestions.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
};

/**
 * Calculate string similarity
 */
const calculateSimilarity = (arr1, arr2) => {
  const set1 = new Set(arr1);
  const set2 = new Set(arr2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
};

/**
 * Check for duplicate records
 */
const checkDuplicate = (record, employee) => {
  // This would typically check against existing database records
  // For now, return false (implement actual duplicate checking logic)
  return false;
};

// Process the batch and send result back to main thread
if (parentPort) {
  // Listen for messages from the main thread
  parentPort.on('message', data => {
    if (data && data.batch && data.userMaps) {
      const result = processBatch(data.batch, data.userMaps);
      parentPort.postMessage(result);
    } else {
      parentPort.postMessage({
        success: false,
        error: 'Invalid data received: batch and userMaps are required',
        processedAt: new Date().toISOString(),
      });
    }
  });

  // Handle initial workerData if provided (for backward compatibility)
  if (workerData && workerData.batch && workerData.userMaps) {
    const result = processBatch(workerData.batch, workerData.userMaps);
    parentPort.postMessage(result);
  }
} else {
  console.error('Worker thread not properly initialized: parentPort is not available');
  process.exit(1);
}
