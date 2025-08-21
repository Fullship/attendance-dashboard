# Clinic.js Performance Profiling Setup - Complete Guide

## 🎉 Installation Complete!

Your Node.js backend is now instrumented with comprehensive Clinic.js performance profiling tools.

## 📋 What's Been Installed

### Core Tools
- ✅ **Clinic.js v13.0.0** - Main profiling toolkit
- ✅ **@clinic/doctor** - I/O and event loop analysis
- ✅ **@clinic/flame** - CPU profiling and flamegraph generation
- ✅ **@clinic/bubbleprof** - Event loop delay analysis

### Scripts Created
- ✅ **load-test.js** - Realistic API load testing
- ✅ **analyze-results.js** - Automated report generation
- ✅ **profile.js** - Orchestrated profiling workflow
- ✅ **verify-setup.js** - Setup verification

## 🚀 Quick Commands

### Run Complete Performance Analysis
```bash
cd backend
npm run perf:profile
```
**This command will:**
1. Run Doctor profiler (I/O analysis) with load testing
2. Run Flame profiler (CPU analysis) with load testing  
3. Run Bubbleprof profiler (event loop analysis) with load testing
4. Generate comprehensive analysis reports
5. Create flamegraphs for CPU hotspot visualization

### Run Individual Profilers
```bash
# CPU profiling and flamegraph generation
npm run perf:profile-single flame

# I/O and event loop issue detection
npm run perf:profile-single doctor

# Event loop delay analysis
npm run perf:profile-single bubbleprof
```

### Manual Profiling (Advanced)
```bash
# Start server with profiler
npm run perf:flame  # or perf:doctor, perf:bubbleprof

# In another terminal, generate load
npm run perf:load-test

# Stop server (Ctrl+C) to generate profile
```

## 📊 Understanding the Output

### 🔥 Flamegraphs (CPU Analysis)
- **Location**: `.clinic/flame.[timestamp]/flamegraph.html`
- **Purpose**: Visualize CPU usage patterns
- **How to read**: 
  - Width = time spent in function
  - Height = call stack depth
  - Click to zoom into hotspots

### 🩺 Doctor Reports (I/O Analysis)
- **Location**: `.clinic/doctor.[timestamp]/doctor.html`
- **Purpose**: Detect blocking operations and I/O issues
- **Provides**: Specific recommendations for optimization

### 🫧 Bubbleprof (Event Loop)
- **Location**: `.clinic/bubbleprof.[timestamp]/bubbleprof.html`
- **Purpose**: Analyze event loop delay patterns
- **Shows**: Async operation timing and delays

### 📋 Analysis Reports
- **Summary**: `performance/reports/performance-summary.md`
- **Detailed**: `performance/reports/detailed-analysis.json`
- **Load Test**: `performance/load-test-results-[timestamp].json`

## 🎯 Example Workflow

1. **Baseline Performance**
   ```bash
   npm run perf:profile
   ```

2. **Review Results**
   - Open flamegraph: `open .clinic/flame.*/flamegraph.html`
   - Check doctor report: `open .clinic/doctor.*/doctor.html`
   - Read summary: `cat performance/reports/performance-summary.md`

3. **Optimize Code**
   - Fix CPU hotspots identified in flamegraph
   - Address I/O issues from doctor report
   - Optimize async operations per bubbleprof

4. **Measure Improvements**
   ```bash
   npm run perf:clean  # Clear old data
   npm run perf:profile  # Re-run analysis
   ```

## 🔧 Load Test Configuration

The load tester simulates realistic usage:

- **Concurrent Users**: 10 (5 during profiling)
- **Test Duration**: 60 seconds (30s during profiling)
- **API Endpoints**:
  - Login: 20% of requests
  - Employee data: 30% of requests
  - Attendance records: 25% of requests
  - Teams: 15% of requests
  - Locations: 10% of requests

## 📈 Performance Targets

### Response Time Goals:
- **P50**: < 50ms
- **P90**: < 100ms
- **P95**: < 200ms
- **P99**: < 500ms

### Throughput Goals:
- **Minimum**: 100 req/s
- **Target**: 500 req/s
- **Optimal**: 1000+ req/s

## 🛠️ Troubleshooting

### Port 3002 In Use
```bash
# Find process using port
lsof -i :3002

# Kill process
pkill -f "node server.js"
```

### No Profile Data Generated
- Ensure server stopped with Ctrl+C (not killed)
- Check for startup errors
- Verify Clinic.js packages installed

### Empty Flamegraphs
- Run longer load tests
- Ensure actual CPU load during profiling
- Check server is processing requests

## 📖 Additional Resources

- [Clinic.js Documentation](https://clinicjs.org/)
- [Node.js Performance Guide](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Flamegraph Tutorial](http://www.brendangregg.com/flamegraphs.html)

## 🎪 Advanced Usage

### Custom Load Patterns
Edit `performance/load-test.js` to modify:
- Request patterns
- User simulation
- Test duration
- Endpoint weights

### Continuous Profiling
```bash
# Profile specific scenarios
npm run perf:profile-single flame

# Analyze specific endpoints
# Modify load-test.js endpoint configuration

# Compare before/after optimizations
npm run perf:analyze
```

### Production Monitoring
Consider integrating:
- Application Performance Monitoring (APM)
- Custom metrics collection
- Automated performance regression testing

---

## ✅ Next Steps

1. **Run your first profile**: `npm run perf:profile`
2. **Review the flamegraph** for CPU hotspots
3. **Check doctor recommendations** for I/O optimizations
4. **Implement fixes** based on analysis
5. **Re-run profiling** to measure improvements

🎉 **Your performance profiling toolkit is ready to use!**
