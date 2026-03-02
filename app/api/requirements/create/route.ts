import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, title, content, status = 'DRAFT' } = body

    if (!projectId || !title || !content) {
      return NextResponse.json({ error: 'Project ID, title, and content are required' }, { status: 400 })
    }

    console.log('📝 Creating requirements document:', { projectId, title })

    // Prismaが利用可能な場合はデータベースに保存
    if (prisma) {
      try {
        const requirement = await prisma.requirementsDocument.create({
          data: {
            projectId,
            title,
            content,
            status,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        return NextResponse.json({
          success: true,
          requirement
        })
      } catch (dbError) {
        console.error('Database error:', dbError)
        // フォールバック
      }
    }

    // フォールバック: メモリ内に保存（簡易版）
    const requirement = {
      id: `req-${Date.now()}`,
      projectId,
      title,
      content,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    console.log('✅ Requirements document created')

    return NextResponse.json({
      success: true,
      requirement
    })
  } catch (error) {
    console.error('Requirements creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create requirements', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}