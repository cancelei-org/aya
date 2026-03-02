# AIプロンプトカスタマイズガイド

## 概要

このガイドでは、より正確な部品仕様の取得、互換性チェック、システム推奨を行うためのAIプロンプトのカスタマイズ方法を説明します。

### 🎯 プロンプトカスタマイズでできること
- 特定の分野（ロボット、IoTなど）に特化した検索
- より正確な部品情報の取得
- 検索結果の精度向上
- トークン使用量の最適化

## プロンプトの構造

### 基本プロンプトテンプレート

```typescript
// utils/prompts/basePrompt.ts
export const BASE_COMPONENT_SEARCH_PROMPT = `
あなたは電子工学の専門家として、技術仕様を見つけるのを手伝います。

部品名: {componentName}

以下の情報を提供してください：
1. 動作電圧（例: "3.3V", "5V", "3.3V/5V"）
2. 通信プロトコル（例: "I2C,SPI,UART"）
3. GPIOピン数
4. アナログピン数
5. 特殊機能（WiFi、Bluetooth、PWMなど）

JSONフォーマットで応答してください：
{
  "voltage": "電圧",
  "communication": "カンマ区切りのプロトコル",
  "gpio": GPIOピン数,
  "analog": アナログピン数,
  "features": {
    "wifi": true/false,
    "bluetooth": true/false,
    "pwm": true/false
  }
}
`
```

## 特定分野向けのカスタマイズ

### 1. ロボット部品用

```typescript
// prompts/robotics.ts
export const ROBOTICS_COMPONENT_PROMPT = `
あなたはロボット工学の専門家です。部品 "{componentName}" について以下を提供してください：

1. モーター制御機能：
   - PWMチャンネル数と周波数範囲
   - エンコーダー入力サポート
   - 電流センシング機能

2. センサーインターフェース：
   - 対応センサータイプ
   - ADC分解能とチャンネル数
   - エンコーダー用割り込みピン

3. ロボットシステム用通信：
   - CANバスサポート
   - マルチドロップ用RS485
   - リアルタイムプロトコル

4. 電力管理：
   - ピンあたりの電流出力
   - 総電流容量
   - 電圧レギュレーション

以下のJSON形式で応答してください：
{
  "motorControl": {
    "pwmChannels": PWMチャンネル数,
    "pwmFrequency": "最小-最大 Hz",
    "encoderInputs": エンコーダー入力数,
    "currentSensing": true/false
  },
  "sensorSupport": {
    "analogChannels": アナログチャンネル数,
    "adcResolution": "ビット数",
    "interruptPins": 割り込みピン数
  },
  "communication": {
    "protocols": ["CAN", "RS485", "I2C", "SPI"],
    "realTimeSupport": true/false
  },
  "power": {
    "pinCurrent": "mA",
    "totalCurrent": "mA",
    "voltageRange": "最小-最大 V"
  }
}
`
```

### 2. IoTデバイス用

```typescript
// prompts/iot.ts
export const IOT_DEVICE_PROMPT = `
IoTデバイス "{componentName}" について分析してください：

1. 接続オプション（WiFi仕様、Bluetoothバージョン、セルラー）
2. 各モードでの消費電力
3. セキュリティ機能（暗号化、セキュアブート）
4. クラウドプラットフォーム互換性
5. OTAアップデート用メモリ

本番環境での使用を考慮してください。

期待するJSON応答：
{
  "connectivity": {
    "wifi": {
      "supported": true/false,
      "standards": ["802.11b/g/n"],
      "frequency": "2.4GHz/5GHz"
    },
    "bluetooth": {
      "version": "4.2/5.0",
      "lowEnergy": true/false
    },
    "cellular": {
      "supported": true/false,
      "bands": ["LTE-M", "NB-IoT"]
    }
  },
  "powerProfile": {
    "active": "mA",
    "sleep": "μA",
    "deepSleep": "μA"
  },
  "security": {
    "encryptionTypes": ["AES", "TLS"],
    "secureBoot": true/false,
    "cryptoChip": true/false
  }
}
`
```

### 3. 産業用制御

