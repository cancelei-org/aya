import { renderHook, act } from '@testing-library/react-hooks'
import { useChatPanelLogic } from '../ChatPanelLogic'
import { RequirementsDefManager } from '@/lib/managers/RequirementsDefManager'

// Mock the RequirementsDefManager
jest.mock('@/lib/managers/RequirementsDefManager')

describe('useChatPanelLogic', () => {
  const mockSetNodes = jest.fn()
  const mockSetConnections = jest.fn()
  const mockSetChatMessages = jest.fn()
  const mockAddSuggestion = jest.fn()
  const mockHandleSendMessage = jest.fn()

  const defaultProps = {
    nodes: [],
    connections: [],
    setNodes: mockSetNodes,
    setConnections: mockSetConnections,
    setChatMessages: mockSetChatMessages,
    currentProject: { id: 'project-123', name: 'Test Project' },
    addSuggestion: mockAddSuggestion,
    handleSendMessage: mockHandleSendMessage
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Requirements Definition', () => {
    it('should detect requirements definition request', () => {
      const { result } = renderHook(() => useChatPanelLogic(defaultProps))

      const testMessages = [
        '要件定義を作成してください',
        'help me create requirements',
        'I need a requirements definition',
        '温度センサーシステムの要件を定義したい'
      ]

      testMessages.forEach(message => {
        expect(result.current.isRequirementsDefinitionRequest(message)).toBe(true)
      })
    })

    it('should not detect non-requirements messages', () => {
      const { result } = renderHook(() => useChatPanelLogic(defaultProps))

      const testMessages = [
        'add a// temperature sensor',
        'check compatibility',
        'what alternatives do you suggest?'
      ]

      testMessages.forEach(message => {
        expect(result.current.isRequirementsDefinitionRequest(message)).toBe(false)
      })
    })

    it('should handle requirements definition request without project', async () => {
      const propsWithoutProject = { ...defaultProps, currentProject: null }
      const { result } = renderHook(() => useChatPanelLogic(propsWithoutProject))

      await act(async () => {
        await result.current.handleRequirementsDefinitionRequest('create requirements')
      })

      expect(mockSetChatMessages).toHaveBeenCalledWith(expect.any(Function))
      const setChatCall = mockSetChatMessages.mock.calls[0][0]
      const messages = setChatCall([])
      expect(messages[0].content).toContain('Please create or select a project')
    })

    it('should create requirements document successfully', async () => {
      const mockRequirementsDoc = {
        id: 'req-123',
        status: 'DRAFT',
        version: '1.0.0'
      }

      const mockQuestions = [
        {
          id: 'q1',
          question: 'What// temperature range do you need?',
          intent: 'To determine sensor specifications'
        }
      ]

      RequirementsDefManager.mockImplementation(() => ({
        generateInitialRequirements: jest.fn().mockResolvedValue(mockRequirementsDoc),
        analyzeAndGenerateQuestions: jest.fn().mockResolvedValue(mockQuestions)
      }))

      const { result } = renderHook(() => useChatPanelLogic(defaultProps))

      await act(async () => {
        await result.current.handleRequirementsDefinitionRequest('create// temperature monitoring requirements')
      })

      // Check that manager was called
      expect(RequirementsDefManager).toHaveBeenCalledWith('user-123', 'project-123')

      // Check chat messages were updated
      expect(mockSetChatMessages).toHaveBeenCalledTimes(3) // Initial, success, questions
    })

    it('should handle extended send message with requirements request', async () => {
      const { result } = renderHook(() => useChatPanelLogic(defaultProps))

      await act(async () => {
        await result.current.handleExtendedSendMessage('要件定義を作成してください')
      })

      // Should not call normal send message
      expect(mockHandleSendMessage).not.toHaveBeenCalled()
    })
  })
})