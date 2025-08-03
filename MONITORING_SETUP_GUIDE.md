# 📊 Comprehensive Monitoring Setup Guide

This guide provides detailed instructions for setting up advanced monitoring for the attendance dashboard with Datadog dashboards and alerts.

## 🎯 Monitoring Overview

### Key Metrics Tracked
- **95th Percentile API Latency**: Sub-500ms target for optimal user experience
- **Time to First Byte (TTFB)**: Sub-800ms target for fast page loads  
- **Memory Usage**: Monitor for leaks and optimization opportunities
- **Error Rates**: Track application stability and user impact
- **Core Web Vitals**: Google's performance metrics (LCP, FID, CLS)
- **Database Performance**: Query optimization and bottleneck identification
- **Business Metrics**: File upload success rates, user engagement

## 🚀 Quick Start Deployment

### Prerequisites
```bash
# Install required tools
brew install terraform jq curl  # macOS
# OR
sudo apt-get install terraform jq curl  # Ubuntu/Debian
```

### Get Datadog Keys
1. **API Key**: Visit [Datadog Organization Settings → API Keys](https://app.datadoghq.com/organization-settings/api-keys)
2. **Application Key**: Visit [Datadog Organization Settings → Application Keys](https://app.datadoghq.com/organization-settings/application-keys)

### Deploy Monitoring
```bash
# Set environment variables
export DATADOG_API_KEY="your-datadog-api-key"
export DATADOG_APP_KEY="your-datadog-app-key" 
export ENVIRONMENT="production"  # or development/staging

# Deploy monitoring infrastructure
./deploy-monitoring.sh
```

## 📈 Dashboard Configuration Details

### Main Dashboard Sections

#### 1. Application Health Overview
- **95p API Latency**: Real-time response time monitoring
- **95p TTFB**: Frontend loading performance
- **Memory Usage**: Server resource utilization
- **Error Rate**: Application stability indicator

#### 2. Backend Performance Metrics
- **Response Latency Charts**: 95p and 99p percentile tracking
- **Request Throughput**: Traffic volume monitoring
- **Memory Usage Over Time**: Trend analysis for optimization
- **Error Rate Trends**: Failure pattern identification

#### 3. Frontend Performance (RUM)
- **Time to First Byte**: Server response performance
- **Core Web Vitals**: LCP, FID, CLS tracking
- **Cumulative Layout Shift**: Visual stability monitoring
- **User Interaction Rate**: Engagement metrics

#### 4. Database & Infrastructure
- **Database Query Performance**: 95p query latency
- **Redis Memory Usage**: Cache optimization tracking
- **CPU Usage**: Server performance monitoring
- **Slowest API Endpoints**: Performance bottleneck identification

#### 5. Business Metrics
- **File Upload Success/Failure**: Core functionality monitoring
- **Data Processing Time**: Efficiency tracking
- **Active User Sessions**: Usage analytics
- **Records Processed**: Throughput measurement

## 🚨 Alert Configuration Details

### Critical Alerts (P0 - Immediate Response)

#### 1. Service Unavailability
```yaml
Condition: HTTP health check fails for 3+ minutes
Impact: Complete service outage
Response: Immediate escalation to on-call engineer
SLA: <5 minutes response time
```

#### 2. High API Latency (>500ms)
```yaml
Condition: 95p latency exceeds 500ms for 5 minutes
Impact: Poor user experience, potential SLA breach
Response: Check server load, database performance
SLA: <15 minutes resolution
```

### High Priority Alerts (P1 - 30min Response)

#### 3. High Memory Usage (>256MB)
```yaml
Condition: Process memory exceeds 256MB for 10 minutes
Impact: Potential service instability, memory leaks
Response: Memory analysis, potential process restart
Actions: Heap dumps, garbage collection review
```

#### 4. High Error Rate (>5%)
```yaml
Condition: Error rate exceeds 5% for 10 minutes
Impact: Users experiencing application failures
Response: Log analysis, recent deployment review
Escalation: Engineering team after 1 hour
```

### Medium Priority Alerts (P2 - 1hr Response)

#### 5. Poor TTFB Performance (>800ms)
```yaml
Condition: Frontend TTFB exceeds 800ms for 10 minutes
Impact: Slow page loads, poor user experience
Response: Backend latency check, CDN verification
Focus: Network and server optimization
```

#### 6. Slow Database Queries (>200ms)
```yaml
Condition: 95p query time exceeds 200ms for 15 minutes
Impact: Application slowdown, user frustration
Response: Query optimization, index analysis
Tools: EXPLAIN ANALYZE, query profiling
```

### Business Critical Alerts

#### 7. File Upload Failure Rate (>10%)
```yaml
Condition: Upload failures exceed 10% for 15 minutes
Impact: Core business functionality impaired
Response: File system check, validation logic review
Stakeholders: Product team, support team
```

## 🎛️ Alert Notification Channels

### Slack Integration
```json
{
  "channel": "#alerts-critical",
  "webhook_url": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
  "username": "Datadog Alerts",
  "icon_emoji": ":exclamation:"
}
```

### PagerDuty Integration
```json
{
  "service_key": "your-pagerduty-service-key",
  "escalation_policies": {
    "P0": "immediate",
    "P1": "high-priority", 
    "P2": "standard"
  }
}
```

### Email Notifications
```json
{
  "recipients": [
    "on-call@company.com",
    "engineering-team@company.com"
  ],
  "subject_template": "[{{env}}] {{alert_name}} - {{status}}"
}
```

## 📊 Custom Metrics Implementation

### Backend Custom Metrics
```javascript
// In your Node.js application
const tracer = require('dd-trace').init();

// Custom business metrics
tracer.increment('attendance.upload.success', 1, ['file_type:csv']);
tracer.histogram('attendance.processing.time', processingTime, ['operation:bulk_insert']);
tracer.gauge('attendance.active_sessions', activeSessionCount);

// Custom APM spans
const span = tracer.startSpan('attendance.data.processing');
span.setTag('file_size', fileSize);
span.setTag('record_count', recordCount);
// ... processing logic
span.finish();
```

### Frontend Custom Metrics
```javascript
// In your React application
import { datadogRum } from '@datadog/browser-rum';

// Track user actions
datadogRum.addAction('file-upload-initiated', {
  file_size: file.size,
  file_type: file.type,
  user_role: userRole
});

// Track performance
datadogRum.addTiming('component-render-time', renderDuration);

// Track errors with context
datadogRum.addError(error, {
  component: 'FileUpload',
  user_action: 'submit_attendance'
});
```

## 🛠️ Dashboard Customization

### Adding Custom Widgets

#### Performance Comparison Widget
```json
{
  "definition": {
    "type": "timeseries",
    "title": "Response Time vs Last Week",
    "requests": [
      {
        "q": "avg:trace.express.request.duration{service:attendance-dashboard}",
        "display_type": "line",
        "style": {"palette": "dog_classic"}
      },
      {
        "q": "week_before(avg:trace.express.request.duration{service:attendance-dashboard})",
        "display_type": "line", 
        "style": {"palette": "grey"}
      }
    ]
  }
}
```

#### SLA Compliance Widget
```json
{
  "definition": {
    "type": "slo",
    "title": "API Response Time SLA",
    "slo_id": "your-slo-id",
    "view_type": "detail",
    "time_windows": ["7d", "30d", "90d"]
  }
}
```

## 📋 SLA Configuration

### Service Level Objectives (SLOs)
```yaml
API Response Time SLO:
  Target: 95% of requests < 200ms
  Measurement: 30-day rolling window
  Error Budget: 5% (allows 36 hours downtime/month)

Availability SLO:
  Target: 99.9% uptime
  Measurement: Monthly
  Error Budget: 43 minutes downtime/month

Error Rate SLO:
  Target: <1% error rate
  Measurement: 7-day rolling window
  Error Budget: 1% of all requests
```

## 🔧 Maintenance and Optimization

### Weekly Tasks
- [ ] Review alert noise and adjust thresholds
- [ ] Analyze performance trends and identify optimization opportunities
- [ ] Update dashboard with new business metrics
- [ ] Test alert notification channels

### Monthly Tasks
- [ ] Review SLA compliance and adjust targets
- [ ] Analyze cost optimization opportunities
- [ ] Update monitoring documentation
- [ ] Conduct monitoring effectiveness review

### Quarterly Tasks
- [ ] Review monitoring strategy alignment with business goals
- [ ] Evaluate new monitoring tools and features
- [ ] Conduct incident response drills
- [ ] Update monitoring budget and projections

## 🔍 Troubleshooting Common Issues

### High Memory Usage Investigation
```bash
# Generate Node.js heap dump
kill -USR2 $(pgrep -f attendance-dashboard)

# Analyze with Chrome DevTools
node --inspect-brk=0.0.0.0:9229 server.js

# Monitor garbage collection
node --trace-gc server.js

# PM2 memory monitoring
pm2 monit
```

### Database Performance Issues
```sql
-- Find slowest queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC LIMIT 10;

-- Check index usage
SELECT schemaname,tablename,attname,n_distinct,correlation 
FROM pg_stats WHERE schemaname = 'public';

-- Monitor active connections
SELECT state, count(*) 
FROM pg_stat_activity 
GROUP BY state;
```

### Frontend Performance Debugging
```javascript
// Performance measurement
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(`${entry.name}: ${entry.duration}ms`);
  }
});
observer.observe({entryTypes: ['measure', 'navigation']});

// Bundle analysis
npm run build -- --analyze

// Core Web Vitals debugging
import {getCLS, getFID, getFCP, getLCP, getTTFB} from 'web-vitals';
getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

## 📚 Additional Resources

### Documentation Links
- [Datadog APM Best Practices](https://docs.datadoghq.com/tracing/guide/)
- [RUM Setup Guide](https://docs.datadoghq.com/real_user_monitoring/guide/)
- [Alert Management](https://docs.datadoghq.com/monitors/guide/)
- [Dashboard Best Practices](https://docs.datadoghq.com/dashboards/guide/)

### Performance Optimization Guides
- [Node.js Performance Monitoring](https://docs.datadoghq.com/tracing/setup_overview/setup/nodejs/)
- [React Performance Monitoring](https://docs.datadoghq.com/real_user_monitoring/guide/setup-rum-deployment-tracking/)
- [Database Query Optimization](https://docs.datadoghq.com/database_monitoring/)
- [Infrastructure Monitoring](https://docs.datadoghq.com/infrastructure/)

### Community Resources
- [Datadog Community Forum](https://community.datadoghq.com/)
- [Performance Monitoring Best Practices](https://www.datadoghq.com/blog/monitoring-101-collecting-data/)
- [SRE Monitoring Principles](https://sre.google/sre-book/monitoring-distributed-systems/)

---

**Need Help?** Contact the DevOps team or create an issue in the project repository for monitoring-related questions.
