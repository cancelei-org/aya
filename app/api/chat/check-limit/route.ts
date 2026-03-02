import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

export async function GET() {
  const session = await auth()
  
  // 開発環境とローカルホストでの認証バイパス
  const isDevelopment = process.env.NODE_ENV === 'development'
  const headersList = await headers()
  const host = headersList.get('host')
  const isLocalhost = host?.includes('localhost') || host?.includes('127.0.0.1')
  const allowDevBypass = isDevelopment && isLocalhost
  
  if (allowDevBypass) {
    return NextResponse.json({ 
      canChat: true, 
      remainingChats: "unlimited", 
      chatCount: 0,
      isPremium: true
    })
  }
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('Check limit API called for user:', session.user.email)
    
    // Prismaクライアントの可用性チェック
    if (!prisma) {
      console.log('⚠️ Prisma not available, returning fallback data for check-limit')
      return NextResponse.json({ 
        canChat: true, 
        remainingChats: "unlimited", 
        chatCount: 0,
        isPremium: false // fallback mode
      })
    }
    
    // ユーザーを取得または作成（upsertで安全に処理）
    const user = await prisma.user.upsert({
      where: { email: session.user.email },
      update: {
        // 既存ユーザーの場合は何も更新しない
      },
      create: {
        email: session.user.email,
        name: session.user.name || session.user.email.split('@')[0],
        chatCount: 0,
        isPremium: false
      },
      select: { id: true, chatCount: true, isPremium: true }
    })
    console.log('User found/created:', user)

    const canChat = user.isPremium || user.chatCount < 100
    const remainingChats = user.isPremium ? "unlimited" : Math.max(0, 100 - user.chatCount)

    return NextResponse.json({ 
      canChat, 
      remainingChats, 
      chatCount: user.chatCount,
      isPremium: user.isPremium
    })
  } catch (error) {
    console.error('Chat limit check error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error('Error details:', errorMessage)
    if (errorStack) {
      console.error('Error stack:', errorStack)
    }
    
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 })
  }
}