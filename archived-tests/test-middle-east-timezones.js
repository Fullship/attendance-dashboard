// Test Middle East Timezone Functionality
// This file demonstrates the timezone features for Middle East regions

const testTimezones = [
  'Asia/Baghdad',
  'Asia/Dubai', 
  'Asia/Kuwait',
  'Asia/Riyadh',
  'Asia/Qatar',
  'Asia/Bahrain',
  'Asia/Muscat',
  'Asia/Tehran',
  'Asia/Istanbul',
  'Asia/Jerusalem',
  'Asia/Beirut',
  'Asia/Damascus',
  'Asia/Amman',
  'Africa/Cairo',
  'Asia/Aden'
];

console.log('🌍 Middle East Timezone Test');
console.log('============================');
console.log(`Current UTC time: ${new Date().toISOString()}`);
console.log('');

testTimezones.forEach(timezone => {
  try {
    const localTime = new Date().toLocaleString('en-US', {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
    
    console.log(`📍 ${timezone.padEnd(20)} | ${localTime}`);
  } catch (error) {
    console.log(`❌ ${timezone.padEnd(20)} | Invalid timezone`);
  }
});

console.log('');
console.log('✅ Timezone functionality test completed!');
