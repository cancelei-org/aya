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

    // Get action from query params or body
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    if (!action) {
      return NextResponse.json({ error: 'Action parameter is required' }, { status: 400 })
    }

    switch (action) {
      case 'transcribe':
        return handleTranscription(request)
      case 'synthesize':
        return handleSynthesis(request)
      case 'chat':
        return handleVoiceChat(request)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Voice API error:', error)
    return NextResponse.json(
      { error: 'Voice API failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Speech to text (transcription)
async function handleTranscription(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    
    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 })
    }

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'ja'
    })

    return NextResponse.json({ 
      success: true, 
      text: transcription.text 
    })
  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: 'Transcription failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Text to speech (synthesis)
async function handleSynthesis(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, voice = 'alloy' } = body

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice,
      input: text,
    })

    const buffer = Buffer.from(await mp3.arrayBuffer())
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('TTS error:', error)
    return NextResponse.json(
      { error: 'Text-to-speech failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Voice chat (combines transcription + chat + synthesis)
async function handleVoiceChat(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    
    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 })
    }

    // Step 1: Transcribe audio
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'ja'
    })

    // Step 2: Get chat response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant for hardware development. Respond in Japanese.'
        },
        {
          role: 'user',
          content: transcription.text
        }
      ]
    })

    const responseText = completion.choices[0].message.content || ''

    // Step 3: Convert response to speech
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: responseText,
    })

    const buffer = Buffer.from(await mp3.arrayBuffer())

    return NextResponse.json({
      success: true,
      transcription: transcription.text,
      response: responseText,
      audio: buffer.toString('base64')
    })
  } catch (error) {
    console.error('Voice chat error:', error)
    return NextResponse.json(
      { error: 'Voice chat failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}