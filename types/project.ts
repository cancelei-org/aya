// プロジェクト・ユーザー・認証関連の型定義

// プロジェクト情報
export interface Project {
  id: string
  name: string
  description?: string
}

// ユーザー情報  
export interface User {
  id: string
  email: string
  name: string
  chatCount: number
  isPremium: boolean
}