```typescript
// prompts/industrial.ts
export const INDUSTRIAL_PROMPT_TEMPLATE = {
  base: `産業用部品 "{componentName}" を以下の観点で分析：`,
  
  requirements: [
    '動作温度範囲',
    '入出力絶縁',
    'EMC準拠規格',
    '冗長性機能',
    '産業用プロトコルサポート（Modbus、PROFIBUS、EtherCAT）'
  ],
  
  outputFormat: {
    environmental: {
      tempRange: '-40°C～+85°C',
      humidity: '0-95% 結露なきこと',
      vibration: 'IEC 60068-2-6',
      shock: 'IEC 60068-2-27'
    },
    isolation: {
      channels: '絶縁チャンネル数',
      voltage: '絶縁電圧定格',
      method: '光学式/磁気式/容量式'
    },
    protocols: {
      fieldbus: ['Modbus RTU', 'PROFIBUS DP'],
      ethernet: ['EtherCAT', 'PROFINET', 'EtherNet/IP']
    }
  }
}
```

## 高度なプロンプト技術

### 1. コンテキスト対応プロンプト

```typescript
// utils/contextualPrompts.ts
export function buildContextualPrompt(
  componentName: string,
  projectContext: ProjectContext
): string {
  const contextParts = []
  
  // プロジェクトタイプのコンテキストを追加
  if (projectContext.type === 'automotive') {
    contextParts.push('CANバスやJ1939などの自動車規格を考慮してください')
  }
  
  // 既存部品のコンテキストを追加
  if (projectContext.components.length > 0) {
    const voltages = extractVoltages(projectContext.components)
    contextParts.push(`システムは ${voltages.join(', ')} の電圧レベルを使用`)
  }
  
  // 通信コンテキストを追加
  const protocols = extractProtocols(projectContext.components)
  if (protocols.length > 0) {
    contextParts.push(`${protocols.join(', ')} との互換性が必要`)
  }
  
  return `
    ${BASE_COMPONENT_SEARCH_PROMPT}
    
    追加コンテキスト：
    ${contextParts.join('\n')}
    
    既存システムとの互換性を優先してください。
  `
}
```

### 2. マルチステッププロンプト

```typescript
// utils/multiStepPrompts.ts
export class MultiStepPromptChain {
  async executeChain(componentName: string): Promise<CompleteSpecification> {
    // ステップ1: 基本的な識別
    const identity = await this.identifyComponent(componentName)
    
    // ステップ2: タイプに基づいた詳細仕様
    const specs = await this.getDetailedSpecs(identity.type, identity.model)
    
    // ステップ3: 互換性情報
    const compatibility = await this.getCompatibility(specs)
    
    // ステップ4: 代替品の提案
    const alternatives = await this.findAlternatives(specs, compatibility)
    
    return {
      identity,
      specifications: specs,
      compatibility,
      alternatives
    }
  }
  
  private async identifyComponent(name: string): Promise<ComponentIdentity> {
    const prompt = `
      正確な部品を識別してください：
      入力: "${name}"
      
      以下を判定：
      1. メーカー
      2. 正確な型番
      3. 部品カテゴリ（MCU/センサー/アクチュエータなど）
      4. 一般的な別名やバリエーション
    `
    
    return await this.aiService.query(prompt)
  }
}
```

### 3. 検証プロンプト

```typescript
// prompts/validation.ts
export const SPECIFICATION_VALIDATION_PROMPT = `
{componentName} の以下の仕様を検証してください：
{specifications}

検証項目：
1. すべての電圧値が現実的で適切にフォーマットされているか？
2. 通信プロトコルが技術的に互換性があるか？
3. GPIOカウントが物理的パッケージと一致するか？
4. 矛盾する仕様がないか？

問題があれば、説明付きで修正値を提供してください。

応答フォーマット：
{
  "valid": true/false,
  "issues": [
    {
      "field": "voltage",
      "issue": "問題の説明",
      "suggestion": "修正値"
    }
  ],
  "correctedSpecs": { ... }
}
`
```

## プロンプト最適化

### 1. トークン効率化

