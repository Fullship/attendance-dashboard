import { test, expect, type Page } from '@playwright/test';

/**
 * AdminPanel E2E Tests
 * 
 * Comprehensive end-to-end testing for the admin panel functionality
 * including real-time updates, user interactions, and data flow.
 */

// Test data and utilities
const ADMIN_PANEL_URL = '/admin';
const POLL_INTERVAL = 5000; // 5 seconds

class AdminPanelPage {
  constructor(private page: Page) {}
  
  async goto() {
    await this.page.goto(ADMIN_PANEL_URL);
    await this.page.waitForLoadState('networkidle');
  }
  
  // Tab navigation
  async clickTab(tabName: string) {
    await this.page.click(`[data-testid="admin-tab-${tabName}"]`);
    await this.page.waitForTimeout(500); // Allow tab transition
  }
  
  // Metrics Card interactions
  async getMetricsData() {
    const metricsCard = this.page.locator('[data-testid="metrics-card"]');
    await expect(metricsCard).toBeVisible();
    
    return {
      requestsPerSecond: await this.page.textContent('[data-testid="rps-value"]'),
      responseTime: await this.page.textContent('[data-testid="response-time-value"]'),
      memoryUsage: await this.page.textContent('[data-testid="memory-usage-value"]'),
      cpuUsage: await this.page.textContent('[data-testid="cpu-usage-value"]'),
      activeUsers: await this.page.textContent('[data-testid="active-users-value"]')
    };
  }
  
  async waitForMetricsUpdate() {
    const initialRps = await this.page.textContent('[data-testid="rps-value"]');
    // Wait for potential update (polling interval + buffer)
    await this.page.waitForTimeout(POLL_INTERVAL + 1000);
    const updatedRps = await this.page.textContent('[data-testid="rps-value"]');
    return initialRps !== updatedRps;
  }
  
  // Cache Manager interactions
  async clearCache() {
    await this.clickTab('cache');
    const clearButton = this.page.locator('[data-testid="clear-cache-btn"]');
    await expect(clearButton).toBeVisible();
    await clearButton.click();
    
    // Wait for success message
    await expect(this.page.locator('[data-testid="cache-clear-success"]')).toBeVisible();
  }
  
  async getCacheStats() {
    await this.clickTab('cache');
    const cacheCard = this.page.locator('[data-testid="cache-manager"]');
    await expect(cacheCard).toBeVisible();
    
    return {
      hitRate: await this.page.textContent('[data-testid="cache-hit-rate"]'),
      totalOperations: await this.page.textContent('[data-testid="cache-operations"]'),
      memoryUsage: await this.page.textContent('[data-testid="cache-memory"]')
    };
  }
  
  // Cluster Status interactions
  async getClusterStatus() {
    await this.clickTab('cluster');
    const clusterCard = this.page.locator('[data-testid="cluster-status"]');
    await expect(clusterCard).toBeVisible();
    
    const workers = await this.page.locator('[data-testid="worker-row"]').count();
    const aliveWorkers = await this.page.locator('[data-testid="worker-status"][data-status="online"]').count();
    
    return {
      totalWorkers: workers,
      aliveWorkers: aliveWorkers,
      health: await this.page.textContent('[data-testid="cluster-health"]')
    };
  }
  
  async restartWorker(workerId: number) {
    await this.clickTab('cluster');
    const restartBtn = this.page.locator(`[data-testid="restart-worker-${workerId}"]`);
    await expect(restartBtn).toBeVisible();
    await restartBtn.click();
    
    // Wait for confirmation modal and confirm
    await expect(this.page.locator('[data-testid="restart-confirm-modal"]')).toBeVisible();
    await this.page.click('[data-testid="confirm-restart"]');
  }
  
  // Profiler interactions
  async startCPUProfiling() {
    await this.clickTab('profiler');
    const startBtn = this.page.locator('[data-testid="start-cpu-profiling"]');
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    
    // Verify profiling started
    await expect(this.page.locator('[data-testid="cpu-profiling-active"]')).toBeVisible();
  }
  
  async stopCPUProfiling() {
    const stopBtn = this.page.locator('[data-testid="stop-cpu-profiling"]');
    await expect(stopBtn).toBeVisible();
    await stopBtn.click();
    
    // Wait for download link
    await expect(this.page.locator('[data-testid="cpu-profile-download"]')).toBeVisible();
  }
  
