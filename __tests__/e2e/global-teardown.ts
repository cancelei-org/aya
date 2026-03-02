// Global teardown for E2E tests
import { chromium, FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  console.log('Starting E2E test teardown...')
  
  // Start browser for cleanup operations
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  try {
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000'
    
    // Navigate to the application for cleanup
    await page.goto(baseURL)
    
    // Clean up test data
    await cleanupTestData(page)
    
    // Generate test summary if needed
    await generateTestSummary()
    
    console.log('E2E test teardown completed successfully')
    
  } catch (error) {
    console.error('E2E test teardown failed:', error)
    // Don't throw error to avoid masking test failures
  } finally {
    await browser.close()
  }
}

async function cleanupTestData(page: any) {
  console.log('Cleaning up test data...')
  
  try {
    // Clear browser storage
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
      
      // Clear any test-specific data
      if ('indexedDB' in window) {
        // Clear IndexedDB if used
        indexedDB.deleteDatabase('test-db')
      }
      
      // Clear service worker cache if used
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          )
        })
      }
    })
    
    console.log('Browser storage cleaned up')
    
  } catch (error) {
    console.error('Failed to clean up test data:', error)
  }
}

async function generateTestSummary() {
  console.log('Generating test summary...')
  
  try {
    const fs = require('fs').promises
    const path = require('path')
    
    // Read test results if available
    const resultsPath = path.join(process.cwd(), 'test-results', 'e2e-results.json')
    
    try {
      const resultsData = await fs.readFile(resultsPath, 'utf8')
      const results = JSON.parse(resultsData)
      
      const summary = {
        timestamp: new Date().toISOString(),
        environment: 'e2e-test',
        totalTests: results.stats?.total || 0,
        passed: results.stats?.passed || 0,
        failed: results.stats?.failed || 0,
        skipped: results.stats?.skipped || 0,
        duration: results.stats?.duration || 0,
        success: (results.stats?.failed || 0) === 0
      }
      
      console.log('Test Summary:', JSON.stringify(summary, null, 2))
      
      // Write summary to file
      const summaryPath = path.join(process.cwd(), 'test-results', 'e2e-summary.json')
      await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2))
      
    } catch (error) {
      console.log('No test results file found or failed to parse')
    }
    
  } catch (error) {
    console.error('Failed to generate test summary:', error)
  }
}

export default globalTeardown