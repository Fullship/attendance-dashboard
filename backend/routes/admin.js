const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');
const { promises: fsPromises } = require('fs');
const moment = require('moment');
const bcrypt = require('bcryptjs');
const { auth, adminAuth } = require('../middleware/auth');
const pool = require('../config/database');
const { TimezoneAttendanceProcessor } = require('../utils/timezone-processor');
const WorkerPool = require('../utils/WorkerPool');
const dbCache = require('../utils/DatabaseCache');
const memoryProfiler = require('../utils/MemoryProfiler');
const profilingManager = require('../utils/ProfilingManager');
const monitoringInstrumentation = require('../middleware/monitoring-instrumentation');
const {
  invalidateAttendanceCache,
  invalidateUserCache,
  invalidateLeaveRequestCache,
  invalidateClockRequestCache,
  invalidateAllCache,
} = require('../middleware/cacheInvalidation');

const router = express.Router();

// Initialize worker pools for async processing (reduced for memory optimization)
const excelWorkerPool = new WorkerPool('./workers/excel-processor.js', 1);
const batchWorkerPool = new WorkerPool('./workers/batch-processor.js', 1);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = './uploads';
    try {
      await fsPromises.access(uploadDir);
    } catch {
      await fsPromises.mkdir(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = file.originalname.toLowerCase().endsWith('.xlsx') ? '.xlsx' : '.csv';
    cb(null, `attendance-${uniqueSuffix}${extension}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const allowedExtensions = ['.csv', '.xlsx'];

    const isValidMimeType = allowedTypes.includes(file.mimetype);
    const isValidExtension = allowedExtensions.some(ext =>
      file.originalname.toLowerCase().endsWith(ext)
    );

    if (!isValidMimeType && !isValidExtension) {
      return cb(new Error('Only CSV and Excel (.xlsx) files are allowed'));
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Get all employees
router.get('/employees', auth, adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', period = '30', locationId, teamId } = req.query;

    // Ensure page and limit are positive integers
    const pageInt = Math.max(1, parseInt(page) || 1);
    const limitInt = Math.max(1, parseInt(limit) || 20);
    const offset = (pageInt - 1) * limitInt;

    // Calculate date range based on period
    let startDate;
    let endDate = null;
    const currentDate = new Date();

    switch (period) {
      case '7':
        startDate = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30':
        startDate = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90':
        startDate = new Date(currentDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '365':
        startDate = new Date(currentDate.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'last_year':
        startDate = new Date(currentDate.getFullYear() - 1, 0, 1);
        endDate = new Date(currentDate.getFullYear() - 1, 11, 31, 23, 59, 59);
        break;
      case 'this_year':
        startDate = new Date(currentDate.getFullYear(), 0, 1);
        break;
      case 'this_month':
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        break;
      default:
        startDate = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Build date filter for attendance records
    let dateFilter = 'ar.date >= $1';
    let dateParams = [startDate.toISOString().split('T')[0]];
    let paramIndex = 2;

    if (endDate) {
      dateFilter += ` AND ar.date <= $${paramIndex}`;
      dateParams.push(endDate.toISOString().split('T')[0]);
      paramIndex++;
    }

    let query = `
      SELECT u.id, u.email, u.first_name, u.last_name, u.is_admin, u.created_at,
             u.location_id, u.team_id,
             l.name as location_name, l.timezone as location_timezone,
             t.name as team_name, t.description as team_description,
             COUNT(ar.id) as total_records,
             COUNT(ar.id) FILTER (WHERE ar.status = 'present') as present_days,
             COUNT(ar.id) FILTER (WHERE ar.status = 'absent') as absent_days,
             COUNT(ar.id) FILTER (WHERE ar.status = 'late') as late_days,
             COUNT(ar.id) FILTER (WHERE ar.status = 'early_leave') as early_leave_days,
             AVG(ar.hours_worked) FILTER (WHERE ar.hours_worked > 0) as avg_hours,
             COUNT(DISTINCT ar.date) as unique_days,
             MIN(ar.date) as first_attendance_date,
             MAX(ar.date) as last_attendance_date
      FROM users u
      LEFT JOIN locations l ON u.location_id = l.id
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN attendance_records ar ON u.id = ar.user_id 
        AND ${dateFilter}
      WHERE u.is_admin = FALSE
    `;

    const params = [...dateParams];

    // Add location filter
    if (locationId) {
      query += ` AND u.location_id = $${params.length + 1}`;
      params.push(locationId);
    }

    // Add team filter
    if (teamId) {
      query += ` AND u.team_id = $${params.length + 1}`;
      params.push(teamId);
    }

    // Add search filter
    if (search) {
      query += ` AND (u.first_name ILIKE $${params.length + 1} OR u.last_name ILIKE $${
        params.length + 1
      } OR u.email ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    query += ` GROUP BY u.id, u.email, u.first_name, u.last_name, u.is_admin, u.created_at,
                      u.location_id, u.team_id, l.name, l.timezone, t.name, t.description`;
    query += ` ORDER BY l.name NULLS LAST, t.name NULLS LAST, u.last_name, u.first_name`;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limitInt, offset);

    const result = await pool.query(query, params);

    // Get total count with same filters
    let countQuery = 'SELECT COUNT(*) FROM users u WHERE u.is_admin = FALSE';
    const countParams = [];

    if (locationId) {
      countQuery += ` AND u.location_id = $${countParams.length + 1}`;
      countParams.push(locationId);
    }

    if (teamId) {
      countQuery += ` AND u.team_id = $${countParams.length + 1}`;
      countParams.push(teamId);
    }

    if (search) {
      countQuery += ` AND (u.first_name ILIKE $${countParams.length + 1} OR u.last_name ILIKE $${
        countParams.length + 1
      } OR u.email ILIKE $${countParams.length + 1})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    // Validate page number - if page is beyond available pages, return empty result
    const totalPages = Math.ceil(total / limitInt);
    if (pageInt > totalPages && total > 0) {
      return res.json({
        employees: [],
        pagination: {
          page: pageInt,
          limit: limitInt,
          total,
          pages: totalPages,
        },
      });
    }

    res.json({
      employees: result.rows.map(emp => ({
        id: emp.id,
        email: emp.email,
        firstName: emp.first_name,
        lastName: emp.last_name,
        isAdmin: emp.is_admin,
        createdAt: emp.created_at,
        locationId: emp.location_id,
        teamId: emp.team_id,
        location: emp.location_name
          ? {
              name: emp.location_name,
              timezone: emp.location_timezone,
            }
          : null,
        team: emp.team_name
          ? {
              name: emp.team_name,
              description: emp.team_description,
            }
          : null,
        stats: {
          totalRecords: parseInt(emp.total_records || 0),
          presentDays: parseInt(emp.present_days || 0),
          absentDays: parseInt(emp.absent_days || 0),
          lateDays: parseInt(emp.late_days || 0),
          earlyLeaveDays: parseInt(emp.early_leave_days || 0),
          averageHours: emp.avg_hours ? parseFloat(emp.avg_hours).toFixed(2) : '0.00',
          totalHours:
            emp.total_records > 0
              ? (parseFloat(emp.avg_hours || 0) * parseInt(emp.present_days || 0)).toFixed(2)
              : '0.00',
        },
      })),
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        pages: Math.ceil(total / limitInt),
      },
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get employee details
router.get('/employees/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '30' } = req.query;

    // Calculate date range based on period (unified logic)
    let startDate, endDate;
    const currentDate = moment();

    switch (period) {
      case '7':
        startDate = moment().subtract(7, 'days').format('YYYY-MM-DD');
        endDate = moment().format('YYYY-MM-DD');
        break;
      case '30':
        startDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
        endDate = moment().format('YYYY-MM-DD');
        break;
      case '90':
        startDate = moment().subtract(90, 'days').format('YYYY-MM-DD');
        endDate = moment().format('YYYY-MM-DD');
        break;
      case '365':
        startDate = moment().subtract(365, 'days').format('YYYY-MM-DD');
        endDate = moment().format('YYYY-MM-DD');
        break;
      case 'last_year':
        startDate = moment().subtract(1, 'year').startOf('year').format('YYYY-MM-DD');
        endDate = moment().subtract(1, 'year').endOf('year').format('YYYY-MM-DD');
        break;
      case 'this_year':
        startDate = moment().startOf('year').format('YYYY-MM-DD');
        endDate = moment().endOf('year').format('YYYY-MM-DD');
        break;
      case 'this_month':
        startDate = moment().startOf('month').format('YYYY-MM-DD');
        endDate = moment().endOf('month').format('YYYY-MM-DD');
        break;
      default:
        startDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
        endDate = moment().format('YYYY-MM-DD');
    }

    // Generate date range string for response
    let dateRange;
    switch (period) {
      case '7':
        dateRange = `${moment().subtract(6, 'days').format('MMM D, YYYY')} - ${moment().format(
          'MMM D, YYYY'
        )}`;
        break;
      case '30':
        dateRange = `${moment().subtract(29, 'days').format('MMM D, YYYY')} - ${moment().format(
          'MMM D, YYYY'
        )}`;
        break;
      case '90':
        dateRange = `${moment().subtract(89, 'days').format('MMM D, YYYY')} - ${moment().format(
          'MMM D, YYYY'
        )}`;
        break;
      case '365':
        dateRange = `${moment().subtract(364, 'days').format('MMM D, YYYY')} - ${moment().format(
          'MMM D, YYYY'
        )}`;
        break;
      case 'last_year':
        dateRange = `${moment()
          .subtract(1, 'year')
          .startOf('year')
          .format('MMM D, YYYY')} - ${moment()
          .subtract(1, 'year')
          .endOf('year')
          .format('MMM D, YYYY')}`;
        break;
      case 'this_year':
        dateRange = `${moment().startOf('year').format('MMM D, YYYY')} - ${moment()
          .endOf('year')
          .format('MMM D, YYYY')}`;
        break;
      case 'this_month':
        dateRange = `${moment().startOf('month').format('MMM D, YYYY')} - ${moment()
          .endOf('month')
          .format('MMM D, YYYY')}`;
        break;
      default:
        dateRange = `${moment().subtract(29, 'days').format('MMM D, YYYY')} - ${moment().format(
          'MMM D, YYYY'
        )}`;
    }

    // Get employee info
    const userResult = await pool.query(
      'SELECT id, email, first_name, last_name, is_admin, created_at FROM users WHERE id = $1 AND is_admin = FALSE',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const employee = userResult.rows[0];

    // Get attendance stats
    const statsResult = await pool.query(
      `
      SELECT 
        COUNT(*) as total_records,
        COUNT(*) FILTER (WHERE status = 'present') as present_days,
        COUNT(*) FILTER (WHERE status = 'absent') as absent_days,
        COUNT(*) FILTER (WHERE status = 'late') as late_days,
        COUNT(*) FILTER (WHERE status = 'early_leave') as early_leave_days,
        AVG(hours_worked) FILTER (WHERE hours_worked > 0) as avg_hours,
        SUM(hours_worked) as total_hours
      FROM attendance_records 
      WHERE user_id = $1 AND date >= $2 AND date <= $3
    `,
      [id, startDate, endDate]
    );

    const stats = statsResult.rows[0];

    // Get recent records with pagination (filtered by date range)
    const { page = 1, limit = 25 } = req.query;
    const offset = (page - 1) * limit;

    const recordsResult = await pool.query(
      'SELECT * FROM attendance_records WHERE user_id = $1 AND date >= $2 AND date <= $3 ORDER BY date DESC LIMIT $4 OFFSET $5',
      [id, startDate, endDate, limit, offset]
    );

    // Get total count of records for pagination (filtered by date range)
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM attendance_records WHERE user_id = $1 AND date >= $2 AND date <= $3',
      [id, startDate, endDate]
    );
    const totalRecords = parseInt(countResult.rows[0].count);

    res.json({
      employee: {
        id: employee.id,
        email: employee.email,
        firstName: employee.first_name,
        lastName: employee.last_name,
        isAdmin: employee.is_admin,
        createdAt: employee.created_at,
      },
      stats: {
        totalRecords: parseInt(stats.total_records),
        presentDays: parseInt(stats.present_days),
        absentDays: parseInt(stats.absent_days),
        lateDays: parseInt(stats.late_days),
        earlyLeaveDays: parseInt(stats.early_leave_days),
        averageHours: parseFloat(stats.avg_hours || 0).toFixed(2),
        totalHours: parseFloat(stats.total_hours || 0).toFixed(2),
      },
      recentRecords: recordsResult.rows,
      dateRange,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalRecords,
        pages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (error) {
    console.error('Get employee details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload attendance file (CSV or Excel) - OPTIMIZED VERSION
router.post(
  '/upload-attendance',
  auth,
  adminAuth,
  invalidateAllCache, // Invalidate cache after successful upload
  upload.single('attendanceFile'),
  async (req, res) => {
    let uploadId = null;

    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const filePath = req.file.path;
      const fileName = req.file.filename;
      const originalName = req.file.originalname;

      // Create upload record
      const uploadResult = await pool.query(
        'INSERT INTO file_uploads (filename, original_name, uploaded_by) VALUES ($1, $2, $3) RETURNING id',
        [fileName, originalName, req.user.id]
      );

      uploadId = uploadResult.rows[0].id;
      let processedCount = 0;
      let errorCount = 0;
      const errors = [];

      // Process file (CSV or Excel) with streaming for large files
      const records = [];
      const isExcel = filePath.toLowerCase().endsWith('.xlsx');

      console.log(`Processing ${isExcel ? 'Excel' : 'CSV'} file: ${originalName}`);
      const startTime = Date.now();

      if (isExcel) {
        // Handle Excel file with worker thread processing
        try {
          const excelResult = await excelWorkerPool.execute({ filePath });
          if (excelResult.success) {
            records.push(...excelResult.data);
            console.log(`✅ Excel processed: ${excelResult.recordCount} records in worker thread`);
          } else {
            throw new Error(excelResult.error);
          }
        } catch (error) {
          console.error('Excel processing error:', error);
          throw new Error(`Failed to process Excel file: ${error.message}`);
        }
      } else {
        // Handle CSV file with streaming for better memory usage
        await new Promise((resolve, reject) => {
          let recordCount = 0;
          fs.createReadStream(filePath)
            .pipe(
              csv({
                skipEmptyLines: true,
                trim: true,
              })
            )
            .on('data', data => {
              records.push(data);
              recordCount++;
              // Log progress for very large files
              if (recordCount % 1000 === 0) {
                console.log(`Read ${recordCount} records from CSV...`);
              }
            })
            .on('end', resolve)
            .on('error', reject);
        });
      }

      const parseTime = Date.now() - startTime;
      console.log(`File parsed in ${parseTime}ms. Total records: ${records.length}`);

      const totalRecords = records.length;
      const io = req.app.get('io');

      // Emit initial progress
      io.emit('upload-progress', {
        uploadId,
        phase: 'processing',
        totalRecords,
        processedCount: 0,
        errorCount: 0,
        progress: 0,
      });

      // OPTIMIZATION: Pre-fetch all users with optimized query and better indexing
      const allUsersResult = await pool.query(`
      SELECT id, email, first_name, last_name, 
             LOWER(TRIM(email)) as email_lower,
             LOWER(TRIM(first_name)) as first_name_lower,
             LOWER(TRIM(last_name)) as last_name_lower,
             CONCAT(LOWER(TRIM(first_name)), ' ', LOWER(TRIM(last_name))) as full_name_lower
      FROM users WHERE is_admin = FALSE
    `);

      // Create multiple lookup maps for ultra-fast user resolution
      const usersByEmail = new Map();
      const usersByName = new Map();
      const usersByFullName = new Map();
      const usersById = new Map();
      const usersByFirstName = new Map();
      const usersByLastName = new Map();

      console.log(`Creating lookup maps for ${allUsersResult.rows.length} users...`);

      allUsersResult.rows.forEach(user => {
        // Email lookups
        if (user.email_lower) {
          usersByEmail.set(user.email_lower, user);
        }

        // Name-based lookups
        const nameKey = `${user.first_name_lower}|${user.last_name_lower}`;
        usersByName.set(nameKey, user);

        // Full name lookup (for "John Doe" format)
        if (user.full_name_lower) {
          usersByFullName.set(user.full_name_lower, user);
        }

        // ID lookup
        usersById.set(user.id.toString(), user);

        // Individual name lookups (fallback)
        if (user.first_name_lower) {
          if (!usersByFirstName.has(user.first_name_lower)) {
            usersByFirstName.set(user.first_name_lower, []);
          }
          usersByFirstName.get(user.first_name_lower).push(user);
        }

        if (user.last_name_lower) {
          if (!usersByLastName.has(user.last_name_lower)) {
            usersByLastName.set(user.last_name_lower, []);
          }
          usersByLastName.get(user.last_name_lower).push(user);
        }
      });

      // OPTIMIZATION: Process records in batches using worker threads
      const BATCH_SIZE = 100; // Smaller batches for worker threads
      const batches = [];

      // Create batches for worker processing
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        batches.push(records.slice(i, i + BATCH_SIZE));
      }

      // Prepare user maps for workers
      const userMaps = {
        usersByEmail: Object.fromEntries(usersByEmail),
        usersByName: Object.fromEntries(usersByName),
        usersByFullName: Object.fromEntries(usersByFullName),
        usersById: Object.fromEntries(usersById),
        usersByFirstName: Object.fromEntries(usersByFirstName),
        usersByLastName: Object.fromEntries(usersByLastName),
      };

      // Process batches using worker thread pool
      console.log(`Processing ${batches.length} batches using worker threads...`);
      const batchPromises = batches.map(async (batch, batchIndex) => {
        try {
          return await batchWorkerPool.execute({
            batch,
            userMaps,
            batchIndex,
          });
        } catch (error) {
          console.error(`Batch ${batchIndex} processing error:`, error);
          return {
            validRecords: [],
            duplicates: [],
            newEmployees: [],
            errors: batch.map(record => ({
              record,
              error: `Worker processing failed: ${error.message}`,
              row: batchIndex * BATCH_SIZE,
            })),
            stats: {
              processed: batch.length,
              valid: 0,
              duplicates: 0,
              errors: batch.length,
              newEmployees: 0,
            },
          };
        }
      });

      const processedBatches = await Promise.all(batchPromises);

      // Aggregate results from all worker batches
      processedCount = 0;
      errorCount = 0;
      let totalCreatedUsers = 0;

      processedBatches.forEach(batch => {
        if (batch.success && batch.results) {
          processedCount += batch.results.stats.processed || 0;
          errorCount += batch.results.stats.errors || 0;
          totalCreatedUsers += batch.results.stats.newEmployees || 0;
          errors.push(...(batch.results.errors || []));
        } else {
          // Handle failed batch
          errorCount += batch.batch?.length || 0;
          errors.push({
            error: batch.error || 'Batch processing failed',
            batchSize: batch.batch?.length || 0
          });
        }
      });

      console.log(`Worker processing complete: ${processedCount} processed, ${errorCount} errors`);

      // Update progress
      const currentProgress = Math.round((processedCount / totalRecords) * 100);

      // Emit progress update
      io.emit('upload-progress', {
        uploadId,
        phase: 'processing',
        totalRecords,
        processedCount,
        errorCount,
        progress: currentProgress,
        currentRecord: processedCount,
      });

      // Update upload record with error details
      const finalStatus = errorCount > 0 ? 'completed_with_errors' : 'completed';
      const errorDetailsJson = errors.length > 0 ? JSON.stringify(errors) : null;

      await pool.query(
        'UPDATE file_uploads SET records_processed = $1, errors_count = $2, status = $3, error_details = $4 WHERE id = $5',
        [processedCount, errorCount, finalStatus, errorDetailsJson, uploadId]
      );

      // Emit completion progress
      io.emit('upload-progress', {
        uploadId,
        phase: 'completed',
        totalRecords,
        processedCount,
        errorCount,
        progress: 100,
        status: finalStatus,
      });

      // Clean up uploaded file (async)
      try {
        await fsPromises.unlink(filePath);
      } catch (error) {
        console.warn('Failed to clean up processed file:', error.message);
      }

      // Calculate totals from processed batches (using existing totalCreatedUsers)
      const duplicateErrors = errors.filter(error => error.includes('duplicate'));
      const totalDuplicates = duplicateErrors.length;

      // Extract duplicate count from error messages
      let actualDuplicateRecords = 0;
      duplicateErrors.forEach(error => {
        const match = error.match(/(\d+) duplicate records/);
        if (match) {
          actualDuplicateRecords += parseInt(match[1]);
        }
      });

      res.json({
        message: 'Attendance file upload completed',
        uploadId,
        processedCount,
        errorCount,
        duplicatesCount: actualDuplicateRecords,
        createdUsersCount: totalCreatedUsers,
        errors: errors.slice(0, 15), // Return first 15 errors including duplicates
        summary: {
          totalRecords: processedCount,
          newRecords: processedCount - actualDuplicateRecords,
          duplicateRecords: actualDuplicateRecords,
          errorRecords: errorCount - duplicateErrors.length,
          createdUsers: totalCreatedUsers,
        },
      });
    } catch (error) {
      console.error('Attendance file upload error:', error);

      // Update upload record to failed status if uploadId exists
      if (uploadId) {
        try {
          await pool.query('UPDATE file_uploads SET status = $1, errors_count = $2 WHERE id = $3', [
            'failed',
            1,
            uploadId,
          ]);

          // Emit failure progress
          const io = req.app.get('io');
          io.emit('upload-progress', {
            uploadId,
            phase: 'failed',
            status: 'failed',
            error: error.message,
          });
        } catch (updateError) {
          console.error('Failed to update upload status:', updateError);
        }
      }

      // Clean up file if it exists (async)
      if (req.file) {
        try {
          await fsPromises.unlink(req.file.path);
        } catch (error) {
          // Ignore cleanup errors
          console.warn('Failed to clean up uploaded file:', error.message);
        }
      }

      res.status(500).json({ message: 'Server error during file upload' });
    }
  }
);

// OPTIMIZATION: Enhanced batch processing function with better user resolution
async function processBatch(
  batchRecords,
  usersByEmail,
  usersByName,
  usersByFullName,
  usersById,
  usersByFirstName,
  usersByLastName,
  batchIndex,
  pool
) {
  let processedCount = 0;
  let errorCount = 0;
  let createdUsersCount = 0;
  const errors = [];
  const attendanceRecordsToInsert = [];

  // Create a local date cache for this batch
  const dateCache = new Map();

  // Process each record in the batch
  for (const [recordIndex, record] of batchRecords.entries()) {
    try {
      // Log first few records to debug data format
      if (batchIndex === 0 && recordIndex < 3) {
        console.log(`[BATCH ${batchIndex}] Sample record ${recordIndex}:`, record);
      }

      // Enhanced user resolution with multiple lookup strategies
      let user = null;
      let email = null;
      let firstName = null;
      let lastName = null;
      let employeeId = null;

      // Check if this is the new format with First Name, Last Name, ID
      if (record['First Name'] || record['Last Name'] || record['ID']) {
        firstName = record['First Name']?.toString().trim();
        lastName = record['Last Name']?.toString().trim();
        employeeId = record['ID']?.toString().trim();

        // Strategy 1: Try to find user by ID first (fastest)
        if (employeeId) {
          user = usersById.get(employeeId);
          if (user) {
            console.log(
              `[BATCH ${batchIndex}] Found user by ID: ${employeeId} -> ${user.first_name} ${user.last_name}`
            );
          }
        }

        // Strategy 2: Try by exact name match
        if (!user && firstName && lastName) {
          const nameKey = `${firstName.toLowerCase()}|${lastName.toLowerCase()}`;
          user = usersByName.get(nameKey);
          if (user) {
            console.log(
              `[BATCH ${batchIndex}] Found user by name: ${firstName} ${lastName} -> ${user.first_name} ${user.last_name}`
            );
          }
        }

        // Strategy 3: Try by full name (handles "John Doe" format)
        if (!user && firstName && lastName) {
          const fullName = `${firstName.toLowerCase()} ${lastName.toLowerCase()}`;
          user = usersByFullName.get(fullName);
        }

        // Strategy 4: Fuzzy matching by individual names (slower, last resort)
        if (!user && firstName && lastName) {
          const firstNameLower = firstName.toLowerCase();
          const lastNameLower = lastName.toLowerCase();

          // Find users with matching first name
          const firstNameMatches = usersByFirstName.get(firstNameLower) || [];
          user = firstNameMatches.find(u => u.last_name_lower === lastNameLower);

          // If still not found, try last name first
          if (!user) {
            const lastNameMatches = usersByLastName.get(lastNameLower) || [];
            user = lastNameMatches.find(u => u.first_name_lower === firstNameLower);
          }
        }
      } else {
        // Old format with email
        email = record.email?.toString().trim().toLowerCase();
        if (email) {
          user = usersByEmail.get(email);
        }
      }

      // Extract date with optimized parsing and caching
      let attendanceDate = null;
      const dateField = record['Date'] || record['date'];

      if (dateField) {
        const dateStr = dateField.toString().trim();

        // Use local date cache for this batch
        if (dateCache.has(dateStr)) {
          attendanceDate = dateCache.get(dateStr);
        } else {
          // Try different date formats in order of likelihood
          // Prioritize DD/MM/YYYY for Excel files since most users input dates this way
          const dateFormats = [
            'DD/MM/YYYY', // European format (prioritized for Excel)
            'YYYY-MM-DD', // ISO format
            'MM/DD/YYYY', // US format
            'DD-MM-YYYY', // European with dashes
            'YYYY/MM/DD', // Alternative ISO
            'MM-DD-YYYY', // US with dashes
          ];

          for (const format of dateFormats) {
            const parsedDate = moment(dateStr, format, true);
            if (parsedDate.isValid()) {
              attendanceDate = parsedDate.format('YYYY-MM-DD');
              break;
            }
          }

          // If strict parsing failed, try lenient parsing
          if (!attendanceDate) {
            const autoDate = moment(dateStr);
            if (autoDate.isValid() && autoDate.year() > 2000 && autoDate.year() < 2100) {
              attendanceDate = autoDate.format('YYYY-MM-DD');
            }
          }

          // Cache the result (even if null)
          dateCache.set(dateStr, attendanceDate);
        }
      }

      // Validate required fields and auto-create missing users
      const userIdentifier = email || `${firstName} ${lastName}` || employeeId;
      if (!user) {
        // Try to auto-create user if we have enough information
        if (firstName && lastName) {
          try {
            console.log(`[BATCH ${batchIndex}] Auto-creating user: ${firstName} ${lastName}`);

            // Generate email if not provided
            const autoEmail =
              email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`;

            // Check if user already exists by email to prevent duplicates
            const existingUserResult = await pool.query(
              'SELECT id, email, first_name, last_name FROM users WHERE LOWER(email) = LOWER($1)',
              [autoEmail]
            );

            if (existingUserResult.rows.length > 0) {
              // User already exists, use the existing user
              const existingUser = existingUserResult.rows[0];
              user = {
                id: existingUser.id,
                email: existingUser.email,
                first_name: existingUser.first_name,
                last_name: existingUser.last_name,
                email_lower: existingUser.email.toLowerCase(),
                first_name_lower: existingUser.first_name.toLowerCase(),
                last_name_lower: existingUser.last_name.toLowerCase(),
                full_name_lower: `${existingUser.first_name.toLowerCase()} ${existingUser.last_name.toLowerCase()}`,
              };

              console.log(
                `[BATCH ${batchIndex}] Using existing user: ${firstName} ${lastName} (ID: ${user.id})`
              );
            } else {
              // Generate a temporary password hash (users will need to reset)
              const tempPassword = 'TempPass123!';
              const passwordHash = await bcrypt.hash(tempPassword, 10);

              // Create the user using INSERT ... ON CONFLICT to handle race conditions
              const newUserResult = await pool.query(
                `
                INSERT INTO users (email, first_name, last_name, password, is_admin) 
                VALUES ($1, $2, $3, $4, $5) 
                ON CONFLICT (email) 
                DO UPDATE SET 
                  first_name = EXCLUDED.first_name,
                  last_name = EXCLUDED.last_name
                RETURNING *`,
                [autoEmail, firstName, lastName, passwordHash, false]
              );

              const newUser = newUserResult.rows[0];
              user = {
                id: newUser.id,
                email: newUser.email,
                first_name: newUser.first_name,
                last_name: newUser.last_name,
                email_lower: autoEmail.toLowerCase(),
                first_name_lower: firstName.toLowerCase(),
                last_name_lower: lastName.toLowerCase(),
                full_name_lower: `${firstName.toLowerCase()} ${lastName.toLowerCase()}`,
              };

              console.log(
                `[BATCH ${batchIndex}] Successfully created user: ${firstName} ${lastName} (ID: ${user.id})`
              );
              createdUsersCount++;
            }

            // Add to lookup maps for future records in this batch
            usersByEmail.set(user.email_lower, user);
            const nameKey = `${user.first_name_lower}|${user.last_name_lower}`;
            usersByName.set(nameKey, user);
            usersByFullName.set(user.full_name_lower, user);
            if (employeeId) {
              usersById.set(employeeId, user);
            }
            usersById.set(user.id.toString(), user);
          } catch (createError) {
            errorCount++;
            const errorMsg = `Failed to create user ${userIdentifier}: ${createError.message}`;
            errors.push(errorMsg);
            console.log(`[BATCH ${batchIndex}] ${errorMsg}`);
            continue;
          }
        } else {
          errorCount++;
          const errorMsg = `User not found and insufficient data to create: ${userIdentifier}`;
          errors.push(errorMsg);
          console.log(`[BATCH ${batchIndex}] ${errorMsg}`);
          continue;
        }
      }

      if (!attendanceDate) {
        errorCount++;
        const errorMsg = `Invalid or missing date for user: ${userIdentifier}, dateField: ${
          record['Date'] || record['date']
        }`;
        errors.push(errorMsg);
        console.log(`[BATCH ${batchIndex}] ${errorMsg}`);
        continue;
      }

      const userId = user.id;

      // Extract time data - handle both formats
      let clockIn = null;
      let clockOut = null;
      let hoursWorked = 0;
      let status = 'present';

      // New format
      if (record['Clock-In Time'] || record['Clock-Out Time']) {
        clockIn = record['Clock-In Time']?.trim();
        clockOut = record['Clock-Out Time']?.trim();

        // Use provided worked hours if available
        if (record['Worked Hours']) {
          const workedHoursStr = record['Worked Hours'].toString();
          // Handle formats like "8.5", "8:30", "8h 30m"
          if (workedHoursStr.includes(':')) {
            const [hours, minutes] = workedHoursStr.split(':');
            hoursWorked = parseFloat(hours) + parseFloat(minutes) / 60;
          } else if (workedHoursStr.includes('h')) {
            // Handle "8h 30m" format
            const hourMatch = workedHoursStr.match(/(\d+)h/);
            const minuteMatch = workedHoursStr.match(/(\d+)m/);
            hoursWorked =
              (hourMatch ? parseFloat(hourMatch[1]) : 0) +
              (minuteMatch ? parseFloat(minuteMatch[1]) / 60 : 0);
          } else {
            hoursWorked = parseFloat(workedHoursStr) || 0;
          }
        }

        status = record['Attendance Status']?.toLowerCase() || 'present';
      } else {
        // Old format
        clockIn = record.clock_in?.trim();
        clockOut = record.clock_out?.trim();
        status = record.status?.toLowerCase() || 'present';
      }

      // Calculate hours worked if not provided
      if (hoursWorked === 0 && clockIn && clockOut) {
        const clockInTime = moment(clockIn, ['HH:mm', 'HH:mm:ss', 'h:mm A', 'h:mm:ss A']);
        const clockOutTime = moment(clockOut, ['HH:mm', 'HH:mm:ss', 'h:mm A', 'h:mm:ss A']);

        if (clockInTime.isValid() && clockOutTime.isValid()) {
          hoursWorked = clockOutTime.diff(clockInTime, 'hours', true);
          // Handle overnight shifts
          if (hoursWorked < 0) {
            hoursWorked += 24;
          }
        }
      }

      // Normalize time formats
      if (clockIn) {
        const clockInMoment = moment(clockIn, ['HH:mm', 'HH:mm:ss', 'h:mm A', 'h:mm:ss A']);
        clockIn = clockInMoment.isValid() ? clockInMoment.format('HH:mm') : null;
      }

      if (clockOut) {
        const clockOutMoment = moment(clockOut, ['HH:mm', 'HH:mm:ss', 'h:mm A', 'h:mm:ss A']);
        clockOut = clockOutMoment.isValid() ? clockOutMoment.format('HH:mm') : null;
      }

      // Prepare notes
      const notes = record.notes || record['Notes'] || null;

      // Map status values and ensure they fit in database field (50 chars max)
      const statusMapping = {
        present: 'present',
        absent: 'absent',
        late: 'late',
        'early leave': 'early_leave',
        early_leave: 'early_leave',
        'early departure': 'early_leave',
        sick: 'absent',
        vacation: 'absent',
        holiday: 'absent',
        leave: 'absent',
        'personal leave': 'absent',
        'medical leave': 'absent',
        'unpaid leave': 'absent',
      };

      // Ensure status is a string and handle null/undefined
      const statusStr = (status || 'present').toString().toLowerCase().trim();
      let normalizedStatus = statusMapping[statusStr] || 'present';

      // Ensure status doesn't exceed database field limit (50 chars)
      if (normalizedStatus.length > 50) {
        normalizedStatus = normalizedStatus.substring(0, 50);
      }

      // Validate that the normalized status is not empty
      if (!normalizedStatus) {
        normalizedStatus = 'present';
      }

      // Validate and sanitize all data before adding to batch
      if (!userId || typeof userId !== 'number') {
        errorCount++;
        errors.push(`Invalid user ID for user: ${userIdentifier}`);
        continue;
      }

      if (!attendanceDate || !/^\d{4}-\d{2}-\d{2}$/.test(attendanceDate)) {
        errorCount++;
        errors.push(`Invalid date format for user: ${userIdentifier}`);
        continue;
      }

      // Ensure numeric fields are valid
      const validHoursWorked = isNaN(hoursWorked) ? 0 : Math.max(0, Math.min(24, hoursWorked));

      // Ensure string fields are properly truncated
      const truncatedNotes = notes ? notes.toString().substring(0, 500) : null; // Limit notes to 500 chars

      // Add to batch insert array with validated data
      attendanceRecordsToInsert.push({
        userId: parseInt(userId),
        attendanceDate,
        clockIn,
        clockOut,
        hoursWorked: validHoursWorked,
        status: normalizedStatus,
        notes: truncatedNotes,
      });

      processedCount++;
    } catch (error) {
      errorCount++;
      errors.push(`Error processing record in batch ${batchIndex}: ${error.message}`);
    }
  }

  // OPTIMIZATION: Bulk insert using a single query with multiple values
  if (attendanceRecordsToInsert.length > 0) {
    try {
      // Build the bulk upsert query with proper parameter validation
      const values = [];
      const valueParams = [];
      let paramIndex = 1;

      attendanceRecordsToInsert.forEach((record, recordIndex) => {
        // Validate each record before adding to query
        if (!record.userId || !record.attendanceDate || !record.status) {
          console.warn(`Skipping invalid record ${recordIndex} in batch ${batchIndex}`);
          return;
        }

        values.push(
          `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${
            paramIndex + 4
          }, $${paramIndex + 5}, $${paramIndex + 6})`
        );
        valueParams.push(
          record.userId,
          record.attendanceDate,
          record.clockIn,
          record.clockOut,
          record.hoursWorked,
          record.status,
          record.notes
        );
        paramIndex += 7;
      });

      if (values.length > 0) {
        // First, check which records already exist to track duplicates
        const duplicateCheckQuery = `
          SELECT user_id, date 
          FROM attendance_records 
          WHERE (user_id, date) IN (${attendanceRecordsToInsert
            .map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`)
            .join(', ')})
        `;

        const duplicateCheckParams = [];
        attendanceRecordsToInsert.forEach(record => {
          duplicateCheckParams.push(record.userId, record.attendanceDate);
        });

        let duplicateCount = 0;
        let duplicateRecords = [];

        try {
          const duplicateResult = await pool.query(duplicateCheckQuery, duplicateCheckParams);
          duplicateCount = duplicateResult.rows.length;
          duplicateRecords = duplicateResult.rows.map(row => `User ${row.user_id} on ${row.date}`);
        } catch (duplicateCheckError) {
          console.warn('Could not check for duplicates:', duplicateCheckError.message);
        }

        const bulkInsertQuery = `
          INSERT INTO attendance_records (user_id, date, clock_in, clock_out, hours_worked, status, notes)
          VALUES ${values.join(', ')}
          ON CONFLICT (user_id, date)
          DO UPDATE SET 
            clock_in = EXCLUDED.clock_in,
            clock_out = EXCLUDED.clock_out,
            hours_worked = EXCLUDED.hours_worked,
            status = EXCLUDED.status,
            notes = EXCLUDED.notes,
            updated_at = CURRENT_TIMESTAMP
          RETURNING user_id, date, 
            CASE WHEN xmax = 0 THEN 'inserted' ELSE 'updated' END as action
        `;

        console.log(
          `Executing bulk insert for batch ${batchIndex} with ${values.length} records (${duplicateCount} potential duplicates)`
        );
        const insertResult = await pool.query(bulkInsertQuery, valueParams);

        // Count actual inserts vs updates
        const actualInserts = insertResult.rows.filter(row => row.action === 'inserted').length;
        const actualUpdates = insertResult.rows.filter(row => row.action === 'updated').length;

        console.log(
          `Bulk insert successful for batch ${batchIndex}: ${actualInserts} new records, ${actualUpdates} updated records`
        );

        // Add duplicate information to errors for reporting
        if (actualUpdates > 0) {
          errors.push(
            `Batch ${batchIndex}: ${actualUpdates} duplicate records were updated (same user-date combinations found)`
          );
          duplicateRecords.slice(0, 5).forEach(record => {
            errors.push(`  - Duplicate updated: ${record}`);
          });
          if (duplicateRecords.length > 5) {
            errors.push(`  - ... and ${duplicateRecords.length - 5} more duplicates`);
          }
        }
      }
    } catch (error) {
      // Enhanced error handling with more details
      console.error(`Bulk insert failed for batch ${batchIndex}:`, {
        error: error.message,
        code: error.code,
        detail: error.detail,
        recordCount: attendanceRecordsToInsert.length,
      });

      // If bulk insert fails, fall back to individual inserts for this batch
      console.log(`Falling back to individual inserts for batch ${batchIndex}`);

      let individualDuplicates = 0;

      for (const [index, record] of attendanceRecordsToInsert.entries()) {
        try {
          // Check if record exists first
          const existsResult = await pool.query(
            'SELECT id FROM attendance_records WHERE user_id = $1 AND date = $2',
            [record.userId, record.attendanceDate]
          );

          const isUpdate = existsResult.rows.length > 0;
          if (isUpdate) individualDuplicates++;

          const result = await pool.query(
            `
            INSERT INTO attendance_records (user_id, date, clock_in, clock_out, hours_worked, status, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (user_id, date)
            DO UPDATE SET 
              clock_in = EXCLUDED.clock_in,
              clock_out = EXCLUDED.clock_out,
              hours_worked = EXCLUDED.hours_worked,
              status = EXCLUDED.status,
              notes = EXCLUDED.notes,
              updated_at = CURRENT_TIMESTAMP
          `,
            [
              record.userId,
              record.attendanceDate,
              record.clockIn,
              record.clockOut,
              record.hoursWorked,
              record.status,
              record.notes,
            ]
          );
        } catch (individualError) {
          errorCount++;
          errors.push(
            `Individual insert failed in batch ${batchIndex}, record ${index}: ${individualError.message}`
          );
          processedCount--; // Decrement since this record failed
        }
      }

      // Report duplicates from individual inserts
      if (individualDuplicates > 0) {
        errors.push(
          `Batch ${batchIndex}: ${individualDuplicates} duplicate records were updated during individual processing`
        );
      }
    }
  }

  return {
    processedCount,
    errorCount,
    errors,
    createdUsersCount,
    duplicatesCount: errors.filter(error => error.includes('duplicate')).length,
  };
}

// Create new employee
router.post('/employees', auth, adminAuth, async (req, res) => {
  try {
    const { firstName, lastName, email, password, isAdmin = false } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        message: 'All fields are required',
        errors: [
          { field: 'firstName', message: 'First name is required' },
          { field: 'lastName', message: 'Last name is required' },
          { field: 'email', message: 'Email is required' },
          { field: 'password', message: 'Password is required' },
        ].filter(error => !req.body[error.field]),
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: 'Invalid email format',
        errors: [{ field: 'email', message: 'Please enter a valid email address' }],
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters long',
        errors: [{ field: 'password', message: 'Password must be at least 6 characters long' }],
      });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [
      email.toLowerCase(),
    ]);

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        message: 'User with this email already exists',
        errors: [{ field: 'email', message: 'An account with this email already exists' }],
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password, is_admin, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) 
       RETURNING id, first_name, last_name, email, is_admin, created_at`,
      [firstName.trim(), lastName.trim(), email.toLowerCase(), hashedPassword, isAdmin]
    );

    const newUser = result.rows[0];

    // Return user data (without password)
    res.status(201).json({
      message: 'Employee created successfully',
      user: {
        id: newUser.id,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        email: newUser.email,
        isAdmin: newUser.is_admin,
        createdAt: newUser.created_at,
      },
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ message: 'Server error while creating employee' });
  }
});

