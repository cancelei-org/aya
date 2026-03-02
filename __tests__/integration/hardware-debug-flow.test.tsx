import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import { SessionProvider } from 'next-auth/react'
import { MainCanvas } from '@/components/canvas/MainCanvas'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { VisualInformation } from '@/components/visualization/VisualInformation'
import type { Session } from 'next-auth'

// Mock WebSocket
class MockWebSocket {
  url: string
  readyState: number = 0
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null

  constructor(url: string) {
    this.url = url
    setTimeout(() => {
      this.readyState = 1
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 100)
  }

  send(data: string) {
    const message = JSON.parse(data)
    
    // Simulate responses
    if (message.type === 'session.update') {
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'session.created',
              session: { id: 'test-session' }
            })
          }))
        }
      }, 50)
    }
    
    if (message.type === 'input_audio_buffer.append') {
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'conversation.item.created',
              item: { role: 'user', transcript: 'この回路を見てください' }
            })
          }))
        }
      }, 100)
    }
  }

  close() {
    this.readyState = 3
    if (this.onclose) {
      this.onclose(new CloseEvent('close'))
    }
  }
}

// Mock getUserMedia
const mockGetUserMedia = jest.fn(async () => {
  const stream = {
    getTracks: () => [{
      stop: jest.fn(),
      kind: 'video'
    }, {
      stop: jest.fn(),
      kind: 'audio'
    }],
    getAudioTracks: () => [{
      enabled: true
    }],
    getVideoTracks: () => [{
      enabled: true
    }]
  }
  return stream as unknown as MediaStream
})

Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
    enumerateDevices: jest.fn().mockResolvedValue([
      { deviceId: 'camera1', kind: 'videoinput', label: 'Camera 1' }
    ]),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }
})

// Mock WebSocket globally
global.WebSocket = MockWebSocket as any

// Mock AudioContext
global.AudioContext = jest.fn().mockImplementation(() => ({
  state: 'running',
  sampleRate: 44100,
  createMediaStreamSource: jest.fn().mockReturnValue({
    connect: jest.fn()
  }),
  createScriptProcessor: jest.fn().mockReturnValue({
    connect: jest.fn(),
    disconnect: jest.fn(),
    onaudioprocess: null
  }),
  createBuffer: jest.fn(),
  createBufferSource: jest.fn().mockReturnValue({
    buffer: null,
    connect: jest.fn(),
    start: jest.fn(),
    onended: null
  }),
  destination: {},
  close: jest.fn().mockResolvedValue(undefined),
  resume: jest.fn().mockResolvedValue(undefined)
})) as any

