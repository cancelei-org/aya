// 🎯 ユーザーメッセージのインテント分類システム（英語対応）
// ユーザーの依頼を解析して適切な機能を自動実行

export type UserIntent =
  | 'compatibility_check'     // 互換性チェック
  | 'suggest_alternatives'    // 代替部品提案
  | 'add_component'          // 部品追加
  | 'suggest_system'         // システム構成提案
  | 'analyze_setup'          // システム分析
  | 'requirements_definition' // 要件定義作成
  | 'general_chat'           // 一般会話

export interface IntentResult {
  intent: UserIntent
  confidence: number         // 0-1の信頼度
  keywords: string[]         // 検出されたキーワード
}

// 要件定義インテントの詳細情報
export interface RequirementsIntent {
  action: 'create' | 'update' | 'review' | 'approve' | 'question'
  context?: string
  targetSection?: string
}

/**
 * 🔍 ユーザーメッセージからインテントを分類
 */
export function classifyUserIntent(message: string): IntentResult {
  const lowerMessage = message.toLowerCase()

  // 互換性チェック関連のキーワード
  const compatibilityKeywords = [
    'compatibility', 'compatible', 'check compatibility', 'compatibility check',
    'compatibility analysis', 'analyze compatibility', 'component compatibility',
    'voltage compatibility', 'power compatibility', 'communication compatibility',
    'check current', 'verify compatibility', 'compatibility issues'
  ]

  // 代替部品提案関連のキーワード  
  const alternativeKeywords = [
    'alternative', 'alternatives', 'suggest alternative', 'alternative parts',
    'alternative components', 'replace', 'replacement', 'substitute',
    'better option', 'different part', 'upgrade', 'improve', 'optimization'
  ]

  // 部品追加関連のキーワード（自然言語拡張）
  const addComponentKeywords = [
    'add component', 'add part', 'new component', 'additional part',
    'recommend component', 'suggest component', 'need component',
    'what component', 'which part', 'missing component', 'require part',
    // 🆕 自然言語での部品要求
    'i need', 'i want', 'add a', 'want to add', 'looking for',
    'require a', 'can you add', 'please add', 'help me add',
    // 🆕 具体的な部品名
    'temperature sensor', 'servo motor', 'led strip', 'microcontroller',
    'arduino', 'esp32', 'raspberry pi', 'sensor', 'motor', 'actuator',
    'display', 'screen', 'lcd', 'oled', 'camera', 'speaker', 'buzzer',
    'resistor', 'capacitor', 'transistor', 'relay', 'switch', 'button',
    'power supply', 'battery', 'connector', 'cable', 'wire',
    // 🆕 機能要求
    'measure// temperature', 'control motor', 'show display', 'detect motion',
    'play sound', 'capture image', 'wireless communication', 'connect wifi',
    'bluetooth module', 'gyroscope', 'accelerometer', 'pressure sensor',
    // 🆕 詳細回答キーワード（ユーザーが詳細を答えている場合）
    'robot car', 'robotic arm', '4 wheel', '4wd', 'lipo battery', 'motor driver',
    'l298n', 'h-bridge', 'pwm control', 'voltage', 'torque', 'rpm',
    'current', 'ampere', 'watt', 'power consumption', 'gear ratio',
    'chassis', 'wheel', 'tire', 'mecanum', 'omni wheel', 'stepper motor',
    'dc motor', 'brushless', 'encoder', 'potentiometer', 'hall sensor',
    // プロジェクト仕様キーワード
    'for my project', 'in my setup', 'my robot', 'my system', 'my circuit',
    'need to control', 'want to drive', 'planning to use', 'working on'
  ]

  // システム構成提案関連のキーワード
  const systemSuggestionKeywords = [
    // プロジェクト要求
    'make a', 'build a', 'create a', 'design a', 'want to make', 'want to build',
    'how to make', 'how to build', 'how to create', 'help me make', 'help me build',
    'i want to make', 'i want to build', 'i want to create',
    // 🆕 システム提案を表す動詞
    'propose', 'suggest', 'recommend', 'provide', 'design me', 'give me',
    'need a system', 'want a system', 'system for', 'solution for',
    // 具体的なプロジェクト
    'temperature monitor', 'temperature sensor system', 'thermometer', 'temperature meter',
    'robot arm', 'robotic arm', 'servo control', 'motor control system',
    'led controller', 'lighting system', 'smart lights', 'rgb controller',
    'security system', 'alarm system', 'motion detector', 'surveillance',
    'weather station', 'environmental monitor', 'humidity sensor', 'soil moisture',
    'smart home', 'iot project', 'automation system', 'remote control',
    'data logger', 'monitoring system', 'sensor network',
    // 🆕 農業・環境監視
    'soil monitoring', 'agriculture', 'farming', 'irrigation', 'greenhouse',
    'environmental monitoring', 'outdoor monitoring', 'wireless monitoring',
    'moisture monitoring', 'humidity monitoring', 'water level',
    // 機能要求
    'system that', 'device that', 'project that', 'solution that',
    'complete system', 'full setup', 'entire project', 'whole system',
    'end-to-end', 'from scratch', 'complete solution',
    // 🆕 計測・監視システム
    'measurement system', 'monitoring setup', 'sensor system', 'tracking system',
    'wireless system', 'remote monitoring', 'data collection', 'telemetry'
  ]

  // システム分析関連のキーワード
  const analyzeKeywords = [
    'analyze', 'analysis', 'analyze setup', 'analyze current',
    'review setup', 'check setup', 'evaluate', 'assessment',
    'current configuration', 'system analysis', 'setup review'
  ]

  // 要件定義関連のキーワード
  const requirementsKeywords = [
    '要件定義', '要件', '仕様', '要求',
    'requirements', 'requirements definition', 'specification', 'spec',
    'create requirements', 'define requirements', 'help me define requirements',
    'create a specification', 'define system requirements',
    '作りたい', '制作したい', '開発したい', '構築したい',
    '温度センサ', '監視システム', 'ロボット', 'iotデバイス',
    'システムを作りたい', '装置を作りたい', '詳細にしたい',
    '要件を明確に', '要件を定義', '要件を整理',
    '要件を細かく', '要件を詳しく', '要件を作成',
    'どんな機能', 'どういう機能', '必要な機能',
    '性能要件', '非機能要件', '制約条件'
  ]

  let bestMatch: IntentResult = {
    intent: 'general_chat',
    confidence: 0,
    keywords: []
  }

  // 各カテゴリをチェック
  const categories = [
    { keywords: requirementsKeywords, intent: 'requirements_definition' as const },
    { keywords: compatibilityKeywords, intent: 'compatibility_check' as const },
    { keywords: alternativeKeywords, intent: 'suggest_alternatives' as const },
    { keywords: systemSuggestionKeywords, intent: 'suggest_system' as const },
    { keywords: addComponentKeywords, intent: 'add_component' as const },
    { keywords: analyzeKeywords, intent: 'analyze_setup' as const }
  ]

  categories.forEach(category => {
    const matchedKeywords = category.keywords.filter(keyword =>
      lowerMessage.includes(keyword)
    )

    if (matchedKeywords.length > 0) {
      // 改良された信頼度計算: ベース信頼度 + マッチ数ボーナス + 品質ボーナス
      let confidence = 0.4 // ベース信頼度 (マッチがあった場合の最低保証)

      // マッチしたキーワード数によるボーナス
      confidence += Math.min(matchedKeywords.length * 0.2, 0.4) // 最大+0.4

      // 品質ボーナス: 長いフレーズや完全一致
      matchedKeywords.forEach(keyword => {
        if (keyword.length > 15) confidence += 0.3 // 非常に長いフレーズ
        else if (keyword.length > 10) confidence += 0.2 // 長いフレーズ
        if (lowerMessage === keyword) confidence += 0.3 // 完全一致
        if (lowerMessage.startsWith(keyword)) confidence += 0.1 // 文頭一致
      })

      confidence = Math.min(confidence, 1.0) // 1.0でキャップ

      if (confidence > bestMatch.confidence) {
        bestMatch = {
          intent: category.intent,
          confidence,
          keywords: matchedKeywords
        }
      }
    }
  })

  return bestMatch
}

