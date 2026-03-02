// 互換性チェック・分析関連の型定義

// 互換性問題タイプ
export type CompatibilityIssueType = 
  | 'voltage_mismatch'
  | 'communication_incompatible'
  | 'power_insufficient'
  | 'physical_constraint'
  | 'software_hardware_mismatch'
  | 'software_requirement'

// 互換性重要度
export type CompatibilitySeverity = 'critical' | 'warning' | 'info'

// 互換性問題
export interface CompatibilityIssue {
  type: CompatibilityIssueType
  severity: CompatibilitySeverity
  componentId: string
  componentName: string
  issue: string
  recommendation: string
  affectedComponents: string[]
  affectedComponentNames: string[]  // 影響を受ける他の部品名（必須に変更）
}

// 互換性チェック結果
export interface CompatibilityResult {
  isCompatible: boolean
  issues: CompatibilityIssue[]
  summary: string
}