describe('Hardware Debug Flow Integration', () => {
  const mockSession: Session = {
    user: { id: 'user-123', email: 'test@example.com' },
    expires: '2025-12-31'
  }

  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
    description: 'Test project for hardware debug'
  }

  let handleSendMessage: jest.Mock
  let chatMessages: any[]
  let setChatMessages: jest.Mock

  beforeEach(() => {
    handleSendMessage = jest.fn()
    chatMessages = []
    setChatMessages = jest.fn((updater) => {
      if (typeof updater === 'function') {
        chatMessages = updater(chatMessages)
      } else {
        chatMessages = updater
      }
    })
    
    // Mock fetch for API calls
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('/api/debug/context')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            systemDesign: [
              { id: 'node1', name: 'Arduino', type: 'microcontroller' }
            ],
            partsInfo: [],
            compatibilityIssues: []
          })
        })
      }
      
      if (url.includes('/api/analyze-vision')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            analysis: '回路基板にArduino Unoが見えます。',
            debugSuggestions: ['配線を確認してください']
          })
        })
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    }) as jest.Mock
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('completes full hardware debug flow', async () => {
    const { rerender } = render(
      <SessionProvider session={mockSession}>
        <div style={{ display: 'flex' }}>
          <MainCanvas
            activeTab="visual"
            nodes={[]}
            setCanvasNodes={jest.fn()}
            connections={[]}
            chatMessages={chatMessages}
            currentProject={mockProject}
            isProcessing={false}
            isSaving={false}
            deletionInProgressRef={{ current: false }}
            setConnections={jest.fn()}
            editingItemId={null}
            editingValue=""
            setEditingItemId={jest.fn()}
            setEditingValue={jest.fn()}
            setIsSaving={jest.fn()}
            setIsProcessing={jest.fn()}
            setActiveTab={jest.fn()}
            softwareContext={null}
            handleSendMessage={handleSendMessage}
          />
          <ChatPanel
            chatMessages={chatMessages}
            chatThreads={[]}
            currentMessage=""
            setCurrentMessage={jest.fn()}
            handleSendMessage={handleSendMessage}
            isChatActive={true}
            currentThreadId={null}
            setChatThreads={jest.fn()}
            setShowThreads={jest.fn()}
            showThreads={false}
            setChatMessages={setChatMessages}
            setCurrentThreadId={jest.fn()}
            setIsChatActive={jest.fn()}
            llmStatus={{ isRunning: false, currentTask: '' }}
            hardwareContextStatus={{ isLoading: false, componentCount: 0, summary: '' }}
            failedConnections={[]}
            setFailedConnections={jest.fn()}
            connections={[]}
            setConnections={jest.fn()}
            selectedFiles={[]}
            uploadStatus={{ isUploading: false, progress: 0 }}
            filePreviewUrls={{}}
            handleFileSelect={jest.fn()}
            clearFiles={jest.fn()}
            setUploadStatus={jest.fn()}
          />
        </div>
      </SessionProvider>
    )

    // 1. Start webcam session
    const startButton = screen.getByText('Start Session')
    fireEvent.click(startButton)

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument()
    })

    // 2. Simulate voice input
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    // 3. Check that message was sent to ChatPanel
    await waitFor(() => {
      expect(handleSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'debug-audio',
          content: 'この回路を見てください'
        })
      )
    })

    // 4. Simulate vision analysis trigger
    // In real scenario, the AI would request webcam analysis
    // For test, we'll simulate the vision analysis completion
    setChatMessages(prev => [...prev, {
      id: 'vision-1',
      role: 'assistant',
      content: '回路基板にArduino Unoが見えます。',
      timestamp: new Date().toISOString(),
      type: 'debug-visual',
      debugMetadata: {
        imageBase64: 'test-image'
      }
    }])

    // Rerender to show updated messages
    rerender(
      <SessionProvider session={mockSession}>
        <div style={{ display: 'flex' }}>
          <MainCanvas
            activeTab="visual"
            nodes={[]}
            setCanvasNodes={jest.fn()}
            connections={[]}
            chatMessages={chatMessages}
            currentProject={mockProject}
            isProcessing={false}
            isSaving={false}
            deletionInProgressRef={{ current: false }}
            setConnections={jest.fn()}
            editingItemId={null}
            editingValue=""
            setEditingItemId={jest.fn()}
            setEditingValue={jest.fn()}
            setIsSaving={jest.fn()}
            setIsProcessing={jest.fn()}
            setActiveTab={jest.fn()}
            softwareContext={null}
            handleSendMessage={handleSendMessage}
          />
          <ChatPanel
            chatMessages={chatMessages}
            chatThreads={[]}
            currentMessage=""
            setCurrentMessage={jest.fn()}
            handleSendMessage={handleSendMessage}
            isChatActive={true}
            currentThreadId={null}
            setChatThreads={jest.fn()}
            setShowThreads={jest.fn()}
            showThreads={false}
            setChatMessages={setChatMessages}
            setCurrentThreadId={jest.fn()}
            setIsChatActive={jest.fn()}
            llmStatus={{ isRunning: false, currentTask: '' }}
            hardwareContextStatus={{ isLoading: false, componentCount: 0, summary: '' }}
            failedConnections={[]}
            setFailedConnections={jest.fn()}
            connections={[]}
            setConnections={jest.fn()}
            selectedFiles={[]}
            uploadStatus={{ isUploading: false, progress: 0 }}
            filePreviewUrls={{}}
            handleFileSelect={jest.fn()}
            clearFiles={jest.fn()}
            setUploadStatus={jest.fn()}
          />
        </div>
      </SessionProvider>
    )

    // 5. Verify vision analysis message appears in chat
    await waitFor(() => {
      expect(screen.getByText('Vision Analysis')).toBeInTheDocument()
      expect(screen.getByText('回路基板にArduino Unoが見えます。')).toBeInTheDocument()
    })
  })
})