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
    const { requirements, question, answer } = body

    if (!requirements || !question || !answer) {
      return NextResponse.json({ error: 'Requirements, question, and answer are required' }, { status: 400 })
    }

    console.log('📝 Updating requirements from answer')

    const completion = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        {
          role: 'system',
          content: 'You are a requirements analyst. Update the requirements document based on the Q&A provided.'
        },
        {
          role: 'user',
          content: `Current Requirements:\n${requirements}\n\nQuestion: ${question}\nAnswer: ${answer}\n\nUpdate the requirements to incorporate this information.`
        }
      ],
      // temperature: 0.5,
      max_completion_tokens: 4000
    })

    const updatedRequirements = completion.choices[0]?.message?.content || requirements

    console.log('✅ Requirements updated successfully')

    return NextResponse.json({
      success: true,
      updatedRequirements,
      changes: {
        question,
        answer
      }
    })
  } catch (error) {
    console.error('Requirements update error:', error)
    return NextResponse.json(
      { error: 'Failed to update requirements', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}