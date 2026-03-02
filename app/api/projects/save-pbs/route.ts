import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    // 開発環境での認証バイパス
    const isDevelopment = process.env.NODE_ENV === 'development'
    if (!session?.user?.email && !isDevelopment) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, pbsStructure } = body

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    console.log('📊 Saving PBS structure:', {
      projectId,
      itemsCount: pbsStructure?.length || 0
    })

    // PBS構造をJSON形式で保存
    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        pbsStructure: JSON.stringify(pbsStructure || []),
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        updatedAt: true
      }
    })

    console.log('✅ PBS structure saved successfully')

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        updatedAt: project.updatedAt
      }
    })
  } catch (error) {
    console.error('Save PBS error:', error)
    return NextResponse.json(
      { error: 'Failed to save PBS structure', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}