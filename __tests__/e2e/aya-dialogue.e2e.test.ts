// End-to-End tests for AYA Dialogue System
import { test, expect, Page } from '@playwright/test'

// Mock AYA dialogue responses
const mockAyaResponses = {
  welcome: 'Hello! I\'m AYA, your AI assistant for hardware requirements definition. How can I help you today?',
  // temperatureQuestion: 'What// temperature range does your system need to operate in?',
  followUpQuestion: 'Great! For that// temperature range, what accuracy do you require?',
  systemSuggestion: 'Based on your requirements, I suggest considering a digital// temperature sensor with I2C interface.',
  clarification: 'Could you clarify the power requirements for your system?',
  completion: 'Excellent! Your requirements are now complete. Would you like me to generate system suggestions?'
}

async function setupAyaMocks(page: Page) {
  // Mock AYA chat responses
  await page.route('/api/aya/chat', async route => {
    const request = await route.request()
    const body = await request.postDataJSON()
    const userMessage = body.messages[body.messages.length - 1].content.toLowerCase()

    let response = mockAyaResponses.welcome

    if (userMessage.includes('temperature')) {
      response = mockAyaResponses.temperatureQuestion
    } else if (userMessage.includes('range') || userMessage.includes('°c')) {
      response = mockAyaResponses.followUpQuestion
    } else if (userMessage.includes('accuracy')) {
      response = mockAyaResponses.systemSuggestion
    } else if (userMessage.includes('power')) {
      response = mockAyaResponses.clarification
    } else if (userMessage.includes('yes') || userMessage.includes('complete')) {
      response = mockAyaResponses.completion
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: response,
        suggestions: userMessage.includes('suggestion') ? [
          'Consider// temperature sensors with built-in calibration',
          'Look into wireless communication modules',
          'Evaluate power management solutions'
        ] : [],
        nextQuestions: userMessage.includes('temperature') ? [
          {
            id: 'temp-range',
            question: 'What is the required// temperature measurement range?',
            priority: 1
          },
          {
            id: 'temp-accuracy',
            question: 'What accuracy is needed for// temperature measurements?',
            priority: 2
          }
        ] : [],
        confidence: 0.95,
        context: 'temperature-monitoring-system'
      })
    })
  })

  // Mock requirements analysis for AYA context
  await page.route('/api/requirements/analyze-for-aya', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        currentState: {
          completeness: 45,
          missingAreas: ['power-requirements', 'environmental-specs'],
          strengths: ['functional-requirements', 'basic-specifications']
        },
        suggestions: [
          'Define power consumption requirements',
          'Specify operating environment conditions',
          'Add interface specifications'
        ],
        priorityQuestions: [
          {
            id: 'power-1',
            question: 'What is the expected power consumption?',
            area: 'power-requirements',
            importance: 'high'
          }
        ]
      })
    })
  })

  // Mock AYA context updates
  await page.route('/api/aya/update-context', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        updatedContext: {
          systemType: 'temperature-sensor',
          requirements: ['temp-range', 'accuracy', 'power'],
          completeness: 75
        }
      })
    })
  })
}

