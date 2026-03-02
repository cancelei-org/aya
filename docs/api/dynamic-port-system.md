# 動的ポートシステム APIドキュメント

## 概要

動的ポートシステムは、複雑な電子部品のポート（接続端子）を柔軟に生成・管理するための機能です。AIから取得した部品仕様や手動設定に基づいて、適切なポートを自動的に生成します。

### 🎯 このシステムでできること
- 部品の仕様から自動的にポートを生成
- I2C、SPI、UARTなどの通信ポートを適切に配置
- ポートの接続数制限を管理
- 複雑な部品でも見やすくポートを表示

## 主要なコンポーネント

### DynamicPortSystem（動的ポートシステム）

動的ポートを生成・管理するメインクラスです。

```typescript
import { DynamicPortSystem } from '@/utils/dynamicPortSystem'

const portSystem = new DynamicPortSystem()
```

#### メソッド（使える機能）

##### generatePortConfiguration(specifications: ComponentSpecifications): DynamicPortConfiguration

部品の仕様から完全なポート構成を生成します。

**パラメータ（引数）:**
- `specifications`: 部品の仕様（電圧、通信プロトコル、GPIOピン数など）

**戻り値:**
- `DynamicPortConfiguration`: 生成されたすべてのポートを含む構成

**使用例:**
```typescript
// ESP32のポートを生成する例
const specs = {
  voltage: '3.3V/5V',           // 対応電圧
  communication: 'I2C,SPI,UART', // 通信方式
  gpio: 40,                     // GPIOピン数
  analog: 16,                   // アナログピン数
  pwm: true                     // PWM対応
}

const portConfig = portSystem.generatePortConfiguration(specs)
// 結果: 電源、通信、GPIO、アナログなど60以上のポートが生成される
```

##### classifyPorts(ports: PortDefinition[]): PortGroups

ポートをタイプや特性ごとにグループ分けします。

**パラメータ:**
- `ports`: ポート定義の配列

**戻り値:**
- `PortGroups`: タイプ別（電源、通信、デジタル、アナログ）に整理されたポート

### DynamicPortLayoutManager（ポートレイアウトマネージャー）

動的ポートレイアウトを描画するReactコンポーネントです。

```tsx
import { DynamicPortLayoutManager } from '@/components/nodes/DynamicPortLayoutManager'

<DynamicPortLayoutManager
  nodeId="esp32"
  portConfig={portConfig}
  displayMode="expanded"
  onPortClick={handlePortClick}
/>
```

#### プロパティ（Props）

| プロパティ | 型 | 必須 | 説明 |
|---------|---|-----|------|
| nodeId | string | はい | ノードの一意な識別子 |
| portConfig | DynamicPortConfiguration | はい | 描画するポート構成 |
| displayMode | 'compact' \| 'expanded' \| 'detailed' | いいえ | 表示モード（デフォルト: 'compact'） |
| connectedPorts | string[] | いいえ | 現在接続されているポートのID |
| portCapacityStatus | Record<string, CapacityStatus> | いいえ | ポート容量の使用状況 |
| onPortClick | (port: PortDefinition) => void | いいえ | ポートクリック時の処理 |

### PortLimitManager（ポート制限マネージャー）

ポートの接続制限と容量を管理します。

```typescript
import { PortLimitManager } from '@/utils/portLimitManager'

const limitManager = new PortLimitManager()
```

#### メソッド

##### checkConnectionLimit(port: PortDefinition, currentConnections: number): boolean

ポートがさらに接続を受け入れられるかチェックします。

**パラメータ:**
- `port`: チェックするポート定義
- `currentConnections`: 現在の接続数

**戻り値:**
- `boolean`: 接続可能ならtrue

##### getPortCapacity(port: PortDefinition): number

ポートの最大容量を取得します。

**パラメータ:**
- `port`: ポート定義

**戻り値:**
- `number`: 最大接続数（無制限の場合は-1）

## 型定義（データの形式）

### DynamicPortConfiguration（動的ポート構成）

```typescript
interface DynamicPortConfiguration {
  ports: PortDefinition[]        // すべてのポート定義
  groups: PortGroups            // グループ別に整理されたポート
  layout: 'grid' | 'linear' | 'custom'  // レイアウトタイプ
  expandable: boolean           // 展開可能かどうか
  metadata?: {
    totalPorts: number         // 総ポート数
    powerPorts: number         // 電源ポート数
    communicationPorts: number // 通信ポート数
    gpioPorts: number          // GPIOポート数
  }
}
```

### PortDefinition（ポート定義）

```typescript
interface PortDefinition {
  id: string                   // 一意なID
  name: string                 // ポート名（例: "D0", "SDA"）
  type: 'power' | 'communication' | 'digital' | 'analog'  // ポートタイプ
  direction: 'input' | 'output' | 'bidirectional'        // 信号の方向
  position: 'top' | 'right' | 'bottom' | 'left'          // 表示位置
  protocol?: string            // 通信プロトコル（I2C、SPIなど）
  voltage?: string             // 電圧レベル
  capacity: number             // 最大接続数
  metadata?: {
    pwmCapable?: boolean       // PWM対応
    interruptCapable?: boolean // 割り込み対応
    resolution?: string        // 分解能（アナログの場合）
    maxVoltage?: string        // 最大電圧（アナログの場合）
  }
}
```

