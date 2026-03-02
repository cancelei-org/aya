import { NextRequest } from 'next/server';
// import OpenAI from 'openai'  // Commented for Claude migration
import { anthropic, MODELS } from '@/lib/anthropic';
import { auth } from '@/lib/auth';
import { logger } from '@/utils/logger';

// OpenAI client (commented out for Claude migration)
/*
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})
*/

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { message, conversationHistory, isFirstMessage } =
      await request.json();

    console.log('🔍 [chat-stream API] Received request:', {
      messageLength: message?.length,
      historyLength: conversationHistory?.length || 0,
      isFirstMessage,
    });

    if (!message) {
      return new Response('Message is required', { status: 400 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          // OpenAI implementation (commented out for Claude migration)
          /*
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful hardware assistant specializing in robotics and electronic components.'
              },
              ...(conversationHistory || []),
              {
                role: 'user',
                content: message
              }
            ],
            stream: true
          })

          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', content })}\n\n`))
            }
          }
          */

          // Claude implementation
          let systemContent =
            'You are a helpful hardware assistant specializing in robotics and electronic components.';

          // Add special instructions for first message from welcome page
          if (isFirstMessage) {
            systemContent +=
              "\n\nIMPORTANT: This is the user's first message. Your role is to understand their needs by asking clarifying questions. DO NOT create a requirements document immediately. Instead:\n\n1. Acknowledge their idea briefly\n2. Ask 3-5 specific, targeted questions to understand:\n   - The main purpose and goals of the system\n   - Key features and functionality they need\n   - Any constraints (budget, size, power, environment)\n   - Expected performance or specifications\n   - Timeline or urgency\n\n3. Keep your response conversational and encouraging\n4. Focus on gathering information to create comprehensive requirements later\n\nOnly after the user answers your questions should you proceed to creating requirements documents in subsequent messages.";
          }

          const claudeMessages: Array<{
            role: 'user' | 'assistant';
            content: string;
          }> = [];

          // Filter out empty messages from conversation history
          if (conversationHistory && conversationHistory.length > 0) {
            for (const msg of conversationHistory) {
              if (
                msg.role !== 'system' &&
                msg.content &&
                msg.content.trim() !== ''
              ) {
                claudeMessages.push({
                  role: msg.role === 'assistant' ? 'assistant' : 'user',
                  content: msg.content,
                });
              }
            }
          }

          // Add current message if not empty
          if (message && message.trim() !== '') {
            claudeMessages.push({ role: 'user', content: message });
          }

          const messageStream = await anthropic.messages.stream({
            model: MODELS.SONNET,
            system: systemContent,
            messages: claudeMessages,
            max_tokens: 4096,
          });

          for await (const chunk of messageStream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              const content = chunk.delta.text;
              if (content) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: 'content', content })}\n\n`,
                  ),
                );
              }
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          logger.error('Stream processing error:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    logger.error('Chat stream error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const message = searchParams.get('message');

    if (!message) {
      return new Response('Message is required', { status: 400 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          // OpenAI implementation (commented out for Claude migration)
          /*
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful hardware assistant specializing in robotics and electronic components.'
              },
              {
                role: 'user',
                content: message
              }
            ],
            stream: true
          })

          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', content })}\n\n`))
            }
          }
          */

          // Claude implementation
          // Validate message is not empty
          if (!message || message.trim() === '') {
            throw new Error('Message content cannot be empty');
          }

          const messageStream = await anthropic.messages.stream({
            model: MODELS.SONNET,
            system:
              'You are a helpful hardware assistant specializing in robotics and electronic components.',
            messages: [{ role: 'user', content: message }],
            max_tokens: 4096,
          });

          for await (const chunk of messageStream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              const content = chunk.delta.text;
              if (content) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: 'content', content })}\n\n`,
                  ),
                );
              }
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          logger.error('Stream processing error:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    logger.error('Chat stream error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
