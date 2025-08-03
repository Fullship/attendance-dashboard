# Date Filter Bug Fix

## Issue Description
The date filter in the "Attendance Records" tab was showing incorrect results. When selecting "Last year" from the dropdown, it was still showing current year's data instead of filtering to only show data from the previous calendar year.

## Root Cause
The issue was in both the frontend dropdown labels and backend date calculation logic:

1. **Frontend Issue**: The dropdown option was labeled "Last year" but was using the value `365`, which corresponds to "last 365 days" rather than the previous calendar year.

2. **Backend Issue**: The `365` case in the backend was calculating a date range of "last 365 days" (which includes current year data) instead of a proper "previous calendar year" date range.

## Solution

### Backend Changes (`backend/routes/admin.js`)
1. **Added new `last_year` case**: Added proper logic to calculate the previous calendar year (January 1 to December 31 of the previous year).
2. **Added end date support**: Modified the query building logic to support both start and end dates for date ranges that need upper bounds.
3. **Updated date range response**: Modified the response to return the correct end date when an end date is specified.

```javascript
case 'last_year':
  // Previous calendar year: January 1 to December 31 of last year
  startDate = new Date(currentDate.getFullYear() - 1, 0, 1);
  endDate = new Date(currentDate.getFullYear() - 1, 11, 31, 23, 59, 59);
  break;
```

### Frontend Changes (`frontend/src/pages/AdminDashboard.tsx`)
1. **Updated dropdown options**: Changed the dropdown to distinguish between:
   - "Last 365 days" (value: `365`) - shows last 365 days including current year
   - "Last Year" (value: `last_year`) - shows only the previous calendar year

```tsx
<option value="365">Last 365 days</option>
<option value="last_year">Last Year</option>
```

## Date Filter Options Now Available
1. **Last 7 days** (`7`) - Last 7 days from today
2. **Last 30 days** (`30`) - Last 30 days from today  
3. **Last 90 days** (`90`) - Last 90 days from today
4. **Last 365 days** (`365`) - Last 365 days from today (may include current and previous year data)
5. **Last Year** (`last_year`) - Previous calendar year only (Jan 1 - Dec 31 of previous year)
6. **This Year** (`this_year`) - Current calendar year (Jan 1 - present)
7. **This Month** (`this_month`) - Current calendar month

## Testing
After applying these changes:
1. Backend was rebuilt and restarted using Docker
2. Frontend automatically picked up changes via hot-reload
3. "Last Year" filter now correctly shows only data from the previous calendar year
4. "Last 365 days" option is now clearly labeled to avoid confusion

## Files Modified
- `backend/routes/admin.js` - Updated date calculation logic and query building
- `frontend/src/pages/AdminDashboard.tsx` - Updated dropdown options

## Date: July 5, 2025
