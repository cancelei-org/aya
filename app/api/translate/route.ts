import { NextRequest, NextResponse } from 'next/server'
// import OpenAI from 'openai'  // Commented for Claude migration
import { anthropic, MODELS } from '@/lib/anthropic'

// OpenAI client (commented out for Claude migration)
/*
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})
*/

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, targetLanguage = 'ja' } = body

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    console.log('🌐 Translating text to:', targetLanguage)

    // OpenAI implementation (commented out for Claude migration)
    /*
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate the given text to ${targetLanguage === 'ja' ? 'Japanese' : 'English'}. Return only the translation, no explanations.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      //// temperature is not supported in gpt-5 models
      max_completion_tokens: 1000
    })

    const translatedText = completion.choices[0]?.message?.content || text
    */

    // Claude implementation
    const completion = await anthropic.messages.create({
      model: MODELS.SONNET, // Use Sonnet for translation (fast and efficient)
      system: `You are a professional translator. Translate the given text to ${targetLanguage === 'ja' ? 'Japanese' : 'English'}. Return only the translation, no explanations.`,
      messages: [
        {
          role: 'user',
          content: text
        }
      ],
      max_tokens: 1000,
    })

    const translatedText = completion.content[0]?.type === 'text' 
      ? completion.content[0].text 
      : text

    return NextResponse.json({
      success: true,
      translatedText,
      originalText: text,
      targetLanguage
    })
  } catch (error) {
    console.error('Translation error:', error)
    return NextResponse.json(
      { error: 'Failed to translate text', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}