```typescript
// utils/promptOptimizer.ts
export class PromptOptimizer {
  // 明確さを保ちながらプロンプトを圧縮
  compress(prompt: string): string {
    return prompt
      .replace(/\s+/g, ' ')           // 余分な空白を削除
      .replace(/(\d+)\.\s+/g, '$1) ') // 番号付けを短縮
      .replace(/提供してください/g, '提供') // 冗長な言葉を削除
      .trim()
  }
  
  // 一般的な用語の略語を使用
  abbreviate(prompt: string): string {
    const abbreviations = {
      '通信プロトコル': '通信',
      '動作電圧': '電圧',
      '汎用入出力': 'GPIO'
    }
    
    return Object.entries(abbreviations).reduce(
      (p, [full, abbr]) => p.replace(new RegExp(full, 'gi'), abbr),
      prompt
    )
  }
}
```

### 2. レスポンス形式の最適化

```typescript
// prompts/formats.ts
export const COMPACT_JSON_FORMAT = `
この正確なJSON構造を使用（余分なフィールドなし）：
{
  "v": "電圧",
  "c": "プロトコル",
  "g": GPIOカウント,
  "a": アナログカウント,
  "f": ["機能"]
}
`

export function expandCompactResponse(compact: any): ComponentSpecifications {
  return {
    voltage: compact.v,
    communication: compact.c,
    gpio: compact.g,
    analog: compact.a,
    features: compact.f
  }
}
```

### 3. プロンプト結果のキャッシング

```typescript
// utils/promptCache.ts
export class PromptResultCache {
  private cache = new Map<string, CachedResult>()
  
  getCacheKey(componentName: string, promptType: string): string {
    return `${promptType}:${componentName.toLowerCase().replace(/\s+/g, '-')}`
  }
  
  async getOrGenerate(
    componentName: string,
    promptType: string,
    generator: () => Promise<any>
  ): Promise<any> {
    const key = this.getCacheKey(componentName, promptType)
    
    // キャッシュを確認
    const cached = this.cache.get(key)
    if (cached && cached.expires > Date.now()) {
      return cached.data
    }
    
    // 新しい結果を生成
    const result = await generator()
    
    // 適切なTTLでキャッシュ
    this.cache.set(key, {
      data: result,
      expires: Date.now() + this.getTTL(promptType)
    })
    
    return result
  }
  
  private getTTL(promptType: string): number {
    // プロンプトタイプごとに異なるTTL
    const ttls: Record<string, number> = {
      'basic-specs': 7 * 24 * 60 * 60 * 1000, // 7日
      'compatibility': 24 * 60 * 60 * 1000,    // 1日
      'alternatives': 3 * 60 * 60 * 1000       // 3時間
    }
    
    return ttls[promptType] || 60 * 60 * 1000 // デフォルト1時間
  }
}
```

## カスタムプロンプトのテスト

### 1. プロンプトテストスイート

```typescript
// tests/prompts/promptQuality.test.ts
describe('プロンプト品質テスト', () => {
  const tester = new PromptTester()
  
  it('すべての必須フィールドを取得する', async () => {
    const testComponents = [
      'Arduino Uno',
      'ESP32-WROOM-32',
      'Raspberry Pi Pico'
    ]
    
    for (const component of testComponents) {
      const result = await tester.testPrompt(
        CUSTOM_COMPONENT_PROMPT,
        component
      )
      
      expect(result).toHaveProperty('voltage')
      expect(result).toHaveProperty('communication')
      expect(result.voltage).toMatch(/^\d+\.?\d*V/)
      expect(result.communication).toContain(',')
    }
  })
  
  it('曖昧な部品名を処理する', async () => {
    const ambiguous = ['Arduino', 'ESP', 'Pi']
    
    for (const name of ambiguous) {
      const result = await tester.testPrompt(
        COMPONENT_CLARIFICATION_PROMPT,
        name
      )
      
      expect(result.alternatives).toBeInstanceOf(Array)
      expect(result.alternatives.length).toBeGreaterThan(0)
    }
  })
})
```

### 2. レスポンス検証

