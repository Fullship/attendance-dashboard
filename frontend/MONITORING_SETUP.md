# Monitoring Configuration for Admin Panel

This document outlines the monitoring setup for the Admin Panel, including performance tracking, error monitoring, and alerting.

## 📊 Performance Monitoring

### Core Web Vitals Tracking

```typescript
// frontend/src/utils/performance-monitoring.ts
export interface WebVitalsMetrics {
  CLS: number;  // Cumulative Layout Shift
  FID: number;  // First Input Delay
  FCP: number;  // First Contentful Paint
  LCP: number;  // Largest Contentful Paint
  TTFB: number; // Time to First Byte
}

export class PerformanceMonitor {
  private metrics: Partial<WebVitalsMetrics> = {};
  
  constructor(private reportingEndpoint: string) {
    this.initializeWebVitals();
  }
  
  private initializeWebVitals() {
    // Initialize web-vitals library
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(this.handleMetric.bind(this));
      getFID(this.handleMetric.bind(this));
      getFCP(this.handleMetric.bind(this));
      getLCP(this.handleMetric.bind(this));
      getTTFB(this.handleMetric.bind(this));
    });
  }
  
  private handleMetric(metric: any) {
    this.metrics[metric.name as keyof WebVitalsMetrics] = metric.value;
    this.reportMetric(metric);
  }
  
  private reportMetric(metric: any) {
    // Send to monitoring service
    fetch(this.reportingEndpoint, {
      method: 'POST',
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        id: metric.id,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      })
    }).catch(console.error);
  }
}
```

### Real-Time Performance Tracking

```typescript
// frontend/src/utils/admin-performance-tracker.ts
export class AdminPanelPerformanceTracker {
  private startTime: number = Date.now();
  private apiCallTimes: Map<string, number> = new Map();
  private renderTimes: Map<string, number> = new Map();
  
  // Track API call performance
  trackAPICall(endpoint: string, startTime: number, endTime: number, success: boolean) {
    const duration = endTime - startTime;
    this.apiCallTimes.set(endpoint, duration);
    
    // Report slow API calls
    if (duration > 1000) {
      this.reportSlowAPICall(endpoint, duration, success);
    }
  }
  
  // Track component render performance
  trackComponentRender(componentName: string, renderTime: number) {
    this.renderTimes.set(componentName, renderTime);
    
    // Report slow renders
    if (renderTime > 100) {
      this.reportSlowRender(componentName, renderTime);
    }
  }
  
  // Track memory usage
  trackMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        heapUsed: memory.usedJSHeapSize,
        heapTotal: memory.totalJSHeapSize,
        heapLimit: memory.jsHeapSizeLimit
      };
    }
    return null;
  }
  
  // Generate performance report
  generateReport() {
    return {
      sessionDuration: Date.now() - this.startTime,
      apiCallTimes: Object.fromEntries(this.apiCallTimes),
      renderTimes: Object.fromEntries(this.renderTimes),
      memoryUsage: this.trackMemoryUsage(),
      timestamp: new Date().toISOString()
    };
  }
  
  private reportSlowAPICall(endpoint: string, duration: number, success: boolean) {
    console.warn(\`Slow API call detected: \${endpoint} took \${duration}ms\`);
    // Send to monitoring service
  }
  
  private reportSlowRender(component: string, duration: number) {
    console.warn(\`Slow render detected: \${component} took \${duration}ms\`);
    // Send to monitoring service
  }
}
```

## 🚨 Error Monitoring

### Error Tracking Setup

