// Unit tests for RequirementsDefManager
import { RequirementsDefManager } from '@/lib/managers/RequirementsDefManager'

// Mock fetch globally
global.fetch = jest.fn()

describe('RequirementsDefManager', () => {
  let manager: RequirementsDefManager
  const mockUserId = 'test-user-123'
  const mockProjectId = 'test-project-456'

  beforeEach(() => {
    manager = new RequirementsDefManager(mockUserId, mockProjectId)
    jest.clearAllMocks()
  })

  describe('generateInitialRequirements', () => {
    it('should generate initial requirements document', async () => {
      const mockResponse = {
        id: 'req-123',
        title: 'Test Requirements',
        contentText: 'Initial requirements content',
        status: 'DRAFT',
        version: 1
      }

        ; (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse
        })

      const result = await manager.generateInitialRequirements('Create a// temperature monitoring system')

      expect(fetch).toHaveBeenCalledWith('/api/requirements/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: mockUserId,
          projectId: mockProjectId,
          prompt: 'Create a// temperature monitoring system'
        })
      })

      expect(result).toEqual(mockResponse)
    })

    it('should handle API errors gracefully', async () => {
      ; (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      await expect(manager.generateInitialRequirements('Test prompt'))
        .rejects.toThrow('Failed to generate requirements')
    })

    it('should handle network errors', async () => {
      ; (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      await expect(manager.generateInitialRequirements('Test prompt'))
        .rejects.toThrow('Network error')
    })
  })

  describe('analyzeRequirementsCompleteness', () => {
    it('should analyze requirements completeness correctly', async () => {
      const mockResponse = {
        overallCompleteness: 75,
        sections: [
          {
            name: 'System Overview',
            completeness: 90,
            missingItems: []
          },
          {
            name: 'Technical Specifications',
            completeness: 60,
            missingItems: ['Performance requirements', 'Security requirements']
          }
        ]
      }

        ; (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse
        })

      const result = await manager.analyzeRequirementsCompleteness('req-123')

      expect(fetch).toHaveBeenCalledWith('/api/requirements/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementId: 'req-123',
          userId: mockUserId,
          projectId: mockProjectId
        })
      })

      expect(result).toEqual(mockResponse)
    })

    it('should handle empty requirement ID', async () => {
      await expect(manager.analyzeRequirementsCompleteness(''))
        .rejects.toThrow('Requirement ID is required')
    })
  })

  describe('processUserAnswer', () => {
    it('should process user answer and update requirements', async () => {
      const mockResponse = {
        id: 'req-123',
        contentText: 'Updated requirements with user answer',
        updatedSections: ['technical-specs']
      }

        ; (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse
        })

      const result = await manager.processUserAnswer(
        'req-123',
        'question-456',
        'The system should operate at -20°C to 85°C'
      )

      expect(fetch).toHaveBeenCalledWith('/api/requirements/update-from-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementId: 'req-123',
          questionId: 'question-456',
          answer: 'The system should operate at -20°C to 85°C',
          userId: mockUserId,
          projectId: mockProjectId
        })
      })

      expect(result).toEqual(mockResponse)
    })

    it('should validate required parameters', async () => {
      await expect(manager.processUserAnswer('', 'q1', 'answer'))
        .rejects.toThrow('Requirement ID is required')

      await expect(manager.processUserAnswer('req-1', '', 'answer'))
        .rejects.toThrow('Question ID is required')

      await expect(manager.processUserAnswer('req-1', 'q1', ''))
        .rejects.toThrow('Answer is required')
    })
  })

  describe('extractSystemType', () => {
    it('should extract system type from requirements text', () => {
      const testCases = [
        {
          text: 'temperature monitoring system with sensors',
          expected: 'sensor-system'
        },
        {
          text: 'motor control for robotic arm',
          expected: 'control-system'
        },
        {
          text: 'IoT device with wireless communication',
          expected: 'iot-system'
        },
        {
          text: 'automated robotic assembly line',
          expected: 'robotic-system'
        },
        {
          text: 'generic embedded system',
          expected: 'embedded-system'
        }
      ]

      testCases.forEach(({ text, expected }) => {
        const result = manager.extractSystemType(text)
        expect(result).toBe(expected)
      })
    })
  })

  describe('generateQuestions', () => {
    it('should generate relevant questions based on system type', () => {
      const questions = manager.generateQuestions('sensor-system', 30)

      expect(questions).toBeDefined()
      expect(Array.isArray(questions)).toBe(true)
      expect(questions.length).toBeGreaterThan(0)

      // Check that questions are relevant to sensor systems
      const questionTexts = questions.map(q => q.question.toLowerCase())
      const hasSensorRelatedQuestion = questionTexts.some(text =>
        text.includes('sensor') ||
        text.includes('measurement') ||
        text.includes('accuracy') ||
        text.includes('temperature')
      )
      expect(hasSensorRelatedQuestion).toBe(true)
    })

    it('should prioritize questions based on completeness score', () => {
      const lowCompletenessQuestions = manager.generateQuestions('sensor-system', 20)
      const highCompletenessQuestions = manager.generateQuestions('sensor-system', 80)

      // Low completeness should focus on basic questions
      expect(lowCompletenessQuestions[0].priority).toBeLessThanOrEqual(2)

      // High completeness should focus on detailed questions
      const hasDetailedQuestions = highCompletenessQuestions.some(q =>
        q.question.toLowerCase().includes('specification') ||
        q.question.toLowerCase().includes('detailed') ||
        q.question.toLowerCase().includes('advanced')
      )
      expect(hasDetailedQuestions).toBe(true)
    })
  })

  describe('validateInput', () => {
    it('should validate user input properly', () => {
      // Valid inputs
      expect(() => manager.validateInput('Valid requirements text', 'sensor-system'))
        .not.toThrow()

      // Invalid inputs
      expect(() => manager.validateInput('', 'sensor-system'))
        .toThrow('Requirements text cannot be empty')

      expect(() => manager.validateInput('Valid text', ''))
        .toThrow('System type cannot be empty')

      expect(() => manager.validateInput('ab', 'sensor-system'))
        .toThrow('Requirements text is too short')
    })
  })

  describe('error handling', () => {
    it('should handle malformed API responses', async () => {
      ; (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => null
      })

      await expect(manager.generateInitialRequirements('Test'))
        .rejects.toThrow('Invalid response from server')
    })

    it('should handle timeout scenarios', async () => {
      jest.setTimeout(10000)

        ; (fetch as jest.Mock).mockImplementationOnce(() =>
          new Promise(resolve => setTimeout(resolve, 15000))
        )

      await expect(manager.generateInitialRequirements('Test'))
        .rejects.toThrow() // Should timeout or be rejected
    }, 10000)
  })
})