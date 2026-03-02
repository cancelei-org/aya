// Integration tests for System Suggestions API endpoints
import { createMocks } from 'node-mocks-http'
import generateHandler from '@/pages/api/system-suggestions/generate'
import validateApprovalHandler from '@/pages/api/requirements/validate-approval'
import approvedRequirementsHandler from '@/pages/api/requirements/approved'

// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                suggestions: [
                  {
                    id: 'sys-1',
                    name: 'Temperature Monitoring System',
                    description: 'Complete// temperature monitoring solution with IoT capabilities',
                    basedOnRequirements: ['req-1'],
                    components: [
                      {
                        id: 'comp-1',
                        name: 'Temperature Sensor Module',
                        type: 'sensor',
                        reasoning: 'Provides accurate// temperature measurement',
                        specifications: {
                          range: '-40°C to 125°C',
                          accuracy: '±0.5°C',
                          interface: 'I2C'
                        },
                        cost: { estimated: 15, currency: 'USD' },
                        availability: 'readily-available'
                      },
                      {
                        id: 'comp-2',
                        name: 'Microcontroller Unit',
                        type: 'processor',
                        reasoning: 'Controls system operation and data processing',
                        specifications: {
                          architecture: 'ARM Cortex-M4',
                          flash: '256KB',
                          ram: '64KB'
                        },
                        cost: { estimated: 8, currency: 'USD' },
                        availability: 'readily-available'
                      }
                    ],
                    estimatedCost: { min: 50, max: 80, currency: 'USD' },
                    estimatedDevelopmentTime: { min: 8, max: 12, unit: 'weeks' },
                    technicalComplexity: 'medium',
                    advantages: [
                      'Proven sensor technology',
                      'Low power consumption',
                      'Easy to integrate'
                    ],
                    limitations: [
                      'Limited wireless range',
                      'Requires external power supply'
                    ],
                    recommendedFor: [
                      'Industrial monitoring',
                      'Environmental sensing',
                      'IoT applications'
                    ]
                  }
                ]
              })
            }
          }]
        })
      }
    }
  }))
}))

