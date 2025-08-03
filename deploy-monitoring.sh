#!/bin/bash

# Datadog Monitoring Deployment Script
# This script sets up comprehensive monitoring for the attendance dashboard

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DATADOG_DIR="$PROJECT_ROOT/datadog"
TERRAFORM_DIR="$DATADOG_DIR"

# Environment variables with defaults
ENVIRONMENT="${ENVIRONMENT:-production}"
DATADOG_API_KEY="${DATADOG_API_KEY:-}"
DATADOG_APP_KEY="${DATADOG_APP_KEY:-}"
DATADOG_SITE="${DATADOG_SITE:-datadoghq.com}"

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  INFO:${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅ SUCCESS:${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠️  WARNING:${NC} $1"
}

log_error() {
    echo -e "${RED}❌ ERROR:${NC} $1"
}

log_header() {
    echo -e "${PURPLE}🚀 $1${NC}"
    echo "$(printf '=%.0s' {1..60})"
}

check_dependencies() {
    log_header "Checking Dependencies"
    
    local missing_deps=()
    
    # Check for required tools
    if ! command -v terraform &> /dev/null; then
        missing_deps+=("terraform")
    fi
    
    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi
    
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_info "Please install missing dependencies and try again"
        
        case "$(uname -s)" in
            Darwin*)
                log_info "On macOS, install with: brew install ${missing_deps[*]}"
                ;;
            Linux*)
                log_info "On Ubuntu/Debian, install with: sudo apt-get install ${missing_deps[*]}"
                log_info "On RHEL/CentOS, install with: sudo yum install ${missing_deps[*]}"
                ;;
        esac
        exit 1
    fi
    
    log_success "All dependencies are installed"
}

validate_environment_variables() {
    log_header "Validating Environment Variables"
    
    local missing_vars=()
    
    if [ -z "$DATADOG_API_KEY" ]; then
        missing_vars+=("DATADOG_API_KEY")
    fi
    
    if [ -z "$DATADOG_APP_KEY" ]; then
        missing_vars+=("DATADOG_APP_KEY")
    fi
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        log_info ""
        log_info "Please set the following environment variables:"
        log_info "  export DATADOG_API_KEY='your-datadog-api-key'"
        log_info "  export DATADOG_APP_KEY='your-datadog-app-key'"
        log_info ""
        log_info "You can find these keys in your Datadog account:"
        log_info "  - API Key: https://app.datadoghq.com/organization-settings/api-keys"
        log_info "  - Application Key: https://app.datadoghq.com/organization-settings/application-keys"
        exit 1
    fi
    
    log_success "Environment variables are set"
}

test_datadog_connection() {
    log_header "Testing Datadog API Connection"
    
    local api_url="https://api.${DATADOG_SITE}"
    
    # Test API key
    log_info "Testing API connectivity..."
    if ! curl -s -f -H "DD-API-KEY: $DATADOG_API_KEY" \
         "${api_url}/api/v1/validate" > /dev/null; then
        log_error "Failed to connect to Datadog API"
        log_info "Please verify your DATADOG_API_KEY and network connectivity"
        exit 1
    fi
    
    log_success "Successfully connected to Datadog API"
}

create_terraform_variables() {
    log_header "Creating Terraform Configuration"
    
    local tfvars_file="$TERRAFORM_DIR/terraform.tfvars"
    
    log_info "Creating terraform.tfvars file..."
    cat > "$tfvars_file" << EOF
# Datadog Configuration
datadog_api_key = "$DATADOG_API_KEY"
datadog_app_key = "$DATADOG_APP_KEY"
datadog_api_url = "https://api.${DATADOG_SITE}/"

# Environment Configuration
environment  = "$ENVIRONMENT"
service_name = "attendance-dashboard"
EOF

    # Set restrictive permissions on the variables file (contains secrets)
    chmod 600 "$tfvars_file"
    
    log_success "Terraform configuration created"
}

deploy_terraform_infrastructure() {
    log_header "Deploying Monitoring Infrastructure with Terraform"
    
    cd "$TERRAFORM_DIR"
    
    log_info "Initializing Terraform..."
    terraform init
    
    log_info "Validating Terraform configuration..."
    terraform validate
    
    log_info "Planning Terraform deployment..."
    terraform plan -var-file="terraform.tfvars" -out=monitoring.tfplan
    
    log_info "Applying Terraform configuration..."
    if terraform apply -auto-approve monitoring.tfplan; then
        log_success "Terraform infrastructure deployed successfully"
        
        # Get outputs
        local dashboard_url
        dashboard_url=$(terraform output -raw dashboard_url 2>/dev/null || echo "Not available")
        
        log_success "Dashboard URL: $dashboard_url"
        
        # Display monitor IDs
        log_info "Created monitors:"
        terraform output -json monitor_ids 2>/dev/null | jq -r 'to_entries[] | "  - \(.key): \(.value)"' || log_warning "Could not retrieve monitor IDs"
        
    else
        log_error "Terraform deployment failed"
        exit 1
    fi
}