```typescript
// utils/responseValidator.ts
export class AIResponseValidator {
  validateComponentSpecs(response: any): ValidationResult {
    const errors: string[] = []
    
    // 必須フィールドをチェック
    const required = ['voltage', 'communication', 'gpio']
    for (const field of required) {
      if (!response[field]) {
        errors.push(`必須フィールドが欠落: ${field}`)
      }
    }
    
    // 電圧フォーマットを検証
    if (response.voltage && !this.isValidVoltage(response.voltage)) {
      errors.push(`無効な電圧フォーマット: ${response.voltage}`)
    }
    
    // 通信プロトコルを検証
    if (response.communication) {
      const protocols = response.communication.split(',')
      const invalid = protocols.filter(p => !this.isKnownProtocol(p.trim()))
      if (invalid.length > 0) {
        errors.push(`不明なプロトコル: ${invalid.join(', ')}`)
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
  
  private isValidVoltage(voltage: string): boolean {
    return /^\d+\.?\d*V(\/\d+\.?\d*V)*$/.test(voltage)
  }
  
  private isKnownProtocol(protocol: string): boolean {
    const known = ['I2C', 'SPI', 'UART', 'CAN', 'USB', 'Ethernet', 'WiFi', 'Bluetooth']
    return known.includes(protocol.toUpperCase())
  }
}
```

## モニタリングと改善

### 1. プロンプトパフォーマンスメトリクス

```typescript
// utils/promptMetrics.ts
export class PromptMetrics {
  private metrics: Map<string, PromptMetric> = new Map()
  
  recordPromptResult(
    promptType: string,
    success: boolean,
    responseTime: number,
    tokenCount: number
  ): void {
    const key = promptType
    const existing = this.metrics.get(key) || this.createEmptyMetric()
    
    existing.totalCalls++
    existing.successCount += success ? 1 : 0
    existing.totalResponseTime += responseTime
    existing.totalTokens += tokenCount
    
    this.metrics.set(key, existing)
  }
  
  getMetricsSummary(): PromptMetricsSummary {
    const summary: PromptMetricsSummary = {}
    
    for (const [type, metric] of this.metrics) {
      summary[type] = {
        successRate: metric.successCount / metric.totalCalls,
        avgResponseTime: metric.totalResponseTime / metric.totalCalls,
        avgTokens: metric.totalTokens / metric.totalCalls
      }
    }
    
    return summary
  }
}
```

### 2. A/Bテスト

```typescript
// utils/promptABTesting.ts
export class PromptABTester {
  async testVariants(
    componentName: string,
    variants: PromptVariant[]
  ): Promise<ABTestResult> {
    const results = await Promise.all(
      variants.map(async variant => {
        const start = Date.now()
        const response = await this.aiService.query(variant.prompt)
        const elapsed = Date.now() - start
        
        return {
          variant: variant.name,
          response,
          responseTime: elapsed,
          quality: await this.assessQuality(response)
        }
      })
    )
    
    return {
      winner: this.selectWinner(results),
      results
    }
  }
}
```

## ベストプラクティス（推奨事項）

### 1. 明確性
期待する形式と内容を明確に指定する

### 2. 例の提供
複雑な形式を扱う場合はプロンプトに例を含める

### 3. 制約の指定
検証ルールや制約を明記する

### 4. コンテキストの提供
システムや使用例に関する関連コンテキストを提供する

### 5. 反復的改善
実際の結果に基づいてプロンプトをテスト・改良する

### 6. フォールバック
プライマリプロンプトが失敗した場合のフォールバックを用意する

### 7. モニタリング
プロンプトのパフォーマンスを追跡し、時間とともに改善する

## よくある質問

### Q: プロンプトが長すぎてトークン制限に引っかかります
A: プロンプト最適化セクションの圧縮技術を使用してください。

### Q: 日本語と英語、どちらのプロンプトが良いですか？
A: 技術用語は英語の方が正確ですが、説明は日本語の方が理解しやすいです。ハイブリッドアプローチがおすすめです。

### Q: プロンプトの効果をどう測定しますか？
A: 成功率、レスポンスタイム、トークン使用量をメトリクスとして追跡してください。