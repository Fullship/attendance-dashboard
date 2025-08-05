# Manual Smoke Testing Guide - Admin Panel

This guide provides step-by-step instructions for manually testing the Admin Panel functionality to ensure everything works correctly before deployment.

## 🎯 Testing Objectives

- Verify all admin panel components load correctly
- Test real-time data updates and polling
- Validate user interactions and controls
- Check responsive design across devices
- Ensure error handling works properly

## 📋 Pre-Testing Checklist

### Environment Setup
- [ ] Frontend development server running (`npm run dev`)
- [ ] Backend API server running on expected port
- [ ] Database connection established
- [ ] Redis cache server running
- [ ] Admin authentication configured (if applicable)

### Browser Testing Matrix
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome (iOS/Android)
- [ ] Mobile Safari (iOS)

## 🧪 Test Scenarios

### 1. Initial Load & Navigation

#### Test Case: Admin Panel Loads
**Steps:**
1. Navigate to `/admin` (or admin panel URL)
2. Wait for page to fully load
3. Verify all components are visible

**Expected Results:**
- [ ] Admin panel layout displays correctly
- [ ] All navigation tabs are visible (Overview, Metrics, Cache, Cluster, Profiler, Logs)
- [ ] No console errors in browser dev tools
- [ ] Loading states complete within 5 seconds

#### Test Case: Tab Navigation
**Steps:**
1. Click each tab: Overview → Metrics → Cache → Cluster → Profiler → Logs
2. Verify content changes for each tab
3. Navigate back and forth between tabs

**Expected Results:**
- [ ] Each tab shows unique content
- [ ] Tab transitions are smooth
- [ ] Active tab is visually highlighted
- [ ] Previous tab content is properly unmounted

### 2. Real-Time Metrics Testing

#### Test Case: Metrics Display
**Steps:**
1. Navigate to Metrics tab
2. Observe metric values and charts
3. Wait for 10 seconds (polling interval)
4. Check if values update

**Expected Results:**
- [ ] All metric cards display numeric values
- [ ] Charts render correctly (Response Time, Memory, CPU)
- [ ] Data updates every 5 seconds
- [ ] No "NaN" or undefined values
- [ ] Tooltips work on chart hover

#### Test Case: Metrics Real-Time Updates
**Steps:**
1. Open browser developer tools → Network tab
2. Stay on Metrics tab for 2 minutes
3. Monitor API calls to `/api/admin/metrics`

**Expected Results:**
- [ ] API calls made every 5 seconds
- [ ] HTTP 200 responses received
- [ ] UI updates reflect new data
- [ ] No memory leaks (check dev tools Memory tab)

### 3. Cache Management Testing

#### Test Case: Cache Statistics
**Steps:**
1. Navigate to Cache tab
2. Verify cache statistics display
3. Check cache performance charts

**Expected Results:**
- [ ] Hit rate percentage displayed
- [ ] Total operations count shown
- [ ] Memory usage information visible
- [ ] Cache type breakdown displayed
- [ ] Performance charts render correctly

#### Test Case: Cache Clear Operation
**Steps:**
1. Click "Clear Cache" button
2. Confirm action in modal (if present)
3. Wait for operation completion
4. Verify success message

**Expected Results:**
- [ ] Confirmation modal appears (if configured)
- [ ] Success message displays
- [ ] Cache statistics update after clear
- [ ] No error messages in console

### 4. Cluster Status Testing

#### Test Case: Worker Status Display
**Steps:**
1. Navigate to Cluster tab
2. Review worker list and status
3. Check master process information

**Expected Results:**
- [ ] All workers listed with status
- [ ] Worker details include: PID, uptime, memory, CPU, connections
- [ ] Master process info displayed
- [ ] Health status indicator shows correct state
- [ ] Worker status updates automatically

#### Test Case: Worker Management
**Steps:**
1. Find a worker with "Restart" button
2. Click restart button
3. Confirm restart action
4. Monitor worker status change

**Expected Results:**
- [ ] Restart confirmation modal appears
- [ ] Worker status changes to "restarting"
- [ ] Worker comes back online within 30 seconds
- [ ] New PID assigned to restarted worker

### 5. Performance Profiler Testing

#### Test Case: CPU Profiling
**Steps:**
1. Navigate to Profiler tab
2. Click "Start CPU Profile"
3. Wait 10 seconds
4. Click "Stop CPU Profile"
5. Verify download link appears

**Expected Results:**
- [ ] "Start" button becomes "Stop" button
- [ ] Profiling status indicator shows active
- [ ] Profile stops after clicking stop
- [ ] Download link appears for .cpuprofile file
- [ ] File downloads when link clicked

#### Test Case: Memory Snapshot
**Steps:**
1. Click "Create Memory Snapshot"
2. Wait for operation completion
3. Check snapshot list

**Expected Results:**
- [ ] Loading indicator appears during creation
- [ ] Success message displays
- [ ] New snapshot appears in list
- [ ] Snapshot includes file size and timestamp
- [ ] Download link works

### 6. System Logs Testing

#### Test Case: Log Display
**Steps:**
1. Navigate to Logs tab
2. Verify log entries display
3. Check log entry details

**Expected Results:**
- [ ] Log entries load and display
- [ ] Each log shows: timestamp, level, message, source
- [ ] Logs are sorted by timestamp (newest first)
- [ ] Pagination controls work (if present)
- [ ] Log levels have appropriate styling (colors)

#### Test Case: Log Filtering
**Steps:**
1. Use level filter dropdown
2. Select "Error" level
3. Verify only error logs show
4. Test other filter options

**Expected Results:**
- [ ] Filter dropdown works
- [ ] Log list updates based on filter
- [ ] Filter state persists during navigation
- [ ] Clear filter button works

#### Test Case: Log Search
**Steps:**
1. Enter search term in search box
2. Press Enter or click search
3. Verify filtered results
4. Clear search and verify all logs return

**Expected Results:**
- [ ] Search input accepts text
- [ ] Results filter based on search term
- [ ] Search highlights matching text (if implemented)
- [ ] Clear search restores all logs

#### Test Case: Log Export
**Steps:**
1. Click "Export Logs" button
2. Verify file download starts
3. Check downloaded file content

**Expected Results:**
- [ ] Download starts immediately
- [ ] File is JSON format
- [ ] Contains current filtered/searched logs
- [ ] File size is reasonable

### 7. Responsive Design Testing

#### Test Case: Mobile Layout
**Steps:**
1. Open browser dev tools
2. Switch to mobile device simulation
3. Test various screen sizes (320px, 768px, 1024px)
4. Navigate through all tabs

**Expected Results:**
- [ ] Layout adapts to screen size
- [ ] All content remains accessible
- [ ] Charts resize appropriately
- [ ] Buttons and controls remain usable
- [ ] Text remains readable

#### Test Case: Tablet Layout
**Steps:**
1. Test on iPad/tablet resolution (768px width)
2. Test both portrait and landscape
3. Verify touch interactions

**Expected Results:**
- [ ] Content uses available space efficiently
- [ ] Touch targets are appropriately sized
- [ ] Charts remain interactive
- [ ] Navigation works with touch

### 8. Error Handling Testing

#### Test Case: Network Disconnection
**Steps:**
1. Disconnect network connection
2. Observe admin panel behavior
3. Reconnect network
4. Verify recovery

**Expected Results:**
- [ ] Error messages display appropriately
- [ ] Retry mechanisms work
- [ ] Data resumes updating after reconnection
- [ ] No UI crashes or freezes

#### Test Case: API Errors
**Steps:**
1. Open dev tools → Network tab
2. Block requests to `/api/admin/*`
3. Observe component behavior
4. Unblock requests

**Expected Results:**
- [ ] Components show error states
- [ ] Retry buttons appear and function
- [ ] Error messages are user-friendly
- [ ] Components recover after API restoration

### 9. Performance Testing

#### Test Case: Memory Usage
**Steps:**
1. Open Chrome dev tools → Memory tab
2. Take heap snapshot
3. Use admin panel for 10 minutes
4. Take another heap snapshot
5. Compare memory usage

**Expected Results:**
- [ ] Memory usage remains stable
- [ ] No significant memory leaks detected
- [ ] Polling intervals don't accumulate memory
- [ ] Chart rendering is memory-efficient

#### Test Case: Page Load Performance
**Steps:**
1. Open dev tools → Performance tab
2. Record page load
3. Analyze performance metrics

**Expected Results:**
- [ ] Initial page load < 3 seconds
- [ ] First Contentful Paint < 1.5 seconds
- [ ] Largest Contentful Paint < 2.5 seconds
- [ ] No long tasks blocking the main thread

## 🚨 Critical Issues Checklist

Mark any of these as test failures requiring immediate fix:

- [ ] Page fails to load completely
- [ ] JavaScript errors prevent functionality
- [ ] Data never loads or updates
- [ ] Critical buttons don't work
- [ ] Mobile layout is completely broken
- [ ] Memory leaks crash the browser
- [ ] API operations fail consistently

## ✅ Test Completion Sign-off

### Tester Information
- **Tester Name:** ________________
- **Date:** ________________
- **Environment:** ________________
- **Browser(s) Tested:** ________________

### Results Summary
- **Total Test Cases:** 20
- **Passed:** ___/20
- **Failed:** ___/20
- **Blocked:** ___/20

### Overall Assessment
- [ ] **PASS** - All critical functionality works
- [ ] **PASS WITH MINOR ISSUES** - Cosmetic issues only
- [ ] **FAIL** - Critical functionality broken

### Notes & Issues Found
```
[Space for additional notes, screenshots, or issue descriptions]
```

### Recommendations
- [ ] Ready for production deployment
- [ ] Requires bug fixes before deployment
- [ ] Needs additional testing

---

## 📞 Support Information

If you encounter issues during testing:
- Check browser console for errors
- Verify network connectivity
- Ensure backend services are running
- Contact development team with specific error details
- Include screenshots of any UI issues
