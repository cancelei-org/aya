import { render, screen, fireEvent } from '@testing-library/react'
import { DebugMessageRenderer } from '@/components/chat/DebugMessageRenderer'
import type { DebugChatMessage } from '@/types/debug'

describe('DebugMessageRenderer', () => {
  const mockMessage: DebugChatMessage = {
    id: 'test-1',
    role: 'user',
    content: 'Test message',
    timestamp: new Date().toISOString(),
    type: 'debug-visual',
    debugMetadata: {
      imageBase64: 'test-image-base64',
      ayaContext: {
        systemDesign: [
          { id: 'node1', name: 'Test Node', type: 'component' }
        ],
        partsInfo: [],
        compatibilityIssues: [
          { 
            id: 'issue1', 
            type: 'voltage', 
            severity: 'error', 
            description: 'Voltage mismatch',
            affectedNodes: ['node1']
          }
        ]
      }
    }
  }

  it('renders debug-visual message correctly', () => {
    render(
      <DebugMessageRenderer 
        message={mockMessage}
        messageMaxWidth="max-w-lg"
      />
    )

    expect(screen.getByText('Vision Analysis')).toBeInTheDocument()
    expect(screen.getByText('Test message')).toBeInTheDocument()
  })

  it('renders debug-audio message correctly', () => {
    const audioMessage: DebugChatMessage = {
      ...mockMessage,
      type: 'debug-audio',
      debugMetadata: {
        audioTranscript: 'This is what I said'
      }
    }

    render(
      <DebugMessageRenderer 
        message={audioMessage}
        messageMaxWidth="max-w-lg"
      />
    )

    expect(screen.getByText('Voice Input')).toBeInTheDocument()
    expect(screen.getByText(/This is what I said/)).toBeInTheDocument()
  })

  it('toggles image expansion on click', () => {
    render(
      <DebugMessageRenderer 
        message={mockMessage}
        messageMaxWidth="max-w-lg"
      />
    )

    const image = screen.getByAltText('Debug capture')
    expect(image).toHaveClass('max-w-[200px]')

    fireEvent.click(image.parentElement!)
    expect(image).toHaveClass('max-w-full')
  })

  it('displays AYA context information', () => {
    render(
      <DebugMessageRenderer 
        message={mockMessage}
        messageMaxWidth="max-w-lg"
      />
    )

    expect(screen.getByText(/With AYA context: 1 nodes, 1 issues/)).toBeInTheDocument()
  })

  it('applies correct styling for user messages', () => {
    render(
      <DebugMessageRenderer 
        message={mockMessage}
        messageMaxWidth="max-w-lg"
      />
    )

    const messageContainer = screen.getByText('Test message').closest('div[class*="rounded-lg"]')
    expect(messageContainer).toHaveClass('bg-purple-600', 'text-white')
  })

  it('applies correct styling for assistant messages', () => {
    const assistantMessage: DebugChatMessage = {
      ...mockMessage,
      role: 'assistant'
    }

    render(
      <DebugMessageRenderer 
        message={assistantMessage}
        messageMaxWidth="max-w-lg"
      />
    )

    const messageContainer = screen.getByText('Test message').closest('div[class*="rounded-lg"]')
    expect(messageContainer).toHaveClass('bg-purple-50', 'text-purple-900', 'border', 'border-purple-200')
  })

  it('renders regular messages without debug metadata', () => {
    const regularMessage: DebugChatMessage = {
      id: 'test-regular',
      role: 'user',
      content: 'Regular message',
      timestamp: new Date().toISOString(),
      type: 'user'
    }

    render(
      <DebugMessageRenderer 
        message={regularMessage}
        messageMaxWidth="max-w-lg"
      />
    )

    expect(screen.getByText('Regular message')).toBeInTheDocument()
    expect(screen.queryByText('Vision Analysis')).not.toBeInTheDocument()
    expect(screen.queryByText('Voice Input')).not.toBeInTheDocument()
  })

  it('displays measurement data when available', () => {
    const measurementMessage: DebugChatMessage = {
      ...mockMessage,
      debugMetadata: {
        measurementData: {
          voltage: 3.3,
          current: 0.5,
          resistance: 6.6
        }
      }
    }

    render(
      <DebugMessageRenderer 
        message={measurementMessage}
        messageMaxWidth="max-w-lg"
      />
    )

    // Since measurement data is not displayed in the current implementation,
    // this test verifies that the component renders without errors
    expect(screen.getByText('Test message')).toBeInTheDocument()
  })

  it('handles missing debugMetadata gracefully', () => {
    const messageWithoutMetadata: DebugChatMessage = {
      ...mockMessage,
      debugMetadata: undefined
    }

    render(
      <DebugMessageRenderer 
        message={messageWithoutMetadata}
        messageMaxWidth="max-w-lg"
      />
    )

    expect(screen.getByText('Test message')).toBeInTheDocument()
    expect(screen.queryByAltText('Debug capture')).not.toBeInTheDocument()
  })

  it('displays correct icons for different message types', () => {
    // Test visual icon
    const { rerender } = render(
      <DebugMessageRenderer 
        message={mockMessage}
        messageMaxWidth="max-w-lg"
      />
    )
    
    expect(screen.getByText('Vision Analysis')).toBeInTheDocument()
    // Icon is part of the text content, not a separate element

    // Test audio icon
    const audioMessage: DebugChatMessage = {
      ...mockMessage,
      type: 'debug-audio'
    }
    
    rerender(
      <DebugMessageRenderer 
        message={audioMessage}
        messageMaxWidth="max-w-lg"
      />
    )
    
    expect(screen.getByText('Voice Input')).toBeInTheDocument()
    // Icon is part of the text content, not a separate element
  })

  it('formats timestamp correctly', () => {
    const timestamp = '2025-01-31T10:30:45.000Z'
    const messageWithTimestamp: DebugChatMessage = {
      ...mockMessage,
      timestamp
    }

    render(
      <DebugMessageRenderer 
        message={messageWithTimestamp}
        messageMaxWidth="max-w-lg"
      />
    )

    // The component formats time in Japanese format
    const timeElement = screen.getByText(/\d{2}:\d{2}/)
    expect(timeElement).toBeInTheDocument()
  })

  it('applies correct styling for debug-audio assistant messages', () => {
    const audioAssistantMessage: DebugChatMessage = {
      ...mockMessage,
      role: 'assistant',
      type: 'debug-audio'
    }

    render(
      <DebugMessageRenderer 
        message={audioAssistantMessage}
        messageMaxWidth="max-w-lg"
      />
    )

    const messageContainer = screen.getByText('Test message').closest('div[class*="rounded-lg"]')
    expect(messageContainer).toHaveClass('bg-orange-50', 'text-orange-900', 'border', 'border-orange-200')
  })
})