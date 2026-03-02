describe('Hardware Debug Support E2E', () => {
  beforeEach(() => {
    // ログインとプロジェクト作成
    cy.login('test@example.com', 'password')
    cy.createProject('Test Hardware Debug Project')
    
    // Mock WebSocket connection
    cy.window().then((win) => {
      // @ts-ignore
      win.WebSocket = class MockWebSocket {
        constructor(url: string) {
          setTimeout(() => {
            this.onopen?.({} as Event)
          }, 100)
        }
        send() {}
        close() {}
        onopen: ((event: Event) => void) | null = null
        onmessage: ((event: MessageEvent) => void) | null = null
        onerror: ((event: Event) => void) | null = null
        onclose: ((event: CloseEvent) => void) | null = null
      }
    })
    
    // Mock getUserMedia
    cy.window().then((win) => {
      const mockStream = {
        getTracks: () => [{ stop: cy.stub() }],
        getAudioTracks: () => [{ enabled: true }],
        getVideoTracks: () => [{ enabled: true }]
      }
      
      // @ts-ignore
      win.navigator.mediaDevices = {
        getUserMedia: cy.stub().resolves(mockStream),
        enumerateDevices: cy.stub().resolves([
          { deviceId: 'camera1', kind: 'videoinput', label: 'Test Camera' }
        ])
      }
    })
  })

  it('completes full hardware debug workflow', () => {
    // 1. Navigate to Hardware Debug Support tab
    cy.get('button').contains('Hardware Debug Support').click()
    
    // Verify tab is active
    cy.get('button').contains('Hardware Debug Support')
      .should('have.class', 'border-[#00AEEF]')
    
    // 2. Verify initial UI state
    cy.contains('Hardware Debug Support').should('be.visible')
    cy.contains('Show your hardware components').should('be.visible')
    cy.contains('Camera is off').should('be.visible')
    
    // 3. Start webcam session
    cy.get('button').contains('Start Session').click()
    
    // Wait for connection
    cy.contains('Connected', { timeout: 5000 }).should('be.visible')
    
    // 4. Verify webcam is active
    cy.get('video').should('be.visible')
    cy.get('button').contains('Stop Session').should('be.visible')
    cy.get('button').contains('Mute').should('be.visible')
    
    // 5. Test camera switching (if multiple cameras)
    cy.get('select#camera-select').should('exist')
    cy.get('select#camera-select option').should('have.length.at.least', 1)
    
    // 6. Test mute/unmute functionality
    cy.get('button').contains('Mute').click()
    cy.get('button').contains('Unmute').should('be.visible')
    cy.get('button').contains('Unmute').click()
    cy.get('button').contains('Mute').should('be.visible')
    
    // 7. Simulate voice input and vision analysis
    cy.window().then((win) => {
      // Simulate voice input received
      const ws = (win as any).wsRef?.current
      if (ws && ws.onmessage) {
        ws.onmessage(new MessageEvent('message', {
          data: JSON.stringify({
            type: 'conversation.item.created',
            item: {
              role: 'user',
              transcript: 'この回路基板を確認してください'
            }
          })
        }))
      }
    })
    
    // 8. Verify message appears in ChatPanel
    cy.get('.flex.justify-end').should('exist')
    cy.contains('Voice Input').should('be.visible')
    cy.contains('この回路基板を確認してください').should('be.visible')
    
    // 9. Simulate AI vision analysis response
    cy.intercept('POST', '/api/analyze-vision', {
      statusCode: 200,
      body: {
        analysis: 'Arduino Unoと赤色LEDが接続されています。抵抗が見当たりません。',
        debugSuggestions: ['LEDに適切な抵抗を追加してください']
      }
    }).as('analyzeVision')
    
    cy.window().then((win) => {
      // Simulate function call for vision analysis
      const ws = (win as any).wsRef?.current
      if (ws && ws.onmessage) {
        ws.onmessage(new MessageEvent('message', {
          data: JSON.stringify({
            type: 'response.function_call_arguments.done',
            name: 'analyze_webcam',
            call_id: 'test-call-123'
          })
        }))
      }
    })
    
    cy.wait('@analyzeVision')
    
    // 10. Verify vision analysis appears
    cy.contains('Vision Analysis').should('be.visible')
    cy.contains('Arduino Unoと赤色LEDが接続されています').should('be.visible')
    
    // 11. Test image expansion in debug message
    cy.get('img[alt="Debug capture"]').should('exist')
    cy.get('img[alt="Debug capture"]').parent().click()
    cy.contains('Click to collapse image').should('be.visible')
    
    // 12. Test error handling - disconnect
    cy.window().then((win) => {
      const ws = (win as any).wsRef?.current
      if (ws && ws.onclose) {
        ws.onclose(new CloseEvent('close', { code: 1006 }))
      }
    })
    
    cy.contains('Connection lost').should('be.visible')
    
    // 13. Stop session
    cy.get('button').contains('Stop Session').click()
    cy.contains('Camera is off').should('be.visible')
    cy.get('button').contains('Start Session').should('be.visible')
  })

  it('handles permission errors gracefully', () => {
    // Mock getUserMedia rejection
    cy.window().then((win) => {
      // @ts-ignore
      win.navigator.mediaDevices = {
        getUserMedia: cy.stub().rejects(new Error('NotAllowedError')),
        enumerateDevices: cy.stub().resolves([])
      }
    })
    
    // Navigate to Hardware Debug Support
    cy.get('button').contains('Hardware Debug Support').click()
    
    // Try to start session
    cy.get('button').contains('Start Session').click()
    
    // Should show permission error
    cy.contains('Camera and microphone access denied').should('be.visible')
    cy.get('button').contains('Start Session').should('be.visible')
  })

  it('integrates with project context', () => {
    // First create some nodes in System Diagram
    cy.get('button').contains('System Diagram').click()
    
    // Add Arduino node
    cy.get('.react-flow__pane').rightclick(200, 200)
    cy.contains('Add Component').click()
    cy.get('input[value="New Component"]').clear().type('Arduino Uno')
    cy.get('input[value="New Component"]').blur()
    
    // Add LED node
    cy.get('.react-flow__pane').rightclick(400, 200)
    cy.contains('Add Component').click()
    cy.get('input[value="New Component"]').clear().type('Red LED')
    cy.get('input[value="New Component"]').blur()
    
    // Connect them
    cy.get('.react-flow__node').first().find('.react-flow__handle-right').first()
      .trigger('mousedown', { button: 0 })
    cy.get('.react-flow__node').last().find('.react-flow__handle-left').first()
      .trigger('mouseup', { button: 0 })
    
    // Navigate to Hardware Debug Support
    cy.get('button').contains('Hardware Debug Support').click()
    
    // Mock debug context API
    cy.intercept('GET', '/api/debug/context/*', {
      statusCode: 200,
      body: {
        systemDesign: [
          { id: 'node1', name: 'Arduino Uno', type: 'microcontroller' },
          { id: 'node2', name: 'Red LED', type: 'component' }
        ],
        partsInfo: [],
        compatibilityIssues: [
          {
            id: 'voltage-issue',
            type: 'voltage',
            severity: 'warning',
            description: 'LED requires current limiting resistor',
            affectedNodes: ['node2']
          }
        ]
      }
    }).as('getDebugContext')
    
    // Start session
    cy.get('button').contains('Start Session').click()
    
    // Simulate vision analysis that uses context
    cy.window().then((win) => {
      const ws = (win as any).wsRef?.current
      if (ws && ws.onmessage) {
        ws.onmessage(new MessageEvent('message', {
          data: JSON.stringify({
            type: 'response.function_call_arguments.done',
            name: 'analyze_webcam',
            call_id: 'test-call-456'
          })
        }))
      }
    })
    
    cy.wait('@getDebugContext')
    
    // Verify context is included in analysis
    cy.contains('With AYA context').should('be.visible')
    cy.contains('2 nodes, 1 issues').should('be.visible')
  })
})