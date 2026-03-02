import {
  classifyUserIntent,
  generateIntentPrompt,
  shouldExecuteFunction,
  UserIntent,
  IntentResult,
  RequirementsIntent
} from '@/utils/ai/processing/intentClassifier'

describe('IntentClassifier', () => {
  describe('classifyUserIntent', () => {
    describe('requirements_definition intent', () => {
      it('should classify Japanese requirements definition keywords', () => {
        const testCases = [
          '温度センサーを使った監視システムを作りたい',
          '要件定義を作成してください',
          'IoTデバイスの要件を定義したい',
          'ロボットの仕様を整理したい',
          '監視システムの要求を明確にしたい'
        ]

        testCases.forEach(message => {
          const result = classifyUserIntent(message)
          expect(result.intent).toBe('requirements_definition')
          expect(result.confidence).toBeGreaterThan(0.4)
          expect(result.keywords.length).toBeGreaterThan(0)
        })
      })

      it('should classify English requirements definition keywords', () => {
        const testCases = [
          'I want to create requirements for my system',
          'Help me define requirements',
          'Create a specification document',
          'Define system requirements'
        ]

        testCases.forEach(message => {
          const result = classifyUserIntent(message)
          expect(result.intent).toBe('requirements_definition')
          expect(result.confidence).toBeGreaterThan(0.4)
        })
      })

      it('should have high confidence for specific project requests', () => {
        const result = classifyUserIntent('温度センサーを使った監視システムの要件定義を作成したい')
        expect(result.intent).toBe('requirements_definition')
        expect(result.confidence).toBeGreaterThan(0.7)
      })
    })

    describe('other intents', () => {
      it('should still classify compatibility check correctly', () => {
        const result = classifyUserIntent('check compatibility between components')
        expect(result.intent).toBe('compatibility_check')
      })

      it('should still classify system suggestion correctly', () => {
        const result = classifyUserIntent('suggest a// temperature monitoring system')
        expect(result.intent).toBe('suggest_system')
      })

      it('should classify general chat for unrelated messages', () => {
        const result = classifyUserIntent('hello, how are you?')
        expect(result.intent).toBe('general_chat')
        expect(result.confidence).toBe(0)
      })
    })

    describe('confidence calculation', () => {
      it('should calculate higher confidence for multiple keyword matches', () => {
        const result1 = classifyUserIntent('要件定義')
        const result2 = classifyUserIntent('温度センサーの監視システムの要件定義を詳細に作成したい')

        expect(result1.intent).toBe('requirements_definition')
        expect(result2.intent).toBe('requirements_definition')
        expect(result2.keywords.length).toBeGreaterThan(result1.keywords.length)
      })

      it('should give bonus for exact matches', () => {
        const result = classifyUserIntent('requirements definition')
        expect(result.confidence).toBeGreaterThan(0.6)
      })
    })
  })

  describe('generateIntentPrompt', () => {
    it('should generate requirements definition prompt in Japanese', () => {
      const prompt = generateIntentPrompt('requirements_definition')
      expect(prompt).toContain('要件定義')
      expect(prompt).toContain('システムの目的と概要')
      expect(prompt).toContain('機能要件')
      expect(prompt).toContain('非機能要件')
      expect(prompt).toContain('制約条件')
    })

    it('should generate empty prompt for general chat', () => {
      const prompt = generateIntentPrompt('general_chat')
      expect(prompt).toBe('')
    })

    it('should generate specific prompts for other intents', () => {
      const compatibilityPrompt = generateIntentPrompt('compatibility_check')
      expect(compatibilityPrompt).toContain('compatibility analysis')

      const systemPrompt = generateIntentPrompt('suggest_system')
      expect(systemPrompt).toContain('SYSTEM_SUGGESTIONS_JSON_START')
    })
  })

  describe('shouldExecuteFunction', () => {
    it('should execute function for high confidence requirements definition', () => {
      const shouldExecute = shouldExecuteFunction('requirements_definition', 0.8)
      expect(shouldExecute).toBe(true)
    })

    it('should not execute function for low confidence', () => {
      const shouldExecute = shouldExecuteFunction('requirements_definition', 0.5)
      expect(shouldExecute).toBe(false)
    })

    it('should not execute function for general chat regardless of confidence', () => {
      const shouldExecute = shouldExecuteFunction('general_chat', 1.0)
      expect(shouldExecute).toBe(false)
    })
  })

  describe('RequirementsIntent interface', () => {
    it('should accept valid RequirementsIntent objects', () => {
      const validIntents: RequirementsIntent[] = [
        { action: 'create' },
        { action: 'update', context: 'temperature monitoring' },
        { action: 'review', targetSection: 'functional requirements' },
        { action: 'approve' },
        { action: 'question', context: 'performance requirements' }
      ]

      validIntents.forEach(intent => {
        expect(intent.action).toMatch(/^(create|update|review|approve|question)$/)
      })
    })
  })
})