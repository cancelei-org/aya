# AI統合システム APIドキュメント

## 概要

AI統合システムは、OpenAI GPTモデルを使って電子部品の仕様を自動的に取得したり、部品同士の互換性をチェックしたり、部品選択を支援する機能を提供します。

### 🎯 このシステムでできること
- 部品名を入力するだけで、電圧や通信方式などの仕様を自動取得
- 2つの部品が接続可能かどうかを自動チェック
- 代替部品の提案
- 仕様の信頼度スコア表示

## 主要なコンポーネント

### AISpecificationService（AI仕様サービス）

AIを使って部品の仕様を検索するメインサービスです。

```typescript
import { AISpecificationService } from '@/utils/aiSpecificationService'

const aiService = new AISpecificationService()
```

#### メソッド（使える機能）

##### searchComponentSpecifications(componentName: string, options?: SearchOptions): Promise<AISearchResult>

部品の仕様をAIで検索します。

**パラメータ（引数）:**
- `componentName`: 検索したい部品の名前（例：「ESP32 DevKit」）
- `options`: オプション設定（省略可能）

**戻り値:**
- `Promise<AISearchResult>`: 検索結果（仕様と信頼度スコアを含む）

**使用例:**
```typescript
// ESP32の仕様を検索する例
const result = await aiService.searchComponentSpecifications('ESP32 DevKit', {
  includeAlternatives: true,  // 代替部品も含める
  maxResults: 5              // 最大5件まで結果を取得
})

// 結果の確認
console.log(result.specifications) 
// 出力例: { voltage: '3.3V', communication: 'I2C,SPI,UART,WiFi,Bluetooth', ... }

console.log(result.confidence) 
// 出力例: 0.92 (92%の信頼度)
```

##### validateSpecifications(specs: ComponentSpecifications): ValidationResult

取得した仕様が正しいかどうかを検証します。

**パラメータ:**
- `specs`: 検証したい部品仕様

**戻り値:**
- `ValidationResult`: 検証結果（問題があれば詳細も含む）

### AISearchOptimizer（AI検索最適化）

複数の部品を効率的に検索するための機能です。

```typescript
import { AISearchOptimizer } from '@/utils/aiSearchOptimizer'

const optimizer = new AISearchOptimizer()
```

#### メソッド

##### batchSearch(components: string[]): Promise<Map<string, AISearchResult>>

複数の部品をまとめて検索します。

**パラメータ:**
- `components`: 部品名の配列

**戻り値:**
- `Promise<Map<string, AISearchResult>>`: 部品名と結果の対応表

**使用例:**
```typescript
// 複数の部品をまとめて検索
const results = await optimizer.batchSearch([
  'Arduino Uno',
  'Raspberry Pi 4',
  'ESP8266'
])

// 各部品の結果を表示
results.forEach((result, component) => {
  console.log(`${component}: 信頼度${result.confidence}`)
})
```

### ReliabilityScoreCalculator（信頼度スコア計算）

AIが取得したデータの信頼度を計算します。

```typescript
import { calculateReliabilityScore } from '@/utils/aiSpecificationService'

const score = calculateReliabilityScore(searchResult)
```

## 型定義（データの形式）

### AISearchResult（検索結果）

```typescript
interface AISearchResult {
  componentName: string           // 部品名
  specifications: ComponentSpecifications  // 仕様詳細
  confidence: number             // 信頼度（0～1の値）
  sources: InformationSource[]   // 情報源
  alternativeComponents?: AlternativeComponent[]  // 代替部品候補
  metadata: {
    searchTime: number          // 検索にかかった時間（ミリ秒）
    modelUsed: string          // 使用したAIモデル
    tokensUsed: number         // 使用したトークン数
  }
}
```

### ComponentSpecifications（部品仕様）

```typescript
interface ComponentSpecifications {
  voltage?: string         // 電圧（例: "3.3V", "5V"）
  current?: string         // 電流（例: "500mA"）
  communication?: string   // 通信方式（例: "I2C,SPI,UART"）
  gpio?: number           // GPIO（汎用入出力）ピン数
  analog?: number         // アナログピン数
  pwm?: boolean          // PWM対応かどうか
  wifi?: boolean         // Wi-Fi対応かどうか
  bluetooth?: boolean    // Bluetooth対応かどうか
  operatingTemp?: string // 動作温度範囲
  dimensions?: string    // 寸法
  [key: string]: any     // その他の仕様
}
```

