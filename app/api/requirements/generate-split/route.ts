import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { auth } from '@/lib/auth'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { prompt, part, projectId } = body

    if (!prompt || !part) {
      return NextResponse.json({ error: 'Prompt and part are required' }, { status: 400 })
    }

    console.log('📝 Generating split requirements:', { part, projectId })

    const systemPrompt = part === 'essential'
      ? 'Generate essential requirements focusing on core functionality and must-have features.'
      : 'Generate detailed requirements including technical specifications, optional features, and implementation details.'

    const completion = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      // temperature: 0.7,
      max_completion_tokens: 3000
    })

    const requirements = completion.choices[0]?.message?.content || ''

    console.log('✅ Split requirements generated successfully')

    return NextResponse.json({
      success: true,
      requirements,
      part,
      projectId
    })
  } catch (error) {
    console.error('Split requirements generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate split requirements', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}