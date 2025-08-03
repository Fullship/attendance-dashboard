# Datadog Provider Configuration
terraform {
  required_providers {
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.0"
    }
  }
}

# Configure the Datadog Provider
provider "datadog" {
  api_key = var.datadog_api_key
  app_key = var.datadog_app_key
  api_url = var.datadog_api_url # Default: "https://api.datadoghq.com/"
}

# Variables
variable "datadog_api_key" {
  description = "Datadog API Key"
  type        = string
  sensitive   = true
}

variable "datadog_app_key" {
  description = "Datadog Application Key"
  type        = string
  sensitive   = true
}

variable "datadog_api_url" {
  description = "Datadog API URL"
  type        = string
  default     = "https://api.datadoghq.com/"
}

variable "environment" {
  description = "Environment (development, staging, production)"
  type        = string
  default     = "production"
}

variable "service_name" {
  description = "Service name"
  type        = string
  default     = "attendance-dashboard"
}

# Dashboard - Performance Monitoring
resource "datadog_dashboard" "attendance_dashboard_performance" {
  title       = "Attendance Dashboard - Performance Monitoring"
  description = "Comprehensive performance monitoring with 95p latency, TTFB, memory, and error rates"
  layout_type = "ordered"
  is_read_only = false

  template_variable {
    name    = "env"
    prefix  = "env"
    default = var.environment
  }

  template_variable {
    name    = "service"
    prefix  = "service"
    default = "*"
  }

  # Application Health Overview Group
  widget {
    group_definition {
      title       = "📊 Application Health Overview"
      layout_type = "ordered"

      # 95p API Latency
      widget {
        query_value_definition {
          title       = "🚀 95p API Latency (ms)"
          title_size  = "16"
          title_align = "center"
          precision   = 0
          
          request {
            q          = "avg:trace.express.request.duration.by.service.95p{env:$env,service:attendance-dashboard-backend}"
            aggregator = "last"
          }

          conditional_format {
            comparator = "<"
            value      = "200"
            palette    = "green_on_white"
          }
          conditional_format {
            comparator = ">="
            value      = "200"
            palette    = "yellow_on_white"
          }
          conditional_format {
            comparator = ">="
            value      = "500"
            palette    = "red_on_white"
          }
        }
      }

      # 95p TTFB
      widget {
        query_value_definition {
          title       = "⏱️ 95p TTFB (ms)"
          title_size  = "16"
          title_align = "center"
          precision   = 0
          
          request {
            q          = "avg:rum.loading_time.first_byte.95p{env:$env,application_id:*}"
            aggregator = "last"
          }

          conditional_format {
            comparator = "<"
            value      = "300"
            palette    = "green_on_white"
          }
          conditional_format {
            comparator = ">="
            value      = "300"
            palette    = "yellow_on_white"
          }
          conditional_format {
            comparator = ">="
            value      = "800"
            palette    = "red_on_white"
          }
        }
      }

      # Memory Usage
      widget {
        query_value_definition {
          title       = "💾 Memory Usage (MB)"
          title_size  = "16"
          title_align = "center"
          precision   = 0
          custom_unit = "B"
          
          request {
            q          = "avg:process.memory.rss{env:$env,service:attendance-dashboard-backend}"
            aggregator = "last"
          }

          conditional_format {
            comparator = "<"
            value      = "134217728" # 128MB
            palette    = "green_on_white"
          }
          conditional_format {
            comparator = ">="
            value      = "134217728" # 128MB
            palette    = "yellow_on_white"
          }
          conditional_format {
            comparator = ">="
            value      = "268435456" # 256MB
            palette    = "red_on_white"
          }
        }
      }

      # Error Rate
      widget {
        query_value_definition {
          title       = "❌ Error Rate (%)"
          title_size  = "16"
          title_align = "center"
          precision   = 2
          
          request {
            q          = "sum:trace.express.request.errors{env:$env,service:attendance-dashboard-backend}.as_rate()"
            aggregator = "last"
          }

          conditional_format {
            comparator = "<"
            value      = "0.05"
            palette    = "green_on_white"
          }
          conditional_format {
            comparator = ">="
            value      = "0.05"
            palette    = "yellow_on_white"
          }
          conditional_format {
            comparator = ">="
            value      = "0.1"
            palette    = "red_on_white"
          }
        }
      }
    }
  }

  # Backend Performance Metrics Group
  widget {
    group_definition {
      title       = "🚀 Backend Performance Metrics"
      layout_type = "ordered"

      # API Response Latency Chart
      widget {
        timeseries_definition {
          title       = "API Response Latency (95p & 99p)"
          title_size  = "16"
          title_align = "left"

          request {
            q            = "avg:trace.express.request.duration.by.service.95p{env:$env,service:attendance-dashboard-backend}"
            display_type = "line"
            style {
              palette    = "dog_classic"
              line_type  = "solid"
              line_width = "normal"
            }
          }

          request {
            q            = "avg:trace.express.request.duration.by.service.99p{env:$env,service:attendance-dashboard-backend}"
            display_type = "line"
            style {
              palette    = "orange"
              line_type  = "dashed" 
              line_width = "normal"
            }
          }

          marker {
            value        = "y = 200"
            display_type = "error dashed"
            label        = "SLA Target (200ms)"
          }

          yaxis {
            scale = "linear"
            min   = "auto"
            max   = "auto"
          }
        }
      }

      # Memory Usage Over Time
      widget {
        timeseries_definition {
          title       = "Memory Usage Over Time"
          title_size  = "16"
          title_align = "left"

          request {
            q            = "avg:process.memory.rss{env:$env,service:attendance-dashboard-backend}"
            display_type = "line"
            style {
              palette    = "purple"
              line_type  = "solid"
              line_width = "normal"
            }
          }

          request {
            q            = "avg:process.memory.heap_used{env:$env,service:attendance-dashboard-backend}"
            display_type = "line"
            style {
              palette    = "cool"
              line_type  = "dashed"
              line_width = "normal"
            }
          }

          marker {
            value        = "y = 134217728"
            display_type = "warning dashed"
            label        = "128MB Warning"
          }

          marker {
            value        = "y = 268435456"
            display_type = "error dashed"
            label        = "256MB Critical"
          }

          yaxis {
            label = "Bytes"
            scale = "linear"
            min   = "auto"
            max   = "auto"
          }
        }
      }
    }
  }

  # Frontend Performance Group
  widget {
    group_definition {
      title       = "🌐 Frontend Performance (RUM)"
      layout_type = "ordered"

      # Core Web Vitals
      widget {
        timeseries_definition {
          title       = "Core Web Vitals (LCP & FID)"
          title_size  = "16"
          title_align = "left"

          request {
            q            = "avg:rum.largest_contentful_paint.95p{env:$env,application_id:*}"
            display_type = "line"
            style {
              palette    = "green"
              line_type  = "solid"
              line_width = "normal"
            }
          }

          request {
            q            = "avg:rum.first_input_delay.95p{env:$env,application_id:*}"
            display_type = "line"
            style {
              palette    = "blue"
              line_type  = "dashed"
              line_width = "normal"
            }
          }

          marker {
            value        = "y = 2500"
            display_type = "warning dashed"
            label        = "LCP Good (2.5s)"
          }

          marker {
            value        = "y = 100"
            display_type = "ok dashed"
            label        = "FID Good (100ms)"
          }

          yaxis {
            label = "ms"
            scale = "linear"
            min   = "auto"
            max   = "auto"
          }
        }
      }

      # TTFB Performance
      widget {
        timeseries_definition {
          title       = "Time to First Byte (95p)"
          title_size  = "16"
          title_align = "left"

          request {
            q            = "avg:rum.loading_time.first_byte.95p{env:$env,application_id:*}"
            display_type = "line"
            style {
              palette    = "dog_classic"
              line_type  = "solid"
              line_width = "thick"
            }
          }

          marker {
            value        = "y = 300"
            display_type = "warning dashed"
            label        = "Good (300ms)"
          }

          marker {
            value        = "y = 800"
            display_type = "error dashed"
            label        = "Poor (800ms)"
          }

          yaxis {
            label = "ms"
            scale = "linear"
            min   = "auto"
            max   = "auto"
          }
        }
      }
    }
  }
}

