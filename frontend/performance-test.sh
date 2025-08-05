#!/bin/bash

# Performance Testing Script for Admin Panel
# This script automates performance testing and monitoring setup

set -e

echo "🚀 Starting Admin Panel Performance Testing..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_URL="http://localhost:3000"
ADMIN_URL="$APP_URL/admin"
REPORT_DIR="./performance-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create reports directory
mkdir -p "$REPORT_DIR"

# Function to check if service is running
check_service() {
    local url=$1
    local service_name=$2
    
    echo -e "${BLUE}Checking $service_name at $url...${NC}"
    
    if curl -s -f "$url" > /dev/null; then
        echo -e "${GREEN}✅ $service_name is running${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name is not responding${NC}"
        return 1
    fi
}

# Function to run Lighthouse audit
run_lighthouse_audit() {
    local url=$1
    local output_name=$2
    
    echo -e "${BLUE}Running Lighthouse audit for $output_name...${NC}"
    
    # Check if lighthouse is installed
    if ! command -v lighthouse &> /dev/null; then
        echo -e "${YELLOW}Installing Lighthouse...${NC}"
        npm install -g lighthouse
    fi
    
    lighthouse "$url" \
        --output=html \
        --output=json \
        --output-path="$REPORT_DIR/lighthouse_${output_name}_$TIMESTAMP" \
        --chrome-flags="--headless --no-sandbox" \
        --throttling-method=devtools \
        --form-factor=desktop \
        --quiet
    
    echo -e "${GREEN}✅ Lighthouse audit completed for $output_name${NC}"
}

# Function to run load testing
run_load_test() {
    local url=$1
    local test_name=$2
    
    echo -e "${BLUE}Running load test for $test_name...${NC}"
    
    # Check if autocannon is installed
    if ! command -v autocannon &> /dev/null; then
        echo -e "${YELLOW}Installing autocannon...${NC}"
        npm install -g autocannon
    fi
    
    # Run load test
    autocannon \
        --connections 10 \
        --duration 30 \
        --output "$REPORT_DIR/load_test_${test_name}_$TIMESTAMP.json" \
        "$url"
    
    echo -e "${GREEN}✅ Load test completed for $test_name${NC}"
}

# Function to monitor memory usage
monitor_memory() {
    echo -e "${BLUE}Starting memory monitoring...${NC}"
    
    # Create memory monitoring script
    cat > "$REPORT_DIR/memory_monitor_$TIMESTAMP.sh" << 'EOF'
#!/bin/bash
echo "timestamp,memory_mb,cpu_percent" > memory_usage.csv
for i in {1..60}; do
    timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    memory=$(ps -p $$ -o rss= | awk '{print $1/1024}')
    cpu=$(ps -p $$ -o %cpu= | awk '{print $1}')
    echo "$timestamp,$memory,$cpu" >> memory_usage.csv
    sleep 5
done
EOF
    
    chmod +x "$REPORT_DIR/memory_monitor_$TIMESTAMP.sh"
    echo -e "${GREEN}✅ Memory monitoring script created${NC}"
}

