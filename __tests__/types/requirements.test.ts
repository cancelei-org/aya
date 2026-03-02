import {
  RequirementsDocument,
  RequirementStatus,
  DecisionImportance,
  CollaboratorRole,
  DocumentType,
  DevLogDocument,
  RequirementsAction,
  EditorContent,
  CollaborativeCursor,
  CreateRequirementsRequest,
  UpdateRequirementsRequest,
  AIQuestion,
  RequirementsSection
} from '@/types/requirements'

describe('Requirements Types', () => {
  describe('Enums and Type Unions', () => {
    it('should accept valid RequirementStatus values', () => {
      const validStatuses: RequirementStatus[] = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED']
      validStatuses.forEach(status => {
        expect(status).toMatch(/^(DRAFT|PENDING_APPROVAL|APPROVED|REJECTED)$/)
      })
    })

    it('should accept valid DecisionImportance values', () => {
      const validImportance: DecisionImportance[] = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL']
      validImportance.forEach(importance => {
        expect(importance).toMatch(/^(LOW|NORMAL|HIGH|CRITICAL)$/)
      })
    })

    it('should accept valid CollaboratorRole values', () => {
      const validRoles: CollaboratorRole[] = ['VIEWER', 'COMMENTER', 'EDITOR', 'OWNER']
      validRoles.forEach(role => {
        expect(role).toMatch(/^(VIEWER|COMMENTER|EDITOR|OWNER)$/)
      })
    })

    it('should accept valid DocumentType values', () => {
      const validTypes: DocumentType[] = ['ai-reference', 'requirements', 'decision', 'memo']
      validTypes.forEach(type => {
        expect(type).toMatch(/^(ai-reference|requirements|decision|memo)$/)
      })
    })
  })

  describe('RequirementsDocument', () => {
    it('should create a valid RequirementsDocument object', () => {
      const doc: RequirementsDocument = {
        id: 'req-123',
        projectId: 'proj-456',
        title: 'Temperature Monitoring System Requirements',
        content: { type: 'doc', content: [] },
        contentHtml: '<p>Requirements content</p>',
        contentText: 'Requirements content',
        version: '1.0.0',
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      expect(doc.id).toBe('req-123')
      expect(doc.status).toBe('DRAFT')
      expect(doc.approvedAt).toBeUndefined()
    })
  })

  describe('DevLogDocument', () => {
    it('should create a valid DevLogDocument object', () => {
      const devLogDoc: DevLogDocument = {
        id: 'log-123',
        type: 'requirements',
        title: 'System Requirements Definition',
        content: 'Requirements for// temperature monitoring system',
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          author: 'user-123',
          approvalStatus: 'draft',
          version: '1.0.0'
        }
      }

      expect(devLogDoc.type).toBe('requirements')
      expect(devLogDoc.metadata.approvalStatus).toBe('draft')
    })
  })

  describe('RequirementsAction', () => {
    it('should create valid RequirementsAction objects', () => {
      const actions: RequirementsAction[] = [
        { action: 'create' },
        { action: 'update', context: 'temperature sensor specs' },
        { action: 'review', targetSection: 'functional requirements' },
        { action: 'approve' },
        { action: 'question', context: 'performance requirements' }
      ]

      actions.forEach(action => {
        expect(action.action).toMatch(/^(create|update|review|approve|question)$/)
      })
    })
  })

  describe('API Request Types', () => {
    it('should create a valid CreateRequirementsRequest', () => {
      const request: CreateRequirementsRequest = {
        projectId: 'proj-123',
        initialPrompt: 'Create a// temperature monitoring system',
        language: 'en'
      }

      expect(request.projectId).toBe('proj-123')
      expect(request.language).toBe('en')
    })

    it('should create a valid UpdateRequirementsRequest', () => {
      const request: UpdateRequirementsRequest = {
        content: { type: 'doc', content: [] },
        status: 'PENDING_APPROVAL',
        version: '1.0.1'
      }

      expect(request.status).toBe('PENDING_APPROVAL')
    })
  })

  describe('AI and Collaboration Types', () => {
    it('should create a valid AIQuestion', () => {
      const question: AIQuestion = {
        id: 'q-123',
        question: 'What is the operating// temperature range?',
        intent: 'To determine environmental requirements',
        exampleAnswers: ['-10°C to 50°C', '0°C to 40°C'],
        priority: 1,
        answered: false
      }

      expect(question.priority).toBe(1)
      expect(question.answered).toBe(false)
    })

    it('should create a valid CollaborativeCursor', () => {
      const cursor: CollaborativeCursor = {
        userId: 'user-123',
        userName: 'John Doe',
        color: '#FF6B6B',
        position: {
          anchor: 10,
          head: 20
        }
      }

      expect(cursor.color).toBe('#FF6B6B')
      expect(cursor.position.anchor).toBe(10)
    })
  })

  describe('RequirementsSection', () => {
    it('should create a valid RequirementsSection', () => {
      const section: RequirementsSection = {
        id: 'sec-123',
        title: 'Hardware Requirements',
        type: 'hardware',
        content: 'Temperature sensor, microcontroller, display',
        completeness: 75,
        dependencies: ['sec-456', 'sec-789'],
        warnings: ['Power consumption not specified']
      }

      expect(section.type).toBe('hardware')
      expect(section.completeness).toBe(75)
      expect(section.dependencies).toHaveLength(2)
    })
  })
})