```typescript
// frontend/src/utils/error-monitoring.ts
export interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  line?: number;
  column?: number;
  userAgent: string;
  timestamp: number;
  userId?: string;
  sessionId: string;
  component?: string;
  props?: any;
}

export class ErrorMonitor {
  private sessionId: string;
  
  constructor(private reportingEndpoint: string) {
    this.sessionId = this.generateSessionId();
    this.setupGlobalErrorHandlers();
  }
  
  private setupGlobalErrorHandlers() {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.reportError({
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        line: event.lineno,
        column: event.colno,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        sessionId: this.sessionId
      });
    });
    
    // Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError({
        message: \`Unhandled promise rejection: \${event.reason}\`,
        stack: event.reason?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        sessionId: this.sessionId
      });
    });
    
    // React error boundary integration
    this.setupReactErrorBoundary();
  }
  
  reportError(error: ErrorReport) {
    console.error('Error reported:', error);
    
    fetch(this.reportingEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(error)
    }).catch(console.error);
  }
  
  private generateSessionId(): string {
    return \`session_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
  }
  
  private setupReactErrorBoundary() {
    // This would integrate with React Error Boundary
    // See React Error Boundary component below
  }
}
```

### React Error Boundary

```typescript
// frontend/src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorMonitor } from '../utils/error-monitoring';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  private errorMonitor: ErrorMonitor;
  
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
    this.errorMonitor = new ErrorMonitor('/api/errors');
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.errorMonitor.reportError({
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      sessionId: 'current-session',
      component: errorInfo.componentStack
    });
    
    this.props.onError?.(error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <h2>Something went wrong in the Admin Panel</h2>
          <p>Please refresh the page or contact support if the issue persists.</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

## 📈 Metrics Collection

### Dashboard Metrics

```typescript
// frontend/src/utils/metrics-collector.ts
export interface DashboardMetrics {
  // User interactions
  tabSwitches: number;
  buttonClicks: number;
  formSubmissions: number;
  
  // Performance metrics
  avgAPIResponseTime: number;
  slowAPICallCount: number;
  errorCount: number;
  
  // Usage metrics
  sessionDuration: number;
  featuresUsed: string[];
  lastActiveTime: number;
}

export class MetricsCollector {
  private metrics: DashboardMetrics = {
    tabSwitches: 0,
    buttonClicks: 0,
    formSubmissions: 0,
    avgAPIResponseTime: 0,
    slowAPICallCount: 0,
    errorCount: 0,
    sessionDuration: 0,
    featuresUsed: [],
    lastActiveTime: Date.now()
  };
  
  private apiResponseTimes: number[] = [];
  