// Mock database functions
jest.mock('@/lib/db/requirements', () => ({
  getApprovedRequirements: jest.fn().mockResolvedValue([
    {
      id: 'req-1',
      title: 'Temperature Monitoring Requirements',
      status: 'APPROVED',
      contentText: 'Temperature monitoring system with sensor accuracy ±0.5°C',
      approvedAt: '2023-01-01T00:00:00Z',
      version: 1
    },
    {
      id: 'req-2',
      title: 'IoT Communication Requirements',
      status: 'APPROVED',
      contentText: 'Wireless IoT device with WiFi connectivity and low power',
      approvedAt: '2023-01-02T00:00:00Z',
      version: 1
    }
  ]),
  getRequirementsDocument: jest.fn().mockImplementation((id) => {
    const mockDocs = {
      'req-1': {
        id: 'req-1',
        title: 'Temperature Monitoring Requirements',
        status: 'APPROVED',
        contentText: 'Temperature monitoring system with sensor accuracy ±0.5°C',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      'req-2': {
        id: 'req-2',
        title: 'IoT Communication Requirements',
        status: 'APPROVED',
        contentText: 'Wireless IoT device with WiFi connectivity and low power',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }
    return Promise.resolve(mockDocs[id] || null)
  }),
  validateRequirementsApproval: jest.fn().mockResolvedValue({
    valid: true,
    approvedRequirements: ['req-1', 'req-2'],
    unapprovedRequirements: []
  })
}))

describe('System Suggestions API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('/api/system-suggestions/generate', () => {
    it('should generate system suggestions from approved requirements', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          projectId: 'project-456',
          requirementIds: ['req-1'],
          userId: 'user-123'
        }
      })

      await generateHandler(req, res)

      expect(res._getStatusCode()).toBe(200)

      const data = JSON.parse(res._getData())
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)

      const suggestion = data[0]
      expect(suggestion).toHaveProperty('id')
      expect(suggestion).toHaveProperty('name')
      expect(suggestion).toHaveProperty('description')
      expect(suggestion).toHaveProperty('components')
      expect(suggestion).toHaveProperty('estimatedCost')
      expect(suggestion).toHaveProperty('estimatedDevelopmentTime')
      expect(Array.isArray(suggestion.components)).toBe(true)
    })

    it('should handle missing project ID', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          requirementIds: ['req-1'],
          userId: 'user-123'
        }
      })

      await generateHandler(req, res)

      expect(res._getStatusCode()).toBe(400)

      const data = JSON.parse(res._getData())
      expect(data.error).toContain('Project ID')
    })

    it('should handle empty requirement IDs', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          projectId: 'project-456',
          requirementIds: [],
          userId: 'user-123'
        }
      })

      await generateHandler(req, res)

      expect(res._getStatusCode()).toBe(400)

      const data = JSON.parse(res._getData())
      expect(data.error).toContain('requirement IDs')
    })

    it('should validate requirement approval before generation', async () => {
      // Mock unapproved requirements
      const { validateRequirementsApproval } = require('@/lib/db/requirements')
      validateRequirementsApproval.mockResolvedValueOnce({
        valid: false,
        approvedRequirements: [],
        unapprovedRequirements: ['req-1']
      })

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          projectId: 'project-456',
          requirementIds: ['req-1'],
          userId: 'user-123'
        }
      })

      await generateHandler(req, res)

      expect(res._getStatusCode()).toBe(400)

      const data = JSON.parse(res._getData())
      expect(data.error).toContain('unapproved requirements')
    })
  })

  describe('/api/requirements/validate-approval', () => {
    it('should validate approved requirements', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          requirementIds: ['req-1', 'req-2']
        }
      })

      await validateApprovalHandler(req, res)

      expect(res._getStatusCode()).toBe(200)

      const data = JSON.parse(res._getData())
      expect(data).toHaveProperty('valid')
      expect(data).toHaveProperty('approvedRequirements')
      expect(data).toHaveProperty('unapprovedRequirements')
      expect(data.valid).toBe(true)
      expect(data.approvedRequirements).toContain('req-1')
      expect(data.approvedRequirements).toContain('req-2')
    })

    it('should detect unapproved requirements', async () => {
      // Mock mixed approval status
      const { validateRequirementsApproval } = require('@/lib/db/requirements')
      validateRequirementsApproval.mockResolvedValueOnce({
        valid: false,
        approvedRequirements: ['req-1'],
        unapprovedRequirements: ['req-3']
      })

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          requirementIds: ['req-1', 'req-3']
        }
      })

      await validateApprovalHandler(req, res)

      expect(res._getStatusCode()).toBe(200)

      const data = JSON.parse(res._getData())
      expect(data.valid).toBe(false)
      expect(data.approvedRequirements).toContain('req-1')
      expect(data.unapprovedRequirements).toContain('req-3')
    })
  })

  describe('/api/requirements/approved', () => {
    it('should return approved requirements for project', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { projectId: 'project-456' }
      })

      await approvedRequirementsHandler(req, res)

      expect(res._getStatusCode()).toBe(200)

      const data = JSON.parse(res._getData())
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)

      const requirement = data[0]
      expect(requirement).toHaveProperty('id')
      expect(requirement).toHaveProperty('title')
      expect(requirement).toHaveProperty('status')
      expect(requirement.status).toBe('APPROVED')
    })

    it('should handle missing project ID', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {}
      })

      await approvedRequirementsHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
    })
  })

  describe('System Suggestions Workflow Integration', () => {
    it('should support complete system suggestion workflow', async () => {
      // Step 1: Get approved requirements
      const { req: approvedReq, res: approvedRes } = createMocks({
        method: 'GET',
        query: { projectId: 'project-456' }
      })

      await approvedRequirementsHandler(approvedReq, approvedRes)
      expect(approvedRes._getStatusCode()).toBe(200)

      const approvedRequirements = JSON.parse(approvedRes._getData())
      expect(approvedRequirements.length).toBeGreaterThan(0)

      // Step 2: Validate requirement approval
      const requirementIds = approvedRequirements.map(req => req.id)
      const { req: validateReq, res: validateRes } = createMocks({
        method: 'POST',
        body: { requirementIds }
      })

      await validateApprovalHandler(validateReq, validateRes)
      expect(validateRes._getStatusCode()).toBe(200)

      const validation = JSON.parse(validateRes._getData())
      expect(validation.valid).toBe(true)

      // Step 3: Generate system suggestions
      const { req: generateReq, res: generateRes } = createMocks({
        method: 'POST',
        body: {
          projectId: 'project-456',
          requirementIds: validation.approvedRequirements,
          userId: 'user-123'
        }
      })

      await generateHandler(generateReq, generateRes)
      expect(generateRes._getStatusCode()).toBe(200)

      const suggestions = JSON.parse(generateRes._getData())
      expect(suggestions.length).toBeGreaterThan(0)

      const suggestion = suggestions[0]
      expect(suggestion.basedOnRequirements).toEqual(
        expect.arrayContaining(validation.approvedRequirements)
      )
    })

    it('should handle workflow with mixed requirement statuses', async () => {
      // Mock mixed requirement statuses
      const { validateRequirementsApproval } = require('@/lib/db/requirements')
      validateRequirementsApproval.mockResolvedValueOnce({
        valid: false,
        approvedRequirements: ['req-1'],
        unapprovedRequirements: ['req-2']
      })

      // Step 1: Try to validate mixed requirements
      const { req: validateReq, res: validateRes } = createMocks({
        method: 'POST',
        body: { requirementIds: ['req-1', 'req-2'] }
      })

      await validateApprovalHandler(validateReq, validateRes)
      expect(validateRes._getStatusCode()).toBe(200)

      const validation = JSON.parse(validateRes._getData())
      expect(validation.valid).toBe(false)

      // Step 2: Generate suggestions only with approved requirements
      const { req: generateReq, res: generateRes } = createMocks({
        method: 'POST',
        body: {
          projectId: 'project-456',
          requirementIds: validation.approvedRequirements,
          userId: 'user-123'
        }
      })

      await generateHandler(generateReq, generateRes)
      expect(generateRes._getStatusCode()).toBe(200)

      const suggestions = JSON.parse(generateRes._getData())
      expect(suggestions.length).toBeGreaterThan(0)
    })
  })

  describe('Error Handling in Integration', () => {
    it('should handle OpenAI failures during system generation', async () => {
      // Mock OpenAI to fail
      const { OpenAI } = require('openai')
      OpenAI.mockImplementationOnce(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValueOnce(new Error('OpenAI service unavailable'))
          }
        }
      }))

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          projectId: 'project-456',
          requirementIds: ['req-1'],
          userId: 'user-123'
        }
      })

      await generateHandler(req, res)

      expect(res._getStatusCode()).toBe(500)

      const data = JSON.parse(res._getData())
      expect(data.error).toContain('generation failed')
    })

    it('should handle database errors during requirement validation', async () => {
      // Mock database to fail
      const { validateRequirementsApproval } = require('@/lib/db/requirements')
      validateRequirementsApproval.mockRejectedValueOnce(new Error('Database connection failed'))

      const { req, res } = createMocks({
        method: 'POST',
        body: { requirementIds: ['req-1'] }
      })

      await validateApprovalHandler(req, res)

      expect(res._getStatusCode()).toBe(500)
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle large number of requirements', async () => {
      const largeRequirementList = Array.from({ length: 50 }, (_, i) => `req-${i + 1}`)

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          projectId: 'project-456',
          requirementIds: largeRequirementList,
          userId: 'user-123'
        }
      })

      const startTime = Date.now()
      await generateHandler(req, res)
      const endTime = Date.now()

      expect(res._getStatusCode()).toBe(200)
      expect(endTime - startTime).toBeLessThan(10000) // Should complete within 10 seconds
    })

    it('should handle concurrent system generation requests', async () => {
      const requests = Array.from({ length: 3 }, (_, i) => {
        const { req, res } = createMocks({
          method: 'POST',
          body: {
            projectId: `project-${i}`,
            requirementIds: ['req-1'],
            userId: `user-${i}`
          }
        })
        return { req, res }
      })

      // Execute requests concurrently
      const results = await Promise.allSettled(
        requests.map(({ req, res }) => generateHandler(req, res))
      )

      // All should succeed
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled')
        expect(requests[index].res._getStatusCode()).toBe(200)
      })
    })
  })
})