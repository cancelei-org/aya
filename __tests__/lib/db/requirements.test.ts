// Mock Prisma client first
jest.mock('@/lib/prisma', () => ({
  prisma: {
    requirementsDocument: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn()
    },
    documentVersion: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn()
    },
    comment: {
      create: jest.fn(),
      update: jest.fn()
    },
    decision: {
      create: jest.fn(),
      createMany: jest.fn()
    },
    documentCollaborator: {
      upsert: jest.fn(),
      create: jest.fn()
    },
    $transaction: jest.fn()
  }
}))

import {
  createRequirementsDocument,
  getRequirementsDocument,
  updateRequirementsDocument,
  approveRequirementsDocument,
  searchRequirementsDocuments,
  createDocumentVersion,
  addComment,
  resolveComment,
  addDecision,
  getDocumentVersions,
  updateCollaborator,
  createRequirementsWithInitialData
} from '@/lib/db/requirements'
import { prisma } from '@/lib/prisma'
import { CreateRequirementsRequest, UpdateRequirementsRequest } from '@/types/requirements'

describe('Requirements Data Access Layer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createRequirementsDocument', () => {
    it('should create a new requirements document', async () => {
      const mockDocument = {
        id: 'req-123',
        projectId: 'proj-456',
        title: 'Requirements Definition',
        content: { type: 'doc', content: [] },
        contentText: 'Create a// temperature monitoring system',
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date()
      }

        ; (prisma.requirementsDocument.create as jest.Mock).mockResolvedValue(mockDocument)
        ; (prisma.documentVersion.create as jest.Mock).mockResolvedValue({})

      const request: CreateRequirementsRequest & { userId: string } = {
        projectId: 'proj-456',
        initialPrompt: 'Create a// temperature monitoring system',
        userId: 'user-123'
      }

      const result = await createRequirementsDocument(request)

      expect(prisma.requirementsDocument.create).toHaveBeenCalledWith({
        data: {
          projectId: request.projectId,
          title: 'Requirements Definition',
          content: { type: 'doc', content: [] },
          contentText: request.initialPrompt,
          status: 'DRAFT',
          project: {
            connect: { id: request.projectId }
          }
        },
        include: {
          project: true,
          decisions: true,
          versions: true,
          comments: true,
          collaborators: true
        }
      })

      expect(result.id).toBe('req-123')
      expect(result.status).toBe('DRAFT')
    })
  })

  describe('getRequirementsDocument', () => {
    it('should retrieve a requirements document by ID', async () => {
      const mockDocument = {
        id: 'req-123',
        projectId: 'proj-456',
        title: 'Requirements Definition',
        status: 'DRAFT'
      }

        ; (prisma.requirementsDocument.findUnique as jest.Mock).mockResolvedValue(mockDocument)

      const result = await getRequirementsDocument('req-123')

      expect(prisma.requirementsDocument.findUnique).toHaveBeenCalledWith({
        where: { id: 'req-123' },
        include: {
          project: true,
          decisions: true,
          versions: {
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          comments: {
            where: { resolved: false },
            orderBy: { createdAt: 'desc' }
          },
          collaborators: {
            include: { user: true }
          }
        }
      })

      expect(result?.id).toBe('req-123')
    })

    it('should return null if document not found', async () => {
      ; (prisma.requirementsDocument.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await getRequirementsDocument('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('updateRequirementsDocument', () => {
    it('should update a requirements document', async () => {
      const currentDoc = {
        id: 'req-123',
        content: { type: 'doc', content: [] },
        contentHtml: '',
        contentText: '',
        status: 'DRAFT',
        version: '1.0.0'
      }

      const updatedDoc = {
        ...currentDoc,
        content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Updated content' }] }] },
        status: 'PENDING_APPROVAL'
      }

        ; (prisma.requirementsDocument.findUnique as jest.Mock).mockResolvedValue(currentDoc)
        ; (prisma.requirementsDocument.update as jest.Mock).mockResolvedValue(updatedDoc)
        ; (prisma.documentVersion.count as jest.Mock).mockResolvedValue(1)
        ; (prisma.documentVersion.create as jest.Mock).mockResolvedValue({})

      const updateRequest: UpdateRequirementsRequest = {
        content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Updated content' }] }] },
        status: 'PENDING_APPROVAL'
      }

      const result = await updateRequirementsDocument('req-123', updateRequest, 'user-123')

      expect(prisma.requirementsDocument.update).toHaveBeenCalled()
      expect(result.status).toBe('PENDING_APPROVAL')
    })

    it('should throw error if document not found', async () => {
      ; (prisma.requirementsDocument.findUnique as jest.Mock).mockResolvedValue(null)

      const updateRequest: UpdateRequirementsRequest = {
        status: 'PENDING_APPROVAL'
      }

      await expect(updateRequirementsDocument('non-existent', updateRequest, 'user-123'))
        .rejects.toThrow('Requirements document not found')
    })
  })

  describe('approveRequirementsDocument', () => {
    it('should approve a requirements document', async () => {
      const approvedDoc = {
        id: 'req-123',
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: 'user-123'
      }

        ; (prisma.requirementsDocument.update as jest.Mock).mockResolvedValue(approvedDoc)

      const result = await approveRequirementsDocument('req-123', {
        approvedBy: 'user-123'
      })

      expect(prisma.requirementsDocument.update).toHaveBeenCalledWith({
        where: { id: 'req-123' },
        data: {
          status: 'APPROVED',
          approvedAt: expect.any(Date),
          approvedBy: 'user-123'
        },
        include: {
          project: true,
          decisions: true,
          versions: true,
          comments: true,
          collaborators: true
        }
      })

      expect(result.status).toBe('APPROVED')
    })
  })

  describe('searchRequirementsDocuments', () => {
    it('should search documents with multiple filters', async () => {
      const mockDocuments = [
        { id: 'req-1', title: 'Temperature Sensor Requirements' },
        { id: 'req-2', title: 'Robot Arm Requirements' }
      ]

        ; (prisma.requirementsDocument.findMany as jest.Mock).mockResolvedValue(mockDocuments)

      const searchParams = {
        projectId: 'proj-123',
        status: 'APPROVED' as const,
        searchTerm: 'temperature'
      }

      const results = await searchRequirementsDocuments(searchParams)

      expect(prisma.requirementsDocument.findMany).toHaveBeenCalledWith({
        where: {
          projectId: 'proj-123',
          status: 'APPROVED',
          OR: [
            { title: { contains: 'temperature', mode: 'insensitive' } },
            { contentText: { contains: 'temperature', mode: 'insensitive' } }
          ]
        },
        include: {
          project: true,
          decisions: true
        },
        orderBy: { updatedAt: 'desc' }
      })

      expect(results).toHaveLength(2)
    })
  })

  describe('addComment', () => {
    it('should add a comment to a document', async () => {
      const mockComment = {
        id: 'comment-123',
        documentId: 'req-123',
        content: 'This needs clarification',
        createdBy: 'user-123',
        resolved: false
      }

        ; (prisma.comment.create as jest.Mock).mockResolvedValue(mockComment)

      const result = await addComment(
        'req-123',
        'user-123',
        'This needs clarification'
      )

      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: {
          documentId: 'req-123',
          content: 'This needs clarification',
          selection: null,
          threadId: undefined,
          createdBy: 'user-123'
        },
        include: {
          document: true,
          user: true
        }
      })

      expect(result.content).toBe('This needs clarification')
    })
  })

  describe('addDecision', () => {
    it('should add a decision to requirements', async () => {
      const mockDecision = {
        id: 'decision-123',
        requirementId: 'req-123',
        content: 'Use DS18B20// temperature sensor',
        importance: 'HIGH'
      }

        ; (prisma.decision.create as jest.Mock).mockResolvedValue(mockDecision)

      const result = await addDecision(
        'req-123',
        'Use DS18B20// temperature sensor',
        'Based on accuracy requirements',
        'HIGH'
      )

      expect(prisma.decision.create).toHaveBeenCalledWith({
        data: {
          requirementId: 'req-123',
          content: 'Use DS18B20// temperature sensor',
          context: 'Based on accuracy requirements',
          importance: 'HIGH'
        },
        include: {
          requirement: true
        }
      })

      expect(result.importance).toBe('HIGH')
    })
  })

  describe('createRequirementsWithInitialData', () => {
    it('should create requirements with initial decisions in a transaction', async () => {
      const mockDocument = { id: 'req-123', projectId: 'proj-456' }
      const mockTx = {
        requirementsDocument: { create: jest.fn().mockResolvedValue(mockDocument) },
        documentVersion: { create: jest.fn() },
        decision: { createMany: jest.fn() },
        documentCollaborator: { create: jest.fn() }
      }

        ; (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
          return await callback(mockTx)
        })

      const request: CreateRequirementsRequest & { userId: string } = {
        projectId: 'proj-456',
        initialPrompt: 'Create a monitoring system',
        userId: 'user-123'
      }

      const decisions = [
        { content: 'Use Arduino Uno', importance: 'HIGH' as const },
        { content: 'Temperature range: -10 to 50°C', context: 'Environmental requirements' }
      ]

      const result = await createRequirementsWithInitialData(request, decisions)

      expect(mockTx.requirementsDocument.create).toHaveBeenCalled()
      expect(mockTx.documentVersion.create).toHaveBeenCalled()
      expect(mockTx.decision.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ content: 'Use Arduino Uno', importance: 'HIGH' })
        ])
      })
      expect(mockTx.documentCollaborator.create).toHaveBeenCalledWith({
        data: {
          documentId: 'req-123',
          userId: 'user-123',
          role: 'OWNER'
        }
      })

      expect(result.id).toBe('req-123')
    })
  })
})