import { PrismaClient } from '@prisma/client'

declare global {
  var __globalPrisma: PrismaClient | undefined
}

// 開発環境でのPrismaクライアント初期化を改善
const createPrismaClient = () => {
  try {
    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    })
    
    return client
  } catch (error) {
    console.error('Failed to create Prisma client:', error)
    throw error
  }
}

// グローバルなクライアントインスタンスを確実に再利用
let prismaGlobal: PrismaClient

if (process.env.NODE_ENV === 'production') {
  prismaGlobal = createPrismaClient()
} else {
  if (!globalThis.__globalPrisma) {
    globalThis.__globalPrisma = createPrismaClient()
  }
  prismaGlobal = globalThis.__globalPrisma
}

export const prisma = prismaGlobal!

// プロセス終了時にクリーンアップ
if (typeof window === 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}