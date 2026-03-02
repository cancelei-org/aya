# 動的ポートシステム拡張ガイド

## 概要

このガイドでは、動的ポートシステムを拡張して新しい部品タイプ、ポート構成、カスタム動作をサポートする方法を説明します。

### 🎯 このガイドでできること
- 新しい部品タイプの追加（例：ロボットアーム、センサーモジュール）
- カスタムポートタイプの作成（例：CANバス、RS485）
- ポートグループの実装
- 高度なポート機能の追加

## 新しい部品タイプの追加

### 1. 部品仕様の定義

新しい部品タイプのための仕様インターフェースを作成します：

```typescript
// types/specifications/roboticArm.ts
export interface RoboticArmSpecifications extends ComponentSpecifications {
  motors: number              // モーター数
  encoders: number           // エンコーダー数
  limitSwitches: number      // リミットスイッチ数
  powerRequirement: string   // 電力要件
  controlProtocol: 'PWM' | 'CAN' | 'Serial'  // 制御プロトコル
  feedbackType: 'Encoder' | 'Potentiometer' | 'Both'  // フィードバックタイプ
}
```

### 2. ポート生成ロジックの実装

DynamicPortSystemに生成ロジックを追加します：

```typescript
// utils/dynamicPortSystem.ts
private generateRoboticArmPorts(specs: RoboticArmSpecifications): PortDefinition[] {
  const ports: PortDefinition[] = []
  
  // モーター制御ポート
  for (let i = 0; i < specs.motors; i++) {
    // PWM制御ポート
    ports.push({
      id: `motor-${i}-pwm`,
      name: `モーター${i + 1} PWM`,
      type: 'digital',
      direction: 'output',
      protocol: 'PWM',
      position: 'left',
      capacity: 1,
      metadata: {
        pwmCapable: true,
        frequency: '1-20kHz'
      }
    })
    
    // 方向制御ポート
    ports.push({
      id: `motor-${i}-dir`,
      name: `モーター${i + 1} 方向`,
      type: 'digital',
      direction: 'output',
      position: 'left',
      capacity: 1
    })
  }
  
  // エンコーダー入力
  for (let i = 0; i < specs.encoders; i++) {
    // A相入力
    ports.push({
      id: `encoder-${i}-a`,
      name: `エンコーダー${i + 1} A相`,
      type: 'digital',
      direction: 'input',
      position: 'right',
      capacity: 1,
      metadata: {
        interruptCapable: true  // 割り込み対応
      }
    })
    
    // B相入力
    ports.push({
      id: `encoder-${i}-b`,
      name: `エンコーダー${i + 1} B相`,
      type: 'digital',
      direction: 'input',
      position: 'right',
      capacity: 1,
      metadata: {
        interruptCapable: true
      }
    })
  }
  
  return ports
}
```

### 3. 部品タイプの登録

新しいタイプをコンポーネントレジストリに追加します：

```typescript
// utils/componentRegistry.ts
export const ComponentTypes = {
  MICROCONTROLLER: 'microcontroller',
  SENSOR: 'sensor',
  ACTUATOR: 'actuator',
  ROBOTIC_ARM: 'robotic_arm', // 新しいタイプ
  // ...
} as const

export const ComponentGenerators: Record<string, PortGenerator> = {
  [ComponentTypes.ROBOTIC_ARM]: generateRoboticArmPorts,
  // ...
}
```

## カスタムポートタイプの作成

### 1. ポートタイプの定義

```typescript
// types/ports/canBus.ts
export interface CANBusPort extends PortDefinition {
  type: 'communication'
  protocol: 'CAN'
  baudRate: number           // ボーレート
  termination: boolean       // 終端抵抗
  metadata: {
    canVersion: '2.0A' | '2.0B' | 'FD'  // CANバージョン
    maxNodes: number                     // 最大ノード数
  }
}
```

### 2. ポート動作の実装

```typescript
// utils/portBehaviors/canBusPort.ts
export class CANBusPortBehavior implements PortBehavior {
  validateConnection(
    sourcePort: CANBusPort,
    targetPort: CANBusPort
  ): ValidationResult {
    // CAN互換性をチェック
    if (sourcePort.baudRate !== targetPort.baudRate) {
      return {
        valid: false,
        error: 'CANバスのボーレートが一致しません',
        suggestion: `両方を ${sourcePort.baudRate} または ${targetPort.baudRate} に設定してください`
      }
    }
    
    // 終端抵抗をチェック
    const terminatedPorts = this.getTerminatedPorts()
    if (terminatedPorts.length > 2) {
      return {
        valid: false,
        error: 'CANバスは終端抵抗を2つまでしか持てません',
        suggestion: '余分な終端抵抗を削除してください'
      }
    }
    
    return { valid: true }
  }
  
  getConnectionLimit(port: CANBusPort): number {
    return port.metadata.maxNodes
  }
}
```