deploy_manual_configuration() {
    log_header "Deploying Manual Dashboard and Alert Configuration"
    
    log_warning "Manual deployment mode - using Datadog API directly"
    
    local api_url="https://api.${DATADOG_SITE}"
    local dashboard_file="$DATADOG_DIR/dashboard-definitions.json"
    local alerts_file="$DATADOG_DIR/alert-configurations.json"
    
    # Deploy dashboard
    if [ -f "$dashboard_file" ]; then
        log_info "Deploying dashboard configuration..."
        
        local response
        response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -H "DD-API-KEY: $DATADOG_API_KEY" \
            -H "DD-APPLICATION-KEY: $DATADOG_APP_KEY" \
            -d "@$dashboard_file" \
            "${api_url}/api/v1/dashboard")
        
        if echo "$response" | jq -e '.id' > /dev/null 2>&1; then
            local dashboard_id
            dashboard_id=$(echo "$response" | jq -r '.id')
            log_success "Dashboard created with ID: $dashboard_id"
            log_success "Dashboard URL: https://app.${DATADOG_SITE}/dashboard/$dashboard_id"
        else
            log_warning "Dashboard creation may have failed. Response: $response"
        fi
    else
        log_warning "Dashboard definition file not found: $dashboard_file"
    fi
    
    # Deploy alerts (individual monitor creation)
    if [ -f "$alerts_file" ]; then
        log_info "Deploying alert configurations..."
        
        # Extract alerts from JSON and create individually
        jq -r '.alerts[] | @base64' "$alerts_file" | while read -r alert_data; do
            local alert_json
            alert_json=$(echo "$alert_data" | base64 --decode)
            
            local alert_name
            alert_name=$(echo "$alert_json" | jq -r '.name')
            
            log_info "Creating alert: $alert_name"
            
            local response
            response=$(curl -s -X POST \
                -H "Content-Type: application/json" \
                -H "DD-API-KEY: $DATADOG_API_KEY" \
                -H "DD-APPLICATION-KEY: $DATADOG_APP_KEY" \
                -d "$alert_json" \
                "${api_url}/api/v1/monitor")
            
            if echo "$response" | jq -e '.id' > /dev/null 2>&1; then
                local monitor_id
                monitor_id=$(echo "$response" | jq -r '.id')
                log_success "  ✓ Alert created with ID: $monitor_id"
            else
                log_warning "  ⚠ Alert creation may have failed: $alert_name"
            fi
        done
    else
        log_warning "Alerts definition file not found: $alerts_file"
    fi
}

verify_deployment() {
    log_header "Verifying Deployment"
    
    local api_url="https://api.${DATADOG_SITE}"
    
    # List dashboards
    log_info "Checking for created dashboards..."
    local dashboards
    dashboards=$(curl -s -H "DD-API-KEY: $DATADOG_API_KEY" \
         -H "DD-APPLICATION-KEY: $DATADOG_APP_KEY" \
         "${api_url}/api/v1/dashboard" | jq -r '.dashboards[] | select(.title | contains("Attendance Dashboard")) | "\(.title) - \(.id)"' 2>/dev/null || echo "")
    
    if [ -n "$dashboards" ]; then
        log_success "Found dashboards:"
        echo "$dashboards" | while read -r dashboard; do
            log_info "  - $dashboard"
        done
    else
        log_warning "No dashboards found matching 'Attendance Dashboard'"
    fi
    
    # List monitors
    log_info "Checking for created monitors..."
    local monitors
    monitors=$(curl -s -H "DD-API-KEY: $DATADOG_API_KEY" \
         -H "DD-APPLICATION-KEY: $DATADOG_APP_KEY" \
         "${api_url}/api/v1/monitor" | jq -r '.[] | select(.name | contains("attendance") or contains("Attendance")) | "\(.name) - \(.id)"' 2>/dev/null || echo "")
    
    if [ -n "$monitors" ]; then
        log_success "Found monitors:"
        echo "$monitors" | while read -r monitor; do
            log_info "  - $monitor"
        done
    else
        log_warning "No monitors found matching 'attendance'"
    fi
}

