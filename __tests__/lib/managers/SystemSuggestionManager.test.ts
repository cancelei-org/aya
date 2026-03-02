// Unit tests for SystemSuggestionManager
import { SystemSuggestionManager } from '@/lib/managers/SystemSuggestionManager'
import { RequirementsDocument } from '@/types/requirements'

// Mock fetch globally
global.fetch = jest.fn()

describe('SystemSuggestionManager', () => {
  let manager: SystemSuggestionManager
  const mockUserId = 'test-user-123'
  const mockProjectId = 'test-project-456'

  beforeEach(() => {
    manager = new SystemSuggestionManager(mockUserId, mockProjectId)
    jest.clearAllMocks()
  })

  describe('checkApprovedRequirements', () => {
    it('should fetch approved requirements successfully', async () => {
      const mockRequirements = [
        {
          id: 'req-1',
          title: 'Temperature Monitoring Requirements',
          status: 'APPROVED',
          approvedAt: '2023-01-01T00:00:00Z'
        }
      ]

        ; (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockRequirements
        })

      const result = await manager.checkApprovedRequirements()

      expect(fetch).toHaveBeenCalledWith(`/api/requirements/approved?projectId=${mockProjectId}`)
      expect(result).toEqual(mockRequirements)
    })

    it('should handle API errors', async () => {
      ; (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      await expect(manager.checkApprovedRequirements())
        .rejects.toThrow('Failed to fetch approved requirements')
    })
  })

  describe('validateRequirementsApproval', () => {
    it('should validate requirements approval status', async () => {
      const mockValidation = {
        valid: true,
        approvedRequirements: ['req-1', 'req-2'],
        unapprovedRequirements: []
      }

        ; (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockValidation
        })

      const result = await manager.validateRequirementsApproval(['req-1', 'req-2'])

      expect(fetch).toHaveBeenCalledWith('/api/requirements/validate-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirementIds: ['req-1', 'req-2'] })
      })

      expect(result).toEqual(mockValidation)
    })

    it('should detect unapproved requirements', async () => {
      const mockValidation = {
        valid: false,
        approvedRequirements: ['req-1'],
        unapprovedRequirements: ['req-2']
      }

        ; (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockValidation
        })

      const result = await manager.validateRequirementsApproval(['req-1', 'req-2'])

      expect(result.valid).toBe(false)
      expect(result.unapprovedRequirements).toContain('req-2')
    })
  })

  describe('analyzeRequirements', () => {
    it('should analyze// temperature sensor requirements', () => {
      const requirements: RequirementsDocument[] = [
        {
          id: 'req-1',
          projectId: mockProjectId,
          userId: mockUserId,
          title: 'Temperature Sensor Requirements',
          contentText: 'Temperature monitoring system with accuracy ±0.5°C operating at 3.3V',
          status: 'APPROVED',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          content: {}
        }
      ]

      const result = manager.analyzeRequirements(requirements)

      expect(result.systemType).toBe('sensor-system')
      expect(result.keySpecs.voltage).toBe(3.3)
      expect(result.keySpecs.accuracy).toBe(0.5)
    })

    it('should analyze motor control requirements', () => {
      const requirements: RequirementsDocument[] = [
        {
          id: 'req-1',
          projectId: mockProjectId,
          userId: mockUserId,
          title: 'Motor Control Requirements',
          contentText: 'Control system for servo motors with 12V power supply and compact design',
          status: 'APPROVED',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          content: {}
        }
      ]

      const result = manager.analyzeRequirements(requirements)

      expect(result.systemType).toBe('control-system')
      expect(result.keySpecs.voltage).toBe(12)
      expect(result.constraints).toContain('compact-size')
    })

    it('should detect IoT system requirements', () => {
      const requirements: RequirementsDocument[] = [
        {
          id: 'req-1',
          projectId: mockProjectId,
          userId: mockUserId,
          title: 'IoT Device Requirements',
          contentText: 'IoT device with wireless connectivity and low power consumption',
          status: 'APPROVED',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          content: {}
        }
      ]

      const result = manager.analyzeRequirements(requirements)

      expect(result.systemType).toBe('iot-system')
      expect(result.constraints).toContain('low-power')
    })

    it('should extract multiple constraints', () => {
      const requirements: RequirementsDocument[] = [
        {
          id: 'req-1',
          projectId: mockProjectId,
          userId: mockUserId,
          title: 'Outdoor Sensor Requirements',
          contentText: 'Outdoor// temperature sensor with low power operation and budget constraints under $50',
          status: 'APPROVED',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          content: {}
        }
      ]

      const result = manager.analyzeRequirements(requirements)

      expect(result.constraints).toContain('low-power')
      expect(result.constraints).toContain('rugged-environment')
      expect(result.constraints).toContain('cost-sensitive')
    })

    it('should identify priorities', () => {
      const requirements: RequirementsDocument[] = [
        {
          id: 'req-1',
          projectId: mockProjectId,
          userId: mockUserId,
          title: 'High Precision Requirements',
          contentText: 'System requires high accuracy measurements with real-time processing and reliable operation',
          status: 'APPROVED',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          content: {}
        }
      ]

      const result = manager.analyzeRequirements(requirements)

      expect(result.priorities).toContain('high-accuracy')
      expect(result.priorities).toContain('real-time-performance')
      expect(result.priorities).toContain('reliability')
    })
  })

  describe('generateSystemSuggestions', () => {
    it('should generate system suggestions', async () => {
      const mockSuggestions = [
        {
          id: 'sys-1',
          name: 'Temperature Monitoring System',
          description: 'Complete// temperature monitoring solution',
          basedOnRequirements: ['req-1'],
          components: [],
          estimatedCost: { min: 100, max: 200, currency: 'USD' },
          estimatedDevelopmentTime: { min: 8, max: 12, unit: 'weeks' },
          technicalComplexity: 'medium',
          advantages: ['Proven technology'],
          limitations: ['Limited range'],
          recommendedFor: ['Industrial monitoring']
        }
      ]

        ; (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockSuggestions
        })

      const result = await manager.generateSystemSuggestions(['req-1'])

      expect(fetch).toHaveBeenCalledWith('/api/system-suggestions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: mockProjectId,
          requirementIds: ['req-1'],
          userId: mockUserId
        })
      })

      expect(result).toEqual(mockSuggestions)
    })
  })

  describe('getSystemSuggestionsWithTraceability', () => {
    it('should return complete system suggestions with traceability', async () => {
      // Mock validation response
      ; (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            valid: true,
            approvedRequirements: ['req-1'],
            unapprovedRequirements: []
          })
        })
        // Mock approved requirements
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{
            id: 'req-1',
            title: 'Test Requirements',
            contentText: 'Temperature sensor requirements',
            status: 'APPROVED'
          }]
        })
        // Mock system suggestions
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{
            id: 'sys-1',
            name: 'Test System',
            basedOnRequirements: ['req-1'],
            components: [{
              id: 'comp-1',
              name: 'Temperature Sensor',
              reasoning: 'Provides// temperature measurement capability'
            }]
          }]
        })

      const result = await manager.getSystemSuggestionsWithTraceability(['req-1'])

      expect(result.suggestions).toBeDefined()
      expect(result.mappings).toBeDefined()
      expect(result.requirements).toBeDefined()
      expect(result.analysis).toBeDefined()
    })

    it('should reject unapproved requirements', async () => {
      ; (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          valid: false,
          approvedRequirements: [],
          unapprovedRequirements: ['req-1']
        })
      })

      await expect(manager.getSystemSuggestionsWithTraceability(['req-1']))
        .rejects.toThrow('Cannot generate system suggestions. Unapproved requirements: req-1')
    })
  })

  describe('createRequirementMapping', () => {
    it('should create requirement mappings correctly', () => {
      const requirements: RequirementsDocument[] = [
        {
          id: 'req-1',
          projectId: mockProjectId,
          userId: mockUserId,
          title: 'Temperature Requirements',
          contentText: 'System needs// temperature monitoring with high accuracy',
          status: 'APPROVED',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          content: {}
        }
      ]

      const systemSuggestion = {
        id: 'sys-1',
        name: 'Temperature System',
        description: 'Temperature monitoring system',
        basedOnRequirements: ['req-1'],
        components: [
          {
            id: 'comp-1',
            name: 'Temperature Sensor',
            type: 'sensor' as const,
            reasoning: 'Provides// temperature measurement capability',
            specifications: {},
            cost: { estimated: 10, currency: 'USD' },
            availability: 'readily-available' as const
          }
        ],
        estimatedCost: { min: 100, max: 200, currency: 'USD' },
        estimatedDevelopmentTime: { min: 8, max: 12, unit: 'weeks' as const },
        technicalComplexity: 'medium' as const,
        advantages: [],
        limitations: [],
        recommendedFor: [],
        alternatives: []
      }

      const mappings = manager.createRequirementMapping(requirements, systemSuggestion)

      expect(mappings).toHaveLength(1)
      expect(mappings[0].requirementId).toBe('req-1')
      expect(mappings[0].componentIds).toContain('comp-1')
      expect(mappings[0].satisfaction).toBe('full')
    })
  })
})