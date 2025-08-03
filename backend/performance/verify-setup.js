#!/usr/bin/env node

/**
 * Performance Tools Setup Verification
 *
 * This script verifies that all performance tools are properly installed
 * and provides setup instructions.
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

class SetupVerifier {
  constructor() {
    this.checks = [];
  }

  async checkNodeModules() {
    const requiredPackages = ['@clinic/doctor', '@clinic/flame', '@clinic/bubbleprof', 'clinic'];

    console.log('📦 Checking required packages...');

    for (const pkg of requiredPackages) {
      try {
        const packagePath = path.join(__dirname, '..', 'node_modules', pkg);
        if (fs.existsSync(packagePath)) {
          console.log(`✅ ${pkg} - installed`);
          this.checks.push({ name: pkg, status: 'ok' });
        } else {
          console.log(`❌ ${pkg} - missing`);
          this.checks.push({ name: pkg, status: 'missing' });
        }
      } catch (error) {
        console.log(`❌ ${pkg} - error checking`);
        this.checks.push({ name: pkg, status: 'error' });
      }
    }
  }

  async checkClinicCommand() {
    console.log('\n🔧 Checking clinic command...');

    try {
      const { stdout } = await execAsync('npx clinic --version');
      console.log(`✅ Clinic.js version: ${stdout.trim()}`);
      this.checks.push({ name: 'clinic-command', status: 'ok' });
    } catch (error) {
      console.log('❌ Clinic command not available');
      this.checks.push({ name: 'clinic-command', status: 'error' });
    }
  }

  async checkScripts() {
    console.log('\n📜 Checking performance scripts...');

    const scripts = ['load-test.js', 'analyze-results.js', 'profile.js'];

    for (const script of scripts) {
      const scriptPath = path.join(__dirname, script);
      if (fs.existsSync(scriptPath)) {
        console.log(`✅ ${script} - exists`);
        this.checks.push({ name: script, status: 'ok' });
      } else {
        console.log(`❌ ${script} - missing`);
        this.checks.push({ name: script, status: 'missing' });
      }
    }
  }

  async checkServerFile() {
    console.log('\n🚀 Checking server file...');

    const serverPath = path.join(__dirname, '..', 'server.js');
    if (fs.existsSync(serverPath)) {
      console.log('✅ server.js - found');
      this.checks.push({ name: 'server.js', status: 'ok' });
    } else {
      console.log('❌ server.js - missing');
      this.checks.push({ name: 'server.js', status: 'missing' });
    }
  }

  async checkPort() {
    console.log('\n🌐 Checking port availability...');

    try {
      await execAsync('lsof -i :3002');
      console.log('⚠️  Port 3002 is in use - you may need to stop existing server');
      this.checks.push({ name: 'port-3002', status: 'in-use' });
    } catch (error) {
      console.log('✅ Port 3002 is available');
      this.checks.push({ name: 'port-3002', status: 'available' });
    }
  }

  generateReport() {
    console.log('\n📊 Setup Verification Report');
    console.log('================================');

    const passed = this.checks.filter(c => c.status === 'ok').length;
    const total = this.checks.length;

    console.log(`✅ Passed: ${passed}/${total}`);

    const failed = this.checks.filter(c => c.status !== 'ok' && c.status !== 'available');
    if (failed.length > 0) {
      console.log('\n❌ Issues found:');
      failed.forEach(check => {
        console.log(`   ${check.name}: ${check.status}`);
      });

      console.log('\n🔧 Setup Instructions:');

      const missingPackages = failed.filter(
        c => c.name.startsWith('@clinic') || c.name === 'clinic'
      );
      if (missingPackages.length > 0) {
        console.log('📦 Install missing packages:');
        console.log(
          '   npm install --save-dev clinic @clinic/doctor @clinic/bubbleprof @clinic/flame'
        );
      }

      const missingScripts = failed.filter(c => c.name.endsWith('.js'));
      if (missingScripts.length > 0) {
        console.log('📜 Missing scripts - re-run setup or copy from repository');
      }

      if (failed.some(c => c.name === 'server.js')) {
        console.log("🚀 server.js missing - ensure you're in the backend directory");
      }
    } else {
      console.log('\n🎉 All checks passed! Performance tools are ready to use.');
    }

    console.log('\n🚀 Quick Start:');
    console.log('   npm run perf:profile          # Full performance analysis');
    console.log('   npm run perf:profile-single flame  # Just CPU profiling');
    console.log('   npm run perf:load-test        # Load test only');
    console.log('\n📖 See performance/README.md for detailed usage instructions');
  }

  async run() {
    console.log('🔍 Verifying Performance Tools Setup...\n');

    await this.checkNodeModules();
    await this.checkClinicCommand();
    await this.checkScripts();
    await this.checkServerFile();
    await this.checkPort();

    this.generateReport();
  }
}

if (require.main === module) {
  const verifier = new SetupVerifier();
  verifier.run().catch(console.error);
}

module.exports = SetupVerifier;
