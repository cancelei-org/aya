// Integration tests for Requirements API endpoints
import { createMocks } from 'node-mocks-http'
import generateHandler from '@/pages/api/requirements/generate'
import analyzeHandler from '@/pages/api/requirements/analyze'
import updateFromAnswerHandler from '@/pages/api/requirements/update-from-answer'
import approveHandler from '@/pages/api/requirements/[id]/approve'
import approvalHistoryHandler from '@/pages/api/requirements/[id]/approval-history'

// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                content: {
                  type: 'doc',
                  content: [
                    {
                      type: 'heading',
                      attrs: { level: 1 },
                      content: [{ type: 'text', text: 'Generated Requirements' }]
                    },
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'Generated content based on prompt' }]
                    }
                  ]
                },
                decisions: [
                  {
                    content: 'System architecture decision',
                    context: 'Based on user requirements',
                    importance: 'HIGH'
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
  createRequirementsDocument: jest.fn().mockResolvedValue({
    id: 'req-123',
    title: 'Test Requirements',
    contentText: 'Generated requirements content',
    status: 'DRAFT',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  }),
  getRequirementsDocument: jest.fn().mockResolvedValue({
    id: 'req-123',
    title: 'Test Requirements',
    contentText: 'Temperature monitoring system requirements',
    status: 'DRAFT',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  }),
  updateRequirementsDocument: jest.fn().mockResolvedValue({
    id: 'req-123',
    title: 'Test Requirements',
    contentText: 'Updated requirements content',
    status: 'APPROVED',
    version: 2,
    createdAt: new Date(),
    updatedAt: new Date()
  }),
  getApprovalHistory: jest.fn().mockResolvedValue([
    {
      id: '1',
      action: 'SUBMITTED',
      userId: 'user-123',
      userName: 'John Doe',
      timestamp: new Date().toISOString(),
      comments: 'Initial submission'
    },
    {
      id: '2',
      action: 'APPROVED',
      userId: 'user-456',
      userName: 'Jane Smith',
      timestamp: new Date().toISOString(),
      comments: 'Requirements approved'
    }
  ])
}))

