# Datadog Monitoring Integration

## Overview

This attendance dashboard now includes comprehensive monitoring with Datadog Real User Monitoring (RUM) and Application Performance Monitoring (APM). The integration provides end-to-end observability from frontend user interactions to backend API performance.

## Features

### Frontend Monitoring (React)
- ✅ Real User Monitoring (RUM) with session replay
- ✅ Web Vitals tracking (CLS, FID, FCP, LCP, TTFB)
- ✅ Component performance monitoring
- ✅ Route change tracking
- ✅ API call monitoring with automatic correlation
- ✅ Error tracking and logging
- ✅ User action tracking
- ✅ File upload progress monitoring

### Backend Monitoring (Node.js)
- ✅ APM with distributed tracing
- ✅ Automatic HTTP request instrumentation
- ✅ Database query monitoring (PostgreSQL)
- ✅ Redis operation tracking
- ✅ Socket.IO instrumentation
- ✅ Custom business logic metrics
- ✅ Error tracking and correlation
- ✅ Performance profiling

## Setup Instructions

### 1. Backend Configuration

The backend is already configured with Datadog APM. Update the environment variables in `/backend/.env`:

```env
# Datadog Configuration
DD_API_KEY=your-datadog-api-key
DD_AGENT_HOST=localhost  # or your Datadog agent host
DD_SERVICE=attendance-dashboard-backend
DD_ENV=production  # or development/staging
DD_VERSION=1.0.0
DD_PROFILING_ENABLED=true
DD_TRACE_SAMPLE_RATE=1.0  # 100% for development, lower for production
DD_PROFILING_HEAPDUMP_ENABLED=false
DD_PROFILING_HEAP_ENABLED=true
```

### 2. Frontend Configuration

Update the environment variables in `/frontend/.env`:

```env
# Datadog RUM Configuration
REACT_APP_DD_APPLICATION_ID=your-datadog-application-id
REACT_APP_DD_CLIENT_TOKEN=your-datadog-client-token
REACT_APP_DD_SITE=datadoghq.com  # or datadoghq.eu, us3.datadoghq.com, etc.
REACT_APP_DD_ENV=production  # or development/staging
REACT_APP_VERSION=1.0.0

# Build metadata for tracking
REACT_APP_BUILD_HASH=prod-$(date +%s)
REACT_APP_BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
```

### 3. Datadog Agent Installation

Install the Datadog Agent on your server:

```bash
# On Ubuntu/Debian
DD_AGENT_MAJOR_VERSION=7 DD_API_KEY=your-api-key DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"

# On CentOS/RHEL
DD_AGENT_MAJOR_VERSION=7 DD_API_KEY=your-api-key DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"

# Start the agent
sudo systemctl start datadog-agent
sudo systemctl enable datadog-agent
```

### 4. Create Datadog Applications

1. **Backend APM Service**: Automatically created when the backend starts
2. **Frontend RUM Application**: Create in Datadog UI under Digital Experience > RUM Applications

## Usage Examples

### Frontend Monitoring

```typescript
import { useDatadogPerformance } from '../hooks/useDatadog';
import { PerformanceTracker } from '../utils/datadog';

// In a React component
const MyComponent = () => {
  const { trackUserAction, trackError } = useDatadogPerformance();

  const handleButtonClick = () => {
    trackUserAction('button-click', { buttonId: 'submit-form' });
    // ... button logic
  };

  const handleError = (error: Error) => {
    trackError(error, { component: 'MyComponent' });
  };

  // Use the monitored API service
  const uploadFile = async (file: File) => {
    try {
      await attendanceAPI.uploadAttendance(file, (progress) => {
        console.log(`Upload progress: ${progress}%`);
      });
    } catch (error) {
      handleError(error as Error);
    }
  };
};

// Performance HOC for component monitoring
export default withPerformanceTracking(MyComponent, 'MyComponent');
```

### Backend Monitoring