### InformationSource（情報源）

```typescript
interface InformationSource {
  type: 'official' | 'github' | 'forum' | 'other'  // 情報源の種類
  url: string                                       // URL
  reliability: number                               // 信頼度（0～1）
  lastUpdated?: Date                               // 最終更新日
}
```

### SearchOptions（検索オプション）

```typescript
interface SearchOptions {
  includeAlternatives?: boolean  // 代替部品を含めるか
  maxResults?: number           // 最大結果数
  minConfidence?: number        // 最小信頼度（0～1）
  language?: string             // 言語（'ja'で日本語）
  useCache?: boolean            // キャッシュを使うか
  timeout?: number              // タイムアウト時間（ミリ秒）
}
```

## 設定

### 環境変数

```bash
# 必須
OPENAI_API_KEY=your-api-key  # OpenAIのAPIキー

# オプション
OPENAI_MODEL=gpt-5  # 使用するモデル
OPENAI_max_completion_tokens=2000            # 最大トークン数
OPENAI_TEMPERATURE=0.3            # 応答の多様性（0～1）
AI_SEARCH_TIMEOUT=30000           # タイムアウト（ミリ秒）
```

### APIレート制限の設定

```typescript
// レート制限を設定
aiService.configure({
  maxRequestsPerMinute: 100,      // 1分あたりの最大リクエスト数
  maxTokensPerMinute: 40000,      // 1分あたりの最大トークン数
  retryAttempts: 3,               // リトライ回数
  retryDelay: 1000               // リトライ間隔（ミリ秒）
})
```

## 使用例

### 基本的な部品検索

```typescript
async function searchComponent(name: string) {
  try {
    // 部品の仕様を検索
    const result = await aiService.searchComponentSpecifications(name)
    
    // 信頼度が70%以上なら使用
    if (result.confidence >= 0.7) {
      return result.specifications
    } else {
      // 信頼度が低い場合は警告
      console.warn(`信頼度が低いです (${result.confidence}) - ${name}`)
      return null
    }
  } catch (error) {
    console.error('AI検索に失敗しました:', error)
    // エラー時はキャッシュや手動入力にフォールバック
    return getCachedSpecifications(name)
  }
}
```

### 進捗表示付きバッチ処理

```typescript
async function processBatchWithProgress(components: string[]) {
  const optimizer = new AISearchOptimizer()
  const results = new Map<string, AISearchResult>()
  
  // 進捗更新を受け取る
  optimizer.on('progress', (progress) => {
    console.log(`処理中: ${progress.completed}/${progress.total}`)
  })
  
  try {
    // バッチで検索実行
    const batchResults = await optimizer.batchSearch(components)
    return batchResults
  } catch (error) {
    console.error('バッチ処理に失敗しました:', error)
    // 個別処理にフォールバック
    for (const component of components) {
      try {
        const result = await aiService.searchComponentSpecifications(component)
        results.set(component, result)
      } catch (err) {
        console.error(`${component}の処理に失敗:`, err)
      }
    }
    return results
  }
}
```

### キャッシュ統合

```typescript
import { redisCacheService } from '@/utils/redisCacheService'

async function searchWithCache(componentName: string) {
  // まずキャッシュを確認
  const cacheKey = `ai-spec:${componentName}`
  const cached = await redisCacheService.get(cacheKey)
  
  // 7日以内のキャッシュがあれば使用
  if (cached && cached.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000) {
    console.log('キャッシュを使用します')
    return cached.data
  }
  
  // AI検索を実行
  const result = await aiService.searchComponentSpecifications(componentName)
  
  // 結果をキャッシュに保存
  await redisCacheService.set(cacheKey, {
    data: result,
    timestamp: Date.now()
  }, 7 * 24 * 60 * 60) // 7日間保存
  
  return result
}
```