  trackTabSwitch(tabName: string) {
    this.metrics.tabSwitches++;
    this.trackFeatureUsage(\`tab_\${tabName}\`);
    this.updateLastActiveTime();
  }
  
  trackButtonClick(buttonName: string) {
    this.metrics.buttonClicks++;
    this.trackFeatureUsage(\`button_\${buttonName}\`);
    this.updateLastActiveTime();
  }
  
  trackAPIResponse(endpoint: string, responseTime: number) {
    this.apiResponseTimes.push(responseTime);
    this.metrics.avgAPIResponseTime = 
      this.apiResponseTimes.reduce((a, b) => a + b, 0) / this.apiResponseTimes.length;
    
    if (responseTime > 1000) {
      this.metrics.slowAPICallCount++;
    }
    
    this.updateLastActiveTime();
  }
  
  trackError() {
    this.metrics.errorCount++;
  }
  
  private trackFeatureUsage(feature: string) {
    if (!this.metrics.featuresUsed.includes(feature)) {
      this.metrics.featuresUsed.push(feature);
    }
  }
  
  private updateLastActiveTime() {
    this.metrics.lastActiveTime = Date.now();
    this.metrics.sessionDuration = Date.now() - (this.metrics.lastActiveTime - this.metrics.sessionDuration);
  }
  
  getMetrics(): DashboardMetrics {
    return { ...this.metrics };
  }
  
  reportMetrics() {
    const metrics = this.getMetrics();
    
    fetch('/api/analytics/admin-metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...metrics,
        timestamp: Date.now(),
        url: window.location.href
      })
    }).catch(console.error);
  }
}
```

## 🔔 Alerting Configuration

### Performance Alerts

```yaml
# monitoring/alerts.yml
alerts:
  admin_panel_performance:
    - name: "Admin Panel High Response Time"
      condition: "avg_api_response_time > 2000"
      severity: "warning"
      channels: ["slack", "email"]
      message: "Admin panel API response time is high: {{value}}ms"
      
    - name: "Admin Panel Error Rate"
      condition: "error_rate > 5%"
      severity: "critical"
      channels: ["slack", "email", "pagerduty"]
      message: "Admin panel error rate is high: {{value}}%"
      
    - name: "Admin Panel Memory Usage"
      condition: "memory_usage > 90%"
      severity: "warning"
      channels: ["slack"]
      message: "Admin panel memory usage is high: {{value}}%"
      
    - name: "Admin Panel Load Time"
      condition: "page_load_time > 5000"
      severity: "warning"
      channels: ["slack"]
      message: "Admin panel load time is slow: {{value}}ms"

  admin_panel_availability:
    - name: "Admin Panel Down"
      condition: "admin_panel_health != 'healthy'"
      severity: "critical"
      channels: ["slack", "email", "pagerduty"]
      message: "Admin panel is not responding"
      
    - name: "Admin Panel API Errors"
      condition: "api_error_count > 10 in 5min"
      severity: "warning"
      channels: ["slack"]
      message: "Multiple admin panel API errors detected"
```

### Health Check Endpoint

```typescript
// backend/src/routes/admin/health.ts
export const healthCheck = async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      api: await checkAPIEndpoints()
    }
  };
  
  const isHealthy = Object.values(health.checks).every(check => check.status === 'healthy');
  health.status = isHealthy ? 'healthy' : 'unhealthy';
  
  res.status(isHealthy ? 200 : 503).json(health);
};

async function checkDatabase() {
  try {
    // Test database connection
    await db.query('SELECT 1');
    return { status: 'healthy', responseTime: 0 };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkRedis() {
  try {
    // Test Redis connection
    await redis.ping();
    return { status: 'healthy', responseTime: 0 };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkAPIEndpoints() {
  // Test internal API endpoints
  const endpoints = ['/api/admin/metrics', '/api/admin/cache/stats'];
  const results = await Promise.all(
    endpoints.map(async (endpoint) => {
      try {
        const response = await fetch(\`http://localhost:3000\${endpoint}\`);
        return { endpoint, status: response.ok ? 'healthy' : 'unhealthy' };
      } catch (error) {
        return { endpoint, status: 'unhealthy', error: error.message };
      }
    })
  );
  
  return {
    status: results.every(r => r.status === 'healthy') ? 'healthy' : 'unhealthy',
    endpoints: results
  };
}
```

## 📊 Monitoring Dashboard

### Grafana Dashboard Configuration

```json
{
  "dashboard": {
    "title": "Admin Panel Monitoring",
    "panels": [
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "admin_panel_api_response_time",
            "legendFormat": "API Response Time"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(admin_panel_errors_total[5m])",
            "legendFormat": "Error Rate"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "admin_panel_memory_usage",
            "legendFormat": "Memory Usage"
          }
        ]
      },
      {
        "title": "Active Users",
        "type": "stat",
        "targets": [
          {
            "expr": "admin_panel_active_users",
            "legendFormat": "Active Users"
          }
        ]
      }
    ]
  }
}
```

## 🚀 Implementation Checklist

### Frontend Monitoring Setup
- [ ] Install web-vitals library
- [ ] Implement PerformanceMonitor class
- [ ] Add ErrorBoundary components
- [ ] Setup MetricsCollector
- [ ] Add monitoring to AdminPanel components

### Backend Monitoring Setup
- [ ] Create health check endpoints
- [ ] Implement error logging
- [ ] Setup performance metrics collection
- [ ] Configure alerting rules
- [ ] Create monitoring dashboard

### Infrastructure Setup
- [ ] Configure monitoring service (Datadog/New Relic/etc.)
- [ ] Setup log aggregation
- [ ] Configure alerting channels
- [ ] Create monitoring dashboards
- [ ] Setup automated testing

### Testing & Validation
- [ ] Test error scenarios
- [ ] Validate alert triggers
- [ ] Verify metric collection
- [ ] Test dashboard functionality
- [ ] Validate performance baselines

---

## 📞 Contact Information

For monitoring setup assistance:
- **Development Team:** dev-team@company.com
- **DevOps Team:** devops@company.com
- **On-Call:** +1-555-ON-CALL