### 3. カスタムレンダリングの登録

```typescript
// components/ports/CANBusPortRenderer.tsx
export const CANBusPortRenderer: React.FC<PortRendererProps> = ({ 
  port, 
  isConnected,
  connectionCount 
}) => {
  const canPort = port as CANBusPort
  
  return (
    <div className={`
      port can-bus-port
      ${isConnected ? 'connected' : ''}
      ${canPort.termination ? 'terminated' : ''}
    `}>
      <div className="port-icon">🚌</div>
      <div className="port-label">{port.name}</div>
      <div className="port-info">
        {canPort.baudRate / 1000}k
        {connectionCount > 0 && ` (${connectionCount}/${canPort.metadata.maxNodes})`}
      </div>
    </div>
  )
}
```

## ポートグループの実装

### 1. グループ構造の定義

```typescript
// types/portGroups.ts
export interface PortGroupDefinition {
  id: string
  name: string
  type: 'exclusive' | 'shared' | 'virtual'  // グループタイプ
  ports: string[]                           // ポートID配列
  constraints?: GroupConstraints             // 制約条件
}

export interface GroupConstraints {
  maxActive?: number      // 最大アクティブ数
  requiresAll?: boolean   // すべて必要か
  mutex?: string[]       // 相互排他的なグループ
}
```

### 2. グループロジックの実装

```typescript
// utils/portGroupManager.ts
export class PortGroupManager {
  private groups: Map<string, PortGroupDefinition> = new Map()
  
  addGroup(group: PortGroupDefinition): void {
    this.groups.set(group.id, group)
  }
  
  validateGroupConnection(
    groupId: string,
    portId: string,
    currentConnections: Connection[]
  ): ValidationResult {
    const group = this.groups.get(groupId)
    if (!group) return { valid: false, error: 'グループが見つかりません' }
    
    // 排他的グループのチェック
    if (group.type === 'exclusive') {
      const otherConnected = group.ports.some(
        p => p !== portId && this.isPortConnected(p, currentConnections)
      )
      
      if (otherConnected) {
        return {
          valid: false,
          error: 'このグループでは1つのポートのみ接続可能です',
          suggestion: 'グループ内の他のポートを先に切断してください'
        }
      }
    }
    
    // 相互排他チェック
    if (group.constraints?.mutex) {
      for (const mutexGroupId of group.constraints.mutex) {
        if (this.isGroupActive(mutexGroupId, currentConnections)) {
          return {
            valid: false,
            error: `${mutexGroupId} がアクティブな時は ${group.name} を使用できません`
          }
        }
      }
    }
    
    return { valid: true }
  }
}
```

### 3. UI統合

```typescript
// components/PortGroupSelector.tsx
export const PortGroupSelector: React.FC<{
  groups: PortGroupDefinition[]
  onSelect: (group: PortGroupDefinition) => void
}> = ({ groups, onSelect }) => {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  
  return (
    <div className="port-group-selector">
      {groups.map(group => (
        <div 
          key={group.id}
          className={`
            port-group
            ${selectedGroup === group.id ? 'selected' : ''}
            ${group.type}
          `}
          onClick={() => {
            setSelectedGroup(group.id)
            onSelect(group)
          }}
        >
          <h4>{group.name}</h4>
          <div className="group-type">{group.type}</div>
          <div className="port-count">{group.ports.length} ポート</div>
        </div>
      ))}
    </div>
  )
}
```

## 高度なポート機能

### 1. 動的ポート作成

実行時にポートを作成できるようにします：

```typescript
// utils/dynamicPortCreation.ts
export class DynamicPortCreator {
  createPortAtRuntime(
    nodeId: string,
    portSpec: Partial<PortDefinition>
  ): PortDefinition {
    const port: PortDefinition = {
      id: `${nodeId}-dynamic-${Date.now()}`,
      name: portSpec.name || '動的ポート',
      type: portSpec.type || 'digital',
      direction: portSpec.direction || 'bidirectional',
      position: this.calculateOptimalPosition(nodeId),
      capacity: portSpec.capacity || 1,
      ...portSpec
    }
    
    // UIアップデートのためのイベント発行
    eventBus.emit('port-created', { nodeId, port })
    
    return port
  }
  
  private calculateOptimalPosition(nodeId: string): PortPosition {
    // 既存ポートに基づいて最適な位置を計算
    const existingPorts = this.getNodePorts(nodeId)
    const sideCounts = this.countPortsBySide(existingPorts)
    
    // 最もポートが少ない側を返す
    return Object.entries(sideCounts)
      .sort(([, a], [, b]) => a - b)[0][0] as PortPosition
  }
}
```

### 2. ポートアダプター

ポートタイプ間の変換を作成します：

