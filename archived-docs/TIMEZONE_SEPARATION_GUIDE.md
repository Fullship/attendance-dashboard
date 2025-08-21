# Timezone Separation and Validation Guide

## How to Separate Timezones by Different Locations

### 1. Location-Based Timezone Separation

The attendance dashboard now automatically separates timezones by location. Here's how it works:

#### Database Structure
- Each **Location** has a `timezone` field (e.g., 'Asia/Dubai', 'Asia/Baghdad')
- Each **Employee** is assigned to a `location_id`
- **Attendance records** inherit the timezone from the employee's location

#### API Endpoints for Timezone Analysis

```javascript
// Get timezone summary for all locations
GET /api/admin/timezone-summary

// Get attendance records grouped by timezone  
GET /api/admin/attendance-by-timezone?startDate=2024-07-01&endDate=2024-07-31

// Validate timestamps for a specific location
POST /api/admin/validate-timestamps
{
  "locationId": 1,
  "employeeId": 123,
  "timestamps": [
    "2024-07-12 09:00:00",
    "2024-07-12 17:30:00"
  ]
}
```

### 2. How Timezone Validation Works During Upload

#### Automatic Detection Process

When uploading attendance data, the system:

1. **Identifies Employee Location**: Looks up employee's assigned location
2. **Gets Location Timezone**: Retrieves the timezone for that location  
3. **Validates Timestamps**: Checks if timestamps are valid in that timezone
4. **Converts to UTC**: Stores all times in UTC for consistency
5. **Flags Issues**: Reports warnings for unusual times or weekend work

#### Example Validation Process

```javascript
// Input: Employee in Dubai Office (Asia/Dubai timezone)
{
  "employee": "john.doe@company.com",
  "date": "2024-07-12",
  "clock_in": "09:00:00",
  "clock_out": "17:30:00"
}

// System Processing:
1. Find employee → John Doe (ID: 123, Location: Dubai Office)
2. Get timezone → Asia/Dubai (GMT+4)
3. Parse times in local timezone:
   - clock_in: 2024-07-12 09:00:00 Asia/Dubai
   - clock_out: 2024-07-12 17:30:00 Asia/Dubai
4. Convert to UTC:
   - clock_in: 2024-07-12 05:00:00 UTC
   - clock_out: 2024-07-12 13:30:00 UTC
5. Validate business rules:
   - ✅ Normal work hours (9 AM - 5:30 PM local)
   - ✅ Weekday (not Friday/Saturday for Middle East)
   - ✅ Reasonable work duration (8.5 hours)
```

## Sample Attendance Data with Timezone Information

### CSV Format with Multiple Locations

```csv
Employee Email,First Name,Last Name,Date,Clock In,Clock Out,Location
john.doe@company.com,John,Doe,12/07/2024,09:00:00,17:30:00,Dubai Office
jane.smith@company.com,Jane,Smith,12/07/2024,08:30:00,16:30:00,Baghdad Branch
ahmed.ali@company.com,Ahmed,Ali,12/07/2024,08:00:00,17:00:00,Riyadh Center
sarah.wilson@company.com,Sarah,Wilson,12/07/2024,09:15:00,18:00:00,Main Office
```

### Timezone Conversion Examples

| Location | Local Time | Timezone | UTC Time | Validation |
|----------|------------|----------|----------|------------|
| Dubai Office | 09:00 | Asia/Dubai (GMT+4) | 05:00 UTC | ✅ Valid |
| Baghdad Branch | 08:30 | Asia/Baghdad (GMT+3) | 05:30 UTC | ✅ Valid |
| Riyadh Center | 08:00 | Asia/Riyadh (GMT+3) | 05:00 UTC | ✅ Valid |
| Main Office | 09:15 | America/New_York (GMT-4) | 13:15 UTC | ✅ Valid |

## Testing Timezone Accuracy

### 1. Using the Timezone Validation Tool

Navigate to **Admin Dashboard → Timezone Analysis** tab:

1. **View Timezone Distribution**: See all locations grouped by timezone
2. **Analyze Attendance by Timezone**: View records per timezone with statistics
3. **Test Timestamp Validation**: Input test timestamps to validate accuracy

