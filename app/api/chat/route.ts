import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { anthropic, MODELS } from '@/lib/anthropic';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';

// Streaming chat handler
async function handleStreamingChat(
  message: string,
  conversationHistory?: Array<{ role: string; content: string }>,
) {
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
              content: 'You are a helpful hardware assistant.'
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
        const claudeMessages: Array<{
          role: 'user' | 'assistant';
          content: string;
        }> = [];
        const systemContent = 'You are a helpful hardware assistant.';

        // Convert conversation history to Claude format (filter empty messages)
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

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

// ファイル情報を含むユーザーメッセージを構築
function buildUserMessage(
  message: string,
  attachments?: Array<{
    filename: string;
    type: string;
    content?: string;
  }>,
): string {
  if (!attachments || attachments.length === 0) {
    return message;
  }

  let fullMessage = message || 'ファイルを分析してください。';
  fullMessage += '\n\n📎 添付ファイル:\n';

  attachments.forEach((attachment, index) => {
    fullMessage += `\n${index + 1}. **${attachment.filename}** (${attachment.type})\n`;

    if (attachment.type === 'image' && attachment.content) {
      fullMessage += `   画像データ: ${attachment.content.substring(0, 100)}...\n`;
    } else if (attachment.type === 'excel' && attachment.content) {
      try {
        const data = JSON.parse(attachment.content);
        fullMessage += `   Excelデータ: ${data.sheetNames?.length || 0}シート含む\n`;
        if (data.sheets) {
          Object.keys(data.sheets).forEach((sheetName) => {
            const rows = data.sheets[sheetName]?.length || 0;
            fullMessage += `   - ${sheetName}: ${rows}行\n`;
          });
        }
      } catch {
        fullMessage += `   Excelデータ: 解析可能\n`;
      }
    } else if (attachment.type === 'pdf' && attachment.content) {
      fullMessage += `   PDFデータ: 添付済み\n`;
    }
  });

  fullMessage +=
    '\n上記のファイルを分析し、ハードウェア開発に関連する情報を抽出してください。';
  return fullMessage;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication (バイパス in development)
    const session = await auth();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      message,
      attachments,
      conversationHistory,
      projectId,
      stream = false,
    } = body;

    if (!message && !attachments) {
      return NextResponse.json(
        { error: 'Message or attachments are required' },
        { status: 400 },
      );
    }

    // Handle streaming mode
    if (stream && !attachments && !projectId) {
      return handleStreamingChat(message, conversationHistory);
    }

    // Get hardware context if projectId is provided
    let hardwareContext = '';
    if (projectId) {
      try {
        logger.info('Fetching hardware context for project:', projectId);

        // Get user to verify project ownership (開発環境ではスキップ)
        const user = session?.user?.email
          ? await prisma.user.findUnique({
              where: { email: session.user.email },
            })
          : null;

        if (user) {
          // Get project with all hardware data
          const project = await prisma.project.findFirst({
            where: {
              id: projectId,
              userId: user.id,
            },
          });

          if (project) {
            // Get connections from JSON data
            const connections = project.connectionsData
              ? JSON.parse(project.connectionsData)
              : [];

            // Parse PBS structure
            let pbsData = [];
            if (project.pbsStructure) {
              try {
                pbsData = JSON.parse(project.pbsStructure);
              } catch (e) {
                logger.warn('Failed to parse PBS structure:', e);
              }
            }

            // Generate hardware context using the utility functions
            const { extractHardwareContext, generateLLMContext } = await import(
              '@/utils/data/analysis/hardwareContext'
            );

            // Get nodes from JSON data
            const nodes = project.nodesData
              ? JSON.parse(project.nodesData)
              : [];

            const context = extractHardwareContext(
              nodes,
              connections.map(
                (conn: {
                  id: string;
                  fromId: string;
                  toId: string;
                  fromPort: string;
                  toPort: string;
                }) => ({
                  id: conn.id,
                  fromId: conn.fromId,
                  toId: conn.toId,
                  fromPort: conn.fromPort,
                  toPort: conn.toPort,
                }),
              ),
              pbsData,
            );

            hardwareContext = generateLLMContext(context);
            console.log(
              'Generated hardware context:',
              hardwareContext.substring(0, 200) + '...',
            );
          }
        }
      } catch (error) {
        console.error('Error fetching hardware context:', error);
        // Continue without hardware context if there's an error
      }
    }

    // Get requirements context if projectId is provided
    // Requirements Update modeで要件定義書の内容をAIに渡す
    let requirementsContext = '';
    if (projectId) {
      try {
        console.log('Fetching requirements for project:', projectId);

        // Get latest requirements document for the project
        const requirementsResponse = await fetch(
          `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auto-devlog/documents?projectId=${projectId}&type=requirements`,
        );
        if (requirementsResponse.ok) {
          const { data: documents } = await requirementsResponse.json();
          const latestRequirement = documents?.[0]; // Documents are sorted by updatedAt

          if (latestRequirement) {
            console.log(
              '📄 Found requirements document:',
              latestRequirement.id,
              latestRequirement.title,
            );
            const requirementContent =
              latestRequirement.contentText || latestRequirement.content || '';

            if (requirementContent) {
              requirementsContext = `

CURRENT REQUIREMENTS DOCUMENT:
Title: ${latestRequirement.title}
Status: ${latestRequirement.status}
Content:
${requirementContent}

IMPORTANT: When the user asks about the requirements document (e.g., "what's missing", "analyze requirements", "不足している部分"), always refer to the above requirements document content.`;
              console.log(
                '📝 Requirements context added, length:',
                requirementsContext.length,
              );
            }
          }
        }
      } catch (error) {
        console.error('Error fetching requirements context:', error);
        // Continue without requirements context if there's an error
      }
    }

    // 🌐 言語検出と翻訳処理
    function isEnglish(text: string): boolean {
      // 英語の文字、数字、句読点のみで構成されているかチェック
      const englishPattern =
        /^[a-zA-Z0-9\s.,!?'"()\[\]{}\-_:;@#$%^&*+=<>/\\|`~]+$/;
      return englishPattern.test(text.trim());
    }

    async function translateToEnglish(text: string): Promise<string> {
      try {
        // OpenAI implementation (commented out for Claude migration)
        /*
        const translateCompletion = await openai.chat.completions.create({
          model: 'gpt-5-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a professional translator. Translate the given text to English. Return ONLY the English translation, no explanations or additional text.'
            },
            {
              role: 'user', 
              content: text
            }
          ],
          max_completion_tokens: 500,
          //temperature: 0.1,
        })
        
        return translateCompletion.choices[0]?.message?.content || text
        */

        // Claude implementation
        const translateCompletion = await anthropic.messages.create({
          model: MODELS.SONNET,
          system:
            'You are a professional translator. Translate the given text to English. Return ONLY the English translation, no explanations or additional text.',
          messages: [
            {
              role: 'user',
              content: text,
            },
          ],
          max_tokens: 500,
        });

        const result =
          translateCompletion.content[0]?.type === 'text'
            ? translateCompletion.content[0].text
            : text;
        return result;
      } catch (error) {
        console.error('Translation error:', error);
        return text; // フォールバック：翻訳に失敗した場合は元のテキストを使用
      }
    }

    // メッセージが英語でない場合は翻訳（元の言語を記録）
    let processedMessage = message;
    const originalLanguage = isEnglish(message) ? 'English' : 'Japanese';

    if (!isEnglish(message)) {
      console.log('🌐 Non-English message detected, translating...');
      console.log('🌐 Original language:', originalLanguage);
      processedMessage = await translateToEnglish(message);
      console.log('🌐 Translated message:', processedMessage);
    }

    // 🔍 要件書更新要求かどうかをチェック
    const isRequirementsUpdateRequest = (text: string): boolean => {
      const updateKeywords = [
        'update requirements',
        'update requirement',
        'modify requirements',
        'change requirements',
        'edit requirements',
        'revise requirements',
        'requirements update',
        'requirement update',
        'requirements modification',
        'add to requirements',
        'append requirements',
      ];
      return updateKeywords.some((keyword) =>
        text.toLowerCase().includes(keyword.toLowerCase()),
      );
    };

    // 🔍 新規要件定義要求かどうかをチェック（承認フロー考慮）
    const isNewRequirementsRequest = (text: string): boolean => {
      // 更新要求の場合は新規作成ではない
      if (isRequirementsUpdateRequest(text)) {
        return false;
      }

      const requirementsKeywords = [
        'want to build',
        'want to create',
        'want to develop',
        'want to construct',
        'need to build',
        'need to create',
        'need to develop',
        'create requirements',
        'define requirements',
        'system requirements',
        'requirement document',
        'requirements document',
        'new requirements',
        'create new requirements',
      ];
      return requirementsKeywords.some((keyword) =>
        text.toLowerCase().includes(keyword.toLowerCase()),
      );
    };

    // 要件書更新要求の場合は通常のチャット処理を続行（ChatPanelLogicで処理）
    if (isRequirementsUpdateRequest(processedMessage)) {
      console.log(
        '📝 Requirements update request detected - passing to ChatPanelLogic',
      );
      // 通常のチャット処理を続行
    }
    // 新規要件定義要求の場合は、承認状態をチェック
    else if (isNewRequirementsRequest(processedMessage)) {
      console.log('📋 New requirements definition request detected in chat.ts');

      try {
        // 既存の要件書をチェック
        const requirementsResponse = await fetch(
          `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auto-devlog/documents?projectId=${projectId}&type=requirements`,
        );
        if (requirementsResponse.ok) {
          const { data: documents } = await requirementsResponse.json();
          const existingRequirement = documents?.[0];

          if (
            existingRequirement &&
            existingRequirement.metadata?.approvalStatus === 'draft'
          ) {
            // 未承認の要件書がある場合は承認を促す
            return NextResponse.json({
              response: `📝 **既存の要件定義書があります**\n\n現在、ドラフト状態の要件定義書「${existingRequirement.title}」があります。\n\nシステム提案を受けるには、まず要件定義書を承認してください。Auto Devlogタブから要件定義書を開いて「Approve & Build System」ボタンをクリックしてください。\n\n新しく作り直す場合は「新規要件定義書を作成してください」と入力してください。`,
            });
          }
        }
      } catch (error) {
        console.error('Error checking requirements:', error);
      }
    }

    // 🎯 インテント分類とプロンプト最適化（翻訳後のメッセージを使用）
    const {
      classifyUserIntent,
      generateIntentPrompt,
      logIntentClassification,
    } = await import('@/utils/ai/processing/intentClassifier');
    const intentResult = classifyUserIntent(processedMessage);
    logIntentClassification(message, intentResult);

    // インテント別の追加プロンプト
    const intentPrompt = generateIntentPrompt(intentResult.intent);
    console.log('🎯 Generated intent prompt length:', intentPrompt.length);
    console.log(
      '🎯 Intent prompt includes JSON markers?',
      intentPrompt.includes('COMPONENT_SUGGESTIONS_JSON_START') ||
        intentPrompt.includes('SYSTEM_SUGGESTIONS_JSON_START'),
    );

    // Build conversation context
    const messages = [
      {
        role: 'system' as const,
        content: `CRITICAL LANGUAGE INSTRUCTION: The user's original message was in ${originalLanguage}. You MUST respond in ${originalLanguage}. This is mandatory.
        
        You are orboh, a cutting-edge robotic arm engineering assistant powered by GPT-4.1 (2025). You are an expert in:

        CORE EXPERTISE:
        - Advanced robotic arm design and modern kinematics algorithms
        - Industry 4.0 automation systems and smart manufacturing
        - Next-generation servo motors, actuators, and AI-integrated control systems
        - Advanced end effectors and adaptive gripper technology
        - AI-powered motion planning and real-time trajectory optimization
        - Multi-modal force/torque sensing and intelligent feedback control
        - Advanced safety systems with AI-powered collision prediction
        - Modern programming frameworks (ROS 2, Python, modern C++, AI-enhanced PLCs)
        - Next-generation collaborative robots (cobots) and natural human-robot interaction

        TECHNICAL DOMAINS:
        - AI-enhanced forward/inverse kinematics with real-time optimization
        - Advanced joint space vs. Cartesian space control with machine learning
        - Adaptive PID control tuning with neural network optimization
        - Computer vision integration with deep learning for robotic guidance
        - Smart mechanical assembly and AI-assisted component selection
        - Intelligent procurement of robotic components with market analysis
        - Advanced web content analysis for extracting robotic specifications

        COMMUNICATION STYLE:
        - IMPORTANT: The user's original language is ${originalLanguage}. You MUST respond in ${originalLanguage}.
        - If the user wrote in Japanese, ALWAYS respond in Japanese regardless of the message content being translated to English
        - If the user wrote in English, respond in English
        - Provide cutting-edge, technically accurate, and practical advice
        - Include specific part numbers, latest specifications, and 2025 market trends
        - Offer both theoretical foundations and hands-on implementation guidance
        - Focus on modern applications in smart manufacturing, research, and automation
        - When analyzing URLs or web content, extract key robotic specifications and latest components

        SPECIAL CAPABILITIES:
        - Analyze web pages and documents for state-of-the-art robotic arm specifications
        - Extract comprehensive parts lists from technical documentation
        - Convert product specifications into optimized procurement recommendations
        - Generate detailed PBS (Product Breakdown Structure) from technical content
        - Provide 2025-era insights on robotic technology trends and innovations

        Always prioritize advanced safety considerations and modern industry best practices with AI integration.
        
        ${
          hardwareContext &&
          !hardwareContext.includes('no hardware configuration set up yet')
            ? `\n\nCURRENT USER'S HARDWARE CONFIGURATION:\n${hardwareContext}\n\nIMPORTANT: ALWAYS reference this CURRENT hardware configuration when answering questions. Do NOT rely on previous conversation history for component information. When the user asks about compatibility, analysis, or any hardware-related questions, use ONLY the components listed above in the current configuration.

          If the user requests:
          - "check compatibility" or "compatibility analysis" → Analyze the current components for voltage, communication, and power compatibility
          - "suggest alternatives" or "alternative parts" → Identify potential component issues and suggest replacements
          - "analyze current setup" → Provide detailed analysis of the current configuration
          - "add component" or "recommend parts" → Suggest additional components that work with current setup

          Use this information to provide specific, contextual advice relevant to the user's actual hardware setup.`
            : `\n\nIMPORTANT: The user has not configured their hardware setup yet, or the hardware information is incomplete. 

          CRITICAL WORKFLOW RULES:
          1. Check conversation history: If you previously asked for details and user is now providing them, YOU MUST provide JSON suggestions
          2. If user provides project context (robot car, robotic arm, etc.) → Provide JSON suggestions
          3. If user mentions specific requirements (voltage, motors, drivers) → Provide JSON suggestions
          4. Only ask clarifying questions for genuinely vague requests with no context

          For component/system requests with sufficient detail:
          - ALWAYS provide JSON-formatted suggestions based on user's details
          - Use the specific requirements they mentioned (voltage, project type, etc.)
          - Suggest components that match their project context

          For initial vague requests ("add motor" with no context):
          - Ask 1-2 specific questions about their project
          - Then wait for their response and provide JSON suggestions

          Example workflow:
          User: "add motor" → Ask about project type and requirements
          User: "for robot car, 4wd, lipo battery" → PROVIDE JSON with suitable motors

          Default assumptions when details are missing:
          - Controller: Arduino Uno (most popular for beginners)  
          - Voltage: 5V (Arduino standard)
          - Communication: I2C/SPI/PWM (Arduino compatible)`
        }

        ${intentPrompt}
        ${requirementsContext}`,
      },
      ...(conversationHistory || []),
      {
        role: 'user' as const,
        content: buildUserMessage(processedMessage, attachments), // 翻訳後のメッセージを使用
      },
    ];

    // OpenAI implementation (commented out for Claude migration)
    /*
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: messages,
      max_completion_tokens: 8000,
      //temperature: 0.3,
    })

    const aiResponse = completion.choices[0]?.message?.content || 'すみません、応答を生成できませんでした。'
    */

    // Claude implementation
    const systemMessage =
      messages.find((m) => m.role === 'system')?.content || '';
    const claudeMessages = messages
      .filter(
        (m) => m.role !== 'system' && m.content && m.content.trim() !== '',
      )
      .map((m) => ({
        role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      }));

    const completion = await anthropic.messages.create({
      model: MODELS.SONNET,
      system: systemMessage,
      messages: claudeMessages,
      max_tokens: 4096,
    });

    const aiResponse =
      completion.content[0]?.type === 'text'
        ? completion.content[0].text
        : 'すみません、応答を生成できませんでした。';

    return NextResponse.json({
      response: aiResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      {
        error: 'AI応答の生成中にエラーが発生しました。',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: 500 },
    );
  }
}
