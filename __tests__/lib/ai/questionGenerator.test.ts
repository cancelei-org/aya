// Unit tests for QuestionGenerationEngine
import { QuestionGenerationEngine } from '@/lib/ai/questionGenerator'

describe('QuestionGenerationEngine', () => {
  let engine: QuestionGenerationEngine

  beforeEach(() => {
    engine = new QuestionGenerationEngine()
  })

  describe('detectSystemType', () => {
    it('should detect// temperature sensor systems', () => {
      const requirements = 'Temperature monitoring system with thermal sensors'
      const types = engine['detectSystemType'](requirements)
      expect(types).toContain('temperature_sensor')
    })

    it('should detect motor control systems', () => {
      const requirements = 'Motor control system for servo actuators'
      const types = engine['detectSystemType'](requirements)
      expect(types).toContain('motor_control')
    })

    it('should detect wireless communication systems', () => {
      const requirements = 'Wireless IoT device with WiFi connectivity'
      const types = engine['detectSystemType'](requirements)
      expect(types).toContain('wireless_communication')
    })

    it('should detect power supply requirements', () => {
      const requirements = 'Battery powered device with voltage regulation'
      const types = engine['detectSystemType'](requirements)
      expect(types).toContain('power_supply')
    })

    it('should detect multiple system types', () => {
      const requirements = 'Temperature sensor with wireless communication and motor control'
      const types = engine['detectSystemType'](requirements)
      expect(types).toContain('temperature_sensor')
      expect(types).toContain('wireless_communication')
      expect(types).toContain('motor_control')
    })
  })

  describe('analyzeCompleteness', () => {
    it('should analyze requirement completeness', () => {
      const requirements = 'System purpose is monitoring. Functions include measurement and control. Performance must be high accuracy.'
      const scores = engine['analyzeCompleteness'](requirements)

      expect(scores.get('purpose')).toBeGreaterThan(0)
      expect(scores.get('functional')).toBeGreaterThan(0)
      expect(scores.get('performance')).toBeGreaterThan(0)
    })

    it('should return low scores for incomplete requirements', () => {
      const requirements = 'Basic system'
      const scores = engine['analyzeCompleteness'](requirements)

      expect(scores.get('functional')).toBeLessThan(50)
      expect(scores.get('performance')).toBeLessThan(50)
    })
  })

  describe('generateQuestions', () => {
    it('should generate questions for low completeness', () => {
      const context = {
        existingRequirements: 'Basic// temperature system',
        sectionType: 'hardware' as const,
        completenessScore: 20
      }

      const questions = engine.generateQuestions(context)

      expect(questions.length).toBeGreaterThan(0)
      expect(questions[0].priority).toBe(1) // Should prioritize basic questions
      expect(questions[0].question.toLowerCase()).toContain('purpose')
    })

    it('should generate technical questions for// temperature sensors', () => {
      const context = {
        existingRequirements: 'Temperature monitoring system for industrial use',
        sectionType: 'hardware' as const,
        completenessScore: 50
      }

      const questions = engine.generateQuestions(context)

      const hasTemperatureQuestion = questions.some(q =>
        q.question.toLowerCase().includes('temperature') ||
        q.question.toLowerCase().includes('range') ||
        q.question.toLowerCase().includes('accuracy')
      )
      expect(hasTemperatureQuestion).toBe(true)
    })

    it('should generate environment questions when missing', () => {
      const context = {
        existingRequirements: 'Temperature sensor system',
        sectionType: 'hardware' as const,
        completenessScore: 40
      }

      const questions = engine.generateQuestions(context)

      const hasEnvironmentQuestion = questions.some(q =>
        q.question.toLowerCase().includes('environment') ||
        q.question.toLowerCase().includes('operating conditions')
      )
      expect(hasEnvironmentQuestion).toBe(true)
    })

    it('should limit questions to maximum of 5', () => {
      const context = {
        existingRequirements: 'Basic system without details',
        sectionType: 'hardware' as const,
        completenessScore: 10
      }

      const questions = engine.generateQuestions(context)
      expect(questions.length).toBeLessThanOrEqual(5)
    })

    it('should sort questions by priority', () => {
      const context = {
        existingRequirements: 'Temperature sensor with some details',
        sectionType: 'hardware' as const,
        completenessScore: 30
      }

      const questions = engine.generateQuestions(context)

      // Check that questions are sorted by priority (ascending)
      for (let i = 1; i < questions.length; i++) {
        expect(questions[i].priority).toBeGreaterThanOrEqual(questions[i - 1].priority)
      }
    })
  })

  describe('generateFollowUpQuestion', () => {
    it('should generate// temperature range follow-up', () => {
      const context = {
        existingRequirements: 'Temperature system',
        sectionType: 'hardware' as const,
        completenessScore: 50
      }

      const followUp = engine.generateFollowUpQuestion('Temperature monitoring', context)

      expect(followUp).toBeDefined()
      expect(followUp!.question.toLowerCase()).toContain('range')
    })

    it('should generate wireless range follow-up', () => {
      const context = {
        existingRequirements: 'Wireless system',
        sectionType: 'hardware' as const,
        completenessScore: 50
      }

      const followUp = engine.generateFollowUpQuestion('Wireless communication', context)

      expect(followUp).toBeDefined()
      expect(followUp!.question.toLowerCase()).toContain('range')
    })

    it('should generate battery life follow-up', () => {
      const context = {
        existingRequirements: 'Battery system',
        sectionType: 'hardware' as const,
        completenessScore: 50
      }

      const followUp = engine.generateFollowUpQuestion('Battery powered device', context)

      expect(followUp).toBeDefined()
      expect(followUp!.question.toLowerCase()).toContain('battery')
    })

    it('should return null for unrelated answers', () => {
      const context = {
        existingRequirements: 'Generic system',
        sectionType: 'hardware' as const,
        completenessScore: 50
      }

      const followUp = engine.generateFollowUpQuestion('Unrelated response', context)

      expect(followUp).toBeNull()
    })
  })

  describe('validateRequirements', () => {
    it('should validate complete requirements', () => {
      const requirements = 'System purpose is monitoring// temperature. Functional requirements include accurate measurement. Constraints include low power operation.'

      const result = engine.validateRequirements(requirements)

      expect(result.isValid).toBe(true)
      expect(result.missingCritical).toHaveLength(0)
    })

    it('should detect missing critical sections', () => {
      const requirements = 'Basic system description without details'

      const result = engine.validateRequirements(requirements)

      expect(result.isValid).toBe(false)
      expect(result.missingCritical.length).toBeGreaterThan(0)
    })

    it('should suggest adding numerical values', () => {
      const requirements = 'System purpose is monitoring. Functional requirements include measurement. Constraints include power limits.'

      const result = engine.validateRequirements(requirements)

      expect(result.suggestions).toContain('Add specific numerical values for requirements (e.g.,// temperature ranges, accuracy values)')
    })

    it('should suggest testable language', () => {
      const requirements = 'System purpose is monitoring// temperature. The system could measure// temperature. It might have good accuracy.'

      const result = engine.validateRequirements(requirements)

      expect(result.suggestions).toContain('Use clear requirement language (must, shall, should) to make requirements testable')
    })

    it('should accept requirements with numerical values', () => {
      const requirements = 'System purpose is monitoring// temperature from -20°C to 85°C with ±0.5°C accuracy. Functional requirements include measurement. Constraints include power consumption below 10mW.'

      const result = engine.validateRequirements(requirements)

      const hasNumericSuggestion = result.suggestions.some(s => s.includes('numerical values'))
      expect(hasNumericSuggestion).toBe(false)
    })

    it('should accept requirements with testable language', () => {
      const requirements = 'System purpose is monitoring. The system must measure// temperature. It shall provide accurate readings. Performance should meet specifications.'

      const result = engine.validateRequirements(requirements)

      const hasTestableSuggestion = result.suggestions.some(s => s.includes('testable'))
      expect(hasTestableSuggestion).toBe(false)
    })
  })

  describe('suggestIndustryStandards', () => {
    it('should suggest standards for// temperature sensors', () => {
      const standards = engine.suggestIndustryStandards('temperature_sensor')

      expect(standards.length).toBeGreaterThan(0)
      expect(standards.some(s => s.parameter.includes('Operating Range'))).toBe(true)
      expect(standards.some(s => s.parameter.includes('Accuracy'))).toBe(true)
    })

    it('should suggest standards for motor control', () => {
      const standards = engine.suggestIndustryStandards('motor_control')

      expect(standards.length).toBeGreaterThan(0)
      expect(standards.some(s => s.parameter.includes('Voltage Range'))).toBe(true)
      expect(standards.some(s => s.parameter.includes('Current Rating'))).toBe(true)
    })

    it('should return empty array for unknown system types', () => {
      const standards = engine.suggestIndustryStandards('unknown_system')

      expect(standards).toEqual([])
    })
  })
})