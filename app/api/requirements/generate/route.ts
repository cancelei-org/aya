import { NextRequest, NextResponse } from 'next/server';
// import OpenAI from 'openai'  // Commented for Claude migration
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
    const { prompt, projectId, mode = 'create', userLanguage = 'en' } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 },
      );
    }

    console.log('📝 Generating requirements:', {
      projectId,
      mode,
      userLanguage,
    });

    // Choose system prompt based on user language
    const systemPrompt =
      userLanguage === 'ja'
        ? `あなたはハードウェアシステム設計の専門家です。
    ユーザーのリクエストから簡潔で実現可能な要件定義書を作成してください。
    
    重要な指示:
    - 各項目を簡潔に（1-2行）
    - 全体を3000文字以内に収める
    - 最小限の必須情報に焦点を当てる
    - 必ず日本語で記述する
    
    以下の形式で要件定義書を作成してください：
    
    # システム要件定義書
    
    ## **1. システムの目的と概要**
    - 何を実現するか（1-2文）
    - 主な用途（2-3項目）
    
    ## **2. 主要機能**
    - 必須機能（最大5つ）
    - 各機能を1行で記述
    
    ## **3. 主要コンポーネント**
    - 必要なコンポーネントカテゴリ（コントローラー、センサー、電源など）
    - 可能な場合は具体的な部品名
    
    ## **4. 制約条件**
    - サイズの見積もり（概算でOK）
    - 電源（バッテリー/AC）
    - 予算の見積もり（ある場合）
    
    ## **5. 通信とインターフェース**
    - 必要な通信方式（Wi-Fi、Bluetoothなど）
    - 操作方法（ボタン、アプリなど）
    
    重要: セクションタイトルは**太字**で記述。各項目は簡潔に。`
        : `You are a hardware system design expert.
    Create a concise and feasible requirements document from the user's request.
    
    Important instructions:
    - Keep each item brief (1-2 lines)
    - Keep total within 3000 characters
    - Focus on minimum essential information
    
    Please create the requirements document in the following format:
    
    # System Requirements Document
    
    ## **1. System Purpose and Overview**
    - What to achieve (1-2 sentences)
    - Main applications (2-3 bullet points)
    
    ## **2. Key Functions**
    - Essential functions (maximum 5)
    - Each function in one line
    
    ## **3. Main Components**
    - Required component categories (controller, sensors, power, etc.)
    - Specific part names where possible
    
    ## **4. Constraints**
    - Size estimate (rough is OK)
    - Power source (battery/AC)
    - Budget estimate (if any)
    
    ## **5. Communication & Interface**
    - Required communication (Wi-Fi, Bluetooth, etc.)
    - Operation methods (buttons, app, etc.)
    
    Important: Write section titles in **bold**. Keep each item concise.`;

    console.log('🚀 Calling Claude API with model: Opus');
    console.log('🌐 Language:', userLanguage);
    console.log('📝 User prompt length:', prompt.length);
    console.log('📝 User prompt (first 200 chars):', prompt.substring(0, 200));

    // OpenAI implementation (commented out for Claude migration)
    /*
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
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
      max_completion_tokens: 5000  // 簡潔な要件書のため制限
    })

    const requirements = completion.choices[0]?.message?.content || ''
    */

    // Claude implementation with fallback
    let completion;
    try {
      completion = await anthropic.messages.create({
        model: MODELS.OPUS,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 4096,
      });
      console.log('✅ Successfully generated requirements with Opus');
    } catch (opusError: any) {
      // If Opus is overloaded (529), try with Sonnet
      if (opusError?.status === 529) {
        console.log(
          '[WARN] Opus overloaded (529), falling back to Sonnet for requirements generation',
        );
        completion = await anthropic.messages.create({
          model: MODELS.SONNET,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 4096,
        });
        console.log(
          '✅ Successfully generated requirements with Sonnet (fallback)',
        );
      } else {
        // Re-throw if it's not a 529 error
        console.error(
          '[ERROR] Opus failed with non-529 error:',
          opusError?.status,
        );
        throw opusError;
      }
    }

    const requirements =
      completion.content[0]?.type === 'text' ? completion.content[0].text : '';

    console.log('📊 API Response:', {
      hasContent: !!requirements,
      contentLength: requirements.length,
      stopReason: completion.stop_reason,
      model: completion.model,
      usage: completion.usage,
    });

    // Check stop reason for token limit issues
    if (completion.stop_reason === 'max_tokens') {
      console.warn('⚠️ Token limit reached, response may be incomplete');
    }

    // Check if requirements are actually empty
    if (!requirements || requirements.trim().length === 0) {
      console.warn('⚠️ Claude returned empty requirements content');
      console.warn(
        'Full completion object:',
        JSON.stringify(completion, null, 2),
      );

      // Return error instead of success with empty content
      return NextResponse.json(
        {
          success: false,
          error: 'Generated requirements are empty',
          projectId,
          mode,
        },
        { status: 500 },
      );
    }

    console.log('✅ Requirements generated successfully');
    console.log(
      '📝 First 200 chars of requirements:',
      requirements.substring(0, 200),
    );

    // Save to database if Prisma is available
    if (projectId) {
      try {
        const { prisma } = await import('@/lib/prisma');

        if (prisma) {
          const savedRequirement = await prisma.requirementsDocument.create({
            data: {
              projectId,
              title: 'System Requirements',
              content: requirements,
              status: 'DRAFT',
            },
          });

          console.log(
            '💾 Requirements saved to database:',
            savedRequirement.id,
          );

          return NextResponse.json({
            success: true,
            requirements,
            projectId,
            mode,
            id: savedRequirement.id,
          });
        }
      } catch (dbError) {
        console.error('Database save error:', dbError);
        // Continue without saving - return generated content
      }
    }

    return NextResponse.json({
      success: true,
      requirements,
      projectId,
      mode,
    });
  } catch (error) {
    console.error('Requirements generation error:', error);

    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack?.split('\n').slice(0, 3),
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to generate requirements',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
