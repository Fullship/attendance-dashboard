const redisCache = require('./RedisCache');
const pool = require('../config/database');

/**
 * Database Cache Wrapper - Provides caching for expensive PostgreSQL operations
 * Automatically handles cache-first pattern with fallback to database
 */
class DatabaseCache {
  constructor() {
    this.cache = redisCache;

    // TTL configurations for different data types (in seconds)
    this.ttlConfig = {
      // User data - changes infrequently
      users: 600, // 10 minutes
      user_profile: 1800, // 30 minutes

      // Attendance data - changes more frequently during work hours
      attendance_records: 180, // 3 minutes
      attendance_summary: 300, // 5 minutes
      attendance_stats: 120, // 2 minutes

      // Leave requests - moderate frequency
      leave_requests: 300, // 5 minutes
      leave_stats: 600, // 10 minutes

      // Clock requests - frequent during clock-in/out times
      clock_requests: 60, // 1 minute

      // Analytics and reports - expensive, changes less frequently
      reports: 900, // 15 minutes
      analytics: 1800, // 30 minutes
      dashboard_stats: 300, // 5 minutes

      // File uploads and processing - changes when new uploads happen
      file_uploads: 120, // 2 minutes

      // Configuration data - rarely changes
      locations: 3600, // 1 hour
      teams: 3600, // 1 hour
      settings: 7200, // 2 hours
    };
  }

  /**
   * Generate cache key based on query type and parameters
   * @param {string} type - Cache type (attendance_records, users, etc.)
   * @param {Object} params - Query parameters
   * @returns {string} Cache key
   */
  generateCacheKey(type, params) {
    // Sort params to ensure consistent cache keys
    const sortedParams = Object.keys(params || {})
      .sort()
      .reduce((sorted, key) => {
        sorted[key] = params[key];
        return sorted;
      }, {});

    const paramString =
      Object.keys(sortedParams).length > 0
        ? btoa(JSON.stringify(sortedParams)).replace(/[+/=]/g, '')
        : 'default';

    return `${type}:${paramString}`;
  }