```javascript
// Custom instrumentation is automatically applied
const attendanceInstrumentation = require('./middleware/instrumentation');

// In routes
app.get('/api/attendance', attendanceInstrumentation.trackDatabaseQuery(async (req, res) => {
  const data = await db.query('SELECT * FROM attendance');
  res.json(data);
}));

// Custom metrics
attendanceInstrumentation.incrementCounter('attendance.uploads');
attendanceInstrumentation.recordHistogram('attendance.processing_time', processingTime);
```

### API Monitoring

```typescript
import { attendanceAPI } from '../utils/monitoredAPI';

// All API calls are automatically monitored
const fetchEmployees = async () => {
  try {
    const response = await attendanceAPI.getEmployees();
    return response.data;
  } catch (error) {
    // Error is automatically tracked
    console.error('Failed to fetch employees:', error);
    throw error;
  }
};
```

## Dashboard Setup

### Key Metrics to Monitor

1. **Frontend Performance**
   - Core Web Vitals (LCP, FID, CLS)
   - Page load times
   - Route change performance
   - Component render times
   - API response times

2. **Backend Performance**
   - Request throughput and latency
   - Database query performance
   - Error rates and types
   - Memory and CPU usage
   - Cache hit/miss rates

3. **Business Metrics**
   - Employee upload success rate
   - Data processing times
   - User session duration
   - Feature adoption rates

### Custom Dashboards

Create custom dashboards in Datadog for:

1. **Application Overview**
   - Service map showing frontend ↔ backend interactions
   - Overall health metrics
   - Error rate trends

2. **Performance Deep Dive**
   - Database query performance
   - API endpoint latencies
   - Frontend component performance

3. **Business Intelligence**
   - Upload success rates
   - User engagement metrics
   - Feature usage analytics

## Alerts Configuration

Set up alerts for:

- High error rates (> 5%)
- Slow API responses (> 2s)
- Database query timeouts
- Memory usage spikes
- Failed file uploads

## Troubleshooting

### Common Issues

1. **Missing RUM Data**
   - Verify `REACT_APP_DD_APPLICATION_ID` and `REACT_APP_DD_CLIENT_TOKEN`
   - Check browser console for Datadog errors
   - Ensure correct `REACT_APP_DD_SITE` for your region

2. **Missing APM Data**
   - Verify Datadog agent is running
   - Check `DD_API_KEY` is correct
   - Ensure agent can connect to Datadog (firewall/network)

3. **High Data Usage**
   - Adjust sampling rates in production
   - Use session replay selectively
   - Filter out noisy endpoints

### Debug Mode

Enable debug logging in development:

```env
# Backend
DD_DEBUG=true
DD_TRACE_DEBUG=true

# Frontend (browser console)
# Datadog automatically logs debug info in development
```

## Production Optimizations

1. **Sampling Configuration**
   ```javascript
   // Reduce sampling in production
   sessionSampleRate: 10,  // 10% of sessions
   sessionReplaySampleRate: 5,  // 5% for session replay
   ```

2. **Performance Budget**
   - Monitor bundle size impact
   - Use tree-shaking for Datadog modules
   - Consider async loading for non-critical monitoring

3. **Data Retention**
   - Configure appropriate retention periods
   - Set up data aggregation rules
   - Archive old traces if needed

## Cost Optimization

1. **Smart Sampling**: Higher rates in development, lower in production
2. **Selective Instrumentation**: Focus on critical user journeys
3. **Log Management**: Filter noisy logs, focus on errors and warnings
4. **Custom Metrics**: Track business-critical metrics, avoid over-instrumentation

## Security Considerations

- Never expose API keys in frontend code
- Use environment-specific configurations
- Implement data scrubbing for sensitive information
- Configure privacy settings appropriately

## Additional Resources

- [Datadog RUM Documentation](https://docs.datadoghq.com/real_user_monitoring/)
- [Datadog APM for Node.js](https://docs.datadoghq.com/tracing/setup_overview/setup/nodejs/)
- [Web Vitals Guide](https://web.dev/vitals/)
- [Performance Monitoring Best Practices](https://docs.datadoghq.com/tracing/guide/metrics_namespace/)
