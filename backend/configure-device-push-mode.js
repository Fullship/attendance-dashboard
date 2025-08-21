/**
 * Script to configure device for HTTP push mode (Event Notification)
 */

const axios = require('axios');

class DeviceConfigurator {
  constructor() {
    this.deviceIP = '37.156.107.108';
    this.devicePort = '43821';
    this.baseURL = `http://${this.deviceIP}:${this.devicePort}`;
    this.credentials = {
      username: 'admin',
      password: 'your-admin-password' // Replace with actual password
    };
  }

  async configureHttpNotification() {
    console.log('🔧 Configuring Device for HTTP Event Notifications');
    console.log('=================================================\n');

    try {
      // Step 1: Configure HTTP Host for notifications
      console.log('1️⃣ Setting up HTTP notification host...');
      
      const httpHostConfig = {
        HttpHostNotification: {
          id: 1,
          url: 'http://YOUR_SERVER_IP:8080/ISAPI/Event/notification',
          protocolType: 'HTTP',
          parameterFormatType: 'DEFAULT',
          addressingFormatType: 'ipaddress',
          httpAuthenticationMethod: 'none', // or 'basic' if you want authentication
          httpAccountName: '',
          httpPassword: ''
        }
      };

      const configResponse = await this.makeRequest(
        'PUT',
        '/ISAPI/Event/notification/httpHosts/1',
        httpHostConfig
      );
      
      console.log('✅ HTTP host configured:', configResponse.data);

      // Step 2: Enable event notifications
      console.log('\n2️⃣ Enabling event notifications...');
      
      const eventConfig = {
        EventNotificationAlert: {
          eventType: 'AccessControllerEvent',
          eventState: 'active',
          EventNotificationAlertList: [
            {
              id: 1,
              eventType: 'AccessControllerEvent',
              eventState: 'active',
              EventSubscriptionList: [
                {
                  eventType: 'cardSwipe'
                },
                {
                  eventType: 'doorOpen'
                },
                {
                  eventType: 'doorClose'
                }
              ]
            }
          ]
        }
      };

      const notificationResponse = await this.makeRequest(
        'PUT',
        '/ISAPI/Event/notification/alertStream',
        eventConfig
      );
      
      console.log('✅ Event notifications enabled:', notificationResponse.data);

      // Step 3: Get current configuration to verify
      console.log('\n3️⃣ Verifying configuration...');
      
      const currentConfig = await this.makeRequest('GET', '/ISAPI/Event/notification/httpHosts/1');
      console.log('📋 Current HTTP host config:', JSON.stringify(currentConfig.data, null, 2));

      console.log('\n🎉 Device configuration completed successfully!');
      console.log('\n📋 Summary:');
      console.log(`📡 Device: ${this.deviceIP}:${this.devicePort}`);
      console.log('🔗 Notification URL: http://YOUR_SERVER_IP:8080/ISAPI/Event/notification');
      console.log('📨 Method: HTTP POST');
      console.log('🔐 Authentication: None (configurable)');

    } catch (error) {
      console.error('❌ Configuration failed:', error.message);
      
      if (error.response) {
        console.error('📄 Response data:', error.response.data);
        console.error('📊 Status:', error.response.status);
      }

      this.showManualConfigurationInstructions();
    }
  }

  async makeRequest(method, endpoint, data = null) {
    const config = {
      method,
      url: `${this.baseURL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      auth: this.credentials,
      timeout: 10000
    };

    if (data) {
      config.data = data;
    }

    console.log(`🔄 ${method} ${endpoint}`);
    return await axios(config);
  }

  showManualConfigurationInstructions() {
    console.log('\n📋 Manual Configuration Instructions');
    console.log('====================================');
    console.log('\nIf automatic configuration failed, configure your device manually:');
    console.log('\n1. Access device web interface:');
    console.log(`   URL: http://${this.deviceIP}:${this.devicePort}`);
    console.log(`   Username: ${this.credentials.username}`);
    console.log('   Password: [your-password]');
    
    console.log('\n2. Navigate to: Configuration > Event > Basic Event');
    console.log('   OR: Configuration > Network > Advanced > HTTP Listening');
    
    console.log('\n3. Configure HTTP Notification:');
    console.log('   ✅ Enable HTTP Notification: YES');
    console.log('   ✅ Notification URL: http://YOUR_SERVER_IP:8080/ISAPI/Event/notification');
    console.log('   ✅ Method: POST');
    console.log('   ✅ Content-Type: application/json');
    console.log('   ✅ Authentication: None (or Basic if needed)');
    
    console.log('\n4. Enable Event Types:');
    console.log('   ✅ Card Swipe Events');
    console.log('   ✅ Door Open/Close Events');
    console.log('   ✅ Access Control Events');
    
    console.log('\n5. Save and Apply Configuration');
    
    console.log('\n🔧 Alternative ISAPI Commands:');
    console.log(`curl -u "${this.credentials.username}:PASSWORD" \\`);
    console.log(`  -X PUT "http://${this.deviceIP}:${this.devicePort}/ISAPI/Event/notification/httpHosts/1" \\`);
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{');
    console.log('    "HttpHostNotification": {');
    console.log('      "id": 1,');
    console.log('      "url": "http://YOUR_SERVER_IP:8080/ISAPI/Event/notification",');
    console.log('      "protocolType": "HTTP",');
    console.log('      "parameterFormatType": "DEFAULT"');
    console.log('    }');
    console.log('  }\'');
  }

  async testCurrentConfiguration() {
    console.log('🧪 Testing Current Device Configuration');
    console.log('=====================================\n');

    try {
      // Get device info
      console.log('1️⃣ Getting device information...');
      const deviceInfo = await this.makeRequest('GET', '/ISAPI/System/deviceInfo');
      console.log('📱 Device Model:', deviceInfo.data?.DeviceInfo?.model || 'Unknown');
      console.log('📦 Firmware:', deviceInfo.data?.DeviceInfo?.firmwareVersion || 'Unknown');

      // Get current HTTP hosts configuration
      console.log('\n2️⃣ Checking HTTP notification configuration...');
      const httpHosts = await this.makeRequest('GET', '/ISAPI/Event/notification/httpHosts');
      console.log('📋 HTTP Hosts Configuration:', JSON.stringify(httpHosts.data, null, 2));

      // Check event configuration
      console.log('\n3️⃣ Checking event notification settings...');
      const eventConfig = await this.makeRequest('GET', '/ISAPI/Event/notification');
      console.log('📋 Event Configuration:', JSON.stringify(eventConfig.data, null, 2));

    } catch (error) {
      console.error('❌ Test failed:', error.message);
      if (error.response) {
        console.error('📊 Status:', error.response.status);
        console.error('📄 Response:', error.response.data);
      }
    }
  }
}

async function main() {
  const configurator = new DeviceConfigurator();
  
  console.log('🎯 Device Configuration Helper');
  console.log('==============================\n');
  
  const args = process.argv.slice(2);
  
  if (args.includes('--test') || args.includes('-t')) {
    await configurator.testCurrentConfiguration();
  } else if (args.includes('--configure') || args.includes('-c')) {
    await configurator.configureHttpNotification();
  } else {
    console.log('Usage:');
    console.log('  node configure-device-push-mode.js --test       # Test current configuration');
    console.log('  node configure-device-push-mode.js --configure  # Configure push mode');
    console.log('');
    
    console.log('🔍 First, let\'s test the current configuration:');
    await configurator.testCurrentConfiguration();
    
    console.log('\n💡 To configure push mode, run:');
    console.log('node configure-device-push-mode.js --configure');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DeviceConfigurator;