create_monitoring_summary() {
    log_header "Creating Monitoring Summary"
    
    local summary_file="$PROJECT_ROOT/MONITORING_DEPLOYMENT_SUMMARY.md"
    
    cat > "$summary_file" << EOF
# Monitoring Deployment Summary

**Deployment Date:** $(date -u '+%Y-%m-%d %H:%M:%S UTC')
**Environment:** $ENVIRONMENT
**Datadog Site:** $DATADOG_SITE

## 📊 Deployed Components

### Dashboards
- **Performance Monitoring Dashboard**: Comprehensive performance metrics
  - 95th percentile API latency
  - Time to First Byte (TTFB)
  - Memory usage tracking
  - Error rate monitoring
  - Core Web Vitals (LCP, FID, CLS)
  - Database query performance
  - Business metrics

### Alerts Configured
- 🚨 High API Latency (95p > 500ms)
- ⏱️ Poor TTFB Performance (95p > 800ms)
- 💾 High Memory Usage (>256MB)
- ❌ High Error Rate (>5%)
- 🗄️ Slow Database Queries (95p > 200ms)
- 📱 Poor Core Web Vitals - LCP (>2.5s)
- 🔄 High CPU Usage (>80%)
- 📁 File Upload Failure Rate (>10%)
- 🔌 Service Unavailability
- 📊 Anomaly Detection - Request Volume

## 🔧 Next Steps

1. **Customize Alert Recipients**: Update notification channels in Datadog UI
2. **Set Up Integrations**: Configure Slack, PagerDuty, or other notification services
3. **Review Thresholds**: Adjust alert thresholds based on your SLA requirements
4. **Create Custom Dashboards**: Add business-specific metrics and visualizations
5. **Set Up Synthetic Tests**: Create uptime monitoring for critical user journeys

## 📚 Documentation

- Dashboard Definitions: \`datadog/dashboard-definitions.json\`
- Alert Configurations: \`datadog/alert-configurations.json\`
- Terraform Configuration: \`datadog/terraform-datadog-monitoring.tf\`

## 🛠 Management Commands

\`\`\`bash
# View Terraform state
cd datadog && terraform state list

# Update monitoring configuration
cd datadog && terraform plan && terraform apply

# Destroy monitoring infrastructure (if needed)
cd datadog && terraform destroy
\`\`\`

## 📈 Monitoring Best Practices

1. **Regular Review**: Review and update alert thresholds monthly
2. **Incident Response**: Ensure team members know how to respond to alerts
3. **Documentation**: Keep runbooks updated for common issues
4. **Testing**: Test alert notifications regularly
5. **Optimization**: Use monitoring data to optimize application performance

## 🔗 Useful Links

- [Datadog APM Documentation](https://docs.datadoghq.com/tracing/)
- [RUM Documentation](https://docs.datadoghq.com/real_user_monitoring/)
- [Alert Management](https://docs.datadoghq.com/monitors/manage/)
- [Dashboard Guide](https://docs.datadoghq.com/dashboards/)

EOF

    log_success "Monitoring summary created: $summary_file"
}

cleanup() {
    log_info "Cleaning up temporary files..."
    
    # Remove terraform.tfvars if it exists (contains secrets)
    if [ -f "$TERRAFORM_DIR/terraform.tfvars" ]; then
        rm -f "$TERRAFORM_DIR/terraform.tfvars"
        log_info "Removed terraform.tfvars file"
    fi
    
    # Remove terraform plan file
    if [ -f "$TERRAFORM_DIR/monitoring.tfplan" ]; then
        rm -f "$TERRAFORM_DIR/monitoring.tfplan"
        log_info "Removed terraform plan file"
    fi
}

# Main execution
main() {
    log_header "Datadog Monitoring Deployment for Attendance Dashboard"
    
    # Trap cleanup function
    trap cleanup EXIT
    
    # Validate prerequisites
    check_dependencies
    validate_environment_variables
    test_datadog_connection
    
    # Deploy monitoring infrastructure
    if command -v terraform &> /dev/null; then
        log_info "Using Terraform for infrastructure deployment"
        create_terraform_variables
        deploy_terraform_infrastructure
    else
        log_info "Terraform not available, using manual API deployment"
        deploy_manual_configuration
    fi
    
    # Verify and summarize
    verify_deployment
    create_monitoring_summary
    
    log_header "🎉 Deployment Complete!"
    log_success "Monitoring infrastructure has been successfully deployed"
    log_info ""
    log_info "What's Next:"
    log_info "1. Visit your Datadog dashboard to view the monitoring setup"
    log_info "2. Configure notification channels for your team"
    log_info "3. Test alert notifications"
    log_info "4. Review and adjust alert thresholds as needed"
    log_info ""
    log_info "For detailed information, see: MONITORING_DEPLOYMENT_SUMMARY.md"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