// Update employee
router.put('/employees/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, isAdmin } = req.body;

    // Validation
    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        message: 'First name, last name, and email are required',
        errors: [
          { field: 'firstName', message: 'First name is required' },
          { field: 'lastName', message: 'Last name is required' },
          { field: 'email', message: 'Email is required' },
        ].filter(error => !req.body[error.field]),
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: 'Invalid email format',
        errors: [{ field: 'email', message: 'Please enter a valid email address' }],
      });
    }

    // Check if user exists
    const userExists = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (userExists.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if email is already taken by another user
    const emailExists = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [
      email.toLowerCase(),
      id,
    ]);
    if (emailExists.rows.length > 0) {
      return res.status(400).json({
        message: 'Email is already in use by another user',
        errors: [{ field: 'email', message: 'This email is already in use by another user' }],
      });
    }

    // Update user
    const result = await pool.query(
      `UPDATE users 
       SET first_name = $1, last_name = $2, email = $3, is_admin = $4, updated_at = NOW()
       WHERE id = $5 
       RETURNING id, first_name, last_name, email, is_admin, created_at, updated_at`,
      [firstName.trim(), lastName.trim(), email.toLowerCase(), isAdmin || false, id]
    );

    const updatedUser = result.rows[0];

    res.json({
      message: 'Employee updated successfully',
      user: {
        id: updatedUser.id,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        email: updatedUser.email,
        isAdmin: updatedUser.is_admin,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at,
      },
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ message: 'Server error while updating employee' });
  }
});

