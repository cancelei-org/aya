// End-to-End tests for Requirements Workflow
import { test, expect, Page } from '@playwright/test'

// Mock data for consistent testing
const mockRequirementsData = {
  id: 'req-e2e-123',
  title: 'E2E Test Requirements',
  contentText: 'Temperature monitoring system with IoT capabilities and sensor accuracy requirements',
  status: 'DRAFT',
  version: 1
}

const mockSystemSuggestions = [
  {
    id: 'sys-e2e-1',
    name: 'IoT Temperature Monitoring System',
    description: 'Complete// temperature monitoring solution with wireless connectivity',
    components: [
      {
        id: 'comp-1',
        name: 'Temperature Sensor',
        type: 'sensor',
        reasoning: 'Provides accurate// temperature measurement'
      },
      {
        id: 'comp-2',
        name: 'Wireless Module',
        type: 'communication',
        reasoning: 'Enables IoT connectivity'
      }
    ],
    estimatedCost: { min: 50, max: 100, currency: 'USD' },
    estimatedDevelopmentTime: { min: 6, max: 10, unit: 'weeks' }
  }
]

// Setup function to mock API responses
async function setupApiMocks(page: Page) {
  // Mock requirements generation
  await page.route('/api/requirements/generate', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockRequirementsData)
    })
  })

  // Mock requirements analysis
  await page.route('/api/requirements/analyze', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        completeness: 65,
        questions: [
          {
            id: 'q1',
            question: 'What is the required// temperature measurement range?',
            intent: 'Define sensor specifications',
            priority: 1,
            answered: false
          },
          {
            id: 'q2',
            question: 'What wireless protocols should be supported?',
            intent: 'Define communication requirements',
            priority: 2,
            answered: false
          }
        ],
        systemType: 'iot-system'
      })
    })
  })

  // Mock requirements update from answer
  await page.route('/api/requirements/update-from-answer', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: 'Updated Requirements' }]
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Temperature monitoring system with range -20°C to 85°C' }]
            }
          ]
        },
        decisions: [],
        updatedSections: ['technical-specs']
      })
    })
  })

  // Mock requirements approval
  await page.route('/api/requirements/*/approve', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        status: 'APPROVED'
      })
    })
  })

  // Mock approval history
  await page.route('/api/requirements/*/approval-history', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: '1',
          action: 'SUBMITTED',
          userId: 'user-123',
          userName: 'Test User',
          timestamp: new Date().toISOString(),
          comments: 'Initial submission'
        }
      ])
    })
  })

  // Mock approved requirements
  await page.route('/api/requirements/approved*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          ...mockRequirementsData,
          status: 'APPROVED',
          approvedAt: new Date().toISOString()
        }
      ])
    })
  })

  // Mock system suggestions generation
  await page.route('/api/system-suggestions/generate', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockSystemSuggestions)
    })
  })

  // Mock requirements validation
  await page.route('/api/requirements/validate-approval', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        valid: true,
        approvedRequirements: [mockRequirementsData.id],
        unapprovedRequirements: []
      })
    })
  })
}

