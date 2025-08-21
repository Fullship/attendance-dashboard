#!/bin/bash

# PM2 Cluster Demo Script
# Demonstrates PM2 cluster configuration and features

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_header() {
    echo -e "${PURPLE}╔════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║        PM2 CLUSTER DEMONSTRATION           ║${NC}"
    echo -e "${PURPLE}║     Attendance Dashboard Configuration     ║${NC}"
    echo -e "${PURPLE}╚════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo -e "\n${BLUE}📋 $1${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_feature() {
    echo -e "  ${YELLOW}✓${NC} $1"
}

# Check system info
check_system() {
    print_section "System Information"
    
    CPU_CORES=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo "Unknown")
    MEMORY=$(free -h 2>/dev/null | grep '^Mem:' | awk '{print $2}' || sysctl -n hw.memsize 2>/dev/null | awk '{print $1/1024/1024/1024 " GB"}' || echo "Unknown")
    
    print_info "CPU Cores: $CPU_CORES"
    print_info "Total Memory: $MEMORY"
    print_info "PM2 will use all $CPU_CORES cores in cluster mode"
    echo ""
}

# Show PM2 configuration features
show_features() {
    print_section "PM2 Configuration Features"
    
    echo -e "${BLUE}🚀 Main API Server (attendance-dashboard-api):${NC}"
    print_feature "Cluster Mode: instances: 0 (auto-detect all CPU cores)"
    print_feature "Memory Limit: 2GB per instance with auto-restart"
    print_feature "Auto Restart: Exponential backoff on failures"
    print_feature "Max Restarts: 10 attempts within restart window"
    print_feature "Min Uptime: 10 seconds before success"
    print_feature "Node Args: --max-old-space-size=2048 --enable-source-maps"
    
    echo ""
    echo -e "${BLUE}🔧 Background Worker (attendance-dashboard-worker):${NC}"
    print_feature "Fork Mode: Single instance for background tasks"
    print_feature "Memory Limit: 1GB with auto-restart"
    print_feature "Scheduled Tasks: Cache cleanup, DB maintenance, metrics"
    print_feature "Cron Restart: Daily at 3 AM for maintenance"
    print_feature "Health Endpoint: Optional HTTP server for monitoring"
    
    echo ""
    echo -e "${BLUE}📊 Advanced Features:${NC}"
    print_feature "Zero Downtime Deployment: pm2 reload"
    print_feature "Load Balancing: Round-robin across instances"
    print_feature "Graceful Shutdown: 5s timeout for cleanup"
    print_feature "Log Management: Structured logging with timestamps"
    print_feature "Health Monitoring: Built-in process monitoring"
    print_feature "Auto-start: System boot integration"
    echo ""
}

# Show configuration details
show_config() {
    print_section "Configuration Details"
    
    echo -e "${YELLOW}📄 Ecosystem Configuration (ecosystem.config.js):${NC}"
    echo ""
    cat << 'EOF'
{
  apps: [
    {
      name: 'attendance-dashboard-api',
      script: './backend/server.js',
      instances: 0,                    // ← Auto-detect CPU cores
      exec_mode: 'cluster',            // ← Enable cluster mode
      autorestart: true,               // ← Restart on failure
      max_memory_restart: '2G',        // ← Memory limit
      exponential_backoff_restart_delay: 100,
      max_restarts: 10,                // ← Failure tolerance
      min_uptime: '10s'                // ← Success criteria
    },
    {
      name: 'attendance-dashboard-worker',
      script: './backend/worker.js',
      instances: 1,                    // ← Single worker instance
      exec_mode: 'fork',               // ← Fork mode for worker
      cron_restart: '0 3 * * *'        // ← Daily restart at 3 AM
    }
  ]
}
EOF
    echo ""
}

# Show usage commands
show_usage() {
    print_section "Usage Commands"
    
    echo -e "${GREEN}🎮 Quick Commands:${NC}"
    echo "  npm run pm2:start       # Start all applications"
    echo "  npm run pm2:start-prod  # Start in production mode"
    echo "  npm run pm2:status      # Show process status"
    echo "  npm run pm2:logs        # View application logs"
    echo "  npm run pm2:monitor     # Real-time monitoring"
    echo "  npm run pm2:health      # Health check"
    echo "  npm run pm2:reload      # Zero-downtime reload"
    echo ""
    
    echo -e "${GREEN}🔧 PM2 Manager Script:${NC}"
    echo "  ./pm2-manager.sh start     # Start with cluster detection"
    echo "  ./pm2-manager.sh status    # Detailed status information"
    echo "  ./pm2-manager.sh perf      # Performance statistics"
    echo "  ./pm2-manager.sh health    # Comprehensive health check"
    echo "  ./pm2-manager.sh backup    # Backup PM2 configuration"
    echo ""
}

# Show cluster benefits
show_benefits() {
    print_section "Cluster Mode Benefits"
    
    echo -e "${YELLOW}⚡ Performance Benefits:${NC}"
    print_feature "CPU Utilization: Uses all available CPU cores"
    print_feature "Load Distribution: Requests distributed across instances"
    print_feature "Parallel Processing: Multiple requests handled simultaneously"
    print_feature "Memory Efficiency: Process isolation prevents memory leaks"
    
    echo ""
    echo -e "${YELLOW}🛡️ Reliability Benefits:${NC}"
    print_feature "High Availability: If one process crashes, others continue"
    print_feature "Zero Downtime: Rolling restarts without service interruption"
    print_feature "Failure Isolation: Worker failures don't affect API server"
    print_feature "Automatic Recovery: Exponential backoff restart strategy"
    
    echo ""
    echo -e "${YELLOW}🔍 Monitoring Benefits:${NC}"
    print_feature "Real-time Metrics: CPU, memory, and restart statistics"
    print_feature "Log Aggregation: Centralized logging from all instances"
    print_feature "Health Checks: Built-in monitoring and alerting"
    print_feature "Performance Tracking: Instance-level performance data"
    echo ""
}

# Show next steps
show_next_steps() {
    print_section "Next Steps"
    
    echo -e "${GREEN}🚀 To start using PM2:${NC}"
    echo ""
    echo "1. Install PM2 globally:"
    echo "   npm install -g pm2"
    echo ""
    echo "2. Install backend dependencies:"
    echo "   cd backend && npm install"
    echo ""
    echo "3. Start the applications:"
    echo "   npm run pm2:start"
    echo ""
    echo "4. Monitor the processes:"
    echo "   npm run pm2:monitor"
    echo ""
    echo "5. Check health status:"
    echo "   npm run pm2:health"
    echo ""
    
    echo -e "${BLUE}📚 For more information:${NC}"
    echo "  • PM2_CONFIGURATION.md - Detailed documentation"
    echo "  • ./pm2-manager.sh help - Available commands"
    echo "  • PM2 Official Docs: https://pm2.keymetrics.io/"
    echo ""
}

# Main execution
main() {
    print_header
    check_system
    show_features
    show_config
    show_usage
    show_benefits
    show_next_steps
    
    echo -e "${PURPLE}🎉 PM2 Cluster Configuration Complete!${NC}"
    echo -e "${GREEN}Your attendance dashboard is ready for production deployment${NC}"
    echo -e "${GREEN}with automatic clustering, failure recovery, and monitoring.${NC}"
    echo ""
}

# Run the demo
main