```typescript
// utils/portAdapters.ts
export interface PortAdapter {
  id: string
  name: string
  fromType: PortType
  toType: PortType
  convert: (data: any) => any
  validateConversion: (from: PortDefinition, to: PortDefinition) => boolean
}

export const I2CToSPIAdapter: PortAdapter = {
  id: 'i2c-to-spi',
  name: 'I2C → SPI ブリッジ',
  fromType: { type: 'communication', protocol: 'I2C' },
  toType: { type: 'communication', protocol: 'SPI' },
  
  validateConversion(from, to) {
    // 変換が可能かチェック
    return from.voltage === to.voltage
  },
  
  convert(data) {
    // I2CデータフォーマットをSPIに変換
    return {
      ...data,
      chipSelect: true,
      clockPolarity: 0,
      clockPhase: 0
    }
  }
}
```

### 3. ポートテンプレート

再利用可能なポート構成を定義します：

```typescript
// templates/portTemplates.ts
export const PortTemplates = {
  UART_DEBUG: {
    ports: [
      { id: 'tx', name: 'TX', type: 'communication', direction: 'output' },
      { id: 'rx', name: 'RX', type: 'communication', direction: 'input' }
    ],
    group: { type: 'exclusive', name: 'デバッグUART' }
  },
  
  MOTOR_DRIVER: {
    ports: [
      { id: 'pwm', name: 'PWM', type: 'digital', direction: 'output', metadata: { pwmCapable: true } },
      { id: 'dir', name: '方向', type: 'digital', direction: 'output' },
      { id: 'enable', name: '有効化', type: 'digital', direction: 'output' },
      { id: 'fault', name: '故障', type: 'digital', direction: 'input' }
    ],
    group: { type: 'shared', name: 'モーター制御' }
  }
}

// テンプレートを適用
export function applyPortTemplate(
  nodeId: string,
  templateName: keyof typeof PortTemplates
): PortDefinition[] {
  const template = PortTemplates[templateName]
  return template.ports.map(portSpec => ({
    ...portSpec,
    id: `${nodeId}-${portSpec.id}`
  }))
}
```

## ポート拡張のテスト

### ユニットテスト

```typescript
// tests/ports/customPort.test.ts
describe('カスタムポート動作', () => {
  const portManager = new PortGroupManager()
  
  beforeEach(() => {
    portManager.addGroup({
      id: 'spi-group',
      name: 'SPIバス',
      type: 'exclusive',
      ports: ['mosi', 'miso', 'sck', 'cs']
    })
  })
  
  it('排他的グループ制約を強制する', () => {
    const connections = [
      { source: 'node1', sourceHandle: 'mosi', target: 'node2', targetHandle: 'mosi' }
    ]
    
    const result = portManager.validateGroupConnection(
      'spi-group',
      'miso',
      connections
    )
    
    expect(result.valid).toBe(false)
    expect(result.error).toContain('1つのポートのみ')
  })
})
```

### 統合テスト

```typescript
// tests/integration/portSystem.test.ts
describe('ポートシステム統合', () => {
  it('カスタム部品のポートを生成する', async () => {
    const specs: RoboticArmSpecifications = {
      motors: 6,
      encoders: 6,
      limitSwitches: 12,
      powerRequirement: '24V/10A',
      controlProtocol: 'CAN',
      feedbackType: 'Encoder'
    }
    
    const portSystem = new DynamicPortSystem()
    const config = portSystem.generatePortConfiguration(specs)
    
    expect(config.ports).toHaveLength(36) // 6*2 モーター + 6*2 エンコーダー + 12 リミット
    expect(config.groups.power).toHaveLength(2) // 電源とグランド
    expect(config.groups.communication).toHaveLength(2) // CAN HとCAN L
  })
})
```

## ベストプラクティス（推奨事項）

### 1. 型安全性
カスタムポートには必ず適切なTypeScriptインターフェースを定義する

### 2. 検証
カスタムポート接続の徹底的な検証を実装する

### 3. ドキュメント
ポートの動作と制約を明確に文書化する

### 4. テスト
カスタムポートロジックの包括的なテストを作成する

### 5. パフォーマンス
大量のポートを扱う場合のパフォーマンスへの影響を考慮する

### 6. 後方互換性
拡張が既存機能を壊さないことを確認する

## よくある質問

### Q: 既存のポートタイプを変更できますか？
A: 既存のポートタイプは後方互換性のため変更しないでください。代わりに新しいポートタイプを作成してください。

### Q: 1つの部品に何個までポートを追加できますか？
A: 技術的な制限はありませんが、UIの使いやすさを考慮して50個程度に抑えることを推奨します。

### Q: ポートの色やアイコンをカスタマイズできますか？
A: はい、カスタムレンダラーを実装することで自由にカスタマイズできます。

### Q: 動的に作成したポートは保存されますか？
A: デフォルトでは保存されません。永続化が必要な場合は、保存ロジックを実装する必要があります。