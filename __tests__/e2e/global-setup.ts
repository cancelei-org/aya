// Global setup for E2E tests
import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('Starting E2E test setup...')
  
  // Start browser for setup operations
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  try {
    // Wait for the development server to be ready
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000'
    console.log(`Waiting for server at ${baseURL}...`)
    
    let retries = 30
    while (retries > 0) {
      try {
        const response = await page.goto(baseURL)
        if (response?.ok()) {
          console.log('Development server is ready')
          break
        }
      } catch (error) {
        console.log(`Server not ready, retrying... (${retries} attempts left)`)
        await new Promise(resolve => setTimeout(resolve, 2000))
        retries--
      }
    }
    
    if (retries === 0) {
      throw new Error('Development server failed to start within timeout')
    }
    
    // Perform any additional setup operations
    await setupTestData(page, baseURL)
    await setupApiMocks(page)
    
    console.log('E2E test setup completed successfully')
    
  } catch (error) {
    console.error('E2E test setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }
}

async function setupTestData(page: any, baseURL: string) {
  console.log('Setting up test data...')
  
  // Navigate to the application
  await page.goto(baseURL)
  
  // Check if the application loads correctly
  await page.waitForSelector('body', { timeout: 10000 })
  
  // Verify critical application elements are present
  const title = await page.title()
  console.log(`Application title: ${title}`)
  
  // Set up any required test data in localStorage or sessionStorage
  await page.evaluate(() => {
    // Clear any existing data
    localStorage.clear()
    sessionStorage.clear()
    
    // Set up test environment flags
    localStorage.setItem('test-mode', 'true')
    localStorage.setItem('e2e-test', 'active')
    
    // Set up mock user session
    sessionStorage.setItem('test-user', JSON.stringify({
      id: 'e2e-test-user',
      name: 'E2E Test User',
      email: 'e2e@test.com'
    }))
  })
  
  console.log('Test data setup completed')
}

async function setupApiMocks(page: any) {
  console.log('Setting up API mocks for E2E tests...')
  
  // Set up global API interceptors for consistent test behavior
  
  // Mock authentication if needed
  await page.route('/api/auth/**', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'e2e-test-user',
          name: 'E2E Test User',
          email: 'e2e@test.com'
        },
        authenticated: true
      })
    })
  })
  
  // Mock health check endpoint
  await page.route('/api/health', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: 'e2e-test'
      })
    })
  })
  
  console.log('API mocks setup completed')
}

export default globalSetup