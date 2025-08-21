// Test file to verify date formatting functions
import { formatDate, formatDateTime, formatDateWithDay, formatTime } from './src/utils/dateUtils.js';

// Test dates
const testDate = new Date('2025-07-04T14:30:00Z');
const testDateString = '2025-07-04';
const testTimeString = '14:30:00';

console.log('=== Date Formatting Tests ===');
console.log('Input Date object:', testDate);
console.log('Input Date string:', testDateString);
console.log('Input Time string:', testTimeString);
console.log('');

console.log('formatDate(testDate):', formatDate(testDate));
console.log('formatDate(testDateString):', formatDate(testDateString));
console.log('');

console.log('formatDateTime(testDate):', formatDateTime(testDate));
console.log('formatDateTime(testDateString):', formatDateTime(testDateString));
console.log('');

console.log('formatDateWithDay(testDate):', formatDateWithDay(testDate));
console.log('formatDateWithDay(testDateString):', formatDateWithDay(testDateString));
console.log('');

console.log('formatTime(testTimeString):', formatTime(testTimeString));
console.log('formatTime(null):', formatTime(null));
console.log('');

// Edge cases
console.log('=== Edge Cases ===');
console.log('formatDate("invalid"):', formatDate("invalid"));
console.log('formatTime("invalid"):', formatTime("invalid"));