  /**
   * Cache wrapper for attendance records queries
   */
  async getAttendanceRecords(queryParams) {
    const cacheKey = this.generateCacheKey('attendance_records', queryParams);

    return await this.cache.wrapQuery(
      'attendance',
      cacheKey,
      async () => {
        const {
          page = 1,
          limit = 10,
          period = '30',
          search = '',
          startDate,
          endDate,
        } = queryParams;
        const offset = (page - 1) * limit;
        const currentDate = new Date();

        // Build date filter logic
        let filterStartDate;
        let filterEndDate = endDate ? new Date(endDate) : null;

        switch (period) {
          case '7':
            filterStartDate = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30':
            filterStartDate = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case '90':
            filterStartDate = new Date(currentDate.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case '365':
            filterStartDate = new Date(currentDate.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          case 'this_year':
            filterStartDate = new Date(currentDate.getFullYear(), 0, 1);
            break;
          case 'this_month':
            filterStartDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            break;
          default:
            filterStartDate = startDate
              ? new Date(startDate)
              : new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        // Build query
        let whereClause = 'WHERE ar.date >= $1';
        let dbQueryParams = [filterStartDate.toISOString().split('T')[0]];
        let paramIndex = 2;

        if (filterEndDate) {
          whereClause += ` AND ar.date <= $${paramIndex}`;
          dbQueryParams.push(filterEndDate.toISOString().split('T')[0]);
          paramIndex++;
        }

        if (search) {
          whereClause += ` AND (
            u.first_name ILIKE $${paramIndex} OR 
            u.last_name ILIKE $${paramIndex} OR 
            u.email ILIKE $${paramIndex} OR
            ar.status ILIKE $${paramIndex}
          )`;
          dbQueryParams.push(`%${search}%`);
          paramIndex++;
        }

        // Main query
        const query = `
          SELECT 
            ar.id, ar.user_id, ar.date, ar.clock_in, ar.clock_out,
            ar.hours_worked, ar.status, ar.notes,
            u.first_name, u.last_name, u.email
          FROM attendance_records ar
          JOIN users u ON ar.user_id = u.id
          ${whereClause}
          ORDER BY ar.date DESC, ar.clock_in DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        dbQueryParams.push(limit, offset);

        // Execute queries in parallel
        const [result, countResult] = await Promise.all([
          pool.query(query, dbQueryParams),
          pool.query(
            `
            SELECT COUNT(ar.id) as total
            FROM attendance_records ar
            JOIN users u ON ar.user_id = u.id
            ${whereClause}
          `,
            dbQueryParams.slice(0, -2)
          ),
        ]);

        return {
          records: result.rows.map(record => ({
            id: record.id,
            userId: record.user_id,
            date: record.date,
            clock_in: record.clock_in,
            clock_out: record.clock_out,
            hours_worked: record.hours_worked,
            status: record.status,
            notes: record.notes,
            employee: {
              firstName: record.first_name,
              lastName: record.last_name,
              email: record.email,
            },
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(countResult.rows[0].total),
            pages: Math.ceil(parseInt(countResult.rows[0].total) / limit),
          },
        };
      },
      this.ttlConfig.attendance_records
    );
  }

  /**
   * Cache wrapper for user data queries
   */
  async getUsers(queryParams) {
    const cacheKey = this.generateCacheKey('users', queryParams);

    return await this.cache.wrapQuery(
      'users',
      cacheKey,
      async () => {
        const { page = 1, limit = 10, search = '', includeAdmins = false } = queryParams;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        let dbQueryParams = [];
        let paramIndex = 1;

        if (!includeAdmins) {
          whereClause += ` AND is_admin = false`;
        }

        if (search) {
          whereClause += ` AND (
            first_name ILIKE $${paramIndex} OR 
            last_name ILIKE $${paramIndex} OR 
            email ILIKE $${paramIndex} OR
            employee_id ILIKE $${paramIndex}
          )`;
          dbQueryParams.push(`%${search}%`);
          paramIndex++;
        }

        const query = `
          SELECT 
            u.id, u.first_name, u.last_name, u.email, u.employee_id,
            u.location_id, u.team_id, u.created_at, u.is_admin,
            l.name as location_name, t.name as team_name
          FROM users u
          LEFT JOIN locations l ON u.location_id = l.id
          LEFT JOIN teams t ON u.team_id = t.id
          ${whereClause}
          ORDER BY u.last_name, u.first_name
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        dbQueryParams.push(limit, offset);

        const [result, countResult] = await Promise.all([
          pool.query(query, dbQueryParams),
          pool.query(
            `SELECT COUNT(*) as total FROM users u ${whereClause}`,
            dbQueryParams.slice(0, -2)
          ),
        ]);

        return {
          users: result.rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(countResult.rows[0].total),
            pages: Math.ceil(parseInt(countResult.rows[0].total) / limit),
          },
        };
      },
      this.ttlConfig.users
    );
  }

  /**
   * Cache wrapper for clock requests
   */
  async getClockRequests(queryParams) {
    const cacheKey = this.generateCacheKey('clock_requests', queryParams);

    return await this.cache.wrapQuery(
      'clock_requests',
      cacheKey,
      async () => {
        const { page = 1, limit = 10, status = 'pending' } = queryParams;
        const offset = (page - 1) * limit;

        const [result, countResult] = await Promise.all([
          pool.query(
            `
            SELECT cr.*, u.first_name, u.last_name, u.email,
                   a.first_name as admin_first_name, a.last_name as admin_last_name
            FROM clock_requests cr
            LEFT JOIN users u ON cr.user_id = u.id
            LEFT JOIN users a ON cr.reviewed_by = a.id
            WHERE cr.status = $1
            ORDER BY cr.created_at ASC
            LIMIT $2 OFFSET $3
          `,
            [status, limit, offset]
          ),
          pool.query('SELECT COUNT(*) as total FROM clock_requests WHERE status = $1', [status]),
        ]);

        return {
          requests: result.rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(countResult.rows[0].total),
            pages: Math.ceil(parseInt(countResult.rows[0].total) / limit),
          },
        };
      },
      this.ttlConfig.clock_requests
    );
  }

  /**
   * Cache wrapper for leave requests
   */
  async getLeaveRequests(queryParams) {
    const cacheKey = this.generateCacheKey('leave_requests', queryParams);

    return await this.cache.wrapQuery(
      'leave_requests',
      cacheKey,
      async () => {
        const {
          page = 1,
          limit = 10,
          status,
          leaveType,
          userId,
          locationId,
          teamId,
          startDate,
          endDate,
        } = queryParams;

        const offset = (page - 1) * limit;

        let query = `
          SELECT lr.*, u.first_name, u.last_name, u.email, u.employee_id,
                 l.name as location_name, t.name as team_name,
                 reviewer.first_name as reviewer_first_name,
                 reviewer.last_name as reviewer_last_name
          FROM leave_requests lr
          LEFT JOIN users u ON lr.user_id = u.id
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

        return {
          requests: result.rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        };
      },
      this.ttlConfig.leave_requests
    );
  }

  /**
   * Cache wrapper for dashboard statistics
   */
  async getDashboardStats(queryParams = {}) {
    const cacheKey = this.generateCacheKey('dashboard_stats', queryParams);

    return await this.cache.wrapQuery(
      'analytics',
      cacheKey,
      async () => {
        const today = new Date().toISOString().split('T')[0];
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];

        // Execute multiple analytics queries in parallel
        const [
          totalUsersResult,
          todayAttendanceResult,
          pendingClockRequestsResult,
          pendingLeaveRequestsResult,
          recentUploadsResult,
          weeklyStatsResult,
        ] = await Promise.all([
          pool.query('SELECT COUNT(*) as total FROM users WHERE is_admin = false'),
          pool.query('SELECT COUNT(*) as total FROM attendance_records WHERE date = $1', [today]),
          pool.query('SELECT COUNT(*) as total FROM clock_requests WHERE status = $1', ['pending']),
          pool.query('SELECT COUNT(*) as total FROM leave_requests WHERE status = $1', ['pending']),
          pool.query(
            `
            SELECT COUNT(*) as total 
            FROM file_uploads 
            WHERE upload_date >= $1
          `,
            [sevenDaysAgo]
          ),
          pool.query(
            `
            SELECT 
              date,
              COUNT(*) as attendance_count,
              COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
              COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count,
              COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count
            FROM attendance_records 
            WHERE date >= $1
            GROUP BY date
            ORDER BY date DESC
          `,
            [sevenDaysAgo]
          ),
        ]);

        return {
          totalUsers: parseInt(totalUsersResult.rows[0].total),
          todayAttendance: parseInt(todayAttendanceResult.rows[0].total),
          pendingClockRequests: parseInt(pendingClockRequestsResult.rows[0].total),
          pendingLeaveRequests: parseInt(pendingLeaveRequestsResult.rows[0].total),
          recentUploads: parseInt(recentUploadsResult.rows[0].total),
          weeklyStats: weeklyStatsResult.rows,
          lastUpdated: new Date().toISOString(),
        };
      },
      this.ttlConfig.dashboard_stats
    );
  }

  /**
   * Invalidate cache for specific data types when updates occur
   * @param {string|Array} types - Cache types to invalidate
   * @param {Object} context - Additional context for selective invalidation
   */
  async invalidateCache(types, context = {}) {
    const typeArray = Array.isArray(types) ? types : [types];

    for (const type of typeArray) {
      await this.cache.clear(`${type}:*`);
      console.log(`🧹 Invalidated cache for type: ${type}`);
    }

    // Cascade invalidations for related data
    if (typeArray.includes('attendance_records')) {
      await this.cache.clear('dashboard_stats:*');
      await this.cache.clear('analytics:*');
    }

    if (typeArray.includes('users')) {
      await this.cache.clear('attendance_records:*');
      await this.cache.clear('leave_requests:*');
      await this.cache.clear('dashboard_stats:*');
    }

    if (typeArray.includes('leave_requests') || typeArray.includes('clock_requests')) {
      await this.cache.clear('dashboard_stats:*');
    }
  }

  /**
   * Get cache health and statistics
   */
  async getHealthStatus() {
    return await this.cache.getStats();
  }
}

// Export singleton instance
module.exports = new DatabaseCache();
