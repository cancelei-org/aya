// Unit tests for RequirementsValidator
import { RequirementsValidator } from '@/lib/validators/requirementsValidator'
import { RequirementsDocument, RequirementsSection } from '@/types/requirements'

describe('RequirementsValidator', () => {
  let validator: RequirementsValidator

  beforeEach(() => {
    validator = new RequirementsValidator()
  })

  describe('checkConsistency', () => {
    it('should detect low power vs high performance contradiction', () => {
      const document: RequirementsDocument = {
        id: 'test-doc',
        projectId: 'project-1',
        userId: 'user-1',
        title: 'Test Requirements',
        content: {},
        contentText: 'The system must be low-power battery-powered device with high-performance real-time processing.',
        version: 1,
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const sections: RequirementsSection[] = [
        {
          id: 'sec-1',
          requirementId: 'test-doc',
          title: 'System Requirements',
          type: 'system',
          content: 'System requirements',
          completeness: 90,
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'sec-2',
          requirementId: 'test-doc',
          title: 'Functional Requirements',
          type: 'functional',
          content: 'Functional requirements',
          completeness: 85,
          order: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'sec-3',
          requirementId: 'test-doc',
          title: 'Constraints',
          type: 'constraints',
          content: 'System constraints',
          completeness: 80,
          order: 2,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
      const result = validator.checkConsistency(document, sections)

      expect(result.isConsistent).toBe(true) // No critical errors, only warnings
      expect(result.issues.some(i => i.message.includes('Low power requirement conflicts with high performance'))).toBe(true)
      expect(result.score).toBeLessThan(100)
    })

    it('should detect size vs features contradiction', () => {
      const document: RequirementsDocument = {
        id: 'test-doc',
        projectId: 'project-1',
        userId: 'user-1',
        title: 'Test Requirements',
        content: {},
        contentText: 'The device should be compact and miniature but have many features and extensive functionality.',
        version: 1,
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const sections: RequirementsSection[] = [
        {
          id: 'sec-1',
          requirementId: 'test-doc',
          title: 'System Requirements',
          type: 'system',
          content: 'System requirements',
          completeness: 90,
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'sec-2',
          requirementId: 'test-doc',
          title: 'Functional Requirements',
          type: 'functional',
          content: 'Functional requirements',
          completeness: 85,
          order: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'sec-3',
          requirementId: 'test-doc',
          title: 'Constraints',
          type: 'constraints',
          content: 'System constraints',
          completeness: 80,
          order: 2,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
      const result = validator.checkConsistency(document, sections)

      expect(result.issues.some(i => i.message.includes('Size constraints may conflict'))).toBe(true)
    })

    it('should check numeric consistency for// temperature ranges', () => {
      const document: RequirementsDocument = {
        id: 'test-doc',
        projectId: 'project-1',
        userId: 'user-1',
        title: 'Test Requirements',
        content: {},
        contentText: 'Temperature sensor with fast response and good accuracy.',
        version: 1,
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const sections: RequirementsSection[] = [
        {
          id: 'sec-1',
          requirementId: 'test-doc',
          title: 'System Requirements',
          type: 'system',
          content: 'System requirements',
          completeness: 90,
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'sec-2',
          requirementId: 'test-doc',
          title: 'Functional Requirements',
          type: 'functional',
          content: 'Functional requirements',
          completeness: 85,
          order: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'sec-3',
          requirementId: 'test-doc',
          title: 'Constraints',
          type: 'constraints',
          content: 'System constraints',
          completeness: 80,
          order: 2,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
      const result = validator.checkConsistency(document, sections)

      // Check that ambiguous language is detected
      expect(result.issues.some(i => i.message.includes('Ambiguous term'))).toBe(true)
      expect(result.score).toBeLessThan(100)
    })

    it('should check for missing critical sections', () => {
      const document: RequirementsDocument = {
        id: 'test-doc',
        projectId: 'project-1',
        userId: 'user-1',
        title: 'Test Requirements',
        content: {},
        contentText: 'Some basic description',
        version: 1,
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const sections: RequirementsSection[] = [
        {
          id: 'sec-1',
          requirementId: 'test-doc',
          title: 'Overview',
          type: 'overview',
          content: 'Basic overview',
          completeness: 20,
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      const result = validator.checkConsistency(document, sections)

      expect(result.issues.some(i =>
        i.severity === 'error' &&
        i.message.includes('Missing required section')
      )).toBe(true)
    })

    it('should detect circular dependencies', () => {
      const document: RequirementsDocument = {
        id: 'test-doc',
        projectId: 'project-1',
        userId: 'user-1',
        title: 'Test Requirements',
        content: {},
        contentText: 'Requirements with dependencies',
        version: 1,
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const sections: RequirementsSection[] = [
        {
          id: 'sec-1',
          requirementId: 'test-doc',
          title: 'Section A',
          type: 'functional',
          content: 'Content A',
          completeness: 80,
          dependencies: ['sec-2'],
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'sec-2',
          requirementId: 'test-doc',
          title: 'Section B',
          type: 'functional',
          content: 'Content B',
          completeness: 80,
          dependencies: ['sec-1'],
          order: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      const result = validator.checkConsistency(document, sections)

      expect(result.issues.some(i =>
        i.severity === 'error' &&
        i.message.includes('Circular dependency detected')
      )).toBe(true)
    })

    it('should detect ambiguous language', () => {
      const document: RequirementsDocument = {
        id: 'test-doc',
        projectId: 'project-1',
        userId: 'user-1',
        title: 'Test Requirements',
        content: {},
        contentText: 'The system should be fast and have good performance. It might support many users.',
        version: 1,
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const sections: RequirementsSection[] = []
      const result = validator.checkConsistency(document, sections)

      const ambiguityIssues = result.issues.filter(i =>
        i.severity === 'info' && i.message.includes('Ambiguous term')
      )

      expect(ambiguityIssues.length).toBeGreaterThan(0)
      expect(ambiguityIssues.some(i => i.message.includes('"fast"'))).toBe(true)
      expect(ambiguityIssues.some(i => i.message.includes('"good"'))).toBe(true)
    })

    it('should calculate consistency score correctly', () => {
      const document: RequirementsDocument = {
        id: 'test-doc',
        projectId: 'project-1',
        userId: 'user-1',
        title: 'Test Requirements',
        content: {},
        contentText: 'Well-defined requirements with specific values.',
        version: 1,
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const sections: RequirementsSection[] = [
        {
          id: 'sec-1',
          requirementId: 'test-doc',
          title: 'System Requirements',
          type: 'system',
          content: 'Detailed system requirements',
          completeness: 90,
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'sec-2',
          requirementId: 'test-doc',
          title: 'Functional Requirements',
          type: 'functional',
          content: 'Detailed functional requirements',
          completeness: 85,
          order: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'sec-3',
          requirementId: 'test-doc',
          title: 'Constraints',
          type: 'constraints',
          content: 'System constraints',
          completeness: 80,
          order: 2,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      const result = validator.checkConsistency(document, sections)

      expect(result.score).toBeGreaterThan(70)
      expect(result.isConsistent).toBe(true)
    })
  })

  describe('generateImprovementSuggestions', () => {
    it('should generate suggestions for critical issues', () => {
      const check = {
        isConsistent: false,
        issues: [
          { severity: 'error' as const, section: 'Test', message: 'Critical error', suggestion: 'Fix this' },
          { severity: 'warning' as const, section: 'Test', message: 'Warning', suggestion: 'Review this' }
        ],
        score: 50
      }

      const suggestions = validator.generateImprovementSuggestions(check)

      expect(suggestions).toContain('Fix 1 critical issue before finalizing')
      expect(suggestions).toContain('Review 1 warning to improve consistency')
      expect(suggestions).toContain('Consider restructuring requirements for better clarity')
    })

    it('should suggest fixing ambiguous terms', () => {
      const check = {
        isConsistent: true,
        issues: [
          { severity: 'info' as const, section: 'Language', message: 'ambiguous term found: "fast"', suggestion: 'Be specific' }
        ],
        score: 85
      }

      const suggestions = validator.generateImprovementSuggestions(check)

      expect(suggestions).toContain('Replace ambiguous terms with specific, measurable values')
    })

    it('should suggest fixing dependencies', () => {
      const check = {
        isConsistent: false,
        issues: [
          { severity: 'error' as const, section: 'Structure', message: 'Circular dependency detected', suggestion: 'Fix dependency' }
        ],
        score: 60
      }

      const suggestions = validator.generateImprovementSuggestions(check)

      expect(suggestions).toContain('Review and fix dependency relationships between sections')
    })
  })

  describe('validateAgainstStandards', () => {
    it('should validate// temperature sensor requirements', () => {
      const document: RequirementsDocument = {
        id: 'test-doc',
        projectId: 'project-1',
        userId: 'user-1',
        title: 'Temperature Sensor Requirements',
        content: {},
        contentText: 'Temperature sensor system for monitoring.',
        version: 1,
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const issues = validator.validateAgainstStandards(document, 'temperature_sensor')

      expect(issues.some(i => i.message.includes('should specify accuracy'))).toBe(true)
      expect(issues.some(i => i.message.includes('should specify operating range'))).toBe(true)
    })

    it('should validate wireless system requirements', () => {
      const document: RequirementsDocument = {
        id: 'test-doc',
        projectId: 'project-1',
        userId: 'user-1',
        title: 'Wireless System Requirements',
        content: {},
        contentText: 'Wireless communication system with range of 50 meters.',
        version: 1,
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const issues = validator.validateAgainstStandards(document, 'wireless')

      expect(issues.some(i => i.message.includes('should specify operating frequency'))).toBe(true)
      expect(issues.some(i => i.message.includes('communication range'))).toBe(false) // Already specified
    })

    it('should handle unknown system types gracefully', () => {
      const document: RequirementsDocument = {
        id: 'test-doc',
        projectId: 'project-1',
        userId: 'user-1',
        title: 'Unknown System',
        content: {},
        contentText: 'Some unknown system type.',
        version: 1,
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const issues = validator.validateAgainstStandards(document, 'unknown_type')

      expect(issues).toHaveLength(0)
    })
  })
})