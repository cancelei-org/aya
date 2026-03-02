import { NextRequest, NextResponse } from 'next/server';
import { anthropic, MODELS } from '@/lib/anthropic';
import { auth } from '@/lib/auth';

// OpenAI client (commented out for Claude migration)
/*
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})
*/

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requirements, question } = body;

    if (!requirements || !question) {
      return NextResponse.json(
        { error: 'Requirements and question are required' },
        { status: 400 },
      );
    }

    console.log('🔍 Analyzing requirements with question:', question);

    // OpenAI implementation (commented out for Claude migration)
    /*
    const completion = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        {
          role: 'system',
          content: 'You are an expert requirements analyst. Analyze the given requirements and answer the specific question.'
        },
        {
          role: 'user',
          content: `Requirements:\n${requirements}\n\nQuestion: ${question}`
        }
      ],
      // temperature: 0.5,
      max_completion_tokens: 2000
    })

    const analysis = completion.choices[0]?.message?.content || ''
    */

    // Claude implementation
    const completion = await anthropic.messages.create({
      model: MODELS.OPUS,
      system:
        'You are an expert requirements analyst. Analyze the given requirements and answer the specific question.',
      messages: [
        {
          role: 'user',
          content: `Requirements:\n${requirements}\n\nQuestion: ${question}`,
        },
      ],
      max_tokens: 2000,
    });

    const analysis =
      completion.content[0]?.type === 'text' ? completion.content[0].text : '';

    console.log('✅ Requirements analysis completed');

    return NextResponse.json({
      success: true,
      analysis,
      question,
    });
  } catch (error) {
    console.error('Requirements analysis error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze requirements',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
