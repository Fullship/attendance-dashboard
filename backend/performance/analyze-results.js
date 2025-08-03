#!/usr/bin/env node

/**
 * Performance Analysis and Flamegraph Generator
 *
 * This script analyzes Clinic.js output files and generates
 * comprehensive performance reports with recommendations.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class PerformanceAnalyzer {
  constructor() {
    this.clinicOutputDir = path.join(__dirname, '..');
    this.reportsDir = path.join(__dirname, 'reports');
    this.ensureReportsDir();
  }

  ensureReportsDir() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  findClinicFiles() {
    const files = fs.readdirSync(this.clinicOutputDir);

    const clinicFiles = {
      doctor: files.filter(f => f.startsWith('.clinic') && f.includes('doctor')),
      flame: files.filter(f => f.startsWith('.clinic') && f.includes('flame')),
      bubbleprof: files.filter(f => f.startsWith('.clinic') && f.includes('bubbleprof')),
    };

    return clinicFiles;
  }

  async generateFlamegraph(flameDir) {
    console.log('🔥 Generating flamegraph...');

    try {
      // Check if flamegraph files exist
      const flamegraphPath = path.join(flameDir, 'flamegraph.html');

      if (fs.existsSync(flamegraphPath)) {
        console.log(`✅ Flamegraph already exists: ${flamegraphPath}`);
        return flamegraphPath;
      }

      // Try to generate flamegraph using clinic flame
      const command = `cd ${this.clinicOutputDir} && npx clinic flame --open false ${path.basename(
        flameDir
      )}`;
      await execAsync(command);

      console.log(`✅ Flamegraph generated: ${flamegraphPath}`);
      return flamegraphPath;
    } catch (error) {
      console.error('❌ Error generating flamegraph:', error.message);
      return null;
    }
  }

  analyzeDoctor(doctorDirs) {
    console.log('🩺 Analyzing Doctor reports...');

    const analysis = {
      recommendations: [],
      metrics: {},
      issues: [],
    };

    doctorDirs.forEach(dir => {
      const dirPath = path.join(this.clinicOutputDir, dir);

      try {
        // Look for recommendations file
        const files = fs.readdirSync(dirPath);
        const recommendationsFile = files.find(
          f => f.includes('recommendations') || f.includes('analysis')
        );

        if (recommendationsFile) {
          const content = fs.readFileSync(path.join(dirPath, recommendationsFile), 'utf8');
          analysis.recommendations.push({
            source: dir,
            content: content,
          });
        }

        // Look for metrics
        const metricsFile = files.find(f => f.includes('metrics') || f.includes('stats'));
        if (metricsFile) {
          try {
            const metrics = JSON.parse(fs.readFileSync(path.join(dirPath, metricsFile), 'utf8'));
            analysis.metrics[dir] = metrics;
          } catch (e) {
            // Non-JSON metrics file
          }
        }
      } catch (error) {
        analysis.issues.push(`Error analyzing ${dir}: ${error.message}`);
      }
    });

    return analysis;
  }

  analyzeFlame(flameDirs) {
    console.log('🔥 Analyzing Flame profiles...');

    const analysis = {
      hotspots: [],
      cpuUsage: {},
      flamegraphs: [],
    };

    flameDirs.forEach(async dir => {
      const dirPath = path.join(this.clinicOutputDir, dir);

      try {
        // Generate flamegraph
        const flamegraphPath = await this.generateFlamegraph(dirPath);
        if (flamegraphPath) {
          analysis.flamegraphs.push({
            source: dir,
            path: flamegraphPath,
            url: `file://${flamegraphPath}`,
          });
        }

        // Look for CPU analysis files
        const files = fs.readdirSync(dirPath);
        const dataFile = files.find(f => f.includes('data') || f.includes('profile'));

        if (dataFile) {
          analysis.hotspots.push({
            source: dir,
            dataFile: path.join(dirPath, dataFile),
          });
        }
      } catch (error) {
        console.error(`Error analyzing flame profile ${dir}:`, error.message);
      }
    });

    return analysis;
  }

  analyzeBubbleprof(bubbleprofDirs) {
    console.log('🫧 Analyzing Bubbleprof reports...');

    const analysis = {
      eventLoopDelay: {},
      asyncOperations: {},
      issues: [],
    };

    bubbleprofDirs.forEach(dir => {
      const dirPath = path.join(this.clinicOutputDir, dir);

      try {
        const files = fs.readdirSync(dirPath);

        // Look for bubbleprof data
        const dataFile = files.find(f => f.includes('data') || f.includes('profile'));
        if (dataFile) {
          analysis.eventLoopDelay[dir] = {
            dataFile: path.join(dirPath, dataFile),
            htmlReport: path.join(dirPath, 'bubbleprof.html'),
          };
        }
      } catch (error) {
        analysis.issues.push(`Error analyzing ${dir}: ${error.message}`);
      }
    });

    return analysis;
  }

  generateSummaryReport(doctorAnalysis, flameAnalysis, bubbleprofAnalysis) {
    const timestamp = new Date().toISOString();

    const report = `
# Performance Analysis Report
Generated: ${timestamp}

## 🩺 Doctor Analysis (Event Loop & I/O)

### Recommendations:
${
  doctorAnalysis.recommendations
    .map(r => `- **${r.source}**: Check detailed report for I/O and event loop recommendations`)
    .join('\n') || 'No doctor reports found'
}

### Issues Found:
${doctorAnalysis.issues.map(issue => `- ${issue}`).join('\n') || 'No issues detected'}

## 🔥 Flame Analysis (CPU Profiling)

### CPU Hotspots:
${
  flameAnalysis.hotspots
    .map(h => `- **${h.source}**: CPU profile data available at ${h.dataFile}`)
    .join('\n') || 'No flame profiles found'
}

### Flamegraphs:
${
  flameAnalysis.flamegraphs
    .map(fg => `- **${fg.source}**: [Open Flamegraph](${fg.url})`)
    .join('\n') || 'No flamegraphs generated'
}

## 🫧 Bubbleprof Analysis (Event Loop Delay)

### Event Loop Performance:
${
  Object.keys(bubbleprofAnalysis.eventLoopDelay)
    .map(key => `- **${key}**: Event loop delay analysis available`)
    .join('\n') || 'No bubbleprof data found'
}

### Issues:
${
  bubbleprofAnalysis.issues.map(issue => `- ${issue}`).join('\n') || 'No event loop issues detected'
}

## 📊 Performance Recommendations

### CPU Optimization:
1. **Profile CPU-intensive operations**: Use flamegraphs to identify hot code paths
2. **Optimize synchronous operations**: Move heavy computations to worker threads
3. **Reduce function call overhead**: Inline frequently called small functions

### Event Loop Optimization:
1. **Minimize blocking operations**: Ensure all I/O is asynchronous
2. **Batch operations**: Group multiple small operations together
3. **Use connection pooling**: For database and external API connections

### Memory Optimization:
1. **Monitor memory leaks**: Use clinic doctor to identify memory growth patterns
2. **Optimize object creation**: Reuse objects where possible
3. **Implement proper caching**: Balance memory usage with performance gains

## 🔧 Next Steps

1. **Review flamegraphs** to identify CPU bottlenecks
2. **Check doctor reports** for I/O and event loop issues
3. **Monitor event loop delay** using bubbleprof data
4. **Run load tests** before and after optimizations
5. **Set up continuous profiling** for production monitoring

## 📁 File Locations

### Clinic Reports:
${Object.entries({
  doctor: doctorAnalysis.recommendations.map(r => r.source),
  flame: flameAnalysis.hotspots.map(h => h.source),
  bubbleprof: Object.keys(bubbleprofAnalysis.eventLoopDelay),
})
  .map(([type, dirs]) =>
    dirs.length > 0 ? `- **${type}**: ${dirs.join(', ')}` : `- **${type}**: No reports found`
  )
  .join('\n')}

### Generated Reports:
- Summary Report: ${path.join(this.reportsDir, 'performance-summary.md')}
- Detailed Analysis: ${path.join(this.reportsDir, 'detailed-analysis.json')}
`;

    return report;
  }

  async generateDetailedAnalysis(doctorAnalysis, flameAnalysis, bubbleprofAnalysis) {
    return {
      timestamp: new Date().toISOString(),
      summary: {
        doctorReports: doctorAnalysis.recommendations.length,
        flameProfiles: flameAnalysis.hotspots.length,
        bubbleprofReports: Object.keys(bubbleprofAnalysis.eventLoopDelay).length,
        totalIssues: doctorAnalysis.issues.length + bubbleprofAnalysis.issues.length,
      },
      doctor: doctorAnalysis,
      flame: flameAnalysis,
      bubbleprof: bubbleprofAnalysis,
      recommendations: {
        priority: 'high',
        actions: [
          'Review CPU flamegraphs for optimization opportunities',
          'Check event loop delay patterns in bubbleprof',
          'Implement recommended I/O optimizations from doctor',
          'Set up performance monitoring in production',
        ],
      },
    };
  }

  async run() {
    console.log('🔍 Analyzing Clinic.js performance data...\n');

    const clinicFiles = this.findClinicFiles();

    console.log('📁 Found Clinic files:');
    console.log(`- Doctor: ${clinicFiles.doctor.length} reports`);
    console.log(`- Flame: ${clinicFiles.flame.length} profiles`);
    console.log(`- Bubbleprof: ${clinicFiles.bubbleprof.length} reports\n`);

    if (
      clinicFiles.doctor.length === 0 &&
      clinicFiles.flame.length === 0 &&
      clinicFiles.bubbleprof.length === 0
    ) {
      console.log('❌ No Clinic.js reports found!');
      console.log('💡 Run performance profiling first:');
      console.log('   npm run perf:doctor');
      console.log('   npm run perf:flame');
      console.log('   npm run perf:bubbleprof');
      return;
    }

    // Analyze each type
    const doctorAnalysis = this.analyzeDoctor(clinicFiles.doctor);
    const flameAnalysis = this.analyzeFlame(clinicFiles.flame);
    const bubbleprofAnalysis = this.analyzeBubbleprof(clinicFiles.bubbleprof);

    // Generate reports
    const summaryReport = this.generateSummaryReport(
      doctorAnalysis,
      flameAnalysis,
      bubbleprofAnalysis
    );
    const detailedAnalysis = await this.generateDetailedAnalysis(
      doctorAnalysis,
      flameAnalysis,
      bubbleprofAnalysis
    );

    // Save reports
    const summaryPath = path.join(this.reportsDir, 'performance-summary.md');
    const detailedPath = path.join(this.reportsDir, 'detailed-analysis.json');

    fs.writeFileSync(summaryPath, summaryReport);
    fs.writeFileSync(detailedPath, JSON.stringify(detailedAnalysis, null, 2));

    console.log('📊 Analysis complete!');
    console.log(`📄 Summary report: ${summaryPath}`);
    console.log(`📋 Detailed analysis: ${detailedPath}`);

    // Show flamegraph URLs
    if (flameAnalysis.flamegraphs.length > 0) {
      console.log('\n🔥 Flamegraphs available:');
      flameAnalysis.flamegraphs.forEach(fg => {
        console.log(`   ${fg.source}: ${fg.url}`);
      });
    }

    console.log('\n💡 Open the summary report for detailed recommendations and next steps.');
  }
}

// CLI command parsing
if (require.main === module) {
  const analyzer = new PerformanceAnalyzer();

  const command = process.argv[2];

  if (command === '--flamegraph-only') {
    // Just generate flamegraphs
    const clinicFiles = analyzer.findClinicFiles();
    if (clinicFiles.flame.length > 0) {
      Promise.all(
        clinicFiles.flame.map(dir =>
          analyzer.generateFlamegraph(path.join(analyzer.clinicOutputDir, dir))
        )
      ).then(() => {
        console.log('🔥 Flamegraphs generated!');
      });
    } else {
      console.log('❌ No flame profile data found');
    }
  } else {
    // Full analysis
    analyzer.run().catch(console.error);
  }
}

module.exports = PerformanceAnalyzer;
