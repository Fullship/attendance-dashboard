/**
 * @file AccessControlAPI.js
 * @description External Access Control System API client for fetching clock-in/out events
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class AccessControlAPI {
  constructor(credentials = null) {
    this.baseURL = 'http://37.156.107.108:43821';
    this.timeout = 30000; // 30 seconds timeout
    this.credentials = credentials; // { username, password }
    
    // Create axios instance with default config
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Add Digest Authentication if credentials are provided
    if (this.credentials && this.credentials.username && this.credentials.password) {
      this.client.defaults.auth = {
        username: this.credentials.username,
        password: this.credentials.password
      };
    }

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🔄 External API Request: ${config.method?.toUpperCase()} ${config.url}`);
        console.log(`📤 Request Data:`, JSON.stringify(config.data, null, 2));
        return config;
      },
      (error) => {
        console.error('❌ External API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ External API Response: ${response.status} ${response.statusText}`);
        console.log(`📥 Response Data:`, JSON.stringify(response.data, null, 2));
        return response;
      },
      (error) => {
        console.error('❌ External API Response Error:', error.response?.status, error.response?.statusText);
        console.error('📥 Error Data:', error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Fetch access control events for a specific date range
   * @param {string} startDate - Start date in ISO format (e.g., "2025-08-11T00:00:00+03:00")
   * @param {string} endDate - End date in ISO format (e.g., "2025-08-11T23:59:59+03:00")
   * @param {Object} options - Additional options
   * @param {number} options.maxResults - Maximum number of results (default: 240)
   * @param {number} options.searchResultPosition - Starting position (default: 0)
   * @param {number} options.major - Major version (default: 0)
   * @param {number} options.minor - Minor version (default: 0)
   * @returns {Promise<Object>} Access control events data
   */
  async fetchAccessEvents(startDate, endDate, options = {}) {
    try {
      const {
        maxResults = 240,
        searchResultPosition = 0,
        major = 0,
        minor = 0
      } = options;

      // Generate unique search ID for this request
      const searchID = uuidv4();

      const requestBody = {
        AcsEventCond: {
          searchID,
          searchResultPosition,
          maxResults,
          major,
          minor,
          startTime: startDate,
          endTime: endDate
        }
      };

      console.log(`🎯 Fetching access events from ${startDate} to ${endDate}`);
      console.log(`🔍 Search ID: ${searchID}, Max Results: ${maxResults}`);

      const response = await this.client.post('/ISAPI/AccessControl/AcsEvent?format=json', requestBody);

      return {
        success: true,
        searchID,
        data: response.data,
        totalResults: response.data?.AcsEvent?.totalMatches || 0,
        events: response.data?.AcsEvent?.InfoList || [],
        requestInfo: {
          startDate,
          endDate,
          maxResults,
          searchResultPosition
        }
      };

    } catch (error) {
      console.error('❌ Failed to fetch access events:', error.message);
      
      return {
        success: false,
        error: {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        },
        requestInfo: {
          startDate,
          endDate,
          maxResults: options.maxResults || 240,
          searchResultPosition: options.searchResultPosition || 0
        }
      };
    }
  }

  /**
   * Fetch access events for a specific date (convenience method)
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} timezone - Timezone offset (default: "+03:00")
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Access control events data
   */
  async fetchDayEvents(date, timezone = '+03:00', options = {}) {
    const startDate = `${date}T00:00:00${timezone}`;
    const endDate = `${date}T23:59:59${timezone}`;
    
    return this.fetchAccessEvents(startDate, endDate, options);
  }

  /**
   * Fetch access events for a date range (convenience method)
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @param {string} timezone - Timezone offset (default: "+03:00")
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Access control events data
   */
  async fetchDateRangeEvents(startDate, endDate, timezone = '+03:00', options = {}) {
    const start = `${startDate}T00:00:00${timezone}`;
    const end = `${endDate}T23:59:59${timezone}`;
    
    return this.fetchAccessEvents(start, end, options);
  }

  /**
   * Test the API connection
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection() {
    try {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      
      console.log('🧪 Testing external API connection...');
      
      const result = await this.fetchDayEvents(dateStr, '+03:00', { maxResults: 1 });
      
      if (result.success) {
        console.log('✅ External API connection successful');
        return {
          success: true,
          message: 'Connection successful',
          responseTime: Date.now(),
          hasData: result.events.length > 0
        };
      } else {
        console.log('❌ External API connection failed');
        return {
          success: false,
          message: 'Connection failed',
          error: result.error
        };
      }
    } catch (error) {
      console.error('❌ API connection test failed:', error.message);
      return {
        success: false,
        message: 'Connection test failed',
        error: error.message
      };
    }
  }

  /**
   * Transform external API events to internal format
   * @param {Array} events - Raw events from external API
   * @returns {Array} Transformed events
   */
  transformEvents(events) {
    if (!Array.isArray(events)) {
      return [];
    }

    return events.map(event => ({
      // External event data
      externalId: event.cardNo || event.employeeNoString || null,
      externalEventId: event.eventId || null,
      eventTime: event.time || null,
      eventType: event.eventType || null,
      doorId: event.doorId || null,
      doorName: event.doorName || null,
      deviceId: event.deviceId || null,
      deviceName: event.deviceName || null,
      
      // Standardized fields
      cardNumber: event.cardNo || null,
      employeeId: event.employeeNoString || null,
      timestamp: event.time || null,
      eventDescription: event.eventType || 'Unknown',
      location: event.doorName || event.deviceName || 'Unknown Location',
      
      // Raw data for debugging
      rawData: event
    }));
  }

  /**
   * Update API credentials for Digest Authentication
   * @param {Object} credentials - { username, password }
   */
  updateCredentials(credentials) {
    this.credentials = credentials;
    
    if (credentials && credentials.username && credentials.password) {
      this.client.defaults.auth = {
        username: credentials.username,
        password: credentials.password
      };
      console.log(`🔐 External API credentials updated for user: ${credentials.username}`);
    } else {
      delete this.client.defaults.auth;
      console.log('🔓 External API credentials cleared');
    }
  }

  /**
   * Get API status and configuration
   * @returns {Object} API status information
   */
  getStatus() {
    return {
      baseURL: this.baseURL,
      timeout: this.timeout,
      ready: true,
      hasCredentials: !!(this.credentials && this.credentials.username),
      username: this.credentials?.username || null,
      lastRequestTime: this.lastRequestTime || null
    };
  }
}

module.exports = AccessControlAPI;