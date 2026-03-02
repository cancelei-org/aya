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
    const { requirementsContent, projectId } = body;
    // shippingDestination removed - not used in Claude implementation

    if (!requirementsContent) {
      return NextResponse.json(
        { error: 'Requirements content is required' },
        { status: 400 },
      );
    }

    console.log('🚀 Generating system with streaming:', { projectId });

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start streaming in background
    (async () => {
      try {
        // Send initial progress
        await writer.write(
          encoder.encode('data: {"stage":"analyzing","progress":10}\n\n'),
        );

        // OpenAI implementation (commented out for Claude migration)
        /*
          const completion = await openai.chat.completions.create({
            model: 'gpt-5',
            messages: [
              {
                role: 'system',
                content: 'Generate a hardware system design based on requirements. Stream progress updates.'
              },
              {
                role: 'user',
                content: requirementsContent
              }
            ],
            // temperature: 0.7,
            stream: true
          })

          let fullResponse = ''
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || ''
            fullResponse += content

            // Send progress updates
            const progress = Math.min(90, fullResponse.length / 100)
            await writer.write(encoder.encode(`data: {"stage":"generating","progress":${progress},"chunk":"${content.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"}\n\n`))
          }
          */

        // Claude implementation
        const messageStream = await anthropic.messages.stream({
          model: MODELS.OPUS, // Use Opus for complex system generation
          system:
            'Generate a hardware system design based on requirements. Stream progress updates.',
          messages: [
            {
              role: 'user',
              content: requirementsContent,
            },
          ],
          max_tokens: 4096,
        });

        let fullResponse = '';
        for await (const chunk of messageStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const content = chunk.delta.text;
            fullResponse += content;

            // Send progress updates
            const progress = Math.min(90, fullResponse.length / 100);
            const escapedContent = content
              .replace(/"/g, '\\"')
              .replace(/\n/g, '\\n');
            await writer.write(
              encoder.encode(
                `data: {"stage":"generating","progress":${progress},"chunk":"${escapedContent}"}\n\n`,
              ),
            );
          }
        }

        // Send completion
        await writer.write(
          encoder.encode('data: {"stage":"complete","progress":100}\n\n'),
        );
      } catch (error) {
        await writer.write(encoder.encode(`data: {"error":"${error}"}\n\n`));
      } finally {
        await writer.close();
      }
    })();

    return new NextResponse(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('System generation stream error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate system stream',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