test.describe('AYA Hardware Requirements Dialogue E2E Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
  })

  test('Complete requirements definition and approval workflow', async ({ page }) => {
    // Navigate to the application
    await page.goto('/aya-hardware-requirements')

    // Start a new requirements session
    await page.click('[data-testid="start-new-requirements"]')

    // Enter initial requirements prompt
    await page.fill('[data-testid="requirements-prompt"]',
      'I need a// temperature monitoring system for industrial use with IoT connectivity')

    // Submit the prompt
    await page.click('[data-testid="generate-requirements"]')

    // Wait for requirements to be generated
    await expect(page.locator('[data-testid="requirements-title"]')).toHaveText('E2E Test Requirements')
    await expect(page.locator('[data-testid="requirements-status"]')).toHaveText('DRAFT')

    // Switch to Structure view to see sections
    await page.click('[data-testid="structure-tab"]')
    await expect(page.locator('[data-testid="structured-view"]')).toBeVisible()

    // Switch to AYA dialogue for refinement
    await page.click('[data-testid="aya-dialogue-tab"]')

    // AYA should ask the first question
    await expect(page.locator('[data-testid="aya-question"]')).toContainText('temperature measurement range')

    // Answer the question
    await page.fill('[data-testid="aya-answer-input"]', 'The system should measure from -20°C to 85°C with ±0.5°C accuracy')
    await page.click('[data-testid="submit-answer"]')

    // Wait for requirements to be updated
    await expect(page.locator('[data-testid="requirements-updated"]')).toBeVisible()

    // AYA should ask the next question
    await expect(page.locator('[data-testid="aya-question"]')).toContainText('wireless protocols')

    // Answer the second question
    await page.fill('[data-testid="aya-answer-input"]', 'WiFi and Bluetooth Low Energy support required')
    await page.click('[data-testid="submit-answer"]')

    // Check completeness progress
    await expect(page.locator('[data-testid="completeness-score"]')).toContainText('65%')

    // Move to review mode
    await page.click('[data-testid="review-tab"]')

    // Review checklist should be visible
    await expect(page.locator('[data-testid="review-checklist"]')).toBeVisible()

    // Check critical review items
    const criticalItems = page.locator('[data-testid="critical-check-item"]')
    const count = await criticalItems.count()

    for (let i = 0; i < count; i++) {
      await criticalItems.nth(i).click()
    }

    // Add review comments
    await page.fill('[data-testid="review-comments"]', 'Requirements are comprehensive and meet all criteria')

    // Approve the requirements
    await page.click('[data-testid="approve-requirements"]')

    // Verify approval success
    await expect(page.locator('[data-testid="approval-success"]')).toBeVisible()
    await expect(page.locator('[data-testid="requirements-status"]')).toHaveText('APPROVED')

    // Check approval history
    await page.click('[data-testid="history-tab"]')
    await expect(page.locator('[data-testid="approval-entry"]')).toContainText('Test User')
    await expect(page.locator('[data-testid="approval-action"]')).toContainText('提出')
  })

  test('System suggestions generation workflow', async ({ page }) => {
    // Navigate to system suggestions page
    await page.goto('/system-suggestions')

    // Click to select requirements for system suggestions
    await page.click('[data-testid="select-requirements"]')

    // Requirements selection dialog should open
    await expect(page.locator('[data-testid="requirements-selection-dialog"]')).toBeVisible()

    // Search for requirements
    await page.fill('[data-testid="requirements-search"]', 'temperature')
    await expect(page.locator('[data-testid="requirement-item"]')).toHaveCount(1)

    // Select the requirement
    await page.click('[data-testid="requirement-checkbox"]')
    await expect(page.locator('[data-testid="selected-count"]')).toContainText('1 requirement selected')

    // Generate system suggestions
    await page.click('[data-testid="generate-suggestions"]')

    // Wait for suggestions to be generated
    await expect(page.locator('[data-testid="system-suggestion"]')).toBeVisible()

    // Verify suggestion details
    await expect(page.locator('[data-testid="suggestion-name"]')).toContainText('IoT Temperature Monitoring System')
    await expect(page.locator('[data-testid="suggestion-description"]')).toContainText('wireless connectivity')

    // Check components
    await expect(page.locator('[data-testid="component-item"]')).toHaveCount(2)
    await expect(page.locator('[data-testid="component-name"]').first()).toContainText('Temperature Sensor')

    // Check cost estimation
    await expect(page.locator('[data-testid="cost-estimation"]')).toContainText('$50 - $100')

    // Check development time
    await expect(page.locator('[data-testid="development-time"]')).toContainText('6 - 10 weeks')

    // View component details
    await page.click('[data-testid="component-details-button"]')
    await expect(page.locator('[data-testid="component-details"]')).toBeVisible()
    await expect(page.locator('[data-testid="component-reasoning"]')).toContainText('accurate// temperature measurement')
  })

  test('Error handling and recovery', async ({ page }) => {
    // Mock API error for requirements generation
    await page.route('/api/requirements/generate', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Generation failed' })
      })
    })

    await page.goto('/aya-hardware-requirements')
    await page.click('[data-testid="start-new-requirements"]')
    await page.fill('[data-testid="requirements-prompt"]', 'Test prompt')
    await page.click('[data-testid="generate-requirements"]')

    // Error message should be displayed
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Generation failed')

    // User should be able to retry
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()

    // Restore normal API behavior
    await page.route('/api/requirements/generate', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockRequirementsData)
      })
    })

    // Retry should work
    await page.click('[data-testid="retry-button"]')
    await expect(page.locator('[data-testid="requirements-title"]')).toHaveText('E2E Test Requirements')
  })

  test('Mobile responsive workflow', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip('This test is for mobile only')
    }

    await page.goto('/aya-hardware-requirements')

    // Mobile menu should be visible
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()

    // Start requirements creation
    await page.click('[data-testid="start-new-requirements"]')
    await page.fill('[data-testid="requirements-prompt"]', 'Mobile test requirements')
    await page.click('[data-testid="generate-requirements"]')

    // Tabs should be in mobile layout
    await expect(page.locator('[data-testid="mobile-tabs"]')).toBeVisible()

    // Tab switching should work on mobile
    await page.click('[data-testid="structure-tab-mobile"]')
    await expect(page.locator('[data-testid="structured-view"]')).toBeVisible()

    // AYA dialogue should be accessible
    await page.click('[data-testid="aya-dialogue-tab-mobile"]')
    await expect(page.locator('[data-testid="aya-chat-interface"]')).toBeVisible()
  })

  test('Accessibility compliance', async ({ page }) => {
    await page.goto('/aya-hardware-requirements')

    // Check for proper heading structure
    const h1Count = await page.locator('h1').count()
    expect(h1Count).toBeGreaterThan(0)

    // Check for form labels
    await page.click('[data-testid="start-new-requirements"]')
    const promptInput = page.locator('[data-testid="requirements-prompt"]')
    await expect(promptInput).toHaveAttribute('aria-label')

    // Check for keyboard navigation
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toBeVisible()

    // Check for proper ARIA roles
    await expect(page.locator('[role="main"]')).toBeVisible()
    await expect(page.locator('[role="navigation"]')).toBeVisible()

    // Check color contrast (basic check)
    const backgroundColor = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor
    })
    expect(backgroundColor).toBeTruthy()
  })

  test('Data persistence and session recovery', async ({ page }) => {
    await page.goto('/aya-hardware-requirements')

    // Start requirements creation
    await page.click('[data-testid="start-new-requirements"]')
    await page.fill('[data-testid="requirements-prompt"]', 'Persistence test requirements')
    await page.click('[data-testid="generate-requirements"]')

    // Save requirement ID for later reference
    const requirementId = await page.locator('[data-testid="requirement-id"]').textContent()

    // Refresh the page to simulate session recovery
    await page.reload()

    // Application should restore the session
    await expect(page.locator('[data-testid="requirements-title"]')).toBeVisible()

    // Navigate away and back
    await page.goto('/system-suggestions')
    await page.goBack()

    // Data should still be available
    await expect(page.locator('[data-testid="requirements-title"]')).toHaveText('E2E Test Requirements')
  })

  test('Performance and loading states', async ({ page }) => {
    // Mock slow API response
    await page.route('/api/requirements/generate', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockRequirementsData)
      })
    })

    await page.goto('/aya-hardware-requirements')
    await page.click('[data-testid="start-new-requirements"]')
    await page.fill('[data-testid="requirements-prompt"]', 'Performance test')

    // Click generate and check loading state
    await page.click('[data-testid="generate-requirements"]')
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible()
    await expect(page.locator('[data-testid="loading-message"]')).toContainText('Generating requirements')

    // Wait for completion
    await expect(page.locator('[data-testid="requirements-title"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="loading-spinner"]')).not.toBeVisible()
  })
})