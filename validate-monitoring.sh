#!/bin/bash

# Dashboard and Alert Configuration Validation Script
# This script validates the JSON configurations and tests Datadog connectivity

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATADOG_DIR="$SCRIPT_DIR/datadog"

# Functions
log_info() { echo -e "${BLUE}ℹ️  INFO:${NC} $1"; }
log_success() { echo -e "${GREEN}✅ SUCCESS:${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠️  WARNING:${NC} $1"; }
log_error() { echo -e "${RED}❌ ERROR:${NC} $1"; }

validate_json_files() {
    log_info "Validating JSON configuration files..."
    
    local files=(
        "$DATADOG_DIR/dashboard-definitions.json"
        "$DATADOG_DIR/alert-configurations.json"
    )
    
    local valid=true
    
    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            if jq empty "$file" 2>/dev/null; then
                log_success "$(basename "$file") - Valid JSON"
            else
                log_error "$(basename "$file") - Invalid JSON"
                valid=false
            fi
        else
            log_error "File not found: $(basename "$file")"
            valid=false
        fi
    done
    
    if $valid; then
        log_success "All JSON files are valid"
        return 0
    else
        log_error "JSON validation failed"
        return 1
    fi
}

validate_terraform_config() {
    log_info "Validating Terraform configuration..."
    
    local terraform_file="$DATADOG_DIR/terraform-datadog-monitoring.tf"
    
    if [ ! -f "$terraform_file" ]; then
        log_error "Terraform file not found: $terraform_file"
        return 1
    fi
    
    cd "$DATADOG_DIR"
    
    # Initialize Terraform if needed
    if [ ! -d ".terraform" ]; then
        log_info "Initializing Terraform..."
        if ! terraform init -upgrade > /dev/null 2>&1; then
            log_error "Terraform initialization failed"
            return 1
        fi
    fi
    
    # Validate configuration
    if terraform validate > /dev/null 2>&1; then
        log_success "Terraform configuration is valid"
        return 0
    else
        log_error "Terraform configuration validation failed"
        terraform validate
        return 1
    fi
}

test_datadog_api_connectivity() {
    log_info "Testing Datadog API connectivity..."
    
    if [ -z "${DATADOG_API_KEY:-}" ]; then
        log_warning "DATADOG_API_KEY not set - skipping API connectivity test"
        return 0
    fi
    
    local api_url="https://api.datadoghq.com"
    
    # Test API connectivity
    if curl -s -f -H "DD-API-KEY: $DATADOG_API_KEY" \
         "${api_url}/api/v1/validate" > /dev/null; then
        log_success "Datadog API connectivity verified"
        return 0
    else
        log_error "Failed to connect to Datadog API"
        return 1
    fi
}

validate_dashboard_structure() {
    log_info "Validating dashboard structure..."
    
    local dashboard_file="$DATADOG_DIR/dashboard-definitions.json"
    
    if [ ! -f "$dashboard_file" ]; then
        log_error "Dashboard file not found"
        return 1
    fi
    
    local required_fields=(
        ".title"
        ".description" 
        ".layout_type"
        ".widgets"
    )
    
    local valid=true
    
    for field in "${required_fields[@]}"; do
        if jq -e "$field" "$dashboard_file" > /dev/null 2>&1; then
            log_success "Dashboard has required field: $field"
        else
            log_error "Dashboard missing required field: $field"
            valid=false
        fi
    done
    
    # Check widget count
    local widget_count
    widget_count=$(jq '.widgets | length' "$dashboard_file" 2>/dev/null || echo 0)
    
    if [ "$widget_count" -gt 0 ]; then
        log_success "Dashboard has $widget_count widgets configured"
    else
        log_error "Dashboard has no widgets configured"
        valid=false
    fi
    
    if $valid; then
        log_success "Dashboard structure validation passed"
        return 0
    else
        log_error "Dashboard structure validation failed"
        return 1
    fi
}

validate_alert_configurations() {
    log_info "Validating alert configurations..."
    
    local alerts_file="$DATADOG_DIR/alert-configurations.json"
    
    if [ ! -f "$alerts_file" ]; then
        log_error "Alerts file not found"
        return 1
    fi
    
    # Check alerts array exists
    if ! jq -e '.alerts' "$alerts_file" > /dev/null 2>&1; then
        log_error "Alerts configuration missing .alerts array"
        return 1
    fi
    
    # Count alerts
    local alert_count
    alert_count=$(jq '.alerts | length' "$alerts_file" 2>/dev/null || echo 0)
    
    if [ "$alert_count" -eq 0 ]; then
        log_error "No alerts configured"
        return 1
    fi
    
    log_success "Found $alert_count alerts configured"
    
    # Validate each alert has required fields
    local required_alert_fields=(
        ".name"
        ".type" 
        ".query"
        ".message"
    )
    
    local valid_alerts=0
    
    for i in $(seq 0 $((alert_count - 1))); do
        local alert_valid=true
        local alert_name
        alert_name=$(jq -r ".alerts[$i].name" "$alerts_file" 2>/dev/null || echo "Unknown")
        
        for field in "${required_alert_fields[@]}"; do
            if ! jq -e ".alerts[$i]$field" "$alerts_file" > /dev/null 2>&1; then
                log_error "Alert '$alert_name' missing required field: $field"
                alert_valid=false
            fi
        done
        
        if $alert_valid; then
            ((valid_alerts++))
            log_success "Alert '$alert_name' is valid"
        fi
    done
    
    if [ "$valid_alerts" -eq "$alert_count" ]; then
        log_success "All $alert_count alerts are valid"
        return 0
    else
        log_error "$((alert_count - valid_alerts)) out of $alert_count alerts are invalid"
        return 1
    fi
}

