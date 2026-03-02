import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/requirements/[id]/completeness - 要件ドキュメントの完成度を取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // モックデータまたはデフォルトの完成度データを返す
    const completeness = {
      overall: 75,
      sections: [
        {
          name: 'System Purpose',
          completeness: 100,
          status: 'complete'
        },
        {
          name: 'Functional Requirements',
          completeness: 80,
          status: 'partial'
        },
        {
          name: 'Non-functional Requirements',
          completeness: 70,
          status: 'partial'
        },
        {
          name: 'Constraints',
          completeness: 60,
          status: 'partial'
        },
        {
          name: 'Hardware Requirements',
          completeness: 75,
          status: 'partial'
        },
        {
          name: 'Software Requirements',
          completeness: 70,
          status: 'partial'
        },
        {
          name: 'Interface Requirements',
          completeness: 80,
          status: 'partial'
        }
      ]
    }

    // データベースから実際のドキュメントを取得して完成度を計算
    if (prisma && !id.startsWith('req-mock-')) {
      try {
        const requirement = await prisma.requirementsDocument.findUnique({
          where: { id },
          select: {
            contentText: true,
            status: true
          }
        })

        if (requirement) {
          // contentTextから各セクションの存在と内容量をチェック
          const text = requirement.contentText || ''
          
          completeness.sections = completeness.sections.map(section => {
            const sectionName = section.name.toLowerCase()
            const hasSection = text.toLowerCase().includes(sectionName)
            
            if (hasSection) {
              // セクションが存在する場合、内容の長さで完成度を判定
              const sectionRegex = new RegExp(`${sectionName}[\\s\\S]*?(?=##|$)`, 'i')
              const sectionContent = text.match(sectionRegex)?.[0] || ''
              const contentLength = sectionContent.length
              
              let score = 0
              if (contentLength > 500) score = 100
              else if (contentLength > 300) score = 80
              else if (contentLength > 150) score = 60
              else if (contentLength > 50) score = 40
              else score = 20
              
              return {
                ...section,
                completeness: score,
                status: score >= 80 ? 'complete' : 'partial'
              }
            }
            
            return {
              ...section,
              completeness: 0,
              status: 'missing'
            }
          })
          
          // 全体の完成度を計算
          const totalScore = completeness.sections.reduce((sum, s) => sum + s.completeness, 0)
          completeness.overall = Math.round(totalScore / completeness.sections.length)
        }
      } catch (dbError) {
        console.error('Database error while calculating completeness:', dbError)
        // デフォルト値を使用
      }
    }

    return NextResponse.json(completeness)
  } catch (error) {
    console.error('Error fetching completeness:', error)
    return NextResponse.json(
      { error: 'Failed to fetch completeness data' },
      { status: 500 }
    )
  }
}