/**
 * Cloud ISAPI Event Listener
 * Receives events from Hikvision devices and forwards them to local attendance dashboard
 */

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 8080;

// Configuration
const config = {
  localServer: {
    url: process.env.LOCAL_SERVER_URL || 'http://192.168.1.152:3002',
    endpoint: '/api/admin/external-events/cloud-webhook',
    apiKey: process.env.LOCAL_API_KEY || 'your-api-key'
  },
  auth: {
    username: process.env.BASIC_AUTH_USERNAME || 'admin',
    password: process.env.BASIC_AUTH_PASSWORD || 'admin123'
  }
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Statistics tracking
const stats = {
  events: {
    received: 0,
    forwarded: 0,
    errors: 0
  },
  startTime: new Date(),
  lastEvent: null
};

// Basic auth middleware (optional)
const basicAuth = (req, res, next) => {
  if (!process.env.ENABLE_AUTH) {
    return next();
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="ISAPI Cloud Listener"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    if (username === config.auth.username && password === config.auth.password) {
      return next();
    }
  } catch (error) {
    console.error('Auth parsing error:', error);
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="ISAPI Cloud Listener"');
  return res.status(401).json({ error: 'Invalid credentials' });
};

// Health check endpoint
app.get('/health', (req, res) => {
  const uptime = Date.now() - stats.startTime.getTime();
  
  res.json({
    status: 'healthy',
    uptime: Math.floor(uptime / 1000),
    stats: {
      ...stats.events,
      lastEvent: stats.lastEvent,
      successRate: stats.events.received > 0 ? 
        ((stats.events.forwarded / stats.events.received) * 100).toFixed(2) : 100
    },
    config: {
      localServerConfigured: !!config.localServer.url,
      authEnabled: !!process.env.ENABLE_AUTH
    },
    timestamp: new Date().toISOString()
  });
});

// Main ISAPI event endpoint
app.post('/ISAPI/Event/notification', basicAuth, async (req, res) => {
  const startTime = Date.now();
  const eventId = req.body?.EventNotificationAlert?.eventId || 
                  req.body?.eventId || 
                  `cloud_${Date.now()}`;

  try {
    console.log(`📡 [${new Date().toISOString()}] Event received: ${eventId}`);
    console.log('📦 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📄 Body:', JSON.stringify(req.body, null, 2));

    stats.events.received++;
    stats.lastEvent = new Date().toISOString();

    // Extract and enhance event data
    const eventData = extractEventData(req.body);
    const enhancedEvent = {
      ...eventData,
      metadata: {
        receivedAt: new Date().toISOString(),
        sourceIP: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        cloudProcessed: true
      }
    };

    // Forward to local server
    const forwardResult = await forwardToLocalServer(enhancedEvent);
    
    if (forwardResult.success) {
      stats.events.forwarded++;
      console.log(`✅ Event ${eventId} forwarded successfully`);
    } else {
      stats.events.errors++;
      console.error(`❌ Failed to forward event ${eventId}:`, forwardResult.error);
    }

    // Always return success to device (to prevent retries)
    res.status(200).json({
      status: 'received',
      eventId: eventId,
      timestamp: new Date().toISOString(),
      processed: forwardResult.success,
      processingTime: Date.now() - startTime
    });

  } catch (error) {
    stats.events.errors++;
    console.error(`💥 Error processing event ${eventId}:`, error);
    
    // Still return 200 to prevent device retries
    res.status(200).json({
      status: 'error',
      eventId: eventId,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ISAPI AccessControl Event Search endpoint (for Hikvision AcsEvent queries)
app.post('/ISAPI/AccessControl/AcsEvent', basicAuth, async (req, res) => {
  const startTime = Date.now();
  const searchId = req.body?.AcsEventCond?.searchID || `search_${Date.now()}`;

  try {
    console.log(`🔍 [${new Date().toISOString()}] AcsEvent query received: ${searchId}`);
    console.log('📦 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📄 Body:', JSON.stringify(req.body, null, 2));

    stats.events.received++;
    stats.lastEvent = new Date().toISOString();

    // Extract search parameters
    const searchCond = req.body?.AcsEventCond || {};
    
    // Forward search request to local server
    const forwardResult = await forwardToLocalServer({
      type: 'acsEvent_search',
      searchId: searchId,
      searchCondition: searchCond,
      metadata: {
        receivedAt: new Date().toISOString(),
        sourceIP: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        cloudProcessed: true
      }
    });

    if (forwardResult.success) {
      stats.events.forwarded++;
      console.log(`✅ AcsEvent search ${searchId} forwarded successfully`);
    } else {
      stats.events.errors++;
      console.error(`❌ Failed to forward AcsEvent search ${searchId}:`, forwardResult.error);
    }

    // Return mock response in expected format
    res.status(200).json({
      AcsEventSearchResult: {
        searchID: searchId,
        responseStatusStrg: "OK",
        numOfMatches: 0,
        totalMatches: 0,
        EventList: {
          Event: []
        }
      }
    });

  } catch (error) {
    stats.events.errors++;
    console.error(`💥 Error processing AcsEvent search ${searchId}:`, error);
    
    res.status(200).json({
      AcsEventSearchResult: {
        searchID: searchId,
        responseStatusStrg: "ERROR",
        numOfMatches: 0,
        totalMatches: 0,
        EventList: {
          Event: []
        }
      }
    });
  }
});

// Handle HTTP Hosts validation (for device configuration validation)
app.put('/ISAPI/Event/notification/httpHosts/:id', basicAuth, (req, res) => {
  console.log(`🔧 HTTP Host validation request for ID: ${req.params.id}`);
  console.log('📦 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('📄 Body:', JSON.stringify(req.body, null, 2));
  
  // Return success for device validation
  res.status(200).json({
    responseStatus: "OK",
    responseStatusStrg: "OK"
  });
});

// Handle HTTP Hosts GET requests
app.get('/ISAPI/Event/notification/httpHosts/:id', basicAuth, (req, res) => {
  console.log(`🔧 HTTP Host info request for ID: ${req.params.id}`);
  
  res.status(200).json({
    HttpHostNotification: {
      id: req.params.id,
      url: `http://isapi-cloud-production.up.railway.app/ISAPI/AccessControl/AcsEvent?format=json`,
      protocolType: "HTTP",
      parameterFormatType: "JSON",
      addressingFormatType: "url",
      httpAuthenticationMethod: "none"
    }
  });
});

// Handle any other ISAPI endpoints
app.all('/ISAPI/*', basicAuth, (req, res) => {
  console.log(`📥 ISAPI Request: ${req.method} ${req.path}`);
  console.log('📦 Headers:', req.headers);
  
  if (req.body) {
    console.log('📄 Body:', req.body);
  }
  
  res.status(200).json({ status: 'acknowledged' });
});

// Statistics endpoint
app.get('/stats', (req, res) => {
  const uptime = Date.now() - stats.startTime.getTime();
  
  res.json({
    uptime: {
      seconds: Math.floor(uptime / 1000),
      human: formatUptime(uptime)
    },
    events: stats.events,
    rates: {
      eventsPerHour: stats.events.received > 0 ? 
        Math.round((stats.events.received / (uptime / 1000)) * 3600) : 0,
      successRate: stats.events.received > 0 ? 
        ((stats.events.forwarded / stats.events.received) * 100).toFixed(2) : 100
    },
    lastEvent: stats.lastEvent,
    timestamp: new Date().toISOString()
  });
});

// Extract event data from request body
function extractEventData(body) {
  if (!body) return null;

  let eventInfo = null;

  // Handle different event formats
  if (body.EventNotificationAlert) {
    eventInfo = body.EventNotificationAlert;
  } else if (body.eventType || body.cardNo || body.time) {
    eventInfo = body;
  } else if (body.Event) {
    eventInfo = body.Event;
  }

  if (!eventInfo) return body; // Return original if no known format

  return {
    eventId: eventInfo.eventId || `cloud_${Date.now()}`,
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

// Forward event to local server
async function forwardToLocalServer(eventData) {
  if (!config.localServer.url) {
    console.log('📝 Local server not configured, storing event locally');
    return { success: true, stored: 'local' };
  }

  try {
    const response = await axios.post(
      `${config.localServer.url}${config.localServer.endpoint}`,
      {
        event: eventData,
        source: 'cloud-isapi-listener',
        timestamp: new Date().toISOString()
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.localServer.apiKey}`,
          'X-Source': 'cloud-isapi-listener'
        },
        timeout: 10000 // 10 seconds timeout
      }
    );

    return { 
      success: true, 
      response: response.data,
      status: response.status 
    };

  } catch (error) {
    console.error('🔗 Local server forward error:', error.message);
    
    return { 
      success: false, 
      error: error.message,
      code: error.code,
      status: error.response?.status
    };
  }
}

// Format uptime in human readable format
function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Cloud ISAPI Event Listener Started');
  console.log('=====================================');
  console.log(`🌐 Server: http://0.0.0.0:${PORT}`);
  console.log(`📡 ISAPI Endpoint: http://0.0.0.0:${PORT}/ISAPI/Event/notification`);
  console.log(`❤️  Health Check: http://0.0.0.0:${PORT}/health`);
  console.log(`📊 Statistics: http://0.0.0.0:${PORT}/stats`);
  console.log('=====================================');
  
  if (config.localServer.url) {
    console.log(`🔗 Local Server: ${config.localServer.url}${config.localServer.endpoint}`);
  } else {
    console.log('⚠️  No local server configured - events will be logged only');
  }
  
  console.log('🎯 Ready to receive events from Hikvision devices!');
});

module.exports = app;