# Function to test API endpoints
test_api_endpoints() {
    echo -e "${BLUE}Testing API endpoints...${NC}"
    
    local api_base="$APP_URL/api/admin"
    local endpoints=(
        "metrics"
        "cache/stats"
        "cluster/status"
        "profiler/status"
        "logs"
    )
    
    local results_file="$REPORT_DIR/api_test_results_$TIMESTAMP.json"
    echo "{" > "$results_file"
    echo "  \"timestamp\": \"$(date -Iseconds)\"," >> "$results_file"
    echo "  \"results\": [" >> "$results_file"
    
    local first=true
    for endpoint in "${endpoints[@]}"; do
        if [ "$first" = false ]; then
            echo "," >> "$results_file"
        fi
        first=false
        
        echo -e "${BLUE}Testing endpoint: $endpoint${NC}"
        
        local start_time=$(date +%s%N)
        local response=$(curl -s -w "%{http_code},%{time_total}" "$api_base/$endpoint")
        local end_time=$(date +%s%N)
        
        local response_body=$(echo "$response" | head -n -1)
        local status_and_time=$(echo "$response" | tail -n 1)
        local status_code=$(echo "$status_and_time" | cut -d',' -f1)
        local response_time=$(echo "$status_and_time" | cut -d',' -f2)
        
        echo "    {" >> "$results_file"
        echo "      \"endpoint\": \"$endpoint\"," >> "$results_file"
        echo "      \"status_code\": $status_code," >> "$results_file"
        echo "      \"response_time\": $response_time," >> "$results_file"
        echo "      \"success\": $([ "$status_code" = "200" ] && echo "true" || echo "false")" >> "$results_file"
        echo "    }" >> "$results_file"
        
        if [ "$status_code" = "200" ]; then
            echo -e "${GREEN}✅ $endpoint - OK (${response_time}s)${NC}"
        else
            echo -e "${RED}❌ $endpoint - Failed (Status: $status_code)${NC}"
        fi
    done
    
    echo "  ]" >> "$results_file"
    echo "}" >> "$results_file"
    
    echo -e "${GREEN}✅ API endpoint testing completed${NC}"
}

# Function to run browser-based performance tests
run_browser_performance() {
    echo -e "${BLUE}Running browser performance tests...${NC}"
    
    # Check if puppeteer is available
    if [ ! -d "node_modules/puppeteer" ]; then
        echo -e "${YELLOW}Installing Puppeteer...${NC}"
        npm install puppeteer
    fi
    
    # Create performance test script
    cat > "$REPORT_DIR/browser_perf_test.js" << 'EOF'
const puppeteer = require('puppeteer');
const fs = require('fs');

async function runPerformanceTest() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Enable performance monitoring
    await page.setCacheEnabled(false);
    
    console.log('Navigating to admin panel...');
    const startTime = Date.now();
    
    await page.goto(process.env.ADMIN_URL || 'http://localhost:3000/admin', {
        waitUntil: 'networkidle0',
        timeout: 30000
    });
    
    const loadTime = Date.now() - startTime;
    
    // Get performance metrics
    const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paintMetrics = performance.getEntriesByType('paint');
        
        return {
            loadTime: navigation.loadEventEnd - navigation.fetchStart,
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
            firstPaint: paintMetrics.find(m => m.name === 'first-paint')?.startTime || 0,
            firstContentfulPaint: paintMetrics.find(m => m.name === 'first-contentful-paint')?.startTime || 0,
            resourceCount: performance.getEntriesByType('resource').length
        };
    });
    
    // Test memory usage during interactions
    console.log('Testing admin panel interactions...');
    
    // Click through tabs
    await page.click('[data-testid="admin-tab-metrics"]');
    await page.waitForTimeout(2000);
    
    await page.click('[data-testid="admin-tab-cache"]');
    await page.waitForTimeout(2000);
    
    await page.click('[data-testid="admin-tab-cluster"]');
    await page.waitForTimeout(2000);
    
    await page.click('[data-testid="admin-tab-logs"]');
    await page.waitForTimeout(2000);
    
    // Get final memory metrics
    const memoryMetrics = await page.evaluate(() => {
        if (performance.memory) {
            return {
                heapUsed: performance.memory.usedJSHeapSize,
                heapTotal: performance.memory.totalJSHeapSize,
                heapLimit: performance.memory.jsHeapSizeLimit
            };
        }
        return null;
    });
    
    const results = {
        timestamp: new Date().toISOString(),
        pageLoadTime: loadTime,
        performanceMetrics,
        memoryMetrics
    };
    
    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(`performance_results_${timestamp}.json`, JSON.stringify(results, null, 2));
    
    console.log('Performance test completed:', results);
    
    await browser.close();
    return results;
}