### PortGroups（ポートグループ）

```typescript
interface PortGroups {
  power: PortDefinition[]         // 電源ポート
  communication: PortDefinition[] // 通信ポート
  digital: PortDefinition[]       // デジタルポート
  analog: PortDefinition[]        // アナログポート
  [key: string]: PortDefinition[] // その他のカスタムグループ
}
```

## 使用例

### 基本的なポート生成

```typescript
// ESP32のポートを生成
const esp32Specs = {
  voltage: '3.3V',
  communication: 'I2C,SPI,UART,WiFi,Bluetooth',
  gpio: 36,
  analog: 18,
  pwm: true
}

const portSystem = new DynamicPortSystem()
const portConfig = portSystem.generatePortConfiguration(esp32Specs)

// 結果: タイプ別に整理された60以上のポート
```

### ポート管理を含む複雑なコンポーネント

```tsx
function ComplexComponent({ nodeId, specifications }) {
  const [portConfig] = useState(() => 
    portSystem.generatePortConfiguration(specifications)
  )
  const [displayMode, setDisplayMode] = useState('compact')
  const [connectedPorts, setConnectedPorts] = useState<string[]>([])
  
  const handlePortClick = (port: PortDefinition) => {
    // 接続可能かチェック
    if (limitManager.checkConnectionLimit(port, getConnectionCount(port))) {
      // 接続処理
      connectPort(port)
    } else {
      // 容量警告を表示
      showWarning(`ポート ${port.name} は容量いっぱいです`)
    }
  }
  
  return (
    <DynamicPortLayoutManager
      nodeId={nodeId}
      portConfig={portConfig}
      displayMode={displayMode}
      connectedPorts={connectedPorts}
      onPortClick={handlePortClick}
    />
  )
}
```

### ポート制限のチェック

```typescript
// I2Cポートの制限チェック
const i2cPort: PortDefinition = {
  id: 'sda',
  name: 'SDA',
  type: 'communication',
  protocol: 'I2C',
  capacity: 127 // I2Cは最大127デバイスまでサポート
}

const canConnect = limitManager.checkConnectionLimit(i2cPort, 50) // true
const overLimit = limitManager.checkConnectionLimit(i2cPort, 130) // false

// 電源ポートの制限チェック
const powerPort: PortDefinition = {
  id: '3v3',
  name: '3.3V',
  type: 'power',
  direction: 'output',
  capacity: 10 // 10個まで接続可能
}

const powerAvailable = limitManager.checkConnectionLimit(powerPort, 8) // true
```

## ベストプラクティス（推奨事項）

### 1. ポート生成
- 生成前に仕様を検証する
- 各ポートタイプに適切な容量制限を設定
- 特殊機能（PWM、割り込み）のメタデータを含める

### 2. レイアウト管理
- 複雑な部品はコンパクトモードから始める
- 詳細な作業には展開モードを使用
- 20以上のポートがある場合は検索/フィルター機能を実装

### 3. 接続管理
- 接続前に必ずポート制限をチェック
- 容量の問題は明確にフィードバック
- 接続状態を正確に追跡

### 4. パフォーマンス
- ポートコンポーネントにはReact.memoを使用
- 50以上のポートには仮想化を実装
- 可能な限りポート更新をバッチ処理

## エラー処理

```typescript
try {
  const portConfig = portSystem.generatePortConfiguration(specs)
} catch (error) {
  if (error instanceof InvalidSpecificationError) {
    // 無効な仕様の処理
    console.error('無効な仕様:', error.message)
  } else if (error instanceof PortGenerationError) {
    // 生成失敗の処理
    console.error('ポート生成に失敗:', error.message)
  }
}
```

## 移行ガイド

### 静的ポートから動的ポートへ

```typescript
// 古い静的アプローチ
const arduinoPorts = [
  { id: 'd0', label: 'D0' },
  { id: 'd1', label: 'D1' },
  // ... 手動で定義
]

// 新しい動的アプローチ
const arduinoSpecs = {
  voltage: '5V',
  communication: 'I2C,SPI,UART',
  gpio: 14,
  analog: 6,
  pwm: true
}

const portConfig = portSystem.generatePortConfiguration(arduinoSpecs)
// 適切なタイプと制限を持つすべてのポートが自動生成される
```

## よくある質問

### Q: ポートが多すぎて見づらいです
A: `displayMode`を`'compact'`に設定して、グループごとに折りたたんで表示できます。

### Q: 特定のポートだけを表示したい
A: `portConfig.groups`を使って、必要なグループのポートだけを抽出できます。

### Q: カスタムポートタイプを追加できますか？
A: はい、`extending-port-system.md`ドキュメントを参照してください。

### Q: ポートの色や見た目を変更できますか？
A: CSSクラスやカスタムレンダラーを使って自由にカスタマイズできます。