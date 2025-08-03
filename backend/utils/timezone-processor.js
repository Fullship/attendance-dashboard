// Enhanced Timezone-Aware Attendance Processing
// This module handles timezone separation and validation for attendance uploads

const moment = require('moment-timezone');

class TimezoneAttendanceProcessor {
  constructor() {
    this.locationTimezones = new Map();
    this.employeeLocations = new Map();
  }

  // Initialize location and employee timezone mappings
  async initialize(pool) {
    try {
      // Load all locations with their timezones
      const locationsResult = await pool.query(`
        SELECT id, name, timezone, address 
        FROM locations 
        WHERE is_active = true
      `);
      
      locationsResult.rows.forEach(location => {
        this.locationTimezones.set(location.id, {
          id: location.id,
          name: location.name,
          timezone: location.timezone,
          address: location.address
        });
      });

      // Load employee-location mappings
      const employeesResult = await pool.query(`
        SELECT u.id, u.email, u.first_name, u.last_name, u.location_id, l.timezone
        FROM users u
        LEFT JOIN locations l ON u.location_id = l.id
        WHERE u.is_admin = false
      `);

      employeesResult.rows.forEach(employee => {
        this.employeeLocations.set(employee.id, {
          locationId: employee.location_id,
          timezone: employee.timezone || 'UTC',
          employeeInfo: {
            id: employee.id,
            email: employee.email,
            firstName: employee.first_name,
            lastName: employee.last_name
          }
        });
      });

      console.log(`Initialized timezone processor with ${this.locationTimezones.size} locations and ${this.employeeLocations.size} employees`);
      return true;
    } catch (error) {
      console.error('Failed to initialize timezone processor:', error);
      return false;
    }
  }

  // Validate and convert timestamp to employee's local timezone
  validateAndConvertTimestamp(timestamp, employeeId, recordContext = {}) {
    const validation = {
      isValid: false,
      originalTimestamp: timestamp,
      convertedTimestamp: null,
      timezone: null,
      locationId: null,
      warnings: [],
      errors: []
    };

    try {
      // Get employee's timezone information
      const employeeInfo = this.employeeLocations.get(employeeId);
      if (!employeeInfo) {
        validation.errors.push('Employee not found or not assigned to a location');
        return validation;
      }

      validation.timezone = employeeInfo.timezone;
      validation.locationId = employeeInfo.locationId;

      // Parse timestamp - try multiple formats
      let parsedMoment = null;
      const timestampFormats = [
        'YYYY-MM-DD HH:mm:ss',
        'DD/MM/YYYY HH:mm:ss',
        'MM/DD/YYYY HH:mm:ss',
        'YYYY-MM-DD HH:mm',
        'DD/MM/YYYY HH:mm',
        'MM/DD/YYYY HH:mm',
        'YYYY-MM-DDTHH:mm:ss',
        'YYYY-MM-DDTHH:mm:ssZ'
      ];

      for (const format of timestampFormats) {
        parsedMoment = moment.tz(timestamp, format, employeeInfo.timezone);
        if (parsedMoment.isValid()) {
          break;
        }
      }

      // If no format worked, try auto-parsing in the employee's timezone
      if (!parsedMoment || !parsedMoment.isValid()) {
        parsedMoment = moment.tz(timestamp, employeeInfo.timezone);
      }

      if (!parsedMoment.isValid()) {
        validation.errors.push(`Invalid timestamp format: ${timestamp}`);
        return validation;
      }

      // Convert to UTC for database storage
      validation.convertedTimestamp = parsedMoment.utc().format('YYYY-MM-DD HH:mm:ss');
      validation.isValid = true;

      // Add contextual validations
      this.addContextualValidations(parsedMoment, employeeInfo, validation, recordContext);

      return validation;
    } catch (error) {
      validation.errors.push(`Timestamp processing error: ${error.message}`);
      return validation;
    }
  }

  // Add business rule validations based on location and time
  addContextualValidations(momentInLocalTime, employeeInfo, validation, recordContext) {
    const hour = momentInLocalTime.hour();
    const dayOfWeek = momentInLocalTime.day(); // 0 = Sunday, 6 = Saturday
    const locationInfo = this.locationTimezones.get(employeeInfo.locationId);

    // Weekend validation for Middle East locations
    if (locationInfo && this.isMiddleEastLocation(locationInfo.timezone)) {
      // Friday = 5, Saturday = 6 in moment.js (0 = Sunday)
      if (dayOfWeek === 5 || dayOfWeek === 6) {
        validation.warnings.push(`Record on weekend (${momentInLocalTime.format('dddd')}) for Middle East location`);
      }
    } else {
      // Standard weekend for other locations
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        validation.warnings.push(`Record on weekend (${momentInLocalTime.format('dddd')})`);
      }
    }

