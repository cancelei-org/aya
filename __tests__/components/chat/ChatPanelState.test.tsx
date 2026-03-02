import { renderHook, waitFor } from '@testing-library/react'
import { useChatPanelState } from '@/components/chat/ChatPanelState'

// Mock fetch
global.fetch = jest.fn()

describe('ChatPanelState - Auto Requirements Mode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset fetch mock
    ;(global.fetch as jest.Mock).mockReset()
  })

  it('should automatically enable requirements mode when no requirements document exists', async () => {
    // Mock API response with no requirements documents
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }) // Empty documents array
    })

    const mockProject = { id: 'test-project-id' }
    
    const { result } = renderHook(() => useChatPanelState(mockProject))

    // Initially should be in normal mode
    expect(result.current.chatMode).toBe('normal')

    // Wait for the effect to run and set requirements mode
    await waitFor(() => {
      expect(result.current.chatMode).toBe('requirements')
    })

    // Should have set the auto mode message
    expect(result.current.autoModeMessage).toContain('Requirements mode automatically enabled')
    
    // Should have called the API
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/auto-devlog/documents?projectId=${mockProject.id}&type=requirements`
    )
  })

  it('should remain in normal mode when requirements document exists', async () => {
    // Mock API response with existing requirements document
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        data: [{ 
          id: 'req-123', 
          title: 'Existing Requirements',
          status: 'DRAFT' 
        }] 
      })
    })

    const mockProject = { id: 'test-project-id' }
    
    const { result } = renderHook(() => useChatPanelState(mockProject))

    // Wait for the effect to run
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    // Should remain in normal mode
    expect(result.current.chatMode).toBe('normal')
    
    // Should not have set any auto mode message
    expect(result.current.autoModeMessage).toBeNull()
  })

  it('should not check requirements when no project is provided', async () => {
    const { result } = renderHook(() => useChatPanelState(null))

    // Should remain in normal mode
    expect(result.current.chatMode).toBe('normal')
    
    // Wait a bit to ensure no API call is made
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Should not have called the API
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should only check requirements once per session', async () => {
    // Mock API response with no requirements
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] })
    })

    const mockProject = { id: 'test-project-id' }
    
    const { result, rerender } = renderHook(
      ({ project }) => useChatPanelState(project),
      { initialProps: { project: mockProject } }
    )

    // Wait for first check
    await waitFor(() => {
      expect(result.current.chatMode).toBe('requirements')
    })

    expect(global.fetch).toHaveBeenCalledTimes(1)

    // Rerender with same project
    rerender({ project: mockProject })

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100))

    // Should not make another API call
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })
})