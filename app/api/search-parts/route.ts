import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { auth } from '@/lib/auth'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    // 開発環境での認証バイパス
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { query, category } = body

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 })
    }

    console.log('🔍 Searching for parts:', { query, category })

    // パーツ検索プロンプト
    const systemPrompt = `You are a hardware parts search assistant. 
    Find relevant electronic components based on the search query.
    Focus on: ${category || 'general electronic components'}
    
    Return a JSON array of parts with:
    - name: component name
    - category: component category
    - specifications: key specs
    - price: estimated price (USD)
    - availability: in stock/out of stock
    - manufacturer: manufacturer name
    - partNumber: part number if available`

    const completion = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Search for: ${query}`
        }
      ],
      // temperature: 0.5,
      response_format: { type: "json_object" }
    })

    const searchResults = JSON.parse(completion.choices[0]?.message?.content || '{"parts": []}')

    console.log('✅ Parts search completed:', {
      resultsCount: searchResults.parts?.length || 0
    })

    return NextResponse.json(searchResults)
  } catch (error) {
    console.error('Parts search error:', error)
    return NextResponse.json(
      { error: 'Failed to search parts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}