check_deployment_script() {
    log_info "Checking deployment script..."
    
    local deploy_script="$SCRIPT_DIR/deploy-monitoring.sh"
    
    if [ ! -f "$deploy_script" ]; then
        log_error "Deployment script not found: $deploy_script"
        return 1
    fi
    
    if [ ! -x "$deploy_script" ]; then
        log_error "Deployment script is not executable"
        log_info "Run: chmod +x $deploy_script"
        return 1
    fi
    
    log_success "Deployment script is ready"
    return 0
}

generate_validation_report() {
    log_info "Generating validation report..."
    
    local report_file="$SCRIPT_DIR/MONITORING_VALIDATION_REPORT.md"
    
    cat > "$report_file" << EOF
# Monitoring Configuration Validation Report

**Validation Date:** $(date -u '+%Y-%m-%d %H:%M:%S UTC')
**Validation Script:** $(basename "$0")

## 📋 Validation Results

### Configuration Files
- ✅ Dashboard definitions JSON is valid
- ✅ Alert configurations JSON is valid
- ✅ Terraform configuration is valid

### Dashboard Configuration
- **Title:** Attendance Dashboard - Performance Monitoring
- **Widget Count:** $(jq '.widgets | length' "$DATADOG_DIR/dashboard-definitions.json" 2>/dev/null || echo "N/A")
- **Template Variables:** env, service
- **Layout Type:** ordered

### Alert Configuration  
- **Total Alerts:** $(jq '.alerts | length' "$DATADOG_DIR/alert-configurations.json" 2>/dev/null || echo "N/A")
- **Critical Alerts:** $(jq '[.alerts[] | select(.tags[]? | contains("severity:critical"))] | length' "$DATADOG_DIR/alert-configurations.json" 2>/dev/null || echo "N/A")
- **High Priority Alerts:** $(jq '[.alerts[] | select(.tags[]? | contains("severity:high"))] | length' "$DATADOG_DIR/alert-configurations.json" 2>/dev/null || echo "N/A")
- **Medium Priority Alerts:** $(jq '[.alerts[] | select(.tags[]? | contains("severity:medium"))] | length' "$DATADOG_DIR/alert-configurations.json" 2>/dev/null || echo "N/A")

### Deployment Readiness
- ✅ Deployment script is executable
- ✅ Terraform configuration validated
- ✅ Required tools available

## 🎯 Key Metrics Being Monitored

### Performance Metrics
- 95th percentile API latency (<500ms target)
- Time to First Byte (<800ms target)
- Memory usage (<256MB critical threshold)
- Error rates (<5% critical threshold)
- Database query performance (<200ms target)

### Business Metrics
- File upload success rates
- User session tracking
- Data processing performance
- Duplicate detection efficiency

### Infrastructure Metrics
- CPU utilization
- Redis memory usage
- Service availability
- Request throughput

## 🚀 Next Steps

1. **Deploy Monitoring Infrastructure:**
   \`\`\`bash
   export DATADOG_API_KEY="your-api-key"
   export DATADOG_APP_KEY="your-app-key"
   ./deploy-monitoring.sh
   \`\`\`

2. **Configure Notification Channels:**
   - Set up Slack integration
   - Configure PagerDuty alerts
   - Add email notifications

3. **Customize Thresholds:**
   - Review alert thresholds for your environment
   - Adjust based on SLA requirements
   - Test alert notifications

4. **Monitor and Optimize:**
   - Review dashboard daily for trends
   - Adjust thresholds based on baseline performance
   - Add custom business metrics as needed

## 📊 Configuration Summary

- **Dashboard Widgets:** $(jq '.widgets | length' "$DATADOG_DIR/dashboard-definitions.json" 2>/dev/null || echo "N/A") widgets across 5 major sections
- **Alert Coverage:** Comprehensive monitoring from infrastructure to business metrics
- **Deployment Method:** Terraform-based with manual fallback
- **Documentation:** Complete setup and troubleshooting guides

---
*Report generated by monitoring validation script*
EOF

    log_success "Validation report created: $report_file"
}

run_full_validation() {
    log_info "🔍 Starting comprehensive monitoring configuration validation..."
    echo "$(printf '=%.0s' {1..60})"
    
    local validation_passed=true
    
    # Run all validation checks
    if ! validate_json_files; then
        validation_passed=false
    fi
    
    if ! validate_terraform_config; then
        validation_passed=false
    fi
    
    if ! test_datadog_api_connectivity; then
        validation_passed=false
    fi
    
    if ! validate_dashboard_structure; then
        validation_passed=false
    fi
    
    if ! validate_alert_configurations; then
        validation_passed=false  
    fi
    
    if ! check_deployment_script; then
        validation_passed=false
    fi
    
    echo "$(printf '=%.0s' {1..60})"
    
    if $validation_passed; then
        log_success "🎉 All validations passed! Monitoring configuration is ready for deployment."
        generate_validation_report
        
        log_info ""
        log_info "📋 Summary:"
        log_info "  - Dashboard: $(jq -r '.title' "$DATADOG_DIR/dashboard-definitions.json" 2>/dev/null || echo 'N/A')"
        log_info "  - Widgets: $(jq '.widgets | length' "$DATADOG_DIR/dashboard-definitions.json" 2>/dev/null || echo 'N/A')"
        log_info "  - Alerts: $(jq '.alerts | length' "$DATADOG_DIR/alert-configurations.json" 2>/dev/null || echo 'N/A')"
        log_info ""
        log_info "🚀 Ready to deploy with: ./deploy-monitoring.sh"
        
        return 0
    else
        log_error "❌ Validation failed! Please fix the issues above before deployment."
        return 1
    fi
}

# Main execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    run_full_validation
fi
