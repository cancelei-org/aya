import type { 
  DebugChatMessage, 
  DebugContext, 
  SystemNode, 
  PartInfo, 
  Issue, 
  DebugSession,
  RealtimeDebugConfig 
} from '@/types/debug'
import type { ChatMessage } from '@/types'

describe('Debug Types', () => {
  describe('DebugChatMessage', () => {
    it('should extend ChatMessage with debug-specific properties', () => {
      const debugMessage: DebugChatMessage = {
        id: 'test-1',
        role: 'user',
        content: 'LEDが点灯しません',
        timestamp: new Date().toISOString(),
        type: 'debug-audio',
        debugMetadata: {
          audioTranscript: 'LEDが点灯しません'
        }
      }

      expect(debugMessage.type).toMatch(/^(user|assistant|debug-visual|debug-audio)$/)
      expect(debugMessage.debugMetadata).toBeDefined()
    })

    it('should support visual debug messages with image data', () => {
      const visualMessage: DebugChatMessage = {
        id: 'test-2',
        role: 'assistant',
        content: '回路基板を確認しました。配線に問題があるようです。',
        timestamp: new Date().toISOString(),
        type: 'debug-visual',
        debugMetadata: {
          imageBase64: 'base64encodedimage',
          ayaContext: {
            systemDesign: [],
            partsInfo: [],
            compatibilityIssues: []
          }
        }
      }

      expect(visualMessage.debugMetadata?.imageBase64).toBeDefined()
      expect(visualMessage.debugMetadata?.ayaContext).toBeDefined()
    })

    it('should support measurement data in debug metadata', () => {
      const measurementMessage: DebugChatMessage = {
        id: 'test-3',
        role: 'assistant',
        content: '電圧測定結果',
        timestamp: new Date().toISOString(),
        type: 'debug-visual',
        debugMetadata: {
          measurementData: {
            voltage: 3.3,
            current: 0.5,
            resistance: 6.6
          }
        }
      }

      expect(measurementMessage.debugMetadata?.measurementData).toBeDefined()
    })
  })

  describe('DebugContext', () => {
    it('should contain all required project information', () => {
      const context: DebugContext = {
        systemDesign: [
          {
            id: 'node-1',
            name: 'Arduino Uno',
            type: 'microcontroller',
            specifications: {
              voltage: 5,
              pins: 20
            },
            connections: ['conn-1', 'conn-2']
          }
        ],
        partsInfo: [
          {
            id: 'part-1',
            name: 'LED',
            category: 'display',
            specifications: {
              voltage: 3.3,
              current: 0.02
            },
            price: 50,
            availability: 'in-stock'
          }
        ],
        compatibilityIssues: [
          {
            id: 'issue-1',
            type: 'voltage',
            severity: 'error',
            description: '電圧不一致',
            affectedNodes: ['node-1', 'part-1']
          }
        ],
        previousDebugSessions: []
      }

      expect(context.systemDesign).toHaveLength(1)
      expect(context.partsInfo).toHaveLength(1)
      expect(context.compatibilityIssues).toHaveLength(1)
    })

    it('should support optional previous debug sessions', () => {
      const context: DebugContext = {
        systemDesign: [],
        partsInfo: [],
        compatibilityIssues: [],
        previousDebugSessions: [
          {
            id: 'session-1',
            projectId: 'project-1',
            startTime: new Date('2025-01-31T10:00:00Z'),
            endTime: new Date('2025-01-31T11:00:00Z'),
            messages: [],
            diagnosis: 'LED接続不良',
            resolution: 'はんだ付け修正',
            images: ['image1.jpg']
          }
        ]
      }

      expect(context.previousDebugSessions).toHaveLength(1)
      expect(context.previousDebugSessions![0].resolution).toBe('はんだ付け修正')
    })
  })

  describe('Issue', () => {
    it('should support all issue types', () => {
      const voltageIssue: Issue = {
        id: 'issue-1',
        type: 'voltage',
        severity: 'error',
        description: '5V部品に3.3Vを供給',
        affectedNodes: ['node-1']
      }

      const protocolIssue: Issue = {
        id: 'issue-2',
        type: 'protocol',
        severity: 'warning',
        description: 'I2CとSPIの混在',
        affectedNodes: ['node-2', 'node-3']
      }

      const powerIssue: Issue = {
        id: 'issue-3',
        type: 'power',
        severity: 'error',
        description: '電力供給不足',
        affectedNodes: ['node-4']
      }

      const otherIssue: Issue = {
        id: 'issue-4',
        type: 'other',
        severity: 'info',
        description: 'ピン配置の推奨事項',
        affectedNodes: []
      }

      expect(voltageIssue.type).toBe('voltage')
      expect(protocolIssue.type).toBe('protocol')
      expect(powerIssue.type).toBe('power')
      expect(otherIssue.type).toBe('other')
    })

    it('should support all severity levels', () => {
      const severities: Issue['severity'][] = ['error', 'warning', 'info']
      
      severities.forEach(severity => {
        const issue: Issue = {
          id: `issue-${severity}`,
          type: 'other',
          severity,
          description: `${severity} level issue`,
          affectedNodes: []
        }
        
        expect(issue.severity).toBe(severity)
      })
    })
  })

  describe('RealtimeDebugConfig', () => {
    it('should contain correct configuration for debug sessions', () => {
      const config: RealtimeDebugConfig = {
        modalities: ['text', 'audio'],
        voice: 'alloy',
        instructions: 'ハードウェアデバッグ専門のAIアシスタント',
        tools: [
          {
            name: 'analyze_webcam',
            function: {} // Mock function
          }
        ]
      }

      expect(config.modalities).toContain('text')
      expect(config.modalities).toContain('audio')
      expect(config.voice).toBe('alloy')
      expect(config.tools).toHaveLength(1)
      expect(config.tools[0].name).toBe('analyze_webcam')
    })
  })

  describe('DebugSession', () => {
    it('should track complete debug session information', () => {
      const session: DebugSession = {
        id: 'session-1',
        projectId: 'project-123',
        startTime: new Date('2025-01-31T10:00:00Z'),
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'LEDが点灯しない',
            timestamp: '2025-01-31T10:01:00Z',
            type: 'debug-audio',
            debugMetadata: {
              audioTranscript: 'LEDが点灯しない'
            }
          }
        ],
        diagnosis: 'LED極性の誤り',
        images: ['debug-img-1.jpg', 'debug-img-2.jpg']
      }

      expect(session.endTime).toBeUndefined()
      expect(session.resolution).toBeUndefined()
      expect(session.messages).toHaveLength(1)
      expect(session.images).toHaveLength(2)
    })

    it('should support completed sessions with resolution', () => {
      const completedSession: DebugSession = {
        id: 'session-2',
        projectId: 'project-456',
        startTime: new Date('2025-01-31T14:00:00Z'),
        endTime: new Date('2025-01-31T14:30:00Z'),
        messages: [],
        diagnosis: '抵抗値の計算ミス',
        resolution: '330Ω抵抗に交換して解決',
        images: []
      }

      expect(completedSession.endTime).toBeDefined()
      expect(completedSession.resolution).toBe('330Ω抵抗に交換して解決')
    })
  })
})