test.describe('AYA Dialogue System E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupAyaMocks(page)
  })

  test('AYA welcome and initial interaction', async ({ page }) => {
    await page.goto('/aya-hardware-requirements')

    // Start AYA dialogue
    await page.click('[data-testid="start-aya-dialogue"]')

    // AYA welcome message should appear
    await expect(page.locator('[data-testid="aya-message"]').first()).toContainText('Hello! I\'m AYA')

    // Chat interface should be active
    await expect(page.locator('[data-testid="aya-chat-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="aya-chat-input"]')).toBeEnabled()

    // Send initial message
    await page.fill('[data-testid="aya-chat-input"]', 'I need help creating requirements for a// temperature monitoring system')
    await page.click('[data-testid="send-message"]')

    // User message should appear in chat
    await expect(page.locator('[data-testid="user-message"]').last()).toContainText('temperature monitoring system')

    // AYA should respond with// temperature-related question
    await expect(page.locator('[data-testid="aya-message"]').last()).toContainText('temperature range')

    // Next questions should be suggested
    await expect(page.locator('[data-testid="suggested-questions"]')).toBeVisible()
    await expect(page.locator('[data-testid="suggested-question"]').first()).toContainText('measurement range')
  })

  test('AYA guided requirements elicitation', async ({ page }) => {
    await page.goto('/aya-hardware-requirements')
    await page.click('[data-testid="start-aya-dialogue"]')

    // Start with// temperature system request
    await page.fill('[data-testid="aya-chat-input"]', 'I need a// temperature monitoring system')
    await page.click('[data-testid="send-message"]')

    // Wait for AYA response
    await expect(page.locator('[data-testid="aya-message"]').last()).toContainText('temperature range')

    // Answer the// temperature range question
    await page.fill('[data-testid="aya-chat-input"]', 'The system needs to measure from -20°C to 85°C')
    await page.click('[data-testid="send-message"]')

    // AYA should ask follow-up about accuracy
    await expect(page.locator('[data-testid="aya-message"]').last()).toContainText('accuracy')

    // Provide accuracy requirement
    await page.fill('[data-testid="aya-chat-input"]', 'We need ±0.5°C accuracy')
    await page.click('[data-testid="send-message"]')

    // AYA should provide system suggestions
    await expect(page.locator('[data-testid="aya-message"]').last()).toContainText('digital// temperature sensor')

    // Check that requirements are being updated
    await expect(page.locator('[data-testid="requirements-status"]')).toContainText('updating')

    // Verify progress indicator
    await expect(page.locator('[data-testid="dialogue-progress"]')).toBeVisible()
  })

  test('AYA contextual suggestions and quick actions', async ({ page }) => {
    await page.goto('/aya-hardware-requirements')
    await page.click('[data-testid="start-aya-dialogue"]')

    // Start dialogue
    await page.fill('[data-testid="aya-chat-input"]', 'I need sensor requirements')
    await page.click('[data-testid="send-message"]')

    // AYA should provide contextual suggestions
    await expect(page.locator('[data-testid="aya-suggestions"]')).toBeVisible()
    await expect(page.locator('[data-testid="suggestion-item"]').first()).toContainText('temperature sensors')

    // Click on a suggestion
    await page.click('[data-testid="suggestion-item"]')

    // Suggestion should be added to chat input
    await expect(page.locator('[data-testid="aya-chat-input"]')).toHaveValue(/temperature sensors/)

    // Quick action buttons should be available
    await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible()
    await expect(page.locator('[data-testid="quick-action-specs"]')).toContainText('Add Specifications')

    // Use quick action
    await page.click('[data-testid="quick-action-specs"]')
    await expect(page.locator('[data-testid="specs-dialog"]')).toBeVisible()
  })

  test('AYA requirements analysis and feedback', async ({ page }) => {
    await page.goto('/aya-hardware-requirements')
    await page.click('[data-testid="start-aya-dialogue"]')

    // Request analysis of current requirements
    await page.fill('[data-testid="aya-chat-input"]', 'Can you analyze my current requirements?')
    await page.click('[data-testid="send-message"]')

    // AYA should show analysis results
    await expect(page.locator('[data-testid="requirements-analysis"]')).toBeVisible()
    await expect(page.locator('[data-testid="completeness-meter"]')).toBeVisible()
    await expect(page.locator('[data-testid="missing-areas"]')).toContainText('power-requirements')

    // AYA should suggest improvements
    await expect(page.locator('[data-testid="improvement-suggestions"]')).toBeVisible()
    await expect(page.locator('[data-testid="suggestion-item"]')).toContainText('power consumption')

    // Priority questions should be highlighted
    await expect(page.locator('[data-testid="priority-questions"]')).toBeVisible()
    await expect(page.locator('[data-testid="priority-question"]')).toContainText('power consumption')
  })

  test('AYA conversation history and context awareness', async ({ page }) => {
    await page.goto('/aya-hardware-requirements')
    await page.click('[data-testid="start-aya-dialogue"]')

    // Have a multi-turn conversation
    const conversationSteps = [
      { user: 'I need a// temperature system', expectedResponse: 'temperature range' },
      { user: '-20°C to 85°C', expectedResponse: 'accuracy' },
      { user: '±0.5°C accuracy', expectedResponse: 'sensor' },
      { user: 'What about power requirements?', expectedResponse: 'power' }
    ]

    for (const step of conversationSteps) {
      await page.fill('[data-testid="aya-chat-input"]', step.user)
      await page.click('[data-testid="send-message"]')
      await expect(page.locator('[data-testid="aya-message"]').last()).toContainText(step.expectedResponse)
    }

    // Check conversation history
    await page.click('[data-testid="conversation-history"]')
    await expect(page.locator('[data-testid="conversation-item"]')).toHaveCount(conversationSteps.length * 2) // user + aya messages

    // AYA should reference previous context
    await page.fill('[data-testid="aya-chat-input"]', 'Go back to the// temperature specifications')
    await page.click('[data-testid="send-message"]')
    await expect(page.locator('[data-testid="aya-message"]').last()).toContainText('-20°C to 85°C')
  })

  test('AYA error handling and recovery', async ({ page }) => {
    // Mock API error
    await page.route('/api/aya/chat', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'AYA service temporarily unavailable' })
      })
    })

    await page.goto('/aya-hardware-requirements')
    await page.click('[data-testid="start-aya-dialogue"]')

    // Try to send message
    await page.fill('[data-testid="aya-chat-input"]', 'Test message')
    await page.click('[data-testid="send-message"]')

    // Error message should appear
    await expect(page.locator('[data-testid="aya-error"]')).toContainText('temporarily unavailable')

    // Retry button should be available
    await expect(page.locator('[data-testid="retry-message"]')).toBeVisible()

    // Restore API
    await setupAyaMocks(page)

    // Retry should work
    await page.click('[data-testid="retry-message"]')
    await expect(page.locator('[data-testid="aya-message"]').last()).toContainText('AYA')
  })

  test('AYA accessibility features', async ({ page }) => {
    await page.goto('/aya-hardware-requirements')
    await page.click('[data-testid="start-aya-dialogue"]')

    // Check ARIA labels for chat interface
    await expect(page.locator('[data-testid="aya-chat-input"]')).toHaveAttribute('aria-label', /chat with AYA/i)

    // Check screen reader announcements
    await page.fill('[data-testid="aya-chat-input"]', 'Test accessibility')
    await page.click('[data-testid="send-message"]')

    // New messages should have proper ARIA live regions
    await expect(page.locator('[data-testid="chat-messages"]')).toHaveAttribute('aria-live', 'polite')

    // Keyboard navigation should work
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'aya-chat-input')

    // Voice input button should be accessible
    await expect(page.locator('[data-testid="voice-input"]')).toHaveAttribute('aria-label', /voice input/i)
  })

  test('AYA mobile interface optimization', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip('This test is for mobile only')
    }

    await page.goto('/aya-hardware-requirements')
    await page.click('[data-testid="start-aya-dialogue"]')

    // Mobile chat interface should be optimized
    await expect(page.locator('[data-testid="mobile-chat-container"]')).toBeVisible()

    // Touch-friendly message bubbles
    const messageHeight = await page.locator('[data-testid="aya-message"]').first().evaluate(el =>
      getComputedStyle(el).minHeight
    )
    expect(parseInt(messageHeight)).toBeGreaterThan(40) // Minimum touch target size

    // Mobile keyboard handling
    await page.fill('[data-testid="aya-chat-input"]', 'Mobile test message')

    // Send button should be large enough for touch
    const sendButtonSize = await page.locator('[data-testid="send-message"]').boundingBox()
    expect(sendButtonSize?.width).toBeGreaterThan(40)
    expect(sendButtonSize?.height).toBeGreaterThan(40)

    // Virtual keyboard should not obscure input
    await page.click('[data-testid="aya-chat-input"]')
    await expect(page.locator('[data-testid="aya-chat-input"]')).toBeInViewport()
  })

  test('AYA performance with long conversations', async ({ page }) => {
    await page.goto('/aya-hardware-requirements')
    await page.click('[data-testid="start-aya-dialogue"]')

    // Simulate a long conversation
    const messageCount = 20
    for (let i = 0; i < messageCount; i++) {
      await page.fill('[data-testid="aya-chat-input"]', `Message ${i + 1}: Testing performance`)

      const startTime = Date.now()
      await page.click('[data-testid="send-message"]')

      // Wait for AYA response
      await expect(page.locator('[data-testid="aya-message"]').last()).toBeVisible()

      const responseTime = Date.now() - startTime
      expect(responseTime).toBeLessThan(5000) // Response should be under 5 seconds
    }

    // Check that chat performance hasn't degraded
    const totalMessages = await page.locator('[data-testid="chat-message"]').count()
    expect(totalMessages).toBeGreaterThan(messageCount)

    // Scroll should still be smooth
    await page.locator('[data-testid="chat-messages"]').evaluate(el => {
      el.scrollTop = 0
    })
    await page.locator('[data-testid="chat-messages"]').evaluate(el => {
      el.scrollTop = el.scrollHeight
    })

    // Latest message should be visible
    await expect(page.locator('[data-testid="aya-message"]').last()).toBeInViewport()
  })

  test('AYA integration with requirements document', async ({ page }) => {
    await page.goto('/aya-hardware-requirements')
    await page.click('[data-testid="start-aya-dialogue"]')

    // Start dialogue and provide requirements
    await page.fill('[data-testid="aya-chat-input"]', 'I need a// temperature sensor with -20°C to 85°C range')
    await page.click('[data-testid="send-message"]')

    // Wait for AYA to process and update requirements
    await expect(page.locator('[data-testid="requirements-updating"]')).toBeVisible()

    // Switch to document view to see updates
    await page.click('[data-testid="document-tab"]')

    // Requirements document should reflect the conversation
    await expect(page.locator('[data-testid="requirements-content"]')).toContainText('-20°C to 85°C')

    // Switch back to AYA and continue conversation
    await page.click('[data-testid="aya-dialogue-tab"]')
    await page.fill('[data-testid="aya-chat-input"]', 'Add accuracy requirement of ±0.5°C')
    await page.click('[data-testid="send-message"]')

    // Check that document is updated again
    await page.click('[data-testid="document-tab"]')
    await expect(page.locator('[data-testid="requirements-content"]')).toContainText('±0.5°C')

    // Completeness should improve
    await expect(page.locator('[data-testid="completeness-score"]')).toContainText(/[5-9]\d%/) // 50-99%
  })
})