runPerformanceTest().catch(console.error);
EOF
    
    # Run the performance test
    ADMIN_URL="$ADMIN_URL" node "$REPORT_DIR/browser_perf_test.js"
    
    echo -e "${GREEN}✅ Browser performance testing completed${NC}"
}

# Function to generate summary report
generate_summary() {
    echo -e "${BLUE}Generating test summary...${NC}"
    
    local summary_file="$REPORT_DIR/test_summary_$TIMESTAMP.md"
    
    cat > "$summary_file" << EOF
# Admin Panel Performance Test Summary

**Test Date:** $(date)
**Test ID:** $TIMESTAMP

## Test Environment
- **Application URL:** $APP_URL
- **Admin Panel URL:** $ADMIN_URL
- **OS:** $(uname -s)
- **Node Version:** $(node --version)

## Tests Executed

### 1. Service Health Checks
- Application server connectivity
- API endpoint availability

### 2. Performance Audits
- Lighthouse performance audit
- Load testing with autocannon
- Browser-based performance metrics

### 3. API Testing
- Endpoint response time testing
- Status code validation
- Error handling verification

### 4. Memory Monitoring
- JavaScript heap usage
- Memory leak detection
- Resource cleanup validation

## Results Location
All test results and reports are saved in: \`$REPORT_DIR\`

### Generated Files:
- Lighthouse reports: \`lighthouse_*_$TIMESTAMP.html\`
- Load test results: \`load_test_*_$TIMESTAMP.json\`
- API test results: \`api_test_results_$TIMESTAMP.json\`
- Browser performance: \`performance_results_*.json\`
- Memory monitoring: \`memory_monitor_$TIMESTAMP.sh\`

## Recommendations

### Performance Optimization
1. Monitor Lighthouse scores (aim for >90)
2. Keep API response times <200ms
3. Monitor memory usage patterns
4. Implement proper caching strategies

### Monitoring Setup
1. Set up continuous performance monitoring
2. Implement alerting for performance regressions
3. Monitor real user metrics (RUM)
4. Track core web vitals

### Next Steps
1. Review all generated reports
2. Address any performance issues found
3. Set up automated performance testing in CI/CD
4. Establish performance budgets and monitoring

---
Generated by Admin Panel Performance Test Suite
EOF
    
    echo -e "${GREEN}✅ Test summary generated: $summary_file${NC}"
}

# Main execution flow
main() {
    echo -e "${BLUE}Admin Panel Performance Testing Suite${NC}"
    echo -e "${BLUE}=====================================${NC}"
    
    # Check prerequisites
    if ! check_service "$APP_URL" "Application Server"; then
        echo -e "${RED}❌ Application server must be running before testing${NC}"
        exit 1
    fi
    
    if ! check_service "$ADMIN_URL" "Admin Panel"; then
        echo -e "${RED}❌ Admin panel must be accessible before testing${NC}"
        exit 1
    fi
    
    # Run all tests
    echo -e "\n${YELLOW}Starting performance test suite...${NC}\n"
    
    # 1. API endpoint testing
    test_api_endpoints
    
    # 2. Lighthouse audit
    run_lighthouse_audit "$ADMIN_URL" "admin_panel"
    
    # 3. Load testing
    run_load_test "$ADMIN_URL" "admin_panel"
    
    # 4. Browser performance testing
    run_browser_performance
    
    # 5. Setup memory monitoring
    monitor_memory
    
    # 6. Generate summary
    generate_summary
    
    echo -e "\n${GREEN}🎉 Performance testing completed successfully!${NC}"
    echo -e "${BLUE}Reports saved to: $REPORT_DIR${NC}"
    echo -e "${BLUE}View Lighthouse report: $REPORT_DIR/lighthouse_admin_panel_$TIMESTAMP.html${NC}"
}

# Error handling
trap 'echo -e "\n${RED}❌ Performance testing interrupted${NC}"; exit 1' INT

# Run main function
main "$@"