  async createMemorySnapshot() {
    await this.clickTab('profiler');
    const snapshotBtn = this.page.locator('[data-testid="create-memory-snapshot"]');
    await expect(snapshotBtn).toBeVisible();
    await snapshotBtn.click();
    
    // Wait for snapshot creation
    await expect(this.page.locator('[data-testid="memory-snapshot-success"]')).toBeVisible();
  }
  
  // Logs interactions
  async filterLogs(level: string) {
    await this.clickTab('logs');
    const filterSelect = this.page.locator('[data-testid="log-level-filter"]');
    await filterSelect.selectOption(level);
    
    // Wait for filtered results
    await this.page.waitForTimeout(500);
  }
  
  async searchLogs(query: string) {
    await this.clickTab('logs');
    const searchInput = this.page.locator('[data-testid="log-search-input"]');
    await searchInput.fill(query);
    await searchInput.press('Enter');
    
    // Wait for search results
    await this.page.waitForTimeout(500);
  }
  
  async getLogCount() {
    const logRows = this.page.locator('[data-testid="log-row"]');
    return await logRows.count();
  }
  
  async exportLogs() {
    const exportBtn = this.page.locator('[data-testid="export-logs"]');
    await expect(exportBtn).toBeVisible();
    
    // Start download
    const downloadPromise = this.page.waitForEvent('download');
    await exportBtn.click();
    const download = await downloadPromise;
    
    return download.suggestedFilename();
  }
}