### 2. Sample Test Timestamps

```
# Dubai Office (Asia/Dubai) - Test Data
2024-07-12 09:00:00
2024-07-12 17:30:00
12/07/2024 08:45
2024-07-12T14:30:00

# Baghdad Branch (Asia/Baghdad) - Test Data  
2024-07-12 08:30:00
2024-07-12 16:30:00
12/07/2024 09:15
2024-07-12T13:45:00

# Invalid/Warning Cases
2024-07-12 02:00:00  # Too early (warning)
2024-07-12 23:30:00  # Too late (warning)
2024-07-12 10:00:00  # Friday in Middle East (weekend warning)
```

### 3. Validation Results Interpretation

#### ✅ Valid Timestamps
- Correct format recognized
- Reasonable work hours (6 AM - 10 PM local)
- Appropriate for location's work schedule
- Converted to UTC successfully

#### ⚠️ Warning Timestamps  
- Unusual hours (very early/late)
- Weekend work in local calendar
- Different format but parseable

#### ❌ Invalid Timestamps
- Unrecognizable format
- Invalid date/time values
- Employee not found or not assigned to location

## Business Rules by Region

### Middle East Locations
- **Weekend**: Friday-Saturday
- **Work Hours**: Typically 08:00-17:00 local time
- **Prayer Time**: Automatic break considerations
- **Ramadan**: Special schedule support

### North America/Europe
- **Weekend**: Saturday-Sunday  
- **Work Hours**: Typically 09:00-17:00 local time
- **Daylight Saving**: Automatic handling

### Timezone-Specific Validations

```javascript
// Examples of location-specific validations
{
  "Dubai": {
    "timezone": "Asia/Dubai", 
    "weekend": ["Friday", "Saturday"],
    "workHours": "08:00-17:00",
    "lateThreshold": "10 minutes"
  },
  "Baghdad": {
    "timezone": "Asia/Baghdad",
    "weekend": ["Friday", "Saturday"], 
    "workHours": "08:30-16:30",
    "lateThreshold": "20 minutes"
  },
  "New York": {
    "timezone": "America/New_York",
    "weekend": ["Saturday", "Sunday"],
    "workHours": "09:00-17:00", 
    "lateThreshold": "15 minutes"
  }
}
```

## API Usage Examples

### Check Current Time in All Locations

```javascript
// Frontend usage
const timezoneSummary = await fetch('/api/admin/timezone-summary');
const data = await timezoneSummary.json();

data.summary.locations.forEach(location => {
  console.log(`${location.name}: ${location.currentTime} (${location.timezone})`);
});

// Output:
// Dubai Office: 2024-07-12 14:30:15 (Asia/Dubai)
// Baghdad Branch: 2024-07-12 13:30:15 (Asia/Baghdad)  
// Main Office: 2024-07-12 06:30:15 (America/New_York)
```

### Validate Upload Before Processing

```javascript
// Validate timestamps before bulk upload
const validation = await fetch('/api/admin/validate-timestamps', {
  method: 'POST',
  body: JSON.stringify({
    locationId: 1, // Dubai Office
    employeeId: 123,
    timestamps: ['2024-07-12 09:00:00', '2024-07-12 17:30:00']
  })
});

const results = await validation.json();
console.log(`Valid: ${results.summary.valid}/${results.summary.total}`);
```

## Best Practices

### 1. Data Upload Preparation
- Include location information in attendance files
- Use consistent timestamp formats per location
- Validate sample data before bulk upload

### 2. Timezone Management
- Assign all employees to appropriate locations
- Keep location timezone settings updated
- Monitor for daylight saving time changes

### 3. Data Validation
- Review validation warnings for unusual patterns
- Check weekend work notifications
- Verify timestamp accuracy for remote employees

### 4. Reporting Considerations
- Generate reports in local timezone for managers
- Use UTC for cross-location comparisons
- Include timezone information in exported data

---

This system ensures accurate attendance tracking across multiple timezones while maintaining data integrity and providing comprehensive validation tools.
