# Performance Profiling with Clinic.js

This directory contains comprehensive performance profiling tools for the Attendance Dashboard backend using Clinic.js.

## 🔧 Setup

The performance tools are already installed. If you need to reinstall:

```bash
npm install --save-dev clinic @clinic/doctor @clinic/bubbleprof @clinic/flame
```

## 🚀 Quick Start

### 1. Run Complete Performance Analysis
```bash
npm run perf:profile
```
This will:
- Run Doctor profiler (I/O and event loop analysis)
- Run Flame profiler (CPU profiling and flamegraphs)  
- Run Bubbleprof profiler (event loop delay analysis)
- Generate load tests for each profiler
- Analyze results and create comprehensive reports

### 2. Run Individual Profilers

**Doctor (I/O & Event Loop Issues):**
```bash
npm run perf:profile-single doctor
```

**Flame (CPU Profiling & Flamegraphs):**
```bash
npm run perf:profile-single flame
```

**Bubbleprof (Event Loop Delay):**
```bash
npm run perf:profile-single bubbleprof
```

### 3. Manual Profiling
```bash
# Start server with profiler
npm run perf:doctor   # or perf:flame, perf:bubbleprof

# In another terminal, run load test
npm run perf:load-test

# Stop server (Ctrl+C) to generate reports
```

### 4. Analyze Existing Results
```bash
npm run perf:analyze
```

### 5. Load Test Only
```bash
npm run perf:load-test
```

## 📊 Understanding the Output

### Doctor Profiler
- **Purpose**: Detects I/O and event loop issues
- **Output**: `.clinic/doctor.html` with recommendations
- **Best for**: Finding blocking operations, inefficient I/O patterns

### Flame Profiler  
- **Purpose**: CPU profiling and hot spot identification
- **Output**: Interactive flamegraph at `.clinic/flame.html`
- **Best for**: Finding CPU-intensive functions, optimization targets

### Bubbleprof Profiler
- **Purpose**: Event loop delay analysis
- **Output**: Bubble chart at `.clinic/bubbleprof.html`
- **Best for**: Understanding asynchronous operation patterns

## 📁 Generated Files

```
backend/
├── .clinic/                    # Clinic.js output directories
│   ├── doctor.[timestamp]/     # Doctor profiler data
│   ├── flame.[timestamp]/      # Flame profiler data & flamegraphs
│   └── bubbleprof.[timestamp]/ # Bubbleprof profiler data
├── performance/
│   ├── reports/                # Generated analysis reports
│   │   ├── performance-summary.md      # Human-readable summary
│   │   └── detailed-analysis.json      # Machine-readable data
│   └── load-test-results-*.json        # Load test metrics
```

## 📈 Load Test Configuration

The load tester simulates realistic API usage:

- **Concurrent Users**: 10 (5 during profiling)
- **Test Duration**: 60 seconds (30s during profiling)
- **Endpoints Tested**:
  - `POST /api/auth/login` (20% of requests)
  - `GET /api/admin/employees` (30% of requests)  
  - `GET /api/admin/attendance` (25% of requests)
  - `GET /api/admin/teams` (15% of requests)
  - `GET /api/admin/locations` (10% of requests)

Modify `performance/load-test.js` to adjust these parameters.

## 🔍 Reading Flamegraphs

Flamegraphs show CPU usage patterns:

- **Width**: Time spent in function (wider = more CPU time)
- **Height**: Call stack depth
- **Color**: Different functions (no significance to performance)
- **Click**: Zoom into specific function calls
- **Search**: Find specific functions in the graph

### Common Patterns to Look For:
- **Wide plateaus**: Functions using lots of CPU time
- **Towers**: Deep call stacks that might be inefficient
- **Repetitive patterns**: Loops or repeated function calls

## 🎯 Performance Optimization Workflow

1. **Baseline**: Run profilers before optimization
2. **Identify**: Find bottlenecks in reports and flamegraphs
3. **Optimize**: Implement performance improvements
4. **Measure**: Re-run profilers to validate improvements
5. **Compare**: Use reports to quantify performance gains

## 📋 Common Commands

```bash
# Full profiling workflow
npm run perf:profile

# Individual profiler with automatic load test
npm run perf:profile-single flame

# Just run load test against running server
npm run perf:load-test

# Analyze existing clinic data
npm run perf:analyze

# Clean up all generated files
npm run perf:clean

# Manual profiling (requires manual load testing)
npm run perf:doctor
npm run perf:flame  
npm run perf:bubbleprof
```

## 🔧 Troubleshooting

### Server Won't Start
- Check if port 3002 is already in use: `lsof -i :3002`
- Kill existing processes: `pkill -f "node server.js"`

### No Clinic Data Generated
- Ensure server was stopped with Ctrl+C (not killed)
- Check for errors in server startup
- Verify Clinic.js packages are installed

### Load Test Fails
- Ensure server is running on port 3002
- Check network connectivity
- Verify API endpoints are responding

### Empty Flamegraphs
- Run longer load tests (increase duration)
- Ensure CPU load during profiling
- Check if flame profiler data was generated

## 📖 Further Reading

- [Clinic.js Documentation](https://clinicjs.org/)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Understanding Flamegraphs](http://www.brendangregg.com/flamegraphs.html)

## 🎯 Performance Targets

### Response Time Targets:
- **P50**: < 50ms
- **P90**: < 100ms  
- **P95**: < 200ms
- **P99**: < 500ms

### Throughput Targets:
- **Minimum**: 100 req/s
- **Target**: 500 req/s
- **Optimal**: 1000+ req/s

### Event Loop Targets:
- **Event Loop Lag**: < 10ms average
- **CPU Usage**: < 70% under load
- **Memory Growth**: Stable (no leaks)