describe('Requirements API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('/api/requirements/generate', () => {
    it('should generate requirements from prompt', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          userId: 'user-123',
          projectId: 'project-456',
          prompt: 'Create a// temperature monitoring system'
        }
      })

      await generateHandler(req, res)

      expect(res._getStatusCode()).toBe(200)

      const data = JSON.parse(res._getData())
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('title')
      expect(data).toHaveProperty('contentText')
      expect(data.status).toBe('DRAFT')
    })

    it('should handle missing prompt', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          userId: 'user-123',
          projectId: 'project-456'
        }
      })

      await generateHandler(req, res)

      expect(res._getStatusCode()).toBe(400)

      const data = JSON.parse(res._getData())
      expect(data.error).toContain('Prompt is required')
    })

    it('should handle invalid method', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      })

      await generateHandler(req, res)

      expect(res._getStatusCode()).toBe(405)
    })
  })

  describe('/api/requirements/analyze', () => {
    it('should analyze requirements completeness', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          requirementId: 'req-123',
          contentText: 'Temperature monitoring system with sensor requirements'
        }
      })

      await analyzeHandler(req, res)

      expect(res._getStatusCode()).toBe(200)

      const data = JSON.parse(res._getData())
      expect(data).toHaveProperty('completeness')
      expect(data).toHaveProperty('questions')
      expect(data).toHaveProperty('systemType')
      expect(Array.isArray(data.questions)).toBe(true)
    })

    it('should handle missing requirement ID', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          contentText: 'Some requirements text'
        }
      })

      await analyzeHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
    })
  })

  describe('/api/requirements/update-from-answer', () => {
    it('should update requirements based on user answer', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          requirementId: 'req-123',
          questionId: 'q-456',
          answer: 'The system should operate at -20°C to 85°C',
          currentContent: 'Basic// temperature system'
        }
      })

      await updateFromAnswerHandler(req, res)

      expect(res._getStatusCode()).toBe(200)

      const data = JSON.parse(res._getData())
      expect(data).toHaveProperty('content')
      expect(data).toHaveProperty('decisions')
      expect(data).toHaveProperty('updatedSections')
    })

    it('should handle missing parameters', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          requirementId: 'req-123'
          // Missing questionId and answer
        }
      })

      await updateFromAnswerHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
    })
  })

  describe('/api/requirements/[id]/approve', () => {
    it('should approve requirements with comments', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'req-123' },
        body: {
          comments: 'Requirements look good',
          reviewData: {
            approvedAt: new Date().toISOString(),
            reviewComments: 'Approved after review'
          }
        }
      })

      await approveHandler(req, res)

      expect(res._getStatusCode()).toBe(200)

      const data = JSON.parse(res._getData())
      expect(data.success).toBe(true)
      expect(data.status).toBe('APPROVED')
    })

    it('should handle invalid requirement ID', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'invalid-id' },
        body: {
          comments: 'Test comment'
        }
      })

      // Mock database to throw error for invalid ID
      const { updateRequirementsDocument } = require('@/lib/db/requirements')
      updateRequirementsDocument.mockRejectedValueOnce(new Error('Requirement not found'))

      await approveHandler(req, res)

      expect(res._getStatusCode()).toBe(404)
    })
  })

  describe('/api/requirements/[id]/approval-history', () => {
    it('should return approval history', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'req-123' }
      })

      await approvalHistoryHandler(req, res)

      expect(res._getStatusCode()).toBe(200)

      const data = JSON.parse(res._getData())
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)
      expect(data[0]).toHaveProperty('action')
      expect(data[0]).toHaveProperty('userId')
      expect(data[0]).toHaveProperty('timestamp')
    })

    it('should handle missing requirement ID', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {}
      })

      await approvalHistoryHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
    })
  })

  describe('API Integration Flow', () => {
    it('should support complete requirements workflow', async () => {
      // Step 1: Generate initial requirements
      const { req: generateReq, res: generateRes } = createMocks({
        method: 'POST',
        body: {
          userId: 'user-123',
          projectId: 'project-456',
          prompt: 'Temperature monitoring system for industrial use'
        }
      })

      await generateHandler(generateReq, generateRes)
      expect(generateRes._getStatusCode()).toBe(200)

      const generatedReq = JSON.parse(generateRes._getData())
      const requirementId = generatedReq.id

      // Step 2: Analyze requirements completeness
      const { req: analyzeReq, res: analyzeRes } = createMocks({
        method: 'POST',
        body: {
          requirementId,
          contentText: generatedReq.contentText
        }
      })

      await analyzeHandler(analyzeReq, analyzeRes)
      expect(analyzeRes._getStatusCode()).toBe(200)

      const analysis = JSON.parse(analyzeRes._getData())
      expect(analysis.questions.length).toBeGreaterThan(0)

      // Step 3: Update requirements based on user answer
      const firstQuestion = analysis.questions[0]
      const { req: updateReq, res: updateRes } = createMocks({
        method: 'POST',
        body: {
          requirementId,
          questionId: firstQuestion.id,
          answer: 'The system should monitor// temperature in the range -40°C to 125°C',
          currentContent: generatedReq.contentText
        }
      })

      await updateFromAnswerHandler(updateReq, updateRes)
      expect(updateRes._getStatusCode()).toBe(200)

      // Step 4: Approve requirements
      const { req: approveReq, res: approveRes } = createMocks({
        method: 'POST',
        query: { id: requirementId },
        body: {
          comments: 'Requirements are complete and approved',
          reviewData: {
            approvedAt: new Date().toISOString(),
            reviewComments: 'Final approval'
          }
        }
      })

      await approveHandler(approveReq, approveRes)
      expect(approveRes._getStatusCode()).toBe(200)

      const approval = JSON.parse(approveRes._getData())
      expect(approval.success).toBe(true)

      // Step 5: Check approval history
      const { req: historyReq, res: historyRes } = createMocks({
        method: 'GET',
        query: { id: requirementId }
      })

      await approvalHistoryHandler(historyReq, historyRes)
      expect(historyRes._getStatusCode()).toBe(200)

      const history = JSON.parse(historyRes._getData())
      expect(history.length).toBeGreaterThan(0)
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      // Mock OpenAI to throw error
      const { OpenAI } = require('openai')
      OpenAI.mockImplementationOnce(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValueOnce(new Error('OpenAI API error'))
          }
        }
      }))

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          userId: 'user-123',
          projectId: 'project-456',
          prompt: 'Test prompt'
        }
      })

      await generateHandler(req, res)

      expect(res._getStatusCode()).toBe(500)

      const data = JSON.parse(res._getData())
      expect(data.error).toContain('generation failed')
    })

    it('should handle database errors in workflow', async () => {
      // Mock database to throw error
      const { createRequirementsDocument } = require('@/lib/db/requirements')
      createRequirementsDocument.mockRejectedValueOnce(new Error('Database connection failed'))

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          userId: 'user-123',
          projectId: 'project-456',
          prompt: 'Test prompt'
        }
      })

      await generateHandler(req, res)

      expect(res._getStatusCode()).toBe(500)
    })
  })

  describe('Concurrent Request Handling', () => {
    it('should handle multiple simultaneous requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => {
        const { req, res } = createMocks({
          method: 'POST',
          body: {
            userId: `user-${i}`,
            projectId: 'project-456',
            prompt: `Test prompt ${i}`
          }
        })
        return { req, res, handler: generateHandler }
      })

      // Execute all requests concurrently
      const results = await Promise.allSettled(
        requests.map(({ req, res, handler }) => handler(req, res))
      )

      // All requests should succeed
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled')
        expect(requests[index].res._getStatusCode()).toBe(200)
      })
    })
  })
})