// Update employee location and team assignment
router.put('/employees/:id/assignment', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    let { locationId, teamId } = req.body;

    // Convert undefined to null for proper database handling
    locationId = locationId === undefined ? null : locationId;
    teamId = teamId === undefined ? null : teamId;

    // Verify employee exists and is not admin
    const employeeCheck = await pool.query('SELECT id, is_admin FROM users WHERE id = $1', [id]);
    if (employeeCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    if (employeeCheck.rows[0].is_admin) {
      return res.status(400).json({ message: 'Cannot assign location/team to admin users' });
    }

    // Verify location exists if provided
    if (locationId) {
      const locationCheck = await pool.query('SELECT id FROM locations WHERE id = $1', [
        locationId,
      ]);
      if (locationCheck.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid location ID' });
      }
    }

    // Verify team exists if provided
    if (teamId) {
      let teamQuery = 'SELECT id, location_id FROM teams WHERE id = $1';
      const teamParams = [teamId];

      const teamCheck = await pool.query(teamQuery, teamParams);
      if (teamCheck.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid team ID' });
      }

      const teamLocationId = teamCheck.rows[0].location_id;

      // If both location and team are provided, ensure team belongs to location (only if team has a location)
      if (locationId && teamLocationId && teamLocationId !== parseInt(locationId)) {
        return res.status(400).json({ message: 'Team does not belong to the specified location' });
      }

      // If team is provided but no location, use team's location (if team has one)
      if (!locationId && teamLocationId) {
        const result = await pool.query(
          'UPDATE users SET location_id = $1, team_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
          [teamLocationId, teamId, id]
        );

        const user = result.rows[0];
        return res.json({
          message: 'Employee assignment updated successfully',
          employee: {
            id: user.id,
            locationId: user.location_id,
            teamId: user.team_id,
          },
        });
      }
    }

    // Update employee assignment
    const result = await pool.query(
      'UPDATE users SET location_id = $1, team_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [locationId, teamId, id]
    );

    const user = result.rows[0];
    res.json({
      message: 'Employee assignment updated successfully',
      employee: {
        id: user.id,
        locationId: user.location_id,
        teamId: user.team_id,
      },
    });
  } catch (error) {
    console.error('Error updating employee assignment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete employee
router.delete('/employees/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const userExists = await pool.query(
      'SELECT id, first_name, last_name, email FROM users WHERE id = $1',
      [id]
    );

    if (userExists.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const user = userExists.rows[0];

    // Prevent deletion of admin users for safety
    const isAdmin = await pool.query('SELECT is_admin FROM users WHERE id = $1', [id]);
    if (isAdmin.rows[0]?.is_admin) {
      return res.status(400).json({ message: 'Cannot delete admin users' });
    }

    // Delete user (this will cascade delete related attendance records if foreign key is set up)
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({
      message: `Employee ${user.first_name} ${user.last_name} deleted successfully`,
      deletedUser: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ message: 'Server error while deleting employee' });
  }
});

// Get upload history
router.get('/uploads', auth, adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `
      SELECT fu.*, u.first_name, u.last_name, u.email
      FROM file_uploads fu
      JOIN users u ON fu.uploaded_by = u.id
      ORDER BY fu.upload_date DESC
      LIMIT $1 OFFSET $2
    `,
      [limit, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) FROM file_uploads');
    const total = parseInt(countResult.rows[0].count);

    res.json({
      uploads: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get uploads error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get upload details including errors
router.get('/uploads/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT fu.*, u.first_name, u.last_name, u.email
      FROM file_uploads fu
      JOIN users u ON fu.uploaded_by = u.id
      WHERE fu.id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Upload not found' });
    }

    const upload = result.rows[0];

    // Parse error details if they exist
    let errors = [];
    if (upload.error_details) {
      try {
        errors = JSON.parse(upload.error_details);
      } catch (parseError) {
        console.error('Error parsing error_details:', parseError);
        errors = ['Error details could not be parsed'];
      }
    }

    res.json({
      ...upload,
      errors,
    });
  } catch (error) {
    console.error('Get upload details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get dashboard metrics
router.get('/metrics', auth, adminAuth, async (req, res) => {
  try {
    const { period = '30' } = req.query;

    // Calculate date range based on period (same logic as attendance records)
    let startDate;
    let endDate = null;
    const currentDate = new Date();

    switch (period) {
      case '7':
        startDate = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30':
        startDate = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90':
        startDate = new Date(currentDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '365':
        startDate = new Date(currentDate.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'last_year':
        // Previous calendar year: January 1 to December 31 of last year
        startDate = new Date(currentDate.getFullYear() - 1, 0, 1);
        endDate = new Date(currentDate.getFullYear() - 1, 11, 31, 23, 59, 59);
        break;
      case 'this_year':
        startDate = new Date(currentDate.getFullYear(), 0, 1);
        break;
      case 'this_month':
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        break;
      default:
        startDate = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Build date filter condition
    let dateFilter = 'ar.date >= $1';
    let dateParams = [startDate.toISOString().split('T')[0]];
    let paramIndex = 2;

    if (endDate) {
      dateFilter += ` AND ar.date <= $${paramIndex}`;
      dateParams.push(endDate.toISOString().split('T')[0]);
      paramIndex++;
    }

    // Overall metrics
    const overallResult = await pool.query(
      `
      SELECT 
        COUNT(DISTINCT u.id) as total_employees,
        COUNT(ar.id) as total_records,
        COUNT(ar.id) FILTER (WHERE ar.status = 'present') as total_present,
        COUNT(ar.id) FILTER (WHERE ar.status = 'absent') as total_absent,
        COUNT(ar.id) FILTER (WHERE ar.status = 'late') as total_late,
        AVG(ar.hours_worked) FILTER (WHERE ar.hours_worked > 0) as avg_hours
      FROM users u
      LEFT JOIN attendance_records ar ON u.id = ar.user_id AND ${dateFilter}
      WHERE u.is_admin = FALSE
    `,
      dateParams
    );

    // Top performers (by attendance rate)
    const topPerformersResult = await pool.query(
      `
      SELECT 
        u.id, u.first_name, u.last_name, u.email,
        COUNT(ar.id) as total_days,
        COUNT(ar.id) FILTER (WHERE ar.status = 'present') as present_days,
        (COUNT(ar.id) FILTER (WHERE ar.status = 'present') * 100.0 / NULLIF(COUNT(ar.id), 0)) as attendance_rate
      FROM users u
      LEFT JOIN attendance_records ar ON u.id = ar.user_id AND ${dateFilter}
      WHERE u.is_admin = FALSE
      GROUP BY u.id, u.first_name, u.last_name, u.email
      HAVING COUNT(ar.id) > 0
      ORDER BY attendance_rate DESC
      LIMIT 5
    `,
      dateParams
    );

    // Attendance trends (daily)
    const trendsResult = await pool.query(
      `
      SELECT 
        ar.date,
        COUNT(ar.id) as total_records,
        COUNT(ar.id) FILTER (WHERE ar.status = 'present') as present_count,
        COUNT(ar.id) FILTER (WHERE ar.status = 'absent') as absent_count,
        COUNT(ar.id) FILTER (WHERE ar.status = 'late') as late_count
      FROM attendance_records ar
      WHERE ${dateFilter}
      GROUP BY ar.date
      ORDER BY ar.date DESC
      LIMIT 30
    `,
      dateParams
    );

    const overall = overallResult.rows[0];

    res.json({
      overall: {
        totalEmployees: parseInt(overall.total_employees),
        totalRecords: parseInt(overall.total_records),
        totalPresent: parseInt(overall.total_present),
        totalAbsent: parseInt(overall.total_absent),
        totalLate: parseInt(overall.total_late),
        averageHours: parseFloat(overall.avg_hours || 0).toFixed(2),
        attendanceRate:
          overall.total_records > 0
            ? ((overall.total_present / overall.total_records) * 100).toFixed(1)
            : '0.0',
      },
      topPerformers: topPerformersResult.rows.map(emp => ({
        id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        email: emp.email,
        attendanceRate: parseFloat(emp.attendance_rate || 0).toFixed(1),
      })),
      trends: trendsResult.rows.reverse(), // Show chronological order
      period,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate
          ? endDate.toISOString().split('T')[0]
          : currentDate.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all attendance records with pagination and date filtering (cached)
router.get('/attendance-records', auth, adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 25, period = '30', search = '' } = req.query;

    console.log(
      `🔍 Getting attendance records - Page: ${page}, Period: ${period}, Search: "${search}"`
    );

    // Use cached database query
    const result = await dbCache.getAttendanceRecords({
      page,
      limit,
      period,
      search,
    });

    // Add period and date range info
    const currentDate = new Date();
    let startDate;
    let endDate = null;

    switch (period) {
      case '7':
        startDate = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30':
        startDate = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90':
        startDate = new Date(currentDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '365':
        startDate = new Date(currentDate.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'last_year':
        startDate = new Date(currentDate.getFullYear() - 1, 0, 1);
        endDate = new Date(currentDate.getFullYear() - 1, 11, 31, 23, 59, 59);
        break;
      case 'this_year':
        startDate = new Date(currentDate.getFullYear(), 0, 1);
        break;
      case 'this_month':
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        break;
      default:
        startDate = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    res.json({
      ...result,
      period,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate
          ? endDate.toISOString().split('T')[0]
          : currentDate.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    console.error('Get attendance records error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all clock requests for admin review (cached)
router.get('/clock-requests', auth, adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'pending' } = req.query;

    console.log(`🔍 Getting clock requests - Status: ${status}, Page: ${page}`);

    // Use cached database query
    const result = await dbCache.getClockRequests({ page, limit, status });

    res.json(result);
  } catch (error) {
    console.error('Get clock requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// Approve or reject clock request
router.put('/clock-requests/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, adminNotes } = req.body; // action: 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Must be approve or reject' });
    }

    // Get the clock request details
    const requestResult = await pool.query('SELECT * FROM clock_requests WHERE request_id = $1', [
      id,
    ]);

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ message: 'Clock request not found' });
    }

    const clockRequest = requestResult.rows[0];

    if (clockRequest.status !== 'pending') {
      return res.status(400).json({ message: 'This request has already been processed' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update the clock request
    const updateResult = await pool.query(
      `UPDATE clock_requests 
       SET status = $1, reviewed_by = $2, admin_notes = $3, processed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE request_id = $4 
       RETURNING *`,
      [newStatus, req.user.id, adminNotes || '', id]
    );

    const updatedRequest = updateResult.rows[0];

    // If approved, create attendance record
    if (action === 'approve') {
      try {
        // Extract time from the requested_time timestamp
        const requestedTime = new Date(clockRequest.requested_time);
        const timeString = requestedTime.toTimeString().split(' ')[0]; // Gets HH:MM:SS format
        const dateString = clockRequest.requested_date;

        if (clockRequest.request_type === 'clock_in') {
          // Determine status based on time
          const timeHour = requestedTime.getHours();
          const timeMinute = requestedTime.getMinutes();
          const isLate = timeHour > 9 || (timeHour === 9 && timeMinute > 0); // After 9:00 AM

          // Create or update attendance record for clock in
          await pool.query(
            `INSERT INTO attendance_records (user_id, date, clock_in, status, notes, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id, date) 
             DO UPDATE SET 
               clock_in = EXCLUDED.clock_in,
               status = CASE 
                 WHEN EXCLUDED.clock_in > '09:00:00' THEN 'late'
                 ELSE 'present'
               END,
               notes = COALESCE(attendance_records.notes, '') || '; Clock-in request approved: ' || EXCLUDED.notes,
               updated_at = CURRENT_TIMESTAMP`,
            [
              clockRequest.user_id,
              dateString,
              timeString,
              isLate ? 'late' : 'present',
              `Clock-in request approved by admin`,
            ]
          );
        } else if (clockRequest.request_type === 'clock_out') {
          // Update attendance record for clock out
          const attendanceCheck = await pool.query(
            'SELECT * FROM attendance_records WHERE user_id = $1 AND date = $2',
            [clockRequest.user_id, dateString]
          );

          if (attendanceCheck.rows.length > 0) {
            const attendance = attendanceCheck.rows[0];
            const clockInTime = attendance.clock_in;

            // Calculate hours worked
            let hoursWorked = 0;
            if (clockInTime) {
              const clockIn = new Date(`1970-01-01T${clockInTime}`);
              const clockOut = new Date(`1970-01-01T${timeString}`);
              hoursWorked = Math.max(0, (clockOut - clockIn) / (1000 * 60 * 60));
            }

            await pool.query(
              `UPDATE attendance_records 
               SET clock_out = $1, hours_worked = $2, 
               notes = COALESCE(notes, '') || '; Clock-out request approved by admin',
               updated_at = CURRENT_TIMESTAMP
               WHERE user_id = $3 AND date = $4`,
              [timeString, hoursWorked, clockRequest.user_id, dateString]
            );
          } else {
            // Create new attendance record with just clock out (unusual case)
            await pool.query(
              `INSERT INTO attendance_records (user_id, date, clock_out, status, notes, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              [
                clockRequest.user_id,
                dateString,
                timeString,
                'present',
                `Clock-out request approved by admin (no clock-in found)`,
              ]
            );
          }
        }

        console.log(
          `Attendance record created successfully for user ${clockRequest.user_id} on ${dateString}`
        );
      } catch (attendanceError) {
        console.error('Error creating attendance record:', attendanceError);
        // Still return success for the approval, but log the error
      }
    }

    res.json({
      message: `Clock request ${action}d successfully`,
      request: {
        id: updatedRequest.id,
        status: updatedRequest.status,
        adminNotes: updatedRequest.admin_notes,
        processedAt: updatedRequest.processed_at,
      },
    });
  } catch (error) {
    console.error('Process clock request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================================
// ATTENDANCE SETTINGS MANAGEMENT
// ============================================================================

// Get all attendance settings with pagination
router.get('/settings', auth, adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      settingsPage = 1,
      settingsLimit = 20,
      holidaysPage = 1,
      holidaysLimit = 20,
      schedulesPage = 1,
      schedulesLimit = 20,
      search = '',
      holidayYear,
    } = req.query;

    // Settings pagination
    const settingsOffset = (parseInt(settingsPage) - 1) * parseInt(settingsLimit);
    let settingsQuery = 'SELECT * FROM attendance_settings';
    let settingsParams = [];
    let settingsParamIndex = 1;

    if (search) {
      settingsQuery +=
        ' WHERE setting_name ILIKE $' +
        settingsParamIndex +
        ' OR description ILIKE $' +
        settingsParamIndex;
      settingsParams.push(`%${search}%`);
      settingsParamIndex++;
    }

    settingsQuery +=
      ' ORDER BY setting_name LIMIT $' +
      settingsParamIndex +
      ' OFFSET $' +
      (settingsParamIndex + 1);
    settingsParams.push(parseInt(settingsLimit), settingsOffset);

    const settingsCountQuery = search
      ? 'SELECT COUNT(*) FROM attendance_settings WHERE setting_name ILIKE $1 OR description ILIKE $1'
      : 'SELECT COUNT(*) FROM attendance_settings';
    const settingsCountParams = search ? [`%${search}%`] : [];

    // Holidays pagination
    const holidaysOffset = (parseInt(holidaysPage) - 1) * parseInt(holidaysLimit);
    let holidaysQuery = 'SELECT * FROM holidays';
    let holidaysParams = [];
    let holidaysParamIndex = 1;

    if (holidayYear) {
      holidaysQuery += ' WHERE EXTRACT(YEAR FROM date) = $' + holidaysParamIndex;
      holidaysParams.push(parseInt(holidayYear));
      holidaysParamIndex++;
    }

    holidaysQuery +=
      ' ORDER BY date DESC LIMIT $' + holidaysParamIndex + ' OFFSET $' + (holidaysParamIndex + 1);
    holidaysParams.push(parseInt(holidaysLimit), holidaysOffset);

    const holidaysCountQuery = holidayYear
      ? 'SELECT COUNT(*) FROM holidays WHERE EXTRACT(YEAR FROM date) = $1'
      : 'SELECT COUNT(*) FROM holidays';
    const holidaysCountParams = holidayYear ? [parseInt(holidayYear)] : [];

    // Work schedules pagination
    const schedulesOffset = (parseInt(schedulesPage) - 1) * parseInt(schedulesLimit);
    let schedulesQuery = 'SELECT * FROM work_schedules';
    let schedulesParams = [];

    if (search) {
      schedulesQuery += ' WHERE name ILIKE $1 OR description ILIKE $1';
      schedulesParams.push(`%${search}%`);
    }

    schedulesQuery +=
      ' ORDER BY is_default DESC, name LIMIT $' +
      (schedulesParams.length + 1) +
      ' OFFSET $' +
      (schedulesParams.length + 2);
    schedulesParams.push(parseInt(schedulesLimit), schedulesOffset);

    const schedulesCountQuery = search
      ? 'SELECT COUNT(*) FROM work_schedules WHERE name ILIKE $1 OR description ILIKE $1'
      : 'SELECT COUNT(*) FROM work_schedules';
    const schedulesCountParams = search ? [`%${search}%`] : [];

    // Execute all queries in parallel
    const [
      settingsResult,
      settingsCountResult,
      holidaysResult,
      holidaysCountResult,
      workSchedulesResult,
      schedulesCountResult,
    ] = await Promise.all([
      pool.query(settingsQuery, settingsParams),
      pool.query(settingsCountQuery, settingsCountParams),
      pool.query(holidaysQuery, holidaysParams),
      pool.query(holidaysCountQuery, holidaysCountParams),
      pool.query(schedulesQuery, schedulesParams),
      pool.query(schedulesCountQuery, schedulesCountParams),
    ]);

    const settingsTotal = parseInt(settingsCountResult.rows[0].count);
    const holidaysTotal = parseInt(holidaysCountResult.rows[0].count);
    const schedulesTotal = parseInt(schedulesCountResult.rows[0].count);

    res.json({
      settings: {
        data: settingsResult.rows,
        pagination: {
          page: parseInt(settingsPage),
          limit: parseInt(settingsLimit),
          total: settingsTotal,
          pages: Math.ceil(settingsTotal / parseInt(settingsLimit)),
        },
      },
      holidays: {
        data: holidaysResult.rows,
        pagination: {
          page: parseInt(holidaysPage),
          limit: parseInt(holidaysLimit),
          total: holidaysTotal,
          pages: Math.ceil(holidaysTotal / parseInt(holidaysLimit)),
        },
      },
      workSchedules: {
        data: workSchedulesResult.rows,
        pagination: {
          page: parseInt(schedulesPage),
          limit: parseInt(schedulesLimit),
          total: schedulesTotal,
          pages: Math.ceil(schedulesTotal / parseInt(schedulesLimit)),
        },
      },
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update attendance setting
router.put('/settings/:settingName', auth, adminAuth, async (req, res) => {
  try {
    const { settingName } = req.params;
    const { value } = req.body;

    const result = await pool.query(
      'UPDATE attendance_settings SET setting_value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE setting_name = $3 RETURNING *',
      [value, req.user.id, settingName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Setting not found' });
    }

    res.json({
      message: 'Setting updated successfully',
      setting: result.rows[0],
    });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add new holiday
router.post('/holidays', auth, adminAuth, async (req, res) => {
  try {
    const { name, date, isRecurring, recurringType, description } = req.body;

    const result = await pool.query(
      'INSERT INTO holidays (name, date, is_recurring, recurring_type, description, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, date, isRecurring, recurringType, description, req.user.id]
    );

    res.json({
      message: 'Holiday added successfully',
      holiday: result.rows[0],
    });
  } catch (error) {
    console.error('Add holiday error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update holiday
router.put('/holidays/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, isRecurring, recurringType, description } = req.body;

    const result = await pool.query(
      'UPDATE holidays SET name = $1, date = $2, is_recurring = $3, recurring_type = $4, description = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
      [name, date, isRecurring, recurringType, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    res.json({
      message: 'Holiday updated successfully',
      holiday: result.rows[0],
    });
  } catch (error) {
    console.error('Update holiday error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete holiday
router.delete('/holidays/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM holidays WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    res.json({
      message: 'Holiday deleted successfully',
    });
  } catch (error) {
    console.error('Delete holiday error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add new work schedule
router.post('/work-schedules', auth, adminAuth, async (req, res) => {
  try {
    const { name, startTime, endTime, daysOfWeek, isDefault } = req.body;

    // If setting as default, unset other defaults first
    if (isDefault) {
      await pool.query('UPDATE work_schedules SET is_default = false');
    }

    const result = await pool.query(
      'INSERT INTO work_schedules (name, start_time, end_time, days_of_week, is_default, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, startTime, endTime, daysOfWeek, isDefault, req.user.id]
    );

    res.json({
      message: 'Work schedule added successfully',
      schedule: result.rows[0],
    });
  } catch (error) {
    console.error('Add work schedule error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update work schedule
router.put('/work-schedules/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startTime, endTime, daysOfWeek, isDefault } = req.body;

    // If setting as default, unset other defaults first
    if (isDefault) {
      await pool.query('UPDATE work_schedules SET is_default = false WHERE id != $1', [id]);
    }

    const result = await pool.query(
      'UPDATE work_schedules SET name = $1, start_time = $2, end_time = $3, days_of_week = $4, is_default = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
      [name, startTime, endTime, daysOfWeek, isDefault, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Work schedule not found' });
    }

    res.json({
      message: 'Work schedule updated successfully',
      schedule: result.rows[0],
    });
  } catch (error) {
    console.error('Update work schedule error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete work schedule
router.delete('/work-schedules/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if it's the default schedule
    const scheduleResult = await pool.query('SELECT is_default FROM work_schedules WHERE id = $1', [
      id,
    ]);
    if (scheduleResult.rows.length === 0) {
      return res.status(404).json({ message: 'Work schedule not found' });
    }

    if (scheduleResult.rows[0].is_default) {
      return res.status(400).json({ message: 'Cannot delete the default work schedule' });
    }

    await pool.query('DELETE FROM work_schedules WHERE id = $1', [id]);

    res.json({
      message: 'Work schedule deleted successfully',
    });
  } catch (error) {
    console.error('Delete work schedule error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Locations management with pagination
router.get('/locations', auth, adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', timezone, isActive = true } = req.query;

    const pageInt = Math.max(1, parseInt(page) || 1);
    const limitInt = Math.max(1, parseInt(limit) || 20);
    const offset = (pageInt - 1) * limitInt;

    let query = `
      SELECT l.*, 
             COUNT(DISTINCT u.id) as employee_count,
             COUNT(DISTINCT t.id) as team_count
      FROM locations l
      LEFT JOIN users u ON l.id = u.location_id AND u.is_admin = false
      LEFT JOIN teams t ON l.id = t.location_id AND t.is_active = true
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // Filter by active status
    if (isActive !== 'all') {
      query += ` AND l.is_active = $${paramIndex}`;
      params.push(isActive === 'true');
      paramIndex++;
    }

    // Search filter
    if (search) {
      query += ` AND (l.name ILIKE $${paramIndex} OR l.address ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Timezone filter
    if (timezone) {
      query += ` AND l.timezone = $${paramIndex}`;
      params.push(timezone);
      paramIndex++;
    }

    query += `
      GROUP BY l.id, l.name, l.address, l.timezone, l.is_active, l.created_at, l.updated_at
      ORDER BY l.name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limitInt, offset);

    // Count query for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT l.id)
      FROM locations l
      WHERE 1=1
    `;
    const countParams = [];
    let countParamIndex = 1;

    if (isActive !== 'all') {
      countQuery += ` AND l.is_active = $${countParamIndex}`;
      countParams.push(isActive === 'true');
      countParamIndex++;
    }

    if (search) {
      countQuery += ` AND (l.name ILIKE $${countParamIndex} OR l.address ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }

    if (timezone) {
      countQuery += ` AND l.timezone = $${countParamIndex}`;
      countParams.push(timezone);
      countParamIndex++;
    }

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    const total = parseInt(countResult.rows[0].count);

    const locations = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      address: row.address,
      timezone: row.timezone,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      employeeCount: parseInt(row.employee_count),
      teamCount: parseInt(row.team_count),
    }));

    res.json({
      locations,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        pages: Math.ceil(total / limitInt),
      },
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/locations', auth, adminAuth, async (req, res) => {
  try {
    const { name, address, timezone } = req.body;

    if (!name || !timezone) {
      return res.status(400).json({ message: 'Name and timezone are required' });
    }

    const result = await pool.query(
      `INSERT INTO locations (name, address, timezone) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [name, address, timezone]
    );

    const location = result.rows[0];
    res.status(201).json({
      message: 'Location created successfully',
      location: {
        id: location.id,
        name: location.name,
        address: location.address,
        timezone: location.timezone,
        isActive: location.is_active,
        createdAt: location.created_at,
        updatedAt: location.updated_at,
      },
    });
  } catch (error) {
    if (error.code === '23505') {
      // Unique constraint violation
      return res.status(400).json({ message: 'Location name already exists' });
    }
    console.error('Error creating location:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/locations/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, timezone, isActive } = req.body;

    const result = await pool.query(
      `UPDATE locations 
       SET name = $1, address = $2, timezone = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 
       RETURNING *`,
      [name, address, timezone, isActive, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Location not found' });
    }

    const location = result.rows[0];
    res.json({
      message: 'Location updated successfully',
      location: {
        id: location.id,
        name: location.name,
        address: location.address,
        timezone: location.timezone,
        isActive: location.is_active,
        createdAt: location.created_at,
        updatedAt: location.updated_at,
      },
    });
  } catch (error) {
    if (error.code === '23505') {
      // Unique constraint violation
      return res.status(400).json({ message: 'Location name already exists' });
    }
    console.error('Error updating location:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/locations/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if location has associated users or teams
    const usageCheck = await pool.query(
      `SELECT 
         (SELECT COUNT(*) FROM users WHERE location_id = $1) as user_count,
         (SELECT COUNT(*) FROM teams WHERE location_id = $1) as team_count`,
      [id]
    );

    const { user_count, team_count } = usageCheck.rows[0];
    if (parseInt(user_count) > 0 || parseInt(team_count) > 0) {
      return res.status(400).json({
        message: `Cannot delete location. It has ${user_count} users and ${team_count} teams assigned.`,
      });
    }

    const result = await pool.query('DELETE FROM locations WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Location not found' });
    }

    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Teams management with pagination
router.get('/teams', auth, adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', locationId, isActive = true, managerId } = req.query;

    const pageInt = Math.max(1, parseInt(page) || 1);
    const limitInt = Math.max(1, parseInt(limit) || 20);
    const offset = (pageInt - 1) * limitInt;

    let query = `
      SELECT t.*, 
             l.name as location_name, l.timezone as location_timezone,
             m.first_name as manager_first_name, m.last_name as manager_last_name,
             COUNT(DISTINCT u.id) as employee_count
      FROM teams t
      LEFT JOIN locations l ON t.location_id = l.id
      LEFT JOIN users m ON t.manager_id = m.id
      LEFT JOIN users u ON t.id = u.team_id AND u.is_admin = false
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // Filter by active status
    if (isActive !== 'all') {
      query += ` AND t.is_active = $${paramIndex}`;
      params.push(isActive === 'true');
      paramIndex++;
    }

    // Location filter
    if (locationId) {
      query += ` AND t.location_id = $${paramIndex}`;
      params.push(locationId);
      paramIndex++;
    }

    // Manager filter
    if (managerId) {
      query += ` AND t.manager_id = $${paramIndex}`;
      params.push(managerId);
      paramIndex++;
    }

    // Search filter
    if (search) {
      query += ` AND (t.name ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += `
      GROUP BY t.id, t.name, t.location_id, t.description, t.manager_id, t.is_active, 
               t.created_at, t.updated_at, l.name, l.timezone, 
               m.first_name, m.last_name
      ORDER BY l.name NULLS LAST, t.name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limitInt, offset);

    // Count query for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT t.id)
      FROM teams t
      LEFT JOIN locations l ON t.location_id = l.id
      WHERE 1=1
    `;
    const countParams = [];
    let countParamIndex = 1;

    if (isActive !== 'all') {
      countQuery += ` AND t.is_active = $${countParamIndex}`;
      countParams.push(isActive === 'true');
      countParamIndex++;
    }

    if (locationId) {
      countQuery += ` AND t.location_id = $${countParamIndex}`;
      countParams.push(locationId);
      countParamIndex++;
    }

    if (managerId) {
      countQuery += ` AND t.manager_id = $${countParamIndex}`;
      countParams.push(managerId);
      countParamIndex++;
    }

    if (search) {
      countQuery += ` AND (t.name ILIKE $${countParamIndex} OR t.description ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    const total = parseInt(countResult.rows[0].count);

    const teams = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      locationId: row.location_id,
      description: row.description,
      managerId: row.manager_id,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      location: row.location_name
        ? {
            name: row.location_name,
            timezone: row.location_timezone,
          }
        : null,
      manager: row.manager_first_name
        ? {
            firstName: row.manager_first_name,
            lastName: row.manager_last_name,
          }
        : null,
      employeeCount: parseInt(row.employee_count),
    }));

    res.json({
      teams,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        pages: Math.ceil(total / limitInt),
      },
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/teams', auth, adminAuth, async (req, res) => {
  try {
    const { name, locationId, description, managerId } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Team name is required' });
    }

    // Verify location exists if provided
    if (locationId) {
      const locationCheck = await pool.query('SELECT id FROM locations WHERE id = $1', [
        locationId,
      ]);
      if (locationCheck.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid location ID' });
      }
    }

    // Verify manager exists if provided
    if (managerId) {
      const managerCheck = await pool.query('SELECT id FROM users WHERE id = $1', [managerId]);
      if (managerCheck.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid manager ID' });
      }
    }

    const result = await pool.query(
      `INSERT INTO teams (name, location_id, description, manager_id) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, locationId || null, description, managerId]
    );

    const team = result.rows[0];
    res.status(201).json({
      message: 'Team created successfully',
      team: {
        id: team.id,
        name: team.name,
        locationId: team.location_id,
        description: team.description,
        managerId: team.manager_id,
        isActive: team.is_active,
        createdAt: team.created_at,
        updatedAt: team.updated_at,
      },
    });
  } catch (error) {
    if (error.code === '23505') {
      // Unique constraint violation
      return res.status(400).json({ message: 'Team name already exists in this location' });
    }
    console.error('Error creating team:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/teams/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, locationId, description, managerId, isActive } = req.body;

    // Verify location exists if provided
    if (locationId) {
      const locationCheck = await pool.query('SELECT id FROM locations WHERE id = $1', [
        locationId,
      ]);
      if (locationCheck.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid location ID' });
      }
    }

    // Verify manager exists if provided
    if (managerId) {
      const managerCheck = await pool.query('SELECT id FROM users WHERE id = $1', [managerId]);
      if (managerCheck.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid manager ID' });
      }
    }

    const result = await pool.query(
      `UPDATE teams 
       SET name = $1, location_id = $2, description = $3, manager_id = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 
       RETURNING *`,
      [name, locationId, description, managerId, isActive, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const team = result.rows[0];
    res.json({
      message: 'Team updated successfully',
      team: {
        id: team.id,
        name: team.name,
        locationId: team.location_id,
        description: team.description,
        managerId: team.manager_id,
        isActive: team.is_active,
        createdAt: team.created_at,
        updatedAt: team.updated_at,
      },
    });
  } catch (error) {
    if (error.code === '23505') {
      // Unique constraint violation
      return res.status(400).json({ message: 'Team name already exists in this location' });
    }
    console.error('Error updating team:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/teams/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if team has associated users
    const usageCheck = await pool.query(
      'SELECT COUNT(*) as user_count FROM users WHERE team_id = $1',
      [id]
    );

    const userCount = parseInt(usageCheck.rows[0].user_count);
    if (userCount > 0) {
      return res.status(400).json({
        message: `Cannot delete team. It has ${userCount} users assigned.`,
      });
    }

    const result = await pool.query('DELETE FROM teams WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Team not found' });
    }

    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Attendance Rules management with pagination
router.get('/attendance-rules', auth, adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      ruleType,
      locationId,
      teamId,
      isActive = true,
    } = req.query;

    const pageInt = Math.max(1, parseInt(page) || 1);
    const limitInt = Math.max(1, parseInt(limit) || 20);
    const offset = (pageInt - 1) * limitInt;

    let query = `
      SELECT ar.*, 
             l.name as location_name, l.timezone as location_timezone,
             t.name as team_name
      FROM attendance_rules ar
      LEFT JOIN locations l ON ar.location_id = l.id
      LEFT JOIN teams t ON ar.team_id = t.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // Filter by active status
    if (isActive !== 'all') {
      query += ` AND ar.is_active = $${paramIndex}`;
      params.push(isActive === 'true');
      paramIndex++;
    }

    // Rule type filter
    if (ruleType) {
      query += ` AND ar.rule_type = $${paramIndex}`;
      params.push(ruleType);
      paramIndex++;
    }

    // Location filter
    if (locationId) {
      query += ` AND ar.location_id = $${paramIndex}`;
      params.push(locationId);
      paramIndex++;
    }

    // Team filter
    if (teamId) {
      query += ` AND ar.team_id = $${paramIndex}`;
      params.push(teamId);
      paramIndex++;
    }

    // Search filter
    if (search) {
      query += ` AND (ar.name ILIKE $${paramIndex} OR ar.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY ar.rule_type, ar.location_id NULLS LAST, ar.team_id NULLS LAST, ar.priority, ar.name 
               LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitInt, offset);

    // Count query for pagination
    let countQuery = `
      SELECT COUNT(*)
      FROM attendance_rules ar
      LEFT JOIN locations l ON ar.location_id = l.id
      LEFT JOIN teams t ON ar.team_id = t.id
      WHERE 1=1
    `;
    const countParams = [];
    let countParamIndex = 1;

    if (isActive !== 'all') {
      countQuery += ` AND ar.is_active = $${countParamIndex}`;
      countParams.push(isActive === 'true');
      countParamIndex++;
    }

    if (ruleType) {
      countQuery += ` AND ar.rule_type = $${countParamIndex}`;
      countParams.push(ruleType);
      countParamIndex++;
    }

    if (locationId) {
      countQuery += ` AND ar.location_id = $${countParamIndex}`;
      countParams.push(locationId);
      countParamIndex++;
    }

    if (teamId) {
      countQuery += ` AND ar.team_id = $${countParamIndex}`;
      countParams.push(teamId);
      countParamIndex++;
    }

    if (search) {
      countQuery += ` AND (ar.name ILIKE $${countParamIndex} OR ar.description ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    const total = parseInt(countResult.rows[0].count);

    const rules = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      ruleType: row.rule_type,
      locationId: row.location_id,
      teamId: row.team_id,
      configuration: row.configuration,
      priority: row.priority,
      isActive: row.is_active,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      location: row.location_name
        ? {
            name: row.location_name,
            timezone: row.location_timezone,
          }
        : null,
      team: row.team_name
        ? {
            name: row.team_name,
          }
        : null,
    }));

    res.json({
      rules,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        pages: Math.ceil(total / limitInt),
      },
    });
  } catch (error) {
    console.error('Error fetching attendance rules:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/attendance-rules', auth, adminAuth, async (req, res) => {
  try {
    const { ruleName, ruleType, targetId, ruleKey, ruleValue, description } = req.body;

    if (!ruleName || !ruleType || !ruleKey || !ruleValue) {
      return res.status(400).json({ message: 'Rule name, type, key, and value are required' });
    }

    if (!['global', 'location', 'team'].includes(ruleType)) {
      return res
        .status(400)
        .json({ message: 'Invalid rule type. Must be global, location, or team' });
    }

    // Validate target exists for location/team rules
    if (ruleType === 'location' && targetId) {
      const locationCheck = await pool.query('SELECT id FROM locations WHERE id = $1', [targetId]);
      if (locationCheck.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid location ID' });
      }
    } else if (ruleType === 'team' && targetId) {
      const teamCheck = await pool.query('SELECT id FROM teams WHERE id = $1', [targetId]);
      if (teamCheck.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid team ID' });
      }
    }

    const result = await pool.query(
      `INSERT INTO attendance_rules (rule_name, rule_type, target_id, rule_key, rule_value, description) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [ruleName, ruleType, ruleType === 'global' ? null : targetId, ruleKey, ruleValue, description]
    );

    const rule = result.rows[0];
    res.status(201).json({
      message: 'Attendance rule created successfully',
      rule: {
        id: rule.id,
        ruleName: rule.rule_name,
        ruleType: rule.rule_type,
        targetId: rule.target_id,
        ruleKey: rule.rule_key,
        ruleValue: rule.rule_value,
        description: rule.description,
        isActive: rule.is_active,
        createdAt: rule.created_at,
        updatedAt: rule.updated_at,
      },
    });
  } catch (error) {
    if (error.code === '23505') {
      // Unique constraint violation
      return res.status(400).json({ message: 'Rule already exists for this target and key' });
    }
    console.error('Error creating attendance rule:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/attendance-rules/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { ruleName, ruleValue, description, isActive } = req.body;

    const result = await pool.query(
      `UPDATE attendance_rules 
       SET rule_name = $1, rule_value = $2, description = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 
       RETURNING *`,
      [ruleName, ruleValue, description, isActive, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Attendance rule not found' });
    }

    const rule = result.rows[0];
    res.json({
      message: 'Attendance rule updated successfully',
      rule: {
        id: rule.id,
        ruleName: rule.rule_name,
        ruleType: rule.rule_type,
        targetId: rule.target_id,
        ruleKey: rule.rule_key,
        ruleValue: rule.rule_value,
        description: rule.description,
        isActive: rule.is_active,
        createdAt: rule.created_at,
        updatedAt: rule.updated_at,
      },
    });
  } catch (error) {
    console.error('Error updating attendance rule:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/attendance-rules/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM attendance_rules WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Attendance rule not found' });
    }

    res.json({ message: 'Attendance rule deleted successfully' });
  } catch (error) {
    console.error('Error deleting attendance rule:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Timezone Analysis and Validation Endpoints

// Get timezone summary for all locations
router.get('/timezone-summary', auth, adminAuth, async (req, res) => {
  try {
    const processor = new TimezoneAttendanceProcessor();
    await processor.initialize(pool);
    const summary = processor.getTimezoneLocationSummary();

    res.json({
      message: 'Timezone summary retrieved successfully',
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Timezone summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Validate attendance timestamps for a specific location
router.post('/validate-timestamps', auth, adminAuth, async (req, res) => {
  try {
    const { locationId, timestamps, employeeId } = req.body;

    if (!locationId || !timestamps || !Array.isArray(timestamps)) {
      return res.status(400).json({
        message: 'Location ID and timestamps array are required',
      });
    }

    const processor = new TimezoneAttendanceProcessor();
    await processor.initialize(pool);

    const validations = timestamps.map(timestamp => {
      return processor.validateAndConvertTimestamp(timestamp, employeeId, {
        locationId,
        validationType: 'manual_validation',
      });
    });

    res.json({
      message: 'Timestamp validation completed',
      locationId,
      employeeId,
      validations,
      summary: {
        total: validations.length,
        valid: validations.filter(v => v.isValid).length,
        invalid: validations.filter(v => !v.isValid).length,
        warnings: validations.reduce((sum, v) => sum + v.warnings.length, 0),
      },
    });
  } catch (error) {
    console.error('Timestamp validation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get attendance records grouped by timezone
router.get('/attendance-by-timezone', auth, adminAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      dateFilter = 'AND ar.date BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    }

    const query = `
      SELECT 
        l.id as location_id,
        l.name as location_name,
        l.timezone,
        l.address,
        COUNT(ar.id) as total_records,
        COUNT(DISTINCT ar.user_id) as unique_employees,
        MIN(ar.date) as first_record_date,
        MAX(ar.date) as last_record_date,
        AVG(EXTRACT(EPOCH FROM (ar.clock_out - ar.clock_in))/3600) as avg_hours_worked
      FROM locations l
      LEFT JOIN users u ON u.location_id = l.id
      LEFT JOIN attendance_records ar ON ar.user_id = u.id ${dateFilter}
      WHERE l.is_active = true
      GROUP BY l.id, l.name, l.timezone, l.address
      ORDER BY l.timezone, l.name
    `;

    const result = await pool.query(query, params);

    // Group by timezone
    const timezoneGroups = {};
    result.rows.forEach(row => {
      if (!timezoneGroups[row.timezone]) {
        timezoneGroups[row.timezone] = {
          timezone: row.timezone,
          currentTime: require('moment-timezone')().tz(row.timezone).format('YYYY-MM-DD HH:mm:ss'),
          utcOffset: require('moment-timezone')().tz(row.timezone).format('Z'),
          locations: [],
          totalRecords: 0,
          totalEmployees: 0,
        };
      }

      timezoneGroups[row.timezone].locations.push(row);
      timezoneGroups[row.timezone].totalRecords += parseInt(row.total_records) || 0;
      timezoneGroups[row.timezone].totalEmployees += parseInt(row.unique_employees) || 0;
    });

    res.json({
      message: 'Attendance data grouped by timezone',
      dateRange: { startDate, endDate },
      timezoneGroups,
      summary: {
        totalTimezones: Object.keys(timezoneGroups).length,
        totalLocations: result.rows.length,
        totalRecords: result.rows.reduce((sum, row) => sum + (parseInt(row.total_records) || 0), 0),
      },
    });
  } catch (error) {
    console.error('Attendance by timezone error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Enhanced upload with timezone validation
router.post(
  '/upload-attendance-with-timezone',
  auth,
  adminAuth,
  invalidateAllCache, // Invalidate cache after successful upload
  upload.single('attendanceFile'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { validateTimezones = true, defaultTimezone = 'UTC' } = req.body;
      const processor = new TimezoneAttendanceProcessor();
      await processor.initialize(pool);

      // Process file (simplified example)
      const results = {
        processed: 0,
        successful: 0,
        errors: [],
        warnings: [],
        timezoneValidations: [],
      };

      // This would integrate with the existing upload logic
      // but add timezone validation for each record

      res.json({
        message: 'Timezone-aware upload completed',
        results,
        timezoneProcessor: {
          initialized: true,
          locationsLoaded: processor.locationTimezones.size,
          employeesLoaded: processor.employeeLocations.size,
        },
      });
    } catch (error) {
      console.error('Timezone upload error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// ============================================================================
// LEAVE REQUEST MANAGEMENT
// ============================================================================

// Get all leave requests with filtering and pagination
router.get('/leave-requests', auth, adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      leaveType,
      userId,
      locationId,
      teamId,
      startDate,
      endDate,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT lr.*, 
             u.first_name, u.last_name, u.email, u.employee_id,
             u.location_id, u.team_id,
             l.name as location_name, l.timezone as location_timezone,
             t.name as team_name,
             reviewer.first_name as reviewer_first_name, 
             reviewer.last_name as reviewer_last_name
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      LEFT JOIN locations l ON u.location_id = l.id
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN users reviewer ON lr.reviewed_by = reviewer.id
      WHERE u.is_admin = false
    `;

    const params = [];
    let paramCounter = 1;

    if (status) {
      query += ` AND lr.status = $${paramCounter}`;
      params.push(status);
      paramCounter++;
    }

    if (leaveType) {
      query += ` AND lr.leave_type = $${paramCounter}`;
      params.push(leaveType);
      paramCounter++;
    }

    if (userId) {
      query += ` AND lr.user_id = $${paramCounter}`;
      params.push(userId);
      paramCounter++;
    }

    if (locationId) {
      query += ` AND u.location_id = $${paramCounter}`;
      params.push(locationId);
      paramCounter++;
    }

    if (teamId) {
      query += ` AND u.team_id = $${paramCounter}`;
      params.push(teamId);
      paramCounter++;
    }

    if (startDate) {
      query += ` AND lr.end_date >= $${paramCounter}`;
      params.push(startDate);
      paramCounter++;
    }

    if (endDate) {
      query += ` AND lr.start_date <= $${paramCounter}`;
      params.push(endDate);
      paramCounter++;
    }

    // Get total count
    const countQuery = query.replace(/SELECT lr\..*?FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Add ordering and pagination
    query += ` ORDER BY lr.created_at DESC LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    const leaveRequests = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      employee: {
        id: row.user_id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        employeeId: row.employee_id,
        locationId: row.location_id,
        teamId: row.team_id,
      },
      location: row.location_name
        ? {
            name: row.location_name,
            timezone: row.location_timezone,
          }
        : null,
      team: row.team_name
        ? {
            name: row.team_name,
          }
        : null,
      leaveType: row.leave_type,
      startDate: row.start_date,
      endDate: row.end_date,
      halfDay: row.half_day,
      halfDayPeriod: row.half_day_period,
      totalDays: parseFloat(row.total_days),
      reason: row.reason,
      status: row.status,
      adminNotes: row.admin_notes,
      supportingDocumentPath: row.supporting_document_path,
      emergencyContactName: row.emergency_contact_name,
      emergencyContactPhone: row.emergency_contact_phone,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      reviewedAt: row.reviewed_at,
      reviewer: row.reviewer_first_name
        ? {
            firstName: row.reviewer_first_name,
            lastName: row.reviewer_last_name,
          }
        : null,
    }));

    res.json({
      leaveRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get leave requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get leave request statistics
router.get('/leave-requests/stats', auth, adminAuth, async (req, res) => {
  try {
    const { year = new Date().getFullYear(), locationId, teamId } = req.query;

    let baseQuery = `
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      WHERE EXTRACT(YEAR FROM lr.start_date) = $1
      AND u.is_admin = false
    `;

    const params = [year];
    let paramCounter = 2;

    if (locationId) {
      baseQuery += ` AND u.location_id = $${paramCounter}`;
      params.push(locationId);
      paramCounter++;
    }

    if (teamId) {
      baseQuery += ` AND u.team_id = $${paramCounter}`;
      params.push(teamId);
      paramCounter++;
    }

    // Get overall statistics
    const overallStats = await pool.query(
      `
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN lr.status = 'pending' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN lr.status = 'approved' THEN 1 END) as approved_requests,
        COUNT(CASE WHEN lr.status = 'rejected' THEN 1 END) as rejected_requests,
        COALESCE(SUM(CASE WHEN lr.status = 'approved' THEN lr.total_days ELSE 0 END), 0) as total_approved_days
      ${baseQuery}
    `,
      params
    );

    // Get statistics by leave type
    const typeStats = await pool.query(
      `
      SELECT 
        lr.leave_type,
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN lr.status = 'approved' THEN lr.total_days ELSE 0 END), 0) as approved_days
      ${baseQuery}
      GROUP BY lr.leave_type
      ORDER BY count DESC
    `,
      params
    );

    // Get monthly distribution
    const monthlyStats = await pool.query(
      `
      SELECT 
        EXTRACT(MONTH FROM lr.start_date) as month,
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN lr.status = 'approved' THEN lr.total_days ELSE 0 END), 0) as approved_days
      ${baseQuery}
      GROUP BY EXTRACT(MONTH FROM lr.start_date)
      ORDER BY month
    `,
      params
    );

    res.json({
      year: parseInt(year),
      overall: overallStats.rows[0],
      byType: typeStats.rows,
      byMonth: monthlyStats.rows,
    });
  } catch (error) {
    console.error('Get leave request stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get specific leave request details
router.get('/leave-requests/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT lr.*, 
             u.first_name, u.last_name, u.email, u.employee_id,
             u.location_id, u.team_id, u.phone,
             l.name as location_name, l.timezone as location_timezone,
             t.name as team_name,
             reviewer.first_name as reviewer_first_name, 
             reviewer.last_name as reviewer_last_name,
             reviewer.email as reviewer_email
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      LEFT JOIN locations l ON u.location_id = l.id
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN users reviewer ON lr.reviewed_by = reviewer.id
      WHERE lr.id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    const row = result.rows[0];
    const leaveRequest = {
      id: row.id,
      userId: row.user_id,
      employee: {
        id: row.user_id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        employeeId: row.employee_id,
        locationId: row.location_id,
        teamId: row.team_id,
      },
      location: row.location_name
        ? {
            name: row.location_name,
            timezone: row.location_timezone,
          }
        : null,
      team: row.team_name
        ? {
            name: row.team_name,
          }
        : null,
      leaveType: row.leave_type,
      startDate: row.start_date,
      endDate: row.end_date,
      halfDay: row.half_day,
      halfDayPeriod: row.half_day_period,
      totalDays: parseFloat(row.total_days),
      reason: row.reason,
      status: row.status,
      adminNotes: row.admin_notes,
      supportingDocumentPath: row.supporting_document_path,
      emergencyContactName: row.emergency_contact_name,
      emergencyContactPhone: row.emergency_contact_phone,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      reviewedAt: row.reviewed_at,
      reviewer: row.reviewer_first_name
        ? {
            firstName: row.reviewer_first_name,
            lastName: row.reviewer_last_name,
            email: row.reviewer_email,
          }
        : null,
    };

    res.json({ leaveRequest });
  } catch (error) {
    console.error('Get leave request details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve or reject leave request
router.put('/leave-requests/:id/review', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, adminNotes } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be approve or reject' });
    }

    // Get the leave request details
    const requestResult = await pool.query('SELECT * FROM leave_requests WHERE id = $1', [id]);

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    const leaveRequest = requestResult.rows[0];

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({
        message: `Cannot ${action} leave request. Current status: ${leaveRequest.status}`,
      });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update the leave request
    const updateResult = await pool.query(
      `UPDATE leave_requests 
       SET status = $1, reviewed_by = $2, admin_notes = $3, 
           reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 
       RETURNING *`,
      [newStatus, req.user.id, adminNotes || '', id]
    );

    const updatedRequest = updateResult.rows[0];

    // If approved, we could integrate with attendance records or calendar system here
    // For now, we'll just log the approval
    if (action === 'approve') {
      console.log(
        `Leave request approved for user ${leaveRequest.user_id} from ${leaveRequest.start_date} to ${leaveRequest.end_date}`
      );
    }

    res.json({
      message: `Leave request ${action}d successfully`,
      leaveRequest: {
        id: updatedRequest.id,
        status: updatedRequest.status,
        adminNotes: updatedRequest.admin_notes,
        reviewedAt: updatedRequest.reviewed_at,
      },
    });
  } catch (error) {
    console.error('Review leave request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get leave balance for employees (this would typically integrate with HR policies)
router.get('/leave-balance/:userId', auth, adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { year = new Date().getFullYear() } = req.query;

    // Verify user exists
    const userResult = await pool.query(
      'SELECT id, first_name, last_name, email FROM users WHERE id = $1 AND is_admin = false',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const user = userResult.rows[0];

    // Get used leave days by type for the year
    const usedLeaveResult = await pool.query(
      `
      SELECT 
        leave_type,
        COALESCE(SUM(total_days), 0) as used_days
      FROM leave_requests 
      WHERE user_id = $1 
      AND status = 'approved'
      AND EXTRACT(YEAR FROM start_date) = $2
      GROUP BY leave_type
    `,
      [userId, year]
    );

    // Standard leave allocations (these would typically come from HR policies/database)
    const standardAllocations = {
      vacation: 21,
      sick: 10,
      personal: 3,
      emergency: 2,
      maternity: 90,
      paternity: 14,
      bereavement: 5,
    };

    const leaveBalance = Object.keys(standardAllocations).map(leaveType => {
      const usedRecord = usedLeaveResult.rows.find(row => row.leave_type === leaveType);
      const used = usedRecord ? parseFloat(usedRecord.used_days) : 0;
      const allocated = standardAllocations[leaveType];

      return {
        leaveType,
        allocated,
        used,
        remaining: allocated - used,
      };
    });

    res.json({
      employee: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
      },
      year: parseInt(year),
      leaveBalance,
    });
  } catch (error) {
    console.error('Get leave balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get attendance violations and patterns for leave analysis
router.get('/attendance-analysis/:userId', auth, adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    // Verify user exists
    const userResult = await pool.query(
      'SELECT id, first_name, last_name, email FROM users WHERE id = $1 AND is_admin = false',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const user = userResult.rows[0];

    // Get attendance records for the period
    const attendanceResult = await pool.query(
      `
      SELECT 
        date,
        MIN(time) as first_clock_in,
        MAX(time) as last_clock_out,
        COUNT(*) as total_entries,
        array_agg(time ORDER BY time) as all_times,
        array_agg(action ORDER BY time) as all_actions
      FROM attendance_records 
      WHERE user_id = $1 
      AND date BETWEEN $2 AND $3
      GROUP BY date
      ORDER BY date
    `,
      [userId, startDate, endDate]
    );

    // Analyze attendance patterns based on the user's observations
    const violations = [];
    const patterns = {
      lateArrivals: 0,
      earlyLeaves: 0,
      irregularEntries: 0,
      absentDays: 0,
      totalWorkDays: 0,
    };

    // Generate date range for analysis
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateRange = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      // Skip weekends (assuming Monday-Friday work week)
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        dateRange.push(new Date(d).toISOString().split('T')[0]);
        patterns.totalWorkDays++;
      }
    }

    // Check each work day
    dateRange.forEach(date => {
      const attendanceRecord = attendanceResult.rows.find(
        row => row.date.toISOString().split('T')[0] === date
      );

      if (!attendanceRecord) {
        // Absent day
        violations.push({
          date,
          type: 'absent',
          description: 'No attendance records for this day',
        });
        patterns.absentDays++;
      } else {
        const firstClockIn = attendanceRecord.first_clock_in;
        const lastClockOut = attendanceRecord.last_clock_out;
        const totalEntries = attendanceRecord.total_entries;

        // Check for late arrival (after 9:30 AM)
        if (firstClockIn && firstClockIn > '09:30:00') {
          violations.push({
            date,
            type: 'late_arrival',
            description: `Clocked in at ${firstClockIn} (after 9:30 AM)`,
            time: firstClockIn,
          });
          patterns.lateArrivals++;
        }

        // Check for early leave (before 4:30 PM)
        if (lastClockOut && lastClockOut < '16:30:00') {
          violations.push({
            date,
            type: 'early_leave',
            description: `Clocked out at ${lastClockOut} (before 4:30 PM)`,
            time: lastClockOut,
          });
          patterns.earlyLeaves++;
        }

        // Check for irregular entries (very late clock-out)
        if (lastClockOut && lastClockOut > '22:00:00') {
          violations.push({
            date,
            type: 'irregular_entry',
            description: `Very late clock-out at ${lastClockOut}`,
            time: lastClockOut,
          });
          patterns.irregularEntries++;
        }

        // Flag days with many entries (potential issues)
        if (totalEntries > 6) {
          violations.push({
            date,
            type: 'multiple_entries',
            description: `${totalEntries} entries recorded (unusual pattern)`,
            entries: attendanceRecord.all_times,
          });
        }
      }
    });

    // Calculate attendance score
    const attendanceScore = {
      totalDays: patterns.totalWorkDays,
      presentDays: patterns.totalWorkDays - patterns.absentDays,
      attendanceRate:
        patterns.totalWorkDays > 0
          ? (
              ((patterns.totalWorkDays - patterns.absentDays) / patterns.totalWorkDays) *
              100
            ).toFixed(1)
          : 0,
      punctualityScore:
        patterns.totalWorkDays > 0
          ? (
              ((patterns.totalWorkDays - patterns.lateArrivals - patterns.earlyLeaves) /
                patterns.totalWorkDays) *
              100
            ).toFixed(1)
          : 0,
    };

    res.json({
      employee: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
      },
      period: {
        startDate,
        endDate,
      },
      violations,
      patterns,
      attendanceScore,
      recommendations: generateAttendanceRecommendations(patterns, attendanceScore),
    });
  } catch (error) {
    console.error('Get attendance analysis error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to generate recommendations
function generateAttendanceRecommendations(patterns, attendanceScore) {
  const recommendations = [];

  if (parseFloat(attendanceScore.attendanceRate) < 90) {
    recommendations.push({
      type: 'attendance',
      severity: 'high',
      message: 'Low attendance rate. Consider discussing attendance improvement plan.',
    });
  }

  if (patterns.lateArrivals > 3) {
    recommendations.push({
      type: 'punctuality',
      severity: 'medium',
      message:
        'Frequent late arrivals detected. Consider flexible work arrangements or counseling.',
    });
  }

  if (patterns.earlyLeaves > 3) {
    recommendations.push({
      type: 'early_departure',
      severity: 'medium',
      message: 'Frequent early departures. Review workload and personal circumstances.',
    });
  }

  if (patterns.irregularEntries > 0) {
    recommendations.push({
      type: 'irregular_pattern',
      severity: 'low',
      message: 'Irregular clock-out times detected. Verify if overtime is authorized.',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'positive',
      severity: 'none',
      message: 'Good attendance pattern. No immediate concerns identified.',
    });
  }

  return recommendations;
}

// ============================================================================
// LEAVE REQUEST MANAGEMENT
// ============================================================================

// Get all leave requests with filtering and pagination
router.get('/leave-requests', auth, adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      leaveType,
      userId,
      locationId,
      teamId,
      startDate,
      endDate,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT lr.*, 
             u.first_name, u.last_name, u.email, u.employee_id,
             u.location_id, u.team_id,
             l.name as location_name, l.timezone as location_timezone,
             t.name as team_name,
             reviewer.first_name as reviewer_first_name, 
             reviewer.last_name as reviewer_last_name
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      LEFT JOIN locations l ON u.location_id = l.id
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN users reviewer ON lr.reviewed_by = reviewer.id
      WHERE u.is_admin = false
    `;

    const params = [];
    let paramCounter = 1;

    if (status) {
      query += ` AND lr.status = $${paramCounter}`;
      params.push(status);
      paramCounter++;
    }

    if (leaveType) {
      query += ` AND lr.leave_type = $${paramCounter}`;
      params.push(leaveType);
      paramCounter++;
    }

    if (userId) {
      query += ` AND lr.user_id = $${paramCounter}`;
      params.push(userId);
      paramCounter++;
    }

    if (locationId) {
      query += ` AND u.location_id = $${paramCounter}`;
      params.push(locationId);
      paramCounter++;
    }

    if (teamId) {
      query += ` AND u.team_id = $${paramCounter}`;
      params.push(teamId);
      paramCounter++;
    }

    if (startDate) {
      query += ` AND lr.end_date >= $${paramCounter}`;
      params.push(startDate);
      paramCounter++;
    }

    if (endDate) {
      query += ` AND lr.start_date <= $${paramCounter}`;
      params.push(endDate);
      paramCounter++;
    }

    // Get total count
    const countQuery = query.replace(/SELECT lr\..*?FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Add ordering and pagination
    query += ` ORDER BY lr.created_at DESC LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    const leaveRequests = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      employee: {
        id: row.user_id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        employeeId: row.employee_id,
        locationId: row.location_id,
        teamId: row.team_id,
      },
      location: row.location_name
        ? {
            name: row.location_name,
            timezone: row.location_timezone,
          }
        : null,
      team: row.team_name
        ? {
            name: row.team_name,
          }
        : null,
      leaveType: row.leave_type,
      startDate: row.start_date,
      endDate: row.end_date,
      halfDay: row.half_day,
      halfDayPeriod: row.half_day_period,
      totalDays: parseFloat(row.total_days),
      reason: row.reason,
      status: row.status,
      adminNotes: row.admin_notes,
      supportingDocumentPath: row.supporting_document_path,
      emergencyContactName: row.emergency_contact_name,
      emergencyContactPhone: row.emergency_contact_phone,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      reviewedAt: row.reviewed_at,
      reviewer: row.reviewer_first_name
        ? {
            firstName: row.reviewer_first_name,
            lastName: row.reviewer_last_name,
          }
        : null,
    }));

    res.json({
      leaveRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get leave requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get leave request statistics
router.get('/leave-requests/stats', auth, adminAuth, async (req, res) => {
  try {
    const { year = new Date().getFullYear(), locationId, teamId } = req.query;

    let baseQuery = `
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      WHERE EXTRACT(YEAR FROM lr.start_date) = $1
      AND u.is_admin = false
    `;

    const params = [year];
    let paramCounter = 2;

    if (locationId) {
      baseQuery += ` AND u.location_id = $${paramCounter}`;
      params.push(locationId);
      paramCounter++;
    }

    if (teamId) {
      baseQuery += ` AND u.team_id = $${paramCounter}`;
      params.push(teamId);
      paramCounter++;
    }

    // Get overall statistics
    const overallStats = await pool.query(
      `
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN lr.status = 'pending' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN lr.status = 'approved' THEN 1 END) as approved_requests,
        COUNT(CASE WHEN lr.status = 'rejected' THEN 1 END) as rejected_requests,
        COALESCE(SUM(CASE WHEN lr.status = 'approved' THEN lr.total_days ELSE 0 END), 0) as total_approved_days
      ${baseQuery}
    `,
      params
    );

    // Get statistics by leave type
    const typeStats = await pool.query(
      `
      SELECT 
        lr.leave_type,
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN lr.status = 'approved' THEN lr.total_days ELSE 0 END), 0) as approved_days
      ${baseQuery}
      GROUP BY lr.leave_type
      ORDER BY count DESC
    `,
      params
    );

    // Get monthly distribution
    const monthlyStats = await pool.query(
      `
      SELECT 
        EXTRACT(MONTH FROM lr.start_date) as month,
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN lr.status = 'approved' THEN lr.total_days ELSE 0 END), 0) as approved_days
      ${baseQuery}
      GROUP BY EXTRACT(MONTH FROM lr.start_date)
      ORDER BY month
    `,
      params
    );

    res.json({
      year: parseInt(year),
      overall: overallStats.rows[0],
      byType: typeStats.rows,
      byMonth: monthlyStats.rows,
    });
  } catch (error) {
    console.error('Get leave request stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get specific leave request details
router.get('/leave-requests/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT lr.*, 
             u.first_name, u.last_name, u.email, u.employee_id,
             u.location_id, u.team_id, u.phone,
             l.name as location_name, l.timezone as location_timezone,
             t.name as team_name,
             reviewer.first_name as reviewer_first_name, 
             reviewer.last_name as reviewer_last_name,
             reviewer.email as reviewer_email
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      LEFT JOIN locations l ON u.location_id = l.id
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN users reviewer ON lr.reviewed_by = reviewer.id
      WHERE lr.id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    const row = result.rows[0];
    const leaveRequest = {
      id: row.id,
      userId: row.user_id,
      employee: {
        id: row.user_id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        employeeId: row.employee_id,
        locationId: row.location_id,
        teamId: row.team_id,
      },
      location: row.location_name
        ? {
            name: row.location_name,
            timezone: row.location_timezone,
          }
        : null,
      team: row.team_name
        ? {
            name: row.team_name,
          }
        : null,
      leaveType: row.leave_type,
      startDate: row.start_date,
      endDate: row.end_date,
      halfDay: row.half_day,
      halfDayPeriod: row.half_day_period,
      totalDays: parseFloat(row.total_days),
      reason: row.reason,
      status: row.status,
      adminNotes: row.admin_notes,
      supportingDocumentPath: row.supporting_document_path,
      emergencyContactName: row.emergency_contact_name,
      emergencyContactPhone: row.emergency_contact_phone,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      reviewedAt: row.reviewed_at,
      reviewer: row.reviewer_first_name
        ? {
            firstName: row.reviewer_first_name,
            lastName: row.reviewer_last_name,
            email: row.reviewer_email,
          }
        : null,
    };

    res.json({ leaveRequest });
  } catch (error) {
    console.error('Get leave request details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve or reject leave request
router.put('/leave-requests/:id/review', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, adminNotes } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be approve or reject' });
    }

    // Get the leave request details
    const requestResult = await pool.query('SELECT * FROM leave_requests WHERE id = $1', [id]);

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    const leaveRequest = requestResult.rows[0];

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({
        message: `Cannot ${action} leave request. Current status: ${leaveRequest.status}`,
      });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update the leave request
    const updateResult = await pool.query(
      `UPDATE leave_requests 
       SET status = $1, reviewed_by = $2, admin_notes = $3, 
           reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 
       RETURNING *`,
      [newStatus, req.user.id, adminNotes || '', id]
    );

    const updatedRequest = updateResult.rows[0];

    // If approved, we could integrate with attendance records or calendar system here
    // For now, we'll just log the approval
    if (action === 'approve') {
      console.log(
        `Leave request approved for user ${leaveRequest.user_id} from ${leaveRequest.start_date} to ${leaveRequest.end_date}`
      );
    }

    res.json({
      message: `Leave request ${action}d successfully`,
      leaveRequest: {
        id: updatedRequest.id,
        status: updatedRequest.status,
        adminNotes: updatedRequest.admin_notes,
        reviewedAt: updatedRequest.reviewed_at,
      },
    });
  } catch (error) {
    console.error('Review leave request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get leave balance for employees (this would typically integrate with HR policies)
router.get('/leave-balance/:userId', auth, adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { year = new Date().getFullYear() } = req.query;

    // Verify user exists
    const userResult = await pool.query(
      'SELECT id, first_name, last_name, email FROM users WHERE id = $1 AND is_admin = false',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const user = userResult.rows[0];

    // Get used leave days by type for the year
    const usedLeaveResult = await pool.query(
      `
      SELECT 
        leave_type,
        COALESCE(SUM(total_days), 0) as used_days
      FROM leave_requests 
      WHERE user_id = $1 
      AND status = 'approved'
      AND EXTRACT(YEAR FROM start_date) = $2
      GROUP BY leave_type
    `,
      [userId, year]
    );

    // Standard leave allocations (these would typically come from HR policies/database)
    const standardAllocations = {
      vacation: 21,
      sick: 10,
      personal: 3,
      emergency: 2,
      maternity: 90,
      paternity: 14,
      bereavement: 5,
    };

    const leaveBalance = Object.keys(standardAllocations).map(leaveType => {
      const usedRecord = usedLeaveResult.rows.find(row => row.leave_type === leaveType);
      const used = usedRecord ? parseFloat(usedRecord.used_days) : 0;
      const allocated = standardAllocations[leaveType];

      return {
        leaveType,
        allocated,
        used,
        remaining: allocated - used,
      };
    });

    res.json({
      employee: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
      },
      year: parseInt(year),
      leaveBalance,
    });
  } catch (error) {
    console.error('Get leave balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get attendance violations and patterns for leave analysis
router.get('/attendance-analysis/:userId', auth, adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    // Verify user exists
    const userResult = await pool.query(
      'SELECT id, first_name, last_name, email FROM users WHERE id = $1 AND is_admin = false',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const user = userResult.rows[0];

    // Get attendance records for the period
    const attendanceResult = await pool.query(
      `
      SELECT 
        date,
        MIN(time) as first_clock_in,
        MAX(time) as last_clock_out,
        COUNT(*) as total_entries,
        array_agg(time ORDER BY time) as all_times,
        array_agg(action ORDER BY time) as all_actions
      FROM attendance_records 
      WHERE user_id = $1 
      AND date BETWEEN $2 AND $3
      GROUP BY date
      ORDER BY date
    `,
      [userId, startDate, endDate]
    );

    // Analyze attendance patterns based on the user's observations
    const violations = [];
    const patterns = {
      lateArrivals: 0,
      earlyLeaves: 0,
      irregularEntries: 0,
      absentDays: 0,
      totalWorkDays: 0,
    };

    // Generate date range for analysis
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateRange = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      // Skip weekends (assuming Monday-Friday work week)
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        dateRange.push(new Date(d).toISOString().split('T')[0]);
        patterns.totalWorkDays++;
      }
    }

    // Check each work day
    dateRange.forEach(date => {
      const attendanceRecord = attendanceResult.rows.find(
        row => row.date.toISOString().split('T')[0] === date
      );

      if (!attendanceRecord) {
        // Absent day
        violations.push({
          date,
          type: 'absent',
          description: 'No attendance records for this day',
        });
        patterns.absentDays++;
      } else {
        const firstClockIn = attendanceRecord.first_clock_in;
        const lastClockOut = attendanceRecord.last_clock_out;
        const totalEntries = attendanceRecord.total_entries;

        // Check for late arrival (after 9:30 AM)
        if (firstClockIn && firstClockIn > '09:30:00') {
          violations.push({
            date,
            type: 'late_arrival',
            description: `Clocked in at ${firstClockIn} (after 9:30 AM)`,
            time: firstClockIn,
          });
          patterns.lateArrivals++;
        }

        // Check for early leave (before 4:30 PM)
        if (lastClockOut && lastClockOut < '16:30:00') {
          violations.push({
            date,
            type: 'early_leave',
            description: `Clocked out at ${lastClockOut} (before 4:30 PM)`,
            time: lastClockOut,
          });
          patterns.earlyLeaves++;
        }

        // Check for irregular entries (very late clock-out)
        if (lastClockOut && lastClockOut > '22:00:00') {
          violations.push({
            date,
            type: 'irregular_entry',
            description: `Very late clock-out at ${lastClockOut}`,
            time: lastClockOut,
          });
          patterns.irregularEntries++;
        }

        // Flag days with many entries (potential issues)
        if (totalEntries > 6) {
          violations.push({
            date,
            type: 'multiple_entries',
            description: `${totalEntries} entries recorded (unusual pattern)`,
            entries: attendanceRecord.all_times,
          });
        }
      }
    });

    // Calculate attendance score
    const attendanceScore = {
      totalDays: patterns.totalWorkDays,
      presentDays: patterns.totalWorkDays - patterns.absentDays,
      attendanceRate:
        patterns.totalWorkDays > 0
          ? (
              ((patterns.totalWorkDays - patterns.absentDays) / patterns.totalWorkDays) *
              100
            ).toFixed(1)
          : 0,
      punctualityScore:
        patterns.totalWorkDays > 0
          ? (
              ((patterns.totalWorkDays - patterns.lateArrivals - patterns.earlyLeaves) /
                patterns.totalWorkDays) *
              100
            ).toFixed(1)
          : 0,
    };

    res.json({
      employee: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
      },
      period: {
        startDate,
        endDate,
      },
      violations,
      patterns,
      attendanceScore,
      recommendations: generateAttendanceRecommendations(patterns, attendanceScore),
    });
  } catch (error) {
    console.error('Get attendance analysis error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to generate recommendations
function generateAttendanceRecommendations(patterns, attendanceScore) {
  const recommendations = [];

  if (parseFloat(attendanceScore.attendanceRate) < 90) {
    recommendations.push({
      type: 'attendance',
      severity: 'high',
      message: 'Low attendance rate. Consider discussing attendance improvement plan.',
    });
  }

  if (patterns.lateArrivals > 3) {
    recommendations.push({
      type: 'punctuality',
      severity: 'medium',
      message:
        'Frequent late arrivals detected. Consider flexible work arrangements or counseling.',
    });
  }

  if (patterns.earlyLeaves > 3) {
    recommendations.push({
      type: 'early_departure',
      severity: 'medium',
      message: 'Frequent early departures. Review workload and personal circumstances.',
    });
  }

  if (patterns.irregularEntries > 0) {
    recommendations.push({
      type: 'irregular_pattern',
      severity: 'low',
      message: 'Irregular clock-out times detected. Verify if overtime is authorized.',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'positive',
      severity: 'none',
      message: 'Good attendance pattern. No immediate concerns identified.',
    });
  }

  return recommendations;
}

// ============================================================================
// CACHE MANAGEMENT ENDPOINTS
// ============================================================================

// Get cache health and statistics
router.get('/cache/stats', auth, adminAuth, async (req, res) => {
  try {
    console.log('🔍 Getting cache statistics');

    const stats = await dbCache.getHealthStatus();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get cache stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cache statistics',
      error: error.message,
    });
  }
});

// Manually invalidate specific cache types
router.post('/cache/invalidate', auth, adminAuth, async (req, res) => {
  try {
    const { types } = req.body;

    if (!types || !Array.isArray(types)) {
      return res.status(400).json({
        success: false,
        message: 'Types array is required',
      });
    }

    console.log(`🧹 Manually invalidating cache types: ${types.join(', ')}`);

    await dbCache.invalidateCache(types);

    res.json({
      success: true,
      message: `Successfully invalidated cache for: ${types.join(', ')}`,
      invalidatedTypes: types,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cache invalidation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to invalidate cache',
      error: error.message,
    });
  }
});

// Get dashboard statistics (cached)
router.get('/dashboard/stats', auth, adminAuth, async (req, res) => {
  try {
    console.log('🔍 Getting dashboard statistics (cached)');

    const stats = await dbCache.getDashboardStats();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard statistics',
      error: error.message,
    });
  }
});

// Simple test route to verify admin routes are working
router.get('/test', (req, res) => {
  res.json({ message: 'Admin routes are working', timestamp: new Date().toISOString() });
});

// =============================================================================
// DEVELOPMENT MEMORY PROFILING ENDPOINTS
// =============================================================================

// Memory profiling endpoints (development only)
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
  // Get memory profiling instructions and setup guide
  router.get('/dev/memory/instructions', auth, adminAuth, (req, res) => {
    try {
      const instructions = memoryProfiler.getInstructions();
      res.json({
        success: true,
        instructions,
        profilerAvailable: memoryProfiler.isAvailable(),
        environment: process.env.NODE_ENV,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // Get current memory statistics
  router.get('/dev/memory/stats', auth, adminAuth, (req, res) => {
    try {
      const stats = memoryProfiler.getMemoryStats();
      res.json({
        success: true,
        stats,
        profilerAvailable: memoryProfiler.isAvailable(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // Take a memory snapshot
  router.post('/dev/memory/snapshot', auth, adminAuth, async (req, res) => {
    try {
      const { label } = req.body;

      if (!memoryProfiler.isAvailable()) {
        return res.status(503).json({
          success: false,
          error: 'Memory profiler not available',
          message: 'Ensure NODE_ENV=development and heapdump is installed',
        });
      }

      const snapshotInfo = await memoryProfiler.takeSnapshot(label);

      res.json({
        success: true,
        message: 'Memory snapshot taken successfully',
        snapshot: snapshotInfo,
        instructions: {
          analysis:
            'Open Chrome DevTools > Memory tab > Load Profile > Select the .heapsnapshot file',
          location: snapshotInfo.filepath,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // List all memory snapshots
  router.get('/dev/memory/snapshots', auth, adminAuth, async (req, res) => {
    try {
      const result = await memoryProfiler.listSnapshots();
      res.json({
        success: true,
        ...result,
        profilerAvailable: memoryProfiler.isAvailable(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // Clean up old snapshots
  router.delete('/dev/memory/snapshots', auth, adminAuth, async (req, res) => {
    try {
      const { keepCount = 10 } = req.query;
      const result = await memoryProfiler.cleanupSnapshots(parseInt(keepCount));

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // Force garbage collection (requires --expose-gc flag)
  router.post('/dev/memory/gc', auth, adminAuth, (req, res) => {
    try {
      const result = memoryProfiler.forceGC();
      res.json({
        success: true,
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // Take snapshot before and after a specific operation for comparison
  router.post('/dev/memory/compare-operation', auth, adminAuth, async (req, res) => {
    try {
      const { operation, label } = req.body;

      if (!memoryProfiler.isAvailable()) {
        return res.status(503).json({
          success: false,
          error: 'Memory profiler not available',
        });
      }

      // Take before snapshot
      const beforeSnapshot = await memoryProfiler.takeSnapshot(`before-${label || operation}`);

      let operationResult = null;
      let operationError = null;

      // Execute the specified operation
      try {
        switch (operation) {
          case 'get-attendance':
            operationResult = await dbCache.getAttendanceRecords({
              page: 1,
              limit: 1000,
            });
            break;
          case 'get-users':
            operationResult = await dbCache.getUsers({
              page: 1,
              limit: 1000,
            });
            break;
          case 'get-dashboard-stats':
            operationResult = await dbCache.getDashboardStats();
            break;
          case 'force-gc':
            if (global.gc) {
              global.gc();
              operationResult = { message: 'Garbage collection forced' };
            } else {
              operationResult = { message: 'GC not available' };
            }
            break;
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
      } catch (error) {
        operationError = error.message;
      }

      // Take after snapshot
      const afterSnapshot = await memoryProfiler.takeSnapshot(`after-${label || operation}`);

      // Calculate memory differences
      const beforeMem = beforeSnapshot.memoryUsage;
      const afterMem = afterSnapshot.memoryUsage;

      res.json({
        success: true,
        operation,
        label,
        snapshots: {
          before: beforeSnapshot,
          after: afterSnapshot,
        },
        comparison: {
          heapUsedChange:
            afterSnapshot.memoryUsage.heapUsed !== beforeSnapshot.memoryUsage.heapUsed,
          operationResult: operationError ? null : operationResult,
          operationError,
        },
        instructions: {
          analysis: 'Compare the two snapshots in Chrome DevTools to see memory changes',
          steps: [
            '1. Open Chrome DevTools > Memory tab',
            '2. Load both .heapsnapshot files',
            '3. Select "Comparison" view',
            '4. Choose before snapshot as baseline',
            '5. Look for object count differences',
          ],
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  console.log('🔍 Development memory profiling endpoints loaded');
}

// ============================================================================
// ADMIN MONITORING API ENDPOINTS
// ============================================================================

// Import additional monitoring dependencies
const cluster = require('cluster');
const os = require('os');

// GET /admin/metrics - Aggregated system metrics
router.get('/metrics', auth, adminAuth, async (req, res) => {
  try {
    console.log('📊 Getting aggregated system metrics');

    // Get comprehensive metrics from monitoring instrumentation
    const instrumentationMetrics = monitoringInstrumentation.getMetrics();
    
    // Get cache stats
    const cacheStats = await dbCache.getHealthStatus();
    
    // Get database stats
    let dbStats = {};
    try {
      if (typeof pool.getQueryStats === 'function') {
        dbStats = pool.getQueryStats();
      }
    } catch (error) {
      console.warn('Could not get DB stats:', error.message);
      dbStats = { totalQueries: 0, slowQueries: 0, averageDuration: 0 };
    }

    // Merge all metrics
    const metrics = {
      system: instrumentationMetrics.system,
      performance: {
        ...instrumentationMetrics.performance,
        // Add database-specific performance metrics
        databaseAverageQueryTime: dbStats.averageDuration || 0,
        databaseSlowQueryRate: dbStats.slowQueryPercentage || 0
      },
      database: {
        totalQueries: dbStats.totalQueries || 0,
        slowQueries: dbStats.slowQueries || 0,
        averageDuration: dbStats.averageDuration || 0,
        slowQueryPercentage: dbStats.slowQueryPercentage || 0,
        poolActive: dbStats.poolActive || 0,
        poolIdle: dbStats.poolIdle || 0,
        poolWaiting: dbStats.poolWaiting || 0
      },
      cache: {
        connected: cacheStats.connected,
        keyCount: cacheStats.keyCount || 0,
        memoryUsed: cacheStats.memoryUsed || '0 MB',
        hits: cacheStats.hits || 0,
        misses: cacheStats.misses || 0,
        hitRate: cacheStats.hitRate || 0
      },
      requests: instrumentationMetrics.requests,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system metrics',
      error: error.message
    });
  }
});

// POST /admin/profiler/cpu/start - Start CPU profiling
router.post('/profiler/cpu/start', auth, adminAuth, async (req, res) => {
  try {
    console.log('🔥 Starting CPU profiling');
    
    const { duration, sampleInterval, label } = req.body;
    const result = await profilingManager.startCPUProfiling({
      duration: duration || 30000,
      sampleInterval: sampleInterval || 1,
      label: label || 'admin-cpu-profile'
    });

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error starting CPU profiling:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start CPU profiling',
      error: error.message
    });
  }
});

// POST /admin/profiler/cpu/stop - Stop CPU profiling
router.post('/profiler/cpu/stop', auth, adminAuth, async (req, res) => {
  try {
    console.log('🛑 Stopping CPU profiling');
    
    const result = await profilingManager.stopCPUProfiling();

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error stopping CPU profiling:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop CPU profiling',
      error: error.message
    });
  }
});

// POST /admin/profiler/memory/snapshot - Create memory snapshot (enhanced)
router.post('/profiler/memory/snapshot', auth, adminAuth, async (req, res) => {
  try {
    const { label } = req.body;
    console.log('📸 Creating memory snapshot:', label);

    const snapshot = await profilingManager.createMemorySnapshot(label);

    res.json({
      success: true,
      snapshot,
      message: 'Memory snapshot created successfully'
    });

  } catch (error) {
    console.error('Error creating memory snapshot:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create memory snapshot',
      error: error.message
    });
  }
});

// GET /admin/profiler/memory/snapshots - Get all memory snapshots
router.get('/profiler/memory/snapshots', auth, adminAuth, async (req, res) => {
  try {
    console.log('📋 Getting memory snapshots list');

    const snapshots = profilingManager.getMemorySnapshots();

    res.json({
      success: true,
      ...snapshots,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting memory snapshots:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get memory snapshots',
      error: error.message
    });
  }
});

// POST /admin/profiler/memory/start - Start memory profiling session
router.post('/profiler/memory/start', auth, adminAuth, async (req, res) => {
  try {
    const { duration, sampleInterval, label } = req.body;
    console.log('🧠 Starting memory profiling session');

    const result = await profilingManager.startMemoryProfiling({
      duration: duration || 60000,
      sampleInterval: sampleInterval || 1000,
      label: label || 'admin-memory-profile'
    });

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error starting memory profiling:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start memory profiling',
      error: error.message
    });
  }
});

// POST /admin/profiler/memory/stop - Stop memory profiling session
router.post('/profiler/memory/stop', auth, adminAuth, async (req, res) => {
  try {
    console.log('🛑 Stopping memory profiling session');

    const result = await profilingManager.stopMemoryProfiling();

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error stopping memory profiling:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop memory profiling',
      error: error.message
    });
  }
});

// GET /admin/profiler/status - Get profiling status
router.get('/profiler/status', auth, adminAuth, async (req, res) => {
  try {
    console.log('📊 Getting profiling status');

    const status = profilingManager.getProfilingStatus();

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting profiling status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profiling status',
      error: error.message
    });
  }
});

// GET /admin/cache/stats - Enhanced cache statistics (already exists)
// POST /admin/cache/clear - Clear cache (enhanced version)
router.post('/cache/clear', auth, adminAuth, async (req, res) => {
  try {
    const { pattern, types } = req.body;
    console.log('🧹 Clearing cache with pattern:', pattern, 'types:', types);

    if (pattern) {
      // Clear specific pattern
      await dbCache.invalidatePattern(pattern);
      res.json({
        success: true,
        message: `Cache cleared for pattern: ${pattern}`,
        pattern
      });
    } else if (types && Array.isArray(types)) {
      // Clear specific types
      await dbCache.invalidateCache(types);
      res.json({
        success: true,
        message: `Cache cleared for types: ${types.join(', ')}`,
        types
      });
    } else {
      // Clear all cache
      await dbCache.invalidateAllCache();
      res.json({
        success: true,
        message: 'All cache cleared'
      });
    }

  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
      error: error.message
    });
  }
});

// GET /admin/cluster/status - Cluster worker status
router.get('/cluster/status', auth, adminAuth, async (req, res) => {
  try {
    console.log('👥 Getting cluster status');

    const clusterStatus = {
      isMaster: cluster.isMaster,
      isPrimary: cluster.isPrimary,
      workerId: cluster.worker ? cluster.worker.id : null,
      processId: process.pid,
      workers: {},
      system: {
        cpuCount: os.cpus().length,
        totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024), // GB
        freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024), // GB
        loadAverage: os.loadavg(),
        uptime: os.uptime()
      }
    };

    if (cluster.isMaster || cluster.isPrimary) {
      // Get worker information
      for (const [id, worker] of Object.entries(cluster.workers || {})) {
        clusterStatus.workers[id] = {
          id: parseInt(id),
          pid: worker.process.pid,
          state: worker.state,
          isDead: worker.isDead(),
          exitedAfterDisconnect: worker.exitedAfterDisconnect
        };
      }
      clusterStatus.workerCount = Object.keys(cluster.workers || {}).length;
    } else {
      clusterStatus.workerCount = 1;
      clusterStatus.isWorker = true;
    }

    res.json({
      success: true,
      data: clusterStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting cluster status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cluster status',
      error: error.message
    });
  }
});

// POST /admin/cluster/restart - Restart cluster workers
router.post('/cluster/restart', auth, adminAuth, async (req, res) => {
  try {
    console.log('🔄 Restarting cluster workers');

    if (!cluster.isMaster && !cluster.isPrimary) {
      return res.status(400).json({
        success: false,
        message: 'Cluster restart can only be initiated from master process'
      });
    }

    const workerIds = Object.keys(cluster.workers || {});
    let restartedWorkers = 0;

    for (const workerId of workerIds) {
      const worker = cluster.workers[workerId];
      if (worker && !worker.isDead()) {
        worker.disconnect();
        worker.kill();
        restartedWorkers++;
      }
    }

    // Fork new workers
    const cpuCount = os.cpus().length;
    for (let i = 0; i < Math.min(cpuCount, 4); i++) {
      cluster.fork();
    }

    res.json({
      success: true,
      message: `Restarted ${restartedWorkers} workers`,
      restartedWorkers,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error restarting cluster:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restart cluster',
      error: error.message
    });
  }
});

// GET /admin/logs - Recent system logs and alerts
router.get('/logs', auth, adminAuth, async (req, res) => {
  try {
    const { limit = 100, level = 'all' } = req.query;
    console.log('📋 Getting system logs, limit:', limit, 'level:', level);

    // Get database slow queries
    let slowQueries = [];
    try {
      if (typeof pool.getSlowQueries === 'function') {
        slowQueries = pool.getSlowQueries(limit);
      }
    } catch (error) {
      console.warn('Could not get slow queries:', error.message);
    }

    // Get recent alerts (simulated for now - in production, these would come from a logging system)
    const alerts = [
      {
        id: 'alert-1',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        level: 'warn',
        type: 'slow-query',
        message: 'Slow query detected in attendance_records table',
        details: {
          duration: 450,
          query: 'SELECT * FROM attendance_records WHERE date BETWEEN ? AND ?',
          threshold: 200
        }
      },
      {
        id: 'alert-2',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        level: 'info',
        type: 'cache-miss',
        message: 'Cache miss rate increased above 20%',
        details: {
          hitRate: 78,
          missRate: 22,
          threshold: 20
        }
      },
      {
        id: 'alert-3',
        timestamp: new Date(Date.now() - 1200000).toISOString(),
        level: 'error',
        type: 'high-memory',
        message: 'Memory usage above 80% threshold',
        details: {
          memoryUsage: 342,
          limit: 400,
          percentage: 85.5
        }
      }
    ];

    // Filter by level if specified
    const filteredAlerts = level === 'all' ? alerts : 
      alerts.filter(alert => alert.level === level);

    res.json({
      success: true,
      data: {
        alerts: filteredAlerts.slice(0, limit),
        slowQueries: slowQueries.slice(0, limit),
        systemInfo: {
          totalAlerts: alerts.length,
          slowQueryCount: slowQueries.length,
          lastUpdated: new Date().toISOString()
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system logs',
      error: error.message
    });
  }
});

console.log('📊 Admin monitoring API endpoints loaded');

module.exports = router;