    // Late night / early morning validation
    if (hour < 6 || hour > 22) {
      validation.warnings.push(`Unusual work hour: ${momentInLocalTime.format('HH:mm')} local time`);
    }

    // Add local time information for reference
    validation.localTime = momentInLocalTime.format('YYYY-MM-DD HH:mm:ss');
    validation.localTimezone = locationInfo ? locationInfo.timezone : 'Unknown';
    validation.dayOfWeek = momentInLocalTime.format('dddd');
  }

  // Check if location is in Middle East (different weekend)
  isMiddleEastLocation(timezone) {
    const middleEastTimezones = [
      'Asia/Baghdad', 'Asia/Dubai', 'Asia/Kuwait', 'Asia/Riyadh',
      'Asia/Qatar', 'Asia/Bahrain', 'Asia/Muscat', 'Asia/Tehran',
      'Asia/Istanbul', 'Asia/Jerusalem', 'Asia/Beirut', 'Asia/Damascus',
      'Asia/Amman', 'Africa/Cairo', 'Asia/Aden'
    ];
    return middleEastTimezones.includes(timezone);
  }

  // Process attendance record with timezone awareness
  async processAttendanceRecord(record, pool) {
    const result = {
      success: false,
      employeeId: null,
      validations: {},
      processedRecord: null,
      errors: [],
      warnings: []
    };

    try {
      // Find employee (existing logic)
      const employeeId = await this.findEmployee(record);
      if (!employeeId) {
        result.errors.push('Employee not found');
        return result;
      }

      result.employeeId = employeeId;

      // Validate clock in time
      if (record.clock_in || record['Clock In'] || record.clockIn) {
        const clockInTime = record.clock_in || record['Clock In'] || record.clockIn;
        result.validations.clockIn = this.validateAndConvertTimestamp(
          clockInTime, 
          employeeId, 
          { type: 'clock_in', date: record.date || record.Date }
        );
      }

      // Validate clock out time
      if (record.clock_out || record['Clock Out'] || record.clockOut) {
        const clockOutTime = record.clock_out || record['Clock Out'] || record.clockOut;
        result.validations.clockOut = this.validateAndConvertTimestamp(
          clockOutTime, 
          employeeId, 
          { type: 'clock_out', date: record.date || record.Date }
        );
      }

      // Create processed record for database insertion
      if (result.validations.clockIn?.isValid && result.validations.clockOut?.isValid) {
        result.processedRecord = {
          user_id: employeeId,
          date: moment(result.validations.clockIn.convertedTimestamp).format('YYYY-MM-DD'),
          clock_in: result.validations.clockIn.convertedTimestamp,
          clock_out: result.validations.clockOut.convertedTimestamp,
          timezone: result.validations.clockIn.timezone,
          location_id: result.validations.clockIn.locationId
        };

        // Calculate worked hours
        const clockIn = moment.utc(result.validations.clockIn.convertedTimestamp);
        const clockOut = moment.utc(result.validations.clockOut.convertedTimestamp);
        result.processedRecord.worked_hours = clockOut.diff(clockIn, 'hours', true);

        result.success = true;
      }

      // Collect all warnings and errors
      Object.values(result.validations).forEach(validation => {
        result.warnings.push(...validation.warnings);
        result.errors.push(...validation.errors);
      });

      return result;
    } catch (error) {
      result.errors.push(`Processing error: ${error.message}`);
      return result;
    }
  }

  // Get timezone summary for all locations
  getTimezoneLocationSummary() {
    const summary = {
      totalLocations: this.locationTimezones.size,
      timezoneGroups: {},
      locations: []
    };

    this.locationTimezones.forEach((location, locationId) => {
      const locationData = {
        id: locationId,
        name: location.name,
        timezone: location.timezone,
        currentTime: moment.tz(location.timezone).format('YYYY-MM-DD HH:mm:ss'),
        utcOffset: moment.tz(location.timezone).format('Z'),
        employeeCount: 0
      };

      // Count employees in this location
      this.employeeLocations.forEach(employee => {
        if (employee.locationId === locationId) {
          locationData.employeeCount++;
        }
      });

      summary.locations.push(locationData);

      // Group by timezone
      if (!summary.timezoneGroups[location.timezone]) {
        summary.timezoneGroups[location.timezone] = {
          timezone: location.timezone,
          locations: [],
          totalEmployees: 0
        };
      }
      summary.timezoneGroups[location.timezone].locations.push(locationData);
      summary.timezoneGroups[location.timezone].totalEmployees += locationData.employeeCount;
    });

    return summary;
  }

  // Helper method to find employee (simplified - integrate with existing logic)
  async findEmployee(record) {
    // This would integrate with the existing employee finding logic
    // For now, return a placeholder
    return null;
  }
}

module.exports = { TimezoneAttendanceProcessor };
