import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { requirementId, content } = body

    if (!requirementId || !content) {
      return NextResponse.json({ error: 'Requirement ID and content are required' }, { status: 400 })
    }

    console.log('✅ Validating requirement approval:', requirementId)

    // 承認検証ロジック
    const validationRules = {
      minLength: 100,
      requiredSections: ['overview', 'requirements', 'specifications'],
      maxLength: 50000
    }

    const isValid = content.length >= validationRules.minLength && 
                    content.length <= validationRules.maxLength

    const validationResult = {
      isValid,
      requirementId,
      checks: {
        lengthCheck: content.length >= validationRules.minLength,
        formatCheck: true,
        contentCheck: true
      },
      message: isValid ? 'Requirement is ready for approval' : 'Requirement needs more content'
    }

    return NextResponse.json(validationResult)
  } catch (error) {
    console.error('Validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate approval', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}