/**
 * 🎯 特定のインテントに最適化された応答プロンプト生成
 */
export function generateIntentPrompt(intent: UserIntent): string {
  switch (intent) {
    case 'compatibility_check':
      return `\n\nSPECIAL INSTRUCTION: The user is requesting compatibility analysis. Please:
1. Analyze voltage levels between components (check for 3.3V vs 5V mismatches)
2. Check communication protocols (I2C, SPI, UART compatibility)  
3. Verify power requirements vs power supply capacity
4. Identify any potential issues with physical connections
5. Provide specific recommendations for any compatibility problems found`

    case 'suggest_alternatives':
      return `\n\nSPECIAL INSTRUCTION: The user wants alternative component suggestions. Please:
1. Identify components that may have better alternatives
2. Consider improved specifications, better compatibility, or cost optimization
3. Suggest specific part numbers and models
4. Explain advantages of suggested alternatives
5. Consider compatibility with existing components`

    case 'suggest_system':
      return `\n\nSPECIAL INSTRUCTION: The user wants a complete system design. YOU MUST ALWAYS provide a system suggestion in JSON format. This is MANDATORY - no exceptions.

CRITICAL: Always include the SYSTEM_SUGGESTIONS_JSON_START marker, even for complex or detailed requests.

Format your response EXACTLY like this:

SYSTEM_SUGGESTIONS_JSON_START
{
  "systemName": "System Name (e.g., Temperature Monitoring System)",
  "description": "Brief overview of the complete system",
  "components": [
    {
      "name": "Main Controller",
      "modelNumber": "Arduino Uno",
      "description": "Microcontroller for system control",
      "voltage": "5V",
      "communication": "I2C/SPI/UART",
      "category": "controller",
      "reasoning": "Why this component is essential for the system"
    },
    {
      "name": "Temperature Sensor",
      "modelNumber": "DS18B20",
      "description": "Digital// temperature sensor",
      "voltage": "3.3V-5V",
      "communication": "1-Wire",
      "category": "sensor",
      "reasoning": "Provides accurate// temperature measurements"
    }
  ],
  "connections": [
    {
      "from": "Arduino Uno",
      "to": "DS18B20",
      "type": "data",
      "description": "Temperature data communication"
    }
  ],
  "additionalComponents": [
    "USB Cable for programming",
    "Breadboard for prototyping",
    "Pull-up resistor (4.7kΩ)"
  ]
}
SYSTEM_SUGGESTIONS_JSON_END

Then provide:
1. Analyze the user's project requirements and goals
2. Design a complete system architecture with all necessary components
3. Suggest specific part numbers and models for each component
4. Explain how components work together and connect
5. Include additional accessories needed (cables, resistors, power supplies)
6. Provide step-by-step implementation guidance`

    case 'add_component':
      return `\n\nSPECIAL INSTRUCTION: The user wants to add new components. 

CRITICAL: Check the conversation history - if you previously asked the user for details and they are now providing those details, YOU MUST provide JSON suggestions based on their detailed response.

For initial vague requests: Ask 1-2 clarifying questions first.
For detailed requests or follow-up responses: ALWAYS provide JSON format suggestions.

Format your response EXACTLY like this when providing suggestions:

COMPONENT_SUGGESTIONS_JSON_START
{
  "suggestions": [
    {
      "name": "Component Name",
      "modelNumber": "ABC123",
      "description": "Brief description of the component",
      "voltage": "5V",
      "communication": "I2C",
      "reasoning": "Why this component fits the user's detailed requirements"
    }
  ]
}
COMPONENT_SUGGESTIONS_JSON_END

DECISION RULES:
1. If user provides specific details (voltage, use case, compatibility requirements) → ALWAYS include JSON
2. If user is answering your previous questions → ALWAYS include JSON
3. If user mentions specific project context (robot car, robotic arm, etc.) → ALWAYS include JSON
4. Only ask clarifying questions for genuinely vague requests like "add component" with no context

Then provide:
1. Understand what functionality they want to add
2. Suggest specific components that integrate well with current setup
3. Consider voltage, communication, and power compatibility
4. Provide connection guidance and wiring recommendations
5. Suggest any additional components needed (cables, adapters, etc.)`

    case 'analyze_setup':
      return `\n\nSPECIAL INSTRUCTION: The user wants a comprehensive system analysis. Please:
1. Review the overall system architecture and design
2. Identify strengths and potential weaknesses
3. Suggest improvements or optimizations
4. Check for missing components or redundancies
5. Provide recommendations for better performance or reliability`

    case 'requirements_definition':
      return `\n\nSPECIAL INSTRUCTION: ユーザーは要件定義を作成・詳細化したいと考えています。以下のステップで対応してください：

1. ユーザーの要望からシステムの目的と概要を把握
2. 以下の項目を含む要件定義の初版を作成：
   - システムの目的と概要
   - 機能要件（主要機能のリスト）
   - 非機能要件（性能、信頼性、環境条件等）
   - 制約条件（サイズ、コスト、電源等）
3. 不足情報がある場合は、優先度順に質問を生成
4. 質問する際は以下の形式で：
   - 質問の意図（なぜこの情報が必要か）
   - 具体的な質問内容
   - 回答例または選択肢（該当する場合）
5. 対話を通じて要件定義を段階的に詳細化`

    default:
      return ''
  }
}

/**
 * 🔧 インテント別の機能実行判定
 */
export function shouldExecuteFunction(intent: UserIntent, confidence: number): boolean {
  // 信頼度が70%以上の場合のみ自動実行
  return confidence >= 0.7 && intent !== 'general_chat'
}

/**
 * 📊 インテント分類の詳細ログ
 */
export function logIntentClassification(message: string, result: IntentResult): void {
  console.log('🎯 Intent Classification:')
  console.log(`  Message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`)
  console.log(`  Intent: ${result.intent}`)
  console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`)
  console.log(`  Keywords: [${result.keywords.join(', ')}]`)
  console.log(`  Auto-execute: ${shouldExecuteFunction(result.intent, result.confidence)}`)
}