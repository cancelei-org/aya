// 汎用的なコンポーネント自動命名システム

interface ComponentInstance {
  id: string
  title: string
  basePartId?: string
  instanceName?: string
  modelNumber?: string
  voltage?: string
  communication?: string
  description?: string
  purchaseSiteLink?: string
}

/**
 * ベース部品名から次の個別名を生成
 * 例: "Motor" → "Motor A", "Motor B", etc.
 */
export function generateInstanceName(baseName: string, existingNames: string[]): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  
  // A-Zで命名を試行
  for (let i = 0; i < alphabet.length; i++) {
    const candidateName = `${baseName} ${alphabet[i]}`
    if (!existingNames.includes(candidateName)) {
      return candidateName
    }
  }
  
  // 26個以上の場合は数字を使用
  let counter = 1
  while (existingNames.includes(`${baseName} ${counter}`)) {
    counter++
  }
  return `${baseName} ${counter}`
}

/**
 * ベース部品IDを生成（重複のない一意なID）
 */
export function generateBasePartId(partName: string): string {
  return `base-${partName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`
}

/**
 * 同じベース部品の個別インスタンスIDを生成
 */
export function generateInstanceId(basePartId: string, instanceIndex: number): string {
  return `${basePartId}-instance-${instanceIndex}`
}

/**
 * 既存のコンポーネントから同じベース部品のインスタンス名を取得
 */
export function getExistingInstanceNames(
  components: ComponentInstance[], 
  basePartId: string
): string[] {
  return components
    .filter(comp => comp.basePartId === basePartId)
    .map(comp => comp.instanceName || comp.title)
    .filter(name => name) // undefined を除外
}

/**
 * 複数の同じ部品を追加する際のインスタンス情報を生成
 */
export function generateMultipleInstances(
  baseName: string,
  modelNumber: string,
  count: number,
  existingComponents: ComponentInstance[]
): Array<{
  instanceName: string
  basePartId: string
  instanceId: string
}> {
  // ベース部品IDを生成または既存のものを使用
  let basePartId = ''
  const existingBase = existingComponents.find(comp => 
    comp.title === baseName || comp.instanceName?.startsWith(baseName)
  )
  
  if (existingBase && existingBase.basePartId) {
    basePartId = existingBase.basePartId
  } else {
    basePartId = generateBasePartId(baseName)
  }
  
  // 既存のインスタンス名を取得
  const existingNames = getExistingInstanceNames(existingComponents, basePartId)
  
  // 新しいインスタンスを生成
  const instances = []
  for (let i = 0; i < count; i++) {
    const instanceName = generateInstanceName(baseName, existingNames)
    const instanceId = generateInstanceId(basePartId, existingNames.length + i)
    
    instances.push({
      instanceName,
      basePartId,
      instanceId
    })
    
    // 次の命名のために現在の名前を追加
    existingNames.push(instanceName)
  }
  
  return instances
}

/**
 * グループ名を生成（複数のインスタンスがある場合）
 */
export function generateGroupName(baseName: string, count: number): string {
  if (count <= 1) return baseName
  
  // 単純に複数形を作成（より高度なロジックも可能）
  if (baseName.endsWith('y')) {
    return baseName.slice(0, -1) + 'ies' // Battery → Batteries
  } else if (baseName.endsWith('s') || baseName.endsWith('x') || baseName.endsWith('ch')) {
    return baseName + 'es' // Sensor → Sensors, Switch → Switches
  } else {
    return baseName + 's' // Motor → Motors
  }
}

/**
 * 既存コンポーネントをベース部品でグループ化
 */
export function groupComponentsByBase(components: ComponentInstance[]): Map<string, ComponentInstance[]> {
  const groups = new Map<string, ComponentInstance[]>()
  
  components.forEach(component => {
    // basePartId がある場合はそれを使用、なければ部品名をベースにする
    const groupKey = component.basePartId || component.data?.title
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, [])
    }
    groups.get(groupKey)!.push(component)
  })
  
  return groups
}

/**
 * コンポーネントの追加処理（重複時の動作を決定）
 */
export function handleComponentAddition(
  newPartName: string,
  modelNumber: string,
  existingComponents: ComponentInstance[],
  quantity: number = 1  // 🆕 追加: 数量パラメータ
): {
  action: 'create_new' | 'add_instance' | 'duplicate_found'
  basePartId?: string
  instanceName?: string
  instanceId?: string
  groupName?: string
} {
  // 同じベース部品の既存コンポーネントを検索（より厳密に）
  const existingComponent = existingComponents.find(comp => {
    // basePartIdがある場合は、それを基準に判定
    if (comp.basePartId) {
      const baseName = extractBaseName(comp.instanceName || comp.title)
      return baseName === newPartName
    }
    // 従来の検索方法（後方互換性）
    return comp.title === newPartName || comp.instanceName?.startsWith(newPartName)
  })
  
  if (!existingComponent) {
    // 新しい部品として作成（数量に応じた命名）
    const basePartId = generateBasePartId(newPartName)
    const instanceName = quantity === 1 
      ? newPartName  // 🎯 数量1: 大本名を使用
      : generateInstanceName(newPartName, [])  // 🎯 数量2+: インスタンス名を使用
    return {
      action: 'create_new',
      basePartId,
      instanceName: instanceName,
      instanceId: generateInstanceId(basePartId, 0)
    }
  }
  
  // 既存の部品の追加インスタンスとして作成
  const basePartId = existingComponent.basePartId || generateBasePartId(newPartName)
  const existingNames = getExistingInstanceNames(existingComponents, basePartId)
  const instanceName = generateInstanceName(newPartName, existingNames)
  const instanceId = generateInstanceId(basePartId, existingNames.length)
  const groupName = generateGroupName(newPartName, existingNames.length + 1)
  
  return {
    action: 'add_instance',
    basePartId,
    instanceName,
    instanceId,
    groupName
  }
}

// ベース名抽出関数
function extractBaseName(instanceName: string): string {
  const match = instanceName.match(/^(.+?)\s+([A-Z]|\d+)$/)
  return match ? match[1] : instanceName
}