# Alert: High API Latency
resource "datadog_monitor" "high_api_latency" {
  name    = "🚨 High API Latency (95p > 500ms)"
  type    = "metric alert"
  query   = "avg(last_5m):avg:trace.express.request.duration.by.service.95p{service:attendance-dashboard-backend} > 500"
  message = <<-EOF
**CRITICAL: High API Latency Detected**

The 95th percentile API latency has exceeded 500ms for the past 5 minutes.

**Current Value:** {{value}}ms
**Threshold:** 500ms
**Service:** {{service.name}}
**Environment:** {{env.name}}

**Impact:** Users are experiencing slow response times which may affect application usability.

**Immediate Actions:**
- Check current server load and CPU usage
- Review slow database queries  
- Verify if any batch operations are running
- Check for memory leaks or garbage collection issues

**Dashboard:** [Performance Dashboard](https://app.datadoghq.com/dashboard/${datadog_dashboard.attendance_dashboard_performance.id})

@slack-alerts @pagerduty-high-priority
EOF

  thresholds = {
    critical = 500
    warning  = 300
  }

  notify_no_data      = true
  no_data_timeframe   = 10
  require_full_window = false
  new_host_delay      = 300
  evaluation_delay    = 60
  renotify_interval   = 60

  escalation_message = <<-EOF
🔥 **ESCALATION**: API latency issue persists after 1 hour.

**Actions Taken:** Please update this alert with current status.
**Next Steps:** Consider scaling infrastructure or implementing emergency measures.

@manager-on-call @infrastructure-team
EOF

  tags = ["service:attendance-dashboard-backend", "alert-type:performance", "severity:high"]
}

# Alert: Poor TTFB Performance
resource "datadog_monitor" "poor_ttfb" {
  name    = "⏱️ Poor TTFB Performance (95p > 800ms)"
  type    = "metric alert"
  query   = "avg(last_10m):avg:rum.loading_time.first_byte.95p{application_id:*} > 800"
  message = <<-EOF
**WARNING: Poor Time to First Byte Performance**

Frontend TTFB 95th percentile has exceeded 800ms, indicating potential backend or network issues.

**Current Value:** {{value}}ms
**Threshold:** 800ms
**Environment:** {{env.name}}

**User Impact:** Users experiencing slow page loads and poor perceived performance.

**Investigation Steps:**
- Check backend API latency metrics
- Verify CDN and edge cache performance
- Review server response times
- Check for network connectivity issues

@web-performance-team @frontend-alerts
EOF

  thresholds = {
    critical = 800
    warning  = 500
  }

  notify_no_data      = true
  no_data_timeframe   = 20
  require_full_window = false
  evaluation_delay    = 60
  renotify_interval   = 120

  tags = ["service:attendance-dashboard-frontend", "alert-type:frontend", "severity:medium"]
}

# Alert: High Memory Usage
resource "datadog_monitor" "high_memory_usage" {
  name    = "💾 High Memory Usage (>256MB)"
  type    = "metric alert"
  query   = "avg(last_10m):avg:process.memory.rss{service:attendance-dashboard-backend} > 268435456"
  message = <<-EOF
**CRITICAL: High Memory Usage Alert**

Application memory usage has exceeded 256MB threshold.

**Current Usage:** {{value}} bytes
**Threshold:** 256MB
**Service:** {{service.name}}
**Host:** {{host.name}}

**Potential Issues:**
- Memory leaks in application code
- Large data sets being processed
- Inefficient caching strategies
- Node.js garbage collection issues

**Immediate Actions:**
1. Check for memory leaks using heap dumps
2. Review recent deployments for memory-intensive changes
3. Monitor garbage collection metrics
4. Consider restarting affected processes if memory continues to grow

@infrastructure-team @backend-alerts @pagerduty-medium-priority
EOF

  thresholds = {
    critical = 268435456 # 256MB
    warning  = 134217728 # 128MB
  }

  notify_no_data      = true
  no_data_timeframe   = 15
  require_full_window = false
  evaluation_delay    = 60
  renotify_interval   = 30

  tags = ["service:attendance-dashboard-backend", "alert-type:infrastructure", "severity:high"]
}

# Alert: High Error Rate
resource "datadog_monitor" "high_error_rate" {
  name    = "❌ High Error Rate (>5%)"
  type    = "metric alert"
  query   = "avg(last_10m):(sum:trace.express.request.errors{service:attendance-dashboard-backend}.as_rate() / sum:trace.express.request.hits{service:attendance-dashboard-backend}.as_rate()) * 100 > 5"
  message = <<-EOF
**ALERT: High Error Rate Detected**

Application error rate has exceeded 5% threshold.

**Current Error Rate:** {{value}}%
**Threshold:** 5%
**Service:** {{service.name}}
**Environment:** {{env.name}}

**Error Impact:** Users are experiencing failures when using the application.

**Troubleshooting Steps:**
1. Check recent error logs for patterns
2. Review recent deployments for breaking changes
3. Verify database connectivity and health
4. Check external service dependencies
5. Monitor specific error types and endpoints

@backend-team @on-call-engineer @slack-critical
EOF

  thresholds = {
    critical = 5
    warning  = 2
  }

  notify_no_data      = false
  require_full_window = false
  evaluation_delay    = 60
  renotify_interval   = 45

  tags = ["service:attendance-dashboard-backend", "alert-type:errors", "severity:high"]
}

# Alert: Service Unavailability
resource "datadog_monitor" "service_unavailable" {
  name    = "🔌 Service Unavailability"
  type    = "service check"
  query   = "\"http.can_connect\".over(\"instance:attendance-dashboard-backend\").last(3).count_by_status()"
  message = <<-EOF
**CRITICAL OUTAGE: Service Unavailable**

🚨 **IMMEDIATE ACTION REQUIRED** 🚨

The attendance dashboard backend service is not responding to health checks.

**Service:** Attendance Dashboard API
**Check:** HTTP connectivity test
**Duration:** Service has been down for over 3 minutes

**Business Impact:**
- ❌ All users cannot access the attendance system
- ❌ Attendance data cannot be uploaded or processed
- ❌ Employee clock-in/out functionality unavailable

@pagerduty-critical @infrastructure-team @engineering-manager @on-call-engineer
EOF

  thresholds = {
    critical = 3
    warning  = 1
  }

  notify_audit        = true
  notify_no_data      = true
  no_data_timeframe   = 5
  new_host_delay      = 300
  renotify_interval   = 15

  escalation_message = <<-EOF
🔥🔥🔥 **CRITICAL ESCALATION** 🔥🔥🔥

Service has been down for over 15 minutes. This is now a P0 incident requiring immediate senior engineering attention.

@cto @engineering-director @incident-commander
EOF

  tags = ["service:attendance-dashboard-backend", "alert-type:availability", "severity:critical"]
}

# Output dashboard URL
output "dashboard_url" {
  description = "URL of the created performance dashboard"
  value       = "https://app.datadoghq.com/dashboard/${datadog_dashboard.attendance_dashboard_performance.id}"
}

# Output monitor IDs
output "monitor_ids" {
  description = "IDs of created monitors"
  value = {
    high_api_latency    = datadog_monitor.high_api_latency.id
    poor_ttfb          = datadog_monitor.poor_ttfb.id
    high_memory_usage  = datadog_monitor.high_memory_usage.id
    high_error_rate    = datadog_monitor.high_error_rate.id
    service_unavailable = datadog_monitor.service_unavailable.id
  }
}
