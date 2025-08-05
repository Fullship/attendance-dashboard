import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E Test Global Setup...');
  
  const { baseURL } = config.projects[0].use;
  
  // Launch browser for initial setup
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for the application to be available
    console.log(`⏳ Waiting for application at ${baseURL}`);
    await page.goto(baseURL + '/');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Application is ready');
    
    // You could add authentication setup here if needed
    // await setupAuthentication(page);
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
  
  console.log('✅ E2E Test Global Setup Complete');
}

export default globalSetup;
