import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@/lib/auth';
import { estimatePortNumbers } from '@/utils/ai/portEstimation';
import {
  COMMON_SYSTEM_PROMPT,
  JSON_FORMAT_INSTRUCTION,
  buildCategoryPrompt,
  buildConnectionTypePrompt,
  formatVoltage,
} from '@/utils/ai/hardwareAnalysisCommon';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // 開発環境での認証バイパス
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message, currentParts = [] } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 },
      );
    }

    console.log('🔍 Analyzing parts from message...');

    // パーツ分析プロンプト
    const systemPrompt = `${COMMON_SYSTEM_PROMPT}

${buildCategoryPrompt()}
${buildConnectionTypePrompt()}

Current parts in the system:
${currentParts.map((p: { name: string; category: string }) => `- ${p.name}: ${p.category}`).join('\n')}

${JSON_FORMAT_INSTRUCTION}

Extract hardware components and analyze their specifications.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      // temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const analysis = JSON.parse(
      completion.choices[0]?.message?.content || '{}',
    );

    // ポート数の推定
    if (analysis.parts) {
      analysis.parts = analysis.parts.map(
        (part: {
          voltage?: string;
          communication?: string;
          category?: string;
          name?: string;
          [key: string]: unknown;
        }) => ({
          ...part,
          estimatedPorts: estimatePortNumbers(
            part.communication as string | undefined,
            (part.category as string) || '',
            (part.name as string) || '',
          ),
          voltage: formatVoltage(part.voltage),
        }),
      );
    }

    console.log('✅ Parts analysis completed:', {
      partsFound: analysis.parts?.length || 0,
    });

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Parts analysis error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze parts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