### 手動AI検索トリガー

```typescript
import { ManualAISearch } from '@/components/ManualAISearch'

function ComponentSelector() {
  const [selectedComponent, setSelectedComponent] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  
  const handleManualSearch = async (componentName: string) => {
    setIsSearching(true)
    try {
      const result = await aiService.searchComponentSpecifications(componentName, {
        minConfidence: 0.8,
        includeAlternatives: true
      })
      
      if (result.confidence >= 0.8) {
        setSelectedComponent(result)
      } else {
        // 代替部品を表示
        showAlternativeComponents(result.alternativeComponents)
      }
    } finally {
      setIsSearching(false)
    }
  }
  
  return (
    <ManualAISearch
      onSearch={handleManualSearch}
      isSearching={isSearching}
    />
  )
}
```

## エラー処理

### よくあるエラーの種類

```typescript
// APIキーの問題
class APIKeyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'APIKeyError'
  }
}

// レート制限
class RateLimitError extends Error {
  constructor(public retryAfter: number) {
    super(`レート制限を超えました。${retryAfter}ミリ秒後に再試行してください`)
    this.name = 'RateLimitError'
  }
}

// 無効なレスポンス
class InvalidAIResponseError extends Error {
  constructor(public response: any) {
    super('AIからの応答形式が無効です')
    this.name = 'InvalidAIResponseError'
  }
}
```

### エラー処理の例

```typescript
async function robustAISearch(componentName: string) {
  const maxRetries = 3
  let lastError: Error
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await aiService.searchComponentSpecifications(componentName)
    } catch (error) {
      lastError = error
      
      if (error instanceof APIKeyError) {
        // APIキーの問題は再試行しない
        throw error
      }
      
      if (error instanceof RateLimitError) {
        // レート制限の場合は待機
        await new Promise(resolve => setTimeout(resolve, error.retryAfter))
        continue
      }
      
      if (error instanceof InvalidAIResponseError) {
        // 無効な応答はログを残して再試行
        console.error('無効な応答:', error.response)
        continue
      }
      
      // その他のエラーは指数バックオフで再試行
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}
```

## ベストプラクティス（推奨事項）

### 1. APIキーのセキュリティ
- APIキーをクライアント側のコードに直接書かない
- 環境変数を使用する
- 定期的にキーをローテーションする

### 2. レート制限の管理
- リクエストをキューイングする
- 指数バックオフを実装する
- 使用状況をモニタリングする

### 3. レスポンスの検証
- AIからの応答を必ず検証する
- フォールバック機構を用意する
- 予期しない形式はログに記録する

### 4. キャッシュ戦略
- 成功した結果をキャッシュする
- 適切な有効期限を設定する
- オフライン時も考慮する

### 5. ユーザー体験
- 検索の進捗を表示する
- わかりやすいエラーメッセージを表示する
- 手動での上書きを許可する

## モニタリングとデバッグ

### 使用状況メトリクス

```typescript
const metrics = aiService.getMetrics()
console.log({
  totalRequests: metrics.totalRequests,        // 総リクエスト数
  successRate: metrics.successRate,            // 成功率
  averageLatency: metrics.averageLatency,      // 平均レイテンシ
  cacheHitRate: metrics.cacheHitRate          // キャッシュヒット率
})
```

### デバッグモード

```typescript
// デバッグログを有効化
aiService.setDebugMode(true)

// デバッグイベントをリッスン
aiService.on('debug', (event) => {
  console.log('AIデバッグ:', event)
})
```

## トラブルシューティング

### よくある問題

#### 1. 「APIキーが無効です」
- OPENAI_API_KEYが正しく設定されているか確認
- キーの権限を確認
- キーの有効期限を確認

#### 2. 「レート制限を超えました」
- リクエストキューイングを実装
- リクエスト頻度を減らす
- APIプランのアップグレードを検討

#### 3. 「信頼度が低い結果」
- より具体的な部品名を使用
- 部品が十分に文書化されているか確認
- 手動での仕様入力を検討

#### 4. 「タイムアウトエラー」
- タイムアウト設定を増やす
- ネットワーク接続を確認
- リトライロジックを実装