import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { suggestionId, action, projectId } = body

    if (!suggestionId || !action) {
      return NextResponse.json({ error: 'Suggestion ID and action are required' }, { status: 400 })
    }

    console.log('✅ Applying suggestion:', { suggestionId, action, projectId })

    // ここで実際の提案適用ロジックを実装
    // 例: データベースの更新、ステータス変更など

    return NextResponse.json({
      success: true,
      suggestionId,
      action,
      message: `Suggestion ${action} successfully`
    })
  } catch (error) {
    console.error('Apply suggestion error:', error)
    return NextResponse.json(
      { error: 'Failed to apply suggestion', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}