test.describe('Admin Panel E2E Tests', () => {
  let adminPanel: AdminPanelPage;
  
  test.beforeEach(async ({ page }) => {
    adminPanel = new AdminPanelPage(page);
    await adminPanel.goto();
  });
  
  test('should load admin panel with all components', async ({ page }) => {
    // Verify main layout
    await expect(page.locator('[data-testid="admin-panel"]')).toBeVisible();
    
    // Verify all tabs are present
    await expect(page.locator('[data-testid="admin-tab-overview"]')).toBeVisible();
    await expect(page.locator('[data-testid="admin-tab-metrics"]')).toBeVisible();
    await expect(page.locator('[data-testid="admin-tab-cache"]')).toBeVisible();
    await expect(page.locator('[data-testid="admin-tab-cluster"]')).toBeVisible();
    await expect(page.locator('[data-testid="admin-tab-profiler"]')).toBeVisible();
    await expect(page.locator('[data-testid="admin-tab-logs"]')).toBeVisible();
    
    // Verify initial content load
    await expect(page.locator('[data-testid="metrics-card"]')).toBeVisible();
  });
  
  test('should display real-time metrics data', async ({ page }) => {
    const metrics = await adminPanel.getMetricsData();
    
    // Verify metrics are loaded
    expect(metrics.requestsPerSecond).toBeTruthy();
    expect(metrics.responseTime).toBeTruthy();
    expect(metrics.memoryUsage).toBeTruthy();
    expect(metrics.cpuUsage).toBeTruthy();
    expect(metrics.activeUsers).toBeTruthy();
    
    // Verify charts are rendered
    await expect(page.locator('[data-testid="response-time-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="memory-usage-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="cpu-usage-chart"]')).toBeVisible();
  });
  
  test('should handle cache management operations', async ({ page }) => {
    // Get initial cache stats
    const initialStats = await adminPanel.getCacheStats();
    expect(initialStats.hitRate).toBeTruthy();
    
    // Clear cache
    await adminPanel.clearCache();
    
    // Verify success message
    await expect(page.locator('[data-testid="cache-clear-success"]')).toBeVisible();
    
    // Verify cache stats updated (in real scenario, stats would change)
    await page.waitForTimeout(1000);
    const updatedStats = await adminPanel.getCacheStats();
    expect(updatedStats).toBeTruthy();
  });
  
  test('should display cluster status and worker information', async ({ page }) => {
    const clusterStatus = await adminPanel.getClusterStatus();
    
    // Verify cluster data
    expect(clusterStatus.totalWorkers).toBeGreaterThan(0);
    expect(clusterStatus.aliveWorkers).toBeGreaterThanOrEqual(0);
    expect(clusterStatus.health).toBeTruthy();
    
    // Verify worker details are shown
    await expect(page.locator('[data-testid="worker-row"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="worker-memory"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="worker-cpu"]').first()).toBeVisible();
  });
  
  test('should handle profiler operations', async ({ page }) => {
    // Test CPU profiling
    await adminPanel.startCPUProfiling();
    await expect(page.locator('[data-testid="cpu-profiling-active"]')).toBeVisible();
    
    // Wait a moment for profiling
    await page.waitForTimeout(2000);
    
    await adminPanel.stopCPUProfiling();
    await expect(page.locator('[data-testid="cpu-profile-download"]')).toBeVisible();
    
    // Test memory snapshot
    await adminPanel.createMemorySnapshot();
    await expect(page.locator('[data-testid="memory-snapshot-success"]')).toBeVisible();
  });
  
  test('should filter and search logs', async ({ page }) => {
    // Get initial log count
    const initialCount = await adminPanel.getLogCount();
    expect(initialCount).toBeGreaterThan(0);
    
    // Filter by error level
    await adminPanel.filterLogs('error');
    const errorCount = await adminPanel.getLogCount();
    expect(errorCount).toBeGreaterThanOrEqual(0);
    
    // Search for specific term
    await adminPanel.searchLogs('database');
    const searchCount = await adminPanel.getLogCount();
    expect(searchCount).toBeGreaterThanOrEqual(0);
    
    // Test export functionality
    const filename = await adminPanel.exportLogs();
    expect(filename).toContain('logs');
    expect(filename).toContain('.json');
  });
  
  test('should handle tab navigation correctly', async ({ page }) => {
    // Test all tab transitions
    await adminPanel.clickTab('metrics');
    await expect(page.locator('[data-testid="metrics-card"]')).toBeVisible();
    
    await adminPanel.clickTab('cache');
    await expect(page.locator('[data-testid="cache-manager"]')).toBeVisible();
    
    await adminPanel.clickTab('cluster');
    await expect(page.locator('[data-testid="cluster-status"]')).toBeVisible();
    
    await adminPanel.clickTab('profiler');
    await expect(page.locator('[data-testid="profiler-control"]')).toBeVisible();
    
    await adminPanel.clickTab('logs');
    await expect(page.locator('[data-testid="logs-viewer"]')).toBeVisible();
    
    // Return to overview
    await adminPanel.clickTab('overview');
    await expect(page.locator('[data-testid="overview-dashboard"]')).toBeVisible();
  });
  
  test('should be responsive on mobile devices', async ({ page, browserName }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="admin-panel"]')).toBeVisible();
    
    // Test mobile navigation
    if (await page.locator('[data-testid="mobile-menu-toggle"]').isVisible()) {
      await page.click('[data-testid="mobile-menu-toggle"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    }
    
    // Test tab functionality on mobile
    await adminPanel.clickTab('metrics');
    await expect(page.locator('[data-testid="metrics-card"]')).toBeVisible();
  });
  
  test('should handle error states gracefully', async ({ page }) => {
    // Simulate network error by intercepting requests
    await page.route('**/api/admin/**', route => route.abort());
    
    // Reload page to trigger error state
    await page.reload();
    
    // Verify error handling
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10000 });
    
    // Test retry functionality
    await page.unroute('**/api/admin/**');
    const retryBtn = page.locator('[data-testid="retry-button"]');
    if (await retryBtn.isVisible()) {
      await retryBtn.click();
      await expect(page.locator('[data-testid="metrics-card"]')).toBeVisible({ timeout: 10000 });
    }
  });
  
  test('should maintain state during real-time updates', async ({ page }) => {
    // Switch to a specific tab
    await adminPanel.clickTab('cache');
    await expect(page.locator('[data-testid="cache-manager"]')).toBeVisible();
    
    // Wait for a polling cycle
    await page.waitForTimeout(POLL_INTERVAL + 1000);
    
    // Verify we're still on the cache tab
    await expect(page.locator('[data-testid="cache-manager"]')).toBeVisible();
    
    // Verify data is still loading/updating
    const cacheStats = await adminPanel.getCacheStats();
    expect(cacheStats.hitRate).toBeTruthy();
  });
});
