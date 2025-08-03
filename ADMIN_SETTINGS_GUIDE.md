# Admin Settings Configuration Guide

## 🚀 Quick Start Guide

### Accessing Admin Settings
1. Log in as an administrator at `http://localhost:3000/admin`
2. Click on the **"Settings"** tab in the navigation
3. You'll see categorized settings that you can immediately start configuring

## ⚙️ Settings Categories Explained

### 🕐 Time & Schedule Settings

#### Late Threshold Minutes (Default: 15)
- **What it does**: Defines when an employee is considered "late"
- **Example**: If set to 15, arriving 16+ minutes after start time = late
- **Recommended**: 10-15 minutes for most organizations

#### Early Departure Threshold Minutes (Default: 30) 
- **What it does**: Defines when leaving early affects attendance
- **Example**: If set to 30, leaving 31+ minutes before end time = early departure
- **Recommended**: 15-30 minutes depending on flexibility needs

#### Grace Period Minutes (Default: 5)
- **What it does**: Allows small delays without penalty
- **Example**: If set to 5, arriving 1-5 minutes late has no penalty
- **Recommended**: 5-10 minutes for reasonable flexibility

#### Minimum Work Hours (Default: 8)
- **What it does**: Required hours for a "full day" of work
- **Example**: Employee must work 8+ hours to avoid "partial day" status
- **Recommended**: Match your standard work day (7-8 hours)

#### Automatic Break Deduction Minutes (Default: 60)
- **What it does**: Minutes automatically removed for lunch/breaks
- **Example**: If set to 60, total hours = clock time - 1 hour
- **Recommended**: 30-60 minutes based on break policies

### ⏰ Overtime & Hours Management

#### Overtime Threshold Hours (Default: 8)
- **What it does**: Hours after which overtime rates apply
- **Example**: If set to 8, hour 9+ in a day counts as overtime
- **Recommended**: 8 hours (standard) or 40 hours/week

#### Require Admin Approval for Overtime (Default: true)
- **What it does**: Whether overtime needs manager approval
- **Example**: If true, employees must request overtime approval
- **Recommended**: True for cost control, False for flexibility

#### Weekend Work Allowed (Default: false)
- **What it does**: Whether employees can work weekends
- **Example**: If false, weekend clock-ins are flagged/rejected
- **Recommended**: Depends on business needs and local laws

### 💰 Pay & Benefits Configuration

#### Overtime Pay Multiplier (Default: 1.5)
- **What it does**: Pay rate multiplier for overtime hours
- **Example**: If set to 1.5, overtime pays 1.5x regular rate
- **Recommended**: 1.5x (time and a half) is standard

#### Holiday Pay Multiplier (Default: 1.5)
- **What it does**: Pay rate multiplier for holiday work
- **Example**: If set to 2.0, holiday work pays double rate
- **Recommended**: 1.5-2.0x depending on company policy

### 📝 Employee Request Policies

#### Allow Retroactive Requests (Default: true)
- **What it does**: Whether employees can submit past-date requests
- **Example**: If true, employees can request time off for last week
- **Recommended**: True with reasonable limits

#### Max Retroactive Days (Default: 7)
- **What it does**: How far back employees can submit requests
- **Example**: If set to 7, can request up to 1 week in the past
- **Recommended**: 3-14 days depending on approval processes

## 🎄 Holiday Management

### Adding Company Holidays
1. Click **"Add Holiday"** button
2. Fill in:
   - **Name**: Holiday name (e.g., "Christmas Day")
   - **Date**: Specific date for the holiday
   - **Recurring**: Check if this repeats annually
   - **Recurrence Type**: Annual, Monthly, or Weekly
   - **Description**: Optional details about the holiday

### Holiday Types
- **One-time**: Specific date events (e.g., "Company Picnic 2025")
- **Annual**: Yearly holidays (e.g., Christmas, New Year's Day)
- **Monthly**: Monthly events (e.g., First Friday meetings)
- **Weekly**: Weekly events (e.g., Team building Fridays)

### Holiday Impact
- Employees are **not marked absent** on company holidays
- Holiday work can have special pay rates (see Holiday Pay Multiplier)
- Holidays appear in employee calendars with special highlighting

## 📅 Work Schedule Management

### Default Work Schedule
- **Standard Business Hours**: 9:00 AM - 5:00 PM, Monday-Friday
- This applies to all employees unless they have a custom schedule
- Cannot be deleted (but can be modified)

### Creating Custom Schedules
1. Click **"Add Schedule"** button
2. Configure:
   - **Name**: Descriptive name (e.g., "Part-time Evening")
   - **Start Time**: When the workday begins
   - **End Time**: When the workday ends
   - **Working Days**: Which days of the week apply
   - **Default**: Whether this becomes the new default

### Schedule Examples
- **Part-time**: 10:00 AM - 2:00 PM, Mon-Wed-Fri
- **Night Shift**: 11:00 PM - 7:00 AM, Sun-Thu
- **Flexible**: 8:00 AM - 4:00 PM, Mon-Fri
- **Compressed**: 7:00 AM - 5:30 PM, Mon-Thu (4-day week)

## 🔧 Common Configuration Scenarios

### Strict Attendance Policy
```
Late Threshold: 5 minutes
Grace Period: 0 minutes
Early Departure: 15 minutes
Admin Approval for Overtime: true
Retroactive Requests: false
```

### Flexible Work Environment
```
Late Threshold: 30 minutes
Grace Period: 15 minutes
Early Departure: 60 minutes
Admin Approval for Overtime: false
Retroactive Requests: true (14 days)
```

### Manufacturing/Hourly Workers
```
Late Threshold: 10 minutes
Grace Period: 5 minutes
Automatic Break Deduction: 30 minutes
Overtime Threshold: 8 hours
Weekend Work: true
```

### Professional/Salaried Staff
```
Late Threshold: 60 minutes
Grace Period: 30 minutes
Minimum Work Hours: 7 hours
Admin Approval for Overtime: false
Flexible scheduling
```

## 🚨 Important Considerations

### Legal Compliance
- Check local labor laws for overtime requirements
- Ensure break deductions comply with regulations
- Verify holiday pay rates meet legal minimums
- Consider union agreements if applicable

### Change Management
- **Notify employees** before changing attendance policies
- **Phase in changes** gradually when possible
- **Document reasons** for policy changes
- **Train managers** on new policies

### Best Practices
- **Start conservative** and relax policies as needed
- **Monitor metrics** after changes to see impact
- **Regular reviews** of policies (quarterly/annually)
- **Employee feedback** can guide policy improvements

## 📞 Support & Troubleshooting

### Common Issues
- **Settings not saving**: Check admin permissions
- **Holidays not showing**: Verify date format and save
- **Schedule conflicts**: Ensure only one default schedule
- **Permission errors**: Confirm admin login status

### Getting Help
- Check the browser console for error messages
- Verify backend services are running
- Review audit logs for failed operations
- Contact system administrator if issues persist

---

*This guide covers the core functionality of the admin settings panel. For advanced configurations or custom requirements, consult the technical documentation or system administrator.*
