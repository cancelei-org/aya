import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { image, prompt = 'What is in this image?' } = body

    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 })
    }

    console.log('👁️ Analyzing vision')

    // OpenAI Vision APIを使用
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`
              }
            }
          ]
        }
      ],
      max_completion_tokens: 1000
    })

    const analysis = response.choices[0]?.message?.content || 'Could not analyze image'

    console.log('✅ Vision analysis completed')

    return NextResponse.json({
      success: true,
      analysis,
      prompt
    })
  } catch (error) {
    console.error('Vision analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze vision', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}