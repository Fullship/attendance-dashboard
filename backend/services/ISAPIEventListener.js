/**
 * @file ISAPIEventListener.js
 * @description HTTP Listening Mode (Local ISAPI) Event Listener for receiving real-time device events
 */

const express = require('express');
const { promisify } = require('util');
const pool = require('../config/database');

class ISAPIEventListener {
  constructor() {
    this.isListening = false;
    this.port = null;
    this.server = null;
    this.eventCounts = {
      received: 0,
      processed: 0,
      errors: 0
    };
    this.lastEventTime = null;
    this.credentials = null; // Basic auth credentials for device verification
    
    // Create express app for event listening
    this.app = express();
    this.setupRoutes();
  }

  /**
   * Setup HTTP routes for receiving ISAPI events
   */
  setupRoutes() {
    // Parse JSON and form data
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Basic auth middleware for device verification
    this.app.use(this.basicAuthMiddleware.bind(this));

    // Main event notification endpoint
    this.app.post('/ISAPI/Event/notification', this.handleEventNotification.bind(this));
    this.app.put('/ISAPI/Event/notification', this.handleEventNotification.bind(this));

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'listening',
        eventCounts: this.eventCounts,
        lastEventTime: this.lastEventTime,
        uptime: process.uptime()
      });
    });

    // Handle any other ISAPI endpoints
    this.app.all('/ISAPI/*', (req, res) => {
      console.log(`📥 ISAPI Request: ${req.method} ${req.path}`);
      console.log('📦 Headers:', req.headers);
      console.log('📄 Body:', req.body);
      
      // Return success for any ISAPI request
      res.status(200).json({ status: 'received' });
    });
  }

  /**
   * Basic authentication middleware
   */
  basicAuthMiddleware(req, res, next) {
    // If no credentials configured, allow all requests
    if (!this.credentials) {
      return next();
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="ISAPI Event Listener"');
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('ascii');
      const [username, password] = credentials.split(':');

      if (username === this.credentials.username && password === this.credentials.password) {
        return next();
      }
    } catch (error) {
      console.error('❌ Auth parsing error:', error);
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="ISAPI Event Listener"');
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  /**
   * Handle incoming event notifications
   */
  async handleEventNotification(req, res) {
    try {
      console.log(`📡 Event notification received: ${req.method} ${req.path}`);
      console.log('📦 Headers:', JSON.stringify(req.headers, null, 2));
      console.log('📄 Body:', JSON.stringify(req.body, null, 2));

      this.eventCounts.received++;
      this.lastEventTime = new Date().toISOString();

      // Extract event data
      const eventData = this.extractEventData(req.body);
      
      if (eventData) {
        // Process the event
        await this.processEvent(eventData);
        this.eventCounts.processed++;
        
        console.log('✅ Event processed successfully');
      } else {
        console.log('⚠️ No valid event data found in request');
      }

      // Always return 200 to acknowledge receipt
      res.status(200).json({
        status: 'received',
        timestamp: new Date().toISOString(),
        eventId: eventData?.eventId || 'unknown'
      });

    } catch (error) {
      console.error('❌ Error handling event notification:', error);
      this.eventCounts.errors++;
      
      // Still return 200 to acknowledge receipt
      res.status(200).json({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Extract event data from request body
   */
  extractEventData(body) {
    if (!body) return null;

    // Handle different event formats
    let eventInfo = null;

    // Format 1: EventNotificationAlert
    if (body.EventNotificationAlert) {
      eventInfo = body.EventNotificationAlert;
    }
    // Format 2: Direct event data
    else if (body.eventType || body.cardNo || body.time) {
      eventInfo = body;
    }
    // Format 3: Nested in other structures
    else if (body.Event) {
      eventInfo = body.Event;
    }

    if (!eventInfo) return null;

    // Extract common event fields
    return {
      eventId: eventInfo.eventId || `evt_${Date.now()}`,
      eventType: eventInfo.eventType || eventInfo.majorEventType || 'unknown',
      subEventType: eventInfo.subEventType || eventInfo.minorEventType || null,
      eventTime: eventInfo.time || eventInfo.dateTime || new Date().toISOString(),
      cardNumber: eventInfo.cardNo || eventInfo.cardNumber || null,
      employeeId: eventInfo.employeeNoString || eventInfo.employeeNo || null,
      doorId: eventInfo.doorId || null,
      doorName: eventInfo.doorName || null,
      deviceId: eventInfo.deviceId || null,
      deviceName: eventInfo.deviceName || null,
      deviceIP: eventInfo.ipAddress || null,
      rawData: eventInfo
    };
  }

  /**
   * Process and store event in database
   */
  async processEvent(eventData) {
    const client = await pool.connect();
    
    try {
      // Map event codes (example mappings - adjust based on your device)
      const eventTypeMapping = {
        '75001': 'card_swipe_in',
        '75002': 'card_swipe_out', 
        '75003': 'card_invalid',
        '75004': 'door_open',
        '75005': 'door_close',
        // Add more mappings as needed
      };

      const mappedEventType = eventTypeMapping[eventData.eventType] || eventData.eventType;

      // Insert event into external_events table (create if doesn't exist)
      const insertQuery = `
        INSERT INTO external_events (
          external_event_id,
          event_type,
          sub_event_type,
          event_time,
          card_number,
          employee_id,
          door_id,
          door_name,
          device_id,
          device_name,
          device_ip,
          mapped_event_type,
          raw_data,
          processed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        ON CONFLICT (external_event_id) DO NOTHING
        RETURNING id;
      `;

      const values = [
        eventData.eventId,
        eventData.eventType,
        eventData.subEventType,
        eventData.eventTime,
        eventData.cardNumber,
        eventData.employeeId,
        eventData.doorId,
        eventData.doorName,
        eventData.deviceId,
        eventData.deviceName,
        eventData.deviceIP,
        mappedEventType,
        JSON.stringify(eventData.rawData),
      ];

      const result = await client.query(insertQuery, values);
      
      if (result.rows.length > 0) {
        console.log(`💾 Event stored with ID: ${result.rows[0].id}`);
        
        // Try to match with existing employee and create attendance record
        await this.tryCreateAttendanceRecord(client, eventData, mappedEventType);
      } else {
        console.log('ℹ️ Event already exists in database');
      }

    } catch (error) {
      console.error('❌ Error processing event:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Try to create attendance record if employee is found
   */
  async tryCreateAttendanceRecord(client, eventData, mappedEventType) {
    try {
      // Try to find employee by card number or employee ID
      let employee = null;
      
      if (eventData.cardNumber) {
        const cardQuery = 'SELECT * FROM users WHERE card_number = $1 LIMIT 1';
        const cardResult = await client.query(cardQuery, [eventData.cardNumber]);
        employee = cardResult.rows[0];
      }

      if (!employee && eventData.employeeId) {
        const empQuery = 'SELECT * FROM users WHERE employee_id = $1 LIMIT 1';
        const empResult = await client.query(empQuery, [eventData.employeeId]);
        employee = empResult.rows[0];
      }

      if (employee && ['card_swipe_in', 'card_swipe_out'].includes(mappedEventType)) {
        // Create attendance record
        const attendanceQuery = `
          INSERT INTO attendance_records (
            user_id,
            clock_in_time,
            clock_out_time,
            source,
            external_event_id,
            created_at
          ) VALUES ($1, $2, $3, 'external_device', $4, NOW())
          ON CONFLICT DO NOTHING;
        `;

        const clockIn = mappedEventType === 'card_swipe_in' ? eventData.eventTime : null;
        const clockOut = mappedEventType === 'card_swipe_out' ? eventData.eventTime : null;

        await client.query(attendanceQuery, [
          employee.id,
          clockIn,
          clockOut,
          eventData.eventId
        ]);

        console.log(`📝 Attendance record created for employee: ${employee.first_name} ${employee.last_name}`);
      }

    } catch (error) {
      console.error('❌ Error creating attendance record:', error);
      // Don't throw - event is still stored even if attendance fails
    }
  }

  /**
   * Start listening for events
   */
  async startListening(port = 8080) {
    if (this.isListening) {
      throw new Error('Event listener is already running');
    }

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(port, (error) => {
        if (error) {
          reject(error);
        } else {
          this.isListening = true;
          this.port = port;
          console.log(`📡 ISAPI Event Listener started on port ${port}`);
          console.log(`🔗 Device should send events to: http://YOUR_SERVER_IP:${port}/ISAPI/Event/notification`);
          resolve({ port, status: 'listening' });
        }
      });
    });
  }

  /**
   * Stop listening for events
   */
  async stopListening() {
    if (!this.isListening || !this.server) {
      return { status: 'not_running' };
    }

    const closeServer = promisify(this.server.close.bind(this.server));
    await closeServer();
    
    this.isListening = false;
    this.port = null;
    this.server = null;
    
    console.log('🛑 ISAPI Event Listener stopped');
    return { status: 'stopped' };
  }

  /**
   * Update authentication credentials
   */
  updateCredentials(credentials) {
    this.credentials = credentials;
    console.log(`🔐 ISAPI listener credentials updated for user: ${credentials?.username || 'none'}`);
  }

  /**
   * Get listener status
   */
  getStatus() {
    return {
      isListening: this.isListening,
      port: this.port,
      eventCounts: this.eventCounts,
      lastEventTime: this.lastEventTime,
      hasCredentials: !!(this.credentials && this.credentials.username),
      uptime: this.isListening ? process.uptime() : 0
    };
  }

  /**
   * Reset event counters
   */
  resetCounters() {
    this.eventCounts = {
      received: 0,
      processed: 0,
      errors: 0
    };
    this.lastEventTime = null;
  }
}

module.exports = ISAPIEventListener;