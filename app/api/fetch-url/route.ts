import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // 開発環境では認証をスキップ
    if (process.env.NODE_ENV !== 'development') {
      const session = await auth()
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    console.log('🔗 Fetching URL content:', url)

    try {
      // URLの内容を取得
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`)
      }

      const html = await response.text()
      
      // HTMLから主要なテキストコンテンツを抽出（簡易版）
      const textContent = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
        .replace(/<[^>]+>/g, ' ') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
        .substring(0, 10000) // Limit to 10000 characters

      console.log('✅ URL content fetched successfully:', {
        url,
        contentLength: textContent.length
      })

      return NextResponse.json({
        url,
        content: textContent,
        success: true
      })
    } catch (fetchError) {
      console.error('URL fetch error:', fetchError)
      return NextResponse.json({
        url,
        content: '',
        success: false,
        error: fetchError instanceof Error ? fetchError.message : 'Failed to fetch URL'
      })
    }
  } catch (error) {
    console.error('Fetch URL API error:', error)
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}