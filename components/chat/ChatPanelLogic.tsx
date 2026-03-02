'use client';

import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { debounce } from '@/utils/debounce';
import { ChatStreamHandler } from '@/utils/chat/streamHandler';
import type { NodeData, Connection, ChatMessage, Project } from '@/types';
import type { Node } from '@xyflow/react';
import type { Session } from 'next-auth';
import type {
  PartSuggestion,
  AlternativePart,
} from '@/utils/components/alternativePartsFinder';
import { checkSystemCompatibility } from '@/utils/connections/validation/unifiedCompatibilityChecker';
// import { generateSmartPBSStructure } from '@/utils/project/smartGrouping'
// import {
//   extractComponentSuggestions,
//   extractSystemSuggestions,
//   convertSuggestionToNode,
//   convertSystemToNodes,
//   convertSystemToConnections,
//   calculateSuggestionPosition,
//   calculateSystemPosition,
//   getPendingComponentsCount
// } from '@/utils/ai/processing/componentSuggestionExtractor'
import { RequirementsDefManager } from '@/lib/managers/RequirementsDefManager';
// 質問生成機能 - AIベースの実装が完了するまで一時的に無効化
// TODO: AIベースの動的質問生成機能を実装後、コメントアウトを解除
// import { QuestionGenerationEngine } from '@/lib/ai/questionGenerator';
import { SystemSuggestionManager } from '@/lib/managers/SystemSuggestionManager';
import { SoftwarePromptGenerator } from '@/lib/ai/softwarePromptGenerator';
import {
  extractStructuredDataFromResponse,
  convertStructuredDataToMarkdown,
  convertMarkdownToTiptap,
} from '@/lib/utils/markdownToTiptap';
import { detectLanguage } from '@/utils/language/languageDetector';
// import { findAlternativeParts } from '@/utils/components/alternativePartsFinder' // 一時的にコメントアウト

// 翻訳関数（chat.tsと同じロジック）
async function translateToEnglish(text: string): Promise<string> {
  console.log('🔤 Starting translation for:', text.substring(0, 50) + '...');

  // 英語の文字、数字、句読点のみで構成されているかチェック
  const englishPattern = /^[a-zA-Z0-9\s.,!?'"()\[\]{}\-_:;@#$%^&*+=<>/\\|`~]+$/;
  if (englishPattern.test(text.trim())) {
    console.log('🔤 Text is already in English, skipping translation');
    return text; // 既に英語の場合はそのまま返す
  }

  try {
    // タイムアウト付きfetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒のタイムアウト

    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('Translation failed');
    }

    const data = await response.json();
    console.log('🔤 Translation successful');
    return data.translatedText || text;
  } catch (error) {
    if ((error as any).name === 'AbortError') {
      console.error('Translation timeout after 30 seconds');
    } else {
      console.error('Translation error:', error);
    }
    return text; // フォールバック：翻訳に失敗した場合は元のテキストを使用
  }
}

// ChatPanelビジネスロジック専用フック
export function useChatPanelLogic({
  nodes,
  connections,
  // setNodes,
  // setConnections,
  chatMessages,
  setChatMessages,
  currentProject,
  addSuggestion,
  handleSendMessage,
  chatMode,
  session,
}: {
  nodes: Node<NodeData>[];
  connections: Connection[];
  setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>;
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  currentProject: Project | null;
  addSuggestion: (suggestion: PartSuggestion) => void;
  handleSendMessage: (
    message: string | ChatMessage,
    files?: FileList | null,
    skipAnalysis?: boolean,
  ) => Promise<void>;
  chatMode?: 'normal' | 'requirements';
  session?: Session | null;
}) {
  // State for requirements dialogue tracking
  const [activeRequirementId, setActiveRequirementId] = useState<string | null>(
    null,
  );
  // 質問管理用ステート - AIベースの実装まで無効化
  // const [pendingQuestions, setPendingQuestions] = useState<AIQuestion[]>([]);
  // 一時的にpendingQuestionsを空配列として定義（エラー回避用）
  const pendingQuestions: any[] = [];
  // State for system suggestion tracking
  const [latestSystemSuggestion, setLatestSystemSuggestion] = useState<{
    systemId: string;
    components: Array<{ id: string; name: string }>;
    connections: Array<{ from: string; to: string }>;
  } | null>(null);
  const [softwarePromptGenerated, setSoftwarePromptGenerated] = useState(false);

  // 代替部品の提案チェック
  const checkAndSuggestAlternatives = useCallback(async () => {
    if (nodes.length === 0) return;

    try {
      for (const node of nodes) {
        if (node.data.title && node.data.description) {
          // 🚀 React Flow完全移行: 代替部品提案のモックデータ生成（React Flow Node型対応）
          const mockAlternatives: AlternativePart[] = [
            {
              id: `alt-${node.id}-1`,
              title: `${node.data.title} Pro`,
              modelNumber: `${node.data.modelNumber || 'MODEL'}-PRO`,
              voltage: node.data.voltage,
              communication: node.data.communication,
              description: `Enhanced version of ${node.data.title}`,
              category: 'upgraded',
              compatibilityScore: 95,
              priceEstimate: '$25-35',
              advantages: ['Better performance', 'Lower power consumption'],
              tradeoffs: ['Slightly higher cost'],
            },
          ];

          if (mockAlternatives.length > 0) {
            const suggestion: PartSuggestion = {
              problemComponentId: node.id,
              problemComponentName: node.data.title,
              issue: {
                componentId: node.id,
                componentName: node.data.title,
                issue: 'Performance optimization opportunity',
                severity: 'warning' as const,
                recommendation:
                  'Consider alternative parts for better performance and cost',
                type: 'compatibility',
                affectedComponents: [node.id],
                affectedComponentNames: [node.data.title],
              } as any,
              alternatives: mockAlternatives,
              recommendation: 'Performance optimization and cost reduction',
            };
            addSuggestion(suggestion);
          }
        }
      }
    } catch (error) {
      console.error('Error finding alternative parts:', error);
    }
  }, [nodes, addSuggestion]);

  // 互換性チェックリクエスト処理
  const handleCompatibilityRequest = useCallback(() => {
    if (nodes.length < 2) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content:
            '⚠️ You need at least 2 components to run a compatibility check. Please add more components to your system diagram first.',
          timestamp: new Date().toISOString(),
        },
      ]);
      return;
    }

    const compatibilityResult = checkSystemCompatibility(nodes, connections);

    if (compatibilityResult.isCompatible) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `✅ **Compatibility Check Passed!**\n\n${compatibilityResult.summary}\n\nYour system components are compatible and should work well together.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } else {
      const issuesList = compatibilityResult.issues
        .map(
          (issue) =>
            `• **${issue.componentName}**: ${issue.issue}\n  💡 *Recommendation*: ${issue.recommendation}`,
        )
        .join('\n\n');

      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `⚠️ **Compatibility Issues Found**\n\n${compatibilityResult.summary}\n\n**Issues:**\n${issuesList}\n\nPlease review and address these compatibility concerns.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [nodes, connections, setChatMessages]);

  // 互換性チェック要求かどうかを判定 (English-based)
  const isCompatibilityCheckRequest = useCallback(async (message: string) => {
    try {
      const englishMessage = await translateToEnglish(message);
      const compatibilityKeywords = [
        'compatibility',
        'compatible',
        'check compatibility',
        'compatibility check',
        'compatibility analysis',
        'analyze compatibility',
        'compatibility issues',
      ];
      return compatibilityKeywords.some((keyword) =>
        englishMessage.toLowerCase().includes(keyword.toLowerCase()),
      );
    } catch (error) {
      console.error('Error in compatibility check:', error);
      return false;
    }
  }, []);

  // Check if message is requirements definition request (English-based)
  const isRequirementsDefinitionRequest = useCallback(
    async (message: string) => {
      try {
        const englishMessage = await translateToEnglish(message);

        const requirementsKeywords = [
          'create requirements',
          'define requirements',
          'help me define requirements',
          'create a specification',
          'define system requirements',
          'want to build',
          'want to create',
          'want to develop',
          'want to construct',
          'need to build',
          'need to create',
          'need to develop',
          'what I want to build',
          'need to define',
          'system requirements',
          'requirement document',
          'requirements document',
          'create new requirements document',
        ];

        // Exclude messages that are likely to be requirements updates or additions
        const exclusionPatterns = [
          'add',
          'update',
          'modify',
          'change',
          'edit',
          'revise',
        ];

        const hasRequirementKeyword = requirementsKeywords.some((keyword) =>
          englishMessage.toLowerCase().includes(keyword.toLowerCase()),
        );

        const hasExclusionPattern = exclusionPatterns.some((pattern) =>
          englishMessage.toLowerCase().includes(pattern.toLowerCase()),
        );

        // Only consider it a new requirements request if it has keywords but not exclusions
        return hasRequirementKeyword && !hasExclusionPattern;
      } catch (error) {
        console.error('Error in requirements definition check:', error);
        return false;
      }
    },
    [],
  );

  // Check if message is system suggestion request based on requirements (English-based)
  const isRequirementsBasedSystemRequest = useCallback(
    async (message: string) => {
      try {
        const englishMessage = await translateToEnglish(message);
        const systemSuggestionKeywords = [
          'system suggestion',
          'system design',
          'system proposal',
          'suggest system',
          'design system',
          'propose system',
          'based on requirements',
          'from requirements',
          'using requirements',
          'optimal system',
          'recommended system',
          'best system',
          'approved requirements',
          'requirement document',
          'build system',
          'create system based on',
        ];
        return systemSuggestionKeywords.some((keyword) =>
          englishMessage.toLowerCase().includes(keyword.toLowerCase()),
        );
      } catch (error) {
        console.error('Error in system request check:', error);
        return false;
      }
    },
    [],
  );

  // Handle requirements definition request
  const handleRequirementsDefinitionRequest = useCallback(
    async (message: string) => {
      console.log('📝 handleRequirementsDefinitionRequest called');

      if (!currentProject) {
        console.log('❌ No current project available');
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content:
              '⚠️ Please create or select a project first to start defining requirements.',
            timestamp: new Date().toISOString(),
          },
        ]);
        return;
      }

      console.log(
        '✅ Current project:',
        currentProject.id,
        currentProject.name,
      );

      // Check for existing requirements documents first
      try {
        const response = await fetch(
          `/api/auto-devlog/documents?projectId=${currentProject.id}&type=requirements`,
        );
        if (response.ok) {
          const { data: documents } = await response.json();
          // Documents are already sorted by updatedAt in descending order
          const existingRequirement = documents?.[0];

          if (existingRequirement) {
            // Existing requirements found
            console.log(
              '📄 Existing requirements found:',
              existingRequirement.id,
              existingRequirement.status,
            );

            // Add user message
            setChatMessages((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                role: 'user',
                content: message,
                timestamp: new Date().toISOString(),
              },
            ]);

            const approvalStatus = existingRequirement.metadata?.approvalStatus;

            if (approvalStatus === 'draft') {
              setChatMessages((prev) => [
                ...prev,
                {
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: `📝 **Existing Requirements Document Found**\n\nThere is a draft requirements document "${existingRequirement.title}".\nLast updated: ${new Date(existingRequirement.metadata.updatedAt).toLocaleString()}\n\nTo add or edit this content, open the requirements document from the Auto Devlog tab.\n\nTo create a new one, type "Create new requirements document".`,
                  timestamp: new Date().toISOString(),
                },
              ]);
            } else if (approvalStatus === 'approved') {
              setChatMessages((prev) => [
                ...prev,
                {
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: `✅ **Approved Requirements Document Found**\n\nThere is an approved requirements document "${existingRequirement.title} v${existingRequirement.metadata.version}".\nLast updated: ${new Date(existingRequirement.metadata.updatedAt).toLocaleString()}\n\nTo update requirements, open the document from the Auto Devlog tab, edit it, and re-approve.\n\nTo create a completely new requirements document, type "Create new requirements document".`,
                  timestamp: new Date().toISOString(),
                },
              ]);
            }
            return;
          }
        }
      } catch (error) {
        console.error('Failed to check existing requirements:', error);
      }

      // No existing requirements, proceed with creation
      // User message already added by caller - don't add again

      // Extract user ID from session (if available)
      const userId =
        (session?.user as any)?.id ||
        (process.env.NODE_ENV === 'development' ? 'dev-user-123' : null);

      if (!userId) {
        console.error('No user ID available for requirements definition');
        setChatMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content:
              '❌ User authentication is required to create requirements. Please sign in and try again.',
            timestamp: new Date().toISOString(),
          } as ChatMessage,
        ]);
        return;
      }

      // Detect user language first
      const userLanguage = detectLanguage(message);
      console.log('🌐 Detected language:', userLanguage);

      // Initial message with progress indicator (language-specific)
      const progressMessageId = `progress-${Date.now()}`;
      const progressContent =
        userLanguage === 'ja'
          ? `📝 **要件定義書を生成中**\n\n⏳ **進捗状況:**\n• 📄 要件定義書を生成中...\n\n約1分で完了予定です。`
          : `📝 **Generating Requirements Document**\n\n⏳ **Progress:**\n• 📄 Generating requirements...\n\nEstimated completion: ~1 minute`;

      setChatMessages((prev) => [
        ...prev,
        {
          id: progressMessageId,
          role: 'assistant',
          content: progressContent,
          timestamp: new Date().toISOString(),
        },
      ]);

      try {
        console.log('🔄 Creating RequirementsDefManager instance');
        const reqManager = new RequirementsDefManager(
          userId,
          currentProject.id,
        );

        console.log(
          '🔄 Calling generateInitialRequirements with message:',
          message,
        );

        // Generate requirements using standard generation (simplified for speed)
        const requirementsDoc = await reqManager.generateInitialRequirements(
          message,
          userLanguage === 'other' ? 'en' : userLanguage,
        );

        // Commented out: 2-part split generation (replaced with faster single generation)
        /*
        let essentialReceived = false;
        let detailedReceived = false;
        
        // Generate requirements using 2-part split generation
        const requirementsDoc = await reqManager.generateSplitRequirements(
          message, 
          userLanguage,
          (part, content) => {
            // Update progress message
            if (part === 'essential') {
              essentialReceived = true;
              setChatMessages((prev) => 
                prev.map(msg => 
                  msg.id === progressMessageId 
                    ? {
                        ...msg,
                        content: `📝 **要件定義書を生成中**\n\n⏳ **進捗状況:**\n• ✅ 基本要件を生成完了 (1/2)\n• 📄 詳細制約を生成中...\n\n**生成済みセクション:**\n• システムの目的と概要\n• 機能要件\n• 性能要件`
                      }
                    : msg
                )
              );
            } else if (part === 'detailed') {
              detailedReceived = true;
              setChatMessages((prev) => 
                prev.map(msg => 
                  msg.id === progressMessageId 
                    ? {
                        ...msg,
                        content: `📝 **要件定義書を生成中**\n\n⏳ **進捗状況:**\n• ✅ 基本要件を生成完了 (1/2)\n• ✅ 詳細制約を生成完了 (2/2)\n\n📊 文書を保存中...`
                      }
                    : msg
                )
              );
            }
          }
        );
        */

        console.log('✅ Requirements document created:', requirementsDoc);

        // Replace progress message with completion message (language-specific)
        const completionContent =
          userLanguage === 'ja'
            ? `✅ **要件定義書の生成完了**\n\n📄 Document ID: ${requirementsDoc.id}\n📊 Status: ${requirementsDoc.status}\n🔖 Version: ${requirementsDoc.version}\n\n**次のステップ:**\n1. Define requirementsタブで要件を確認\n2. 詳細を明確にする質問に回答\n3. 要件定義書を承認`
            : `✅ **Requirements Document Generated**\n\n📄 Document ID: ${requirementsDoc.id}\n📊 Status: ${requirementsDoc.status}\n🔖 Version: ${requirementsDoc.version}\n\n**Next Steps:**\n1. Review requirements in Define requirements tab\n2. Answer clarifying questions\n3. Approve requirements document`;

        setChatMessages((prev) =>
          prev.map((msg) =>
            msg.id === progressMessageId
              ? {
                  ...msg,
                  content: completionContent,
                }
              : msg,
          ),
        );

        // Fire custom event to notify other components (including DevLog)
        window.dispatchEvent(
          new CustomEvent('requirementsUpdated', {
            detail: {
              requirementId: requirementsDoc.id,
              projectId: currentProject.id,
            },
          }),
        );

        // ========== 質問生成機能（一時無効化） ==========
        // AIベースの動的質問生成が実装されるまでコメントアウト
        //
        // const questionEngine = new QuestionGenerationEngine(userLanguage);
        // const existingContent = requirementsDoc.contentText || '';
        // console.log(
        //   '📝 Existing requirements content for question generation:',
        //   existingContent,
        // );
        // const completenessScore = reqManager.calculateCompleteness(existingContent);
        // const context = {
        //   existingRequirements: existingContent,
        //   sectionType: 'hardware' as const,
        //   completenessScore: completenessScore,
        //   previousAnswers: new Map<string, string>(),
        // };
        // const engineQuestions = questionEngine.generateQuestions(context);
        // setPendingQuestions(engineQuestions);
        // setActiveRequirementId(requirementsDoc.id);
        //
        // if (engineQuestions.length > 0) {
        //   const questionText = engineQuestions
        //     .slice(0, 3)
        //     .map(
        //       (q, idx) =>
        //         `${idx + 1}. **${q.question}**\n   💡 ${q.intent}\n   📝 Example: "${q.exampleAnswers?.[0] || 'No example available'}"`,
        //     )
        //     .join('\n\n');
        //
        //   const clarifyMessage =
        //     userLanguage === 'ja'
        //       ? `🔍 **詳細を明確にするためにいくつか質問させてください:**\n\n${questionText}\n\nより詳細な要件定義を作成するため、これらの質問にお答えください。`
        //       : `🔍 **Let me help clarify some details:**\n\n${questionText}\n\nPlease answer these questions to help me create more detailed requirements.`;
        //
        //   setChatMessages((prev) => [
        //     ...prev,
        //     {
        //       id: Date.now().toString(),
        //       role: 'assistant',
        //       content: clarifyMessage,
        //       timestamp: new Date().toISOString(),
        //     },
        //   ]);
        // }

        // 代替メッセージ（質問機能無効化中）
        setActiveRequirementId(requirementsDoc.id);

        // 重複メッセージを削除 - 既に行528-542で完了メッセージを表示済み

        // ========== 質問生成機能ここまで ==========
      } catch (error) {
        console.error('❌ Requirements definition error:', error);
        console.error('Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });

        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `❌ Failed to create requirements document. 

Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}

Please try again or contact support if the issue persists.`,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentProject, setChatMessages],
  );

  // Handle requirements answer processing
  const handleRequirementsAnswer = useCallback(
    async (answer: string, requirementId?: string, skipUserMessage = false) => {
      // 引数で渡されたIDを優先、なければstateのIDを使用
      const reqId = requirementId || activeRequirementId;
      if (!reqId) return;

      const userId =
        (session?.user as any)?.id ||
        (process.env.NODE_ENV === 'development' ? 'dev-user-123' : null);
      if (!userId) {
        console.error('No user ID available for requirements generation');
        return;
      }
      // Detect language from answer
      const answerLanguage = detectLanguage(answer);
      console.log('🌐 Detected language for answer:', answerLanguage);

      const reqManager = new RequirementsDefManager(userId, currentProject!.id);
      // 質問生成エンジン - 無効化中
      // const questionEngine = new QuestionGenerationEngine(answerLanguage);

      // Check document status before processing
      const documentStatus = await reqManager.getRequirementStatus(reqId);
      console.log('📄 Document status:', documentStatus);

      // Check if this is a special command that should be handled regardless of status
      const isSpecialCommand = [
        'generate software prompt',
        'software development prompt',
        'create software prompt',
        'ソフトウェアプロンプト',
        'コード生成プロンプト',
      ].some((cmd) => answer.toLowerCase().includes(cmd.toLowerCase()));

      if (documentStatus === 'APPROVED' && !isSpecialCommand) {
        // 承認済みの場合のみユーザーメッセージを追加（通常は既に追加済み）
        if (!skipUserMessage) {
          setChatMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'user',
              content: answer,
              timestamp: new Date().toISOString(),
            },
          ]);
        }

        // Detect language from answer
        const docLanguage = detectLanguage(answer);
        const statusMessage =
          docLanguage === 'ja'
            ? `⚠️ **承認済みの要件定義書は編集できません**\n\nこの要件定義書は承認済みのため、直接編集することができません。\n\n以下のいずれかを選択してください：\n1. 「ドラフトに戻す」と入力して編集可能にする\n2. 「新しい要件定義書を作成」と入力して新規作成する`
            : `⚠️ **Cannot edit approved requirements document**\n\nThis requirements document is approved and cannot be edited directly.\n\nPlease choose one of the following:\n1. Type "revert to draft" to make it editable\n2. Type "create new requirements document" to create a new one`;

        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString() + '-status',
            role: 'assistant',
            content: statusMessage,
            timestamp: new Date().toISOString(),
          },
        ]);
        return;
      }

      // ユーザーメッセージを追加（skipUserMessageフラグで制御）
      if (!skipUserMessage) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'user',
            content: answer,
            timestamp: new Date().toISOString(),
          },
        ]);
      }

      // If no pending questions, treat as additional requirements input
      // if (pendingQuestions.length === 0) {
      if (true) {
        // 質問機能は無効化中なので常にtrue
        // Define loading message ID at the outer scope
        const loadingMessageId = Date.now().toString();

        try {
          // Process the answer as a requirement update
          // First show loading animation
          setChatMessages((prev) => [
            ...prev,
            {
              id: loadingMessageId,
              role: 'assistant',
              content: '', // Empty content triggers loading animation
              timestamp: new Date().toISOString(),
            },
          ]);

          // After a short delay, show the updating text
          setTimeout(() => {
            setChatMessages((prev) =>
              prev.map((msg) =>
                msg.id === loadingMessageId
                  ? { ...msg, content: '📝 Updating requirements document' }
                  : msg,
              ),
            );
          }, 500);

          // Detect user language
          const updateLanguage = detectLanguage(answer);
          console.log('🌐 Detected language for update:', updateLanguage);

          // Call processUserAnswer to update via AI
          const response = await reqManager.processUserAnswer(
            reqId,
            'direct-update', // Special ID for direct updates
            answer,
            updateLanguage === 'other' ? 'en' : updateLanguage,
          );

          // Update the requirements document in the database
          if (response.tiptapContent) {
            await reqManager.updateRequirement(reqId, {
              content: response.tiptapContent,
              contentText: response.content,
              status: 'DRAFT',
              updatedAt: new Date().toISOString(),
            });
          }

          // Check if user is asking for questions
          if (response.action === 'generate_questions') {
            console.log(
              '🔍 User requested questions, generating new questions...',
            );

            // Generate new questions based on current requirements
            // Get the latest content from the response (which includes all updates)
            const currentContent = response.content || '';
            console.log(
              '📝 Current requirements content after update:',
              currentContent,
            );

            const context = {
              existingRequirements: currentContent,
              sectionType: 'hardware' as const,
              completenessScore: 70, // Higher score for refinement questions
              previousAnswers: new Map<string, string>(),
            };

            const questions = questionEngine.generateQuestions(context);

            if (questions.length > 0) {
              setPendingQuestions(questions);
              const firstQuestion = questions[0];
              // Replace loading message with question
              setChatMessages((prev) =>
                prev.map((msg) =>
                  msg.id === loadingMessageId
                    ? {
                        ...msg,
                        content: `🔍 **Let me help clarify some details:**\n\n**${firstQuestion.question}**\n💡 ${firstQuestion.intent}\n📝 Example: "${firstQuestion.exampleAnswers?.[0] || 'No example available'}"`,
                      }
                    : msg,
                ),
              );
            } else {
              // Replace loading message with completion message
              setChatMessages((prev) =>
                prev.map((msg) =>
                  msg.id === loadingMessageId
                    ? {
                        ...msg,
                        content: `📋 Your requirements document is already quite comprehensive! If you have specific areas you'd like to expand, please let me know.`,
                      }
                    : msg,
                ),
              );
            }
          } else {
            // Normal update flow - replace loading message
            setChatMessages((prev) =>
              prev.map((msg) =>
                msg.id === loadingMessageId
                  ? {
                      ...msg,
                      content: `✅ Requirements document updated successfully!\n\nThe updates have been applied and are now visible in the Auto Devlog tab.\nYou can continue adding requirements or click "Approve & Build System" when ready.`,
                    }
                  : msg,
              ),
            );
          }

          // Fire custom event to notify other components
          window.dispatchEvent(
            new CustomEvent('requirementsUpdated', {
              detail: {
                requirementId: reqId,
                projectId: currentProject!.id,
              },
            }),
          );

          // Continue the requirements dialogue
          return;
        } catch (error) {
          console.error('Error updating requirements:', error);
          setChatMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: `❌ Failed to update requirements document. Please try again.`,
              timestamp: new Date().toISOString(),
            },
          ]);
          return;
        }
      }

      try {
        // Process the answer for the first pending question
        // const currentQuestion = pendingQuestions[0];
        const currentQuestion = null; // 質問機能無効化中

        // Detect user language
        const answerLanguage = detectLanguage(answer);
        console.log('🌐 Detected language for answer:', answerLanguage);

        const response = await reqManager.processUserAnswer(
          reqId,
          currentQuestion.id,
          answer,
          answerLanguage,
        );

        // Update the requirements document in the database
        if (response.tiptapContent) {
          await reqManager.updateRequirement(reqId, {
            content: response.tiptapContent,
            contentText: response.content,
            status: 'DRAFT',
            updatedAt: new Date().toISOString(),
          });
        }

        // Handle the response - check if it's a question generation request
        if (response.action === 'generate_questions') {
          console.log('🔍 User requested more questions instead of answering');

          // Generate new questions based on current requirements
          const currentContent = response.content || '';
          console.log(
            '📝 Current requirements content for new questions:',
            currentContent,
          );

          const context = {
            existingRequirements: currentContent,
            sectionType: 'hardware' as const,
            completenessScore: reqManager.calculateCompleteness(currentContent), // Calculate based on content
            previousAnswers: new Map<string, string>(),
          };

          const newQuestions = questionEngine.generateQuestions(context);

          if (newQuestions.length > 0) {
            // Replace current questions with new ones
            setPendingQuestions(newQuestions);
            const firstQuestion = newQuestions[0];
            setChatMessages((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                role: 'assistant',
                content:
                  answerLanguage === 'ja'
                    ? `🔍 **詳細を明確にするためにいくつか質問させてください:**\n\n**${firstQuestion.question}**\n💡 ${firstQuestion.intent}\n📝 例: "${firstQuestion.exampleAnswers?.[0] || '例がありません'}"`
                    : `🔍 **Let me help clarify some details:**\n\n**${firstQuestion.question}**\n💡 ${firstQuestion.intent}\n📝 Example: "${firstQuestion.exampleAnswers?.[0] || 'No example available'}"`,
                timestamp: new Date().toISOString(),
              },
            ]);
          } else {
            setChatMessages((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                role: 'assistant',
                content:
                  answerLanguage === 'ja'
                    ? `📋 要件定義書はすでに十分に詳細です！特定の領域を拡張したい場合はお知らせください。`
                    : `📋 Your requirements document is already quite comprehensive! If you have specific areas you'd like to expand, please let me know.`,
                timestamp: new Date().toISOString(),
              },
            ]);
            setPendingQuestions([]);
          }
          return;
        }

        // Normal flow - document was updated
        const updatedDoc = response;

        // Generate follow-up question based on answer
        const updatedContent = updatedDoc.content || '';
        console.log(
          '📝 Updated requirements content for follow-up:',
          updatedContent,
        );

        const context = {
          existingRequirements: updatedContent,
          sectionType: 'hardware' as const,
          completenessScore: 50, // Updated score
          previousAnswers: new Map<string, string>(),
        };

        const followUpQuestion = questionEngine.generateFollowUpQuestion(
          answer,
          context,
        );

        // Remove answered question and add follow-up if exists
        // const remainingQuestions = pendingQuestions.slice(1);
        const remainingQuestions: any[] = []; // 質問機能無効化中
        if (followUpQuestion) {
          remainingQuestions.unshift(followUpQuestion);
        }
        setPendingQuestions(remainingQuestions);

        // Show next question or completion message
        if (remainingQuestions.length > 0) {
          const nextQuestion = remainingQuestions[0];
          setChatMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: `✅ Got it! I've updated the requirements based on your answer.\n\n🔍 **Next question:**\n\n**${nextQuestion.question}**\n💡 ${nextQuestion.intent}\n📝 Example: "${nextQuestion.exampleAnswers?.[0] || 'No example available'}"`,
              timestamp: new Date().toISOString(),
            },
          ]);

          // Fire custom event to notify other components
          window.dispatchEvent(
            new CustomEvent('requirementsUpdated', {
              detail: {
                requirementId: reqId,
                projectId: currentProject!.id,
              },
            }),
          );
        } else {
          // Validate final requirements
          const validation = questionEngine.validateRequirements(
            updatedDoc.contentText || '',
          );

          if (validation.isValid) {
            setChatMessages((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                role: 'assistant',
                content: `🎉 **Requirements Definition Complete!**\n\n✅ All critical information has been gathered.\n📄 Your requirements document is ready for review.\n\n**Next steps:**\n1. Review the complete document in the Auto Devlog tab\n2. Make any final edits using the rich text editor\n3. Submit for approval when ready\n\nThe document is now ready to be used for system proposals!`,
                timestamp: new Date().toISOString(),
              },
            ]);
          } else {
            setChatMessages((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                role: 'assistant',
                content: `⚠️ **Requirements need more detail:**\n\n${validation.suggestions.join('\n')}\n\nWould you like to add more information?`,
                timestamp: new Date().toISOString(),
              },
            ]);
          }

          // Fire custom event to notify other components
          window.dispatchEvent(
            new CustomEvent('requirementsUpdated', {
              detail: {
                requirementId: reqId,
                projectId: currentProject!.id,
              },
            }),
          );

          setActiveRequirementId(null);
          setPendingQuestions([]);
        }
      } catch (error) {
        console.error('Error processing answer:', error);
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: '❌ Failed to process your answer. Please try again.',
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    },
    [
      activeRequirementId,
      // pendingQuestions, // 質問機能無効化中のため除外
      currentProject,
      setChatMessages,
      session?.user?.id,
    ],
  );

  // Handle requirements-based system suggestion request
  const handleRequirementsBasedSystemRequest = useCallback(async () => {
    if (!currentProject) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content:
            '⚠️ Please create or select a project first to generate system suggestions.',
          timestamp: new Date().toISOString(),
        },
      ]);
      return;
    }

    const userId =
      session?.user?.id ||
      (process.env.NODE_ENV === 'development' ? 'dev-user-123' : null);
    if (!userId) {
      console.error('No user ID available for system suggestion');
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            '❌ User authentication is required. Please sign in and try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
      return;
    }
    const systemManager = new SystemSuggestionManager(
      userId,
      currentProject.id,
    );

    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: `🔍 **Checking for approved requirements...**\\n\\nSearching for approved requirement documents that can be used for system suggestions. Only approved requirements will be considered for system design.`,
        timestamp: new Date().toISOString(),
      },
    ]);

    try {
      // Check for approved requirements
      const approvedRequirements =
        await systemManager.checkApprovedRequirements();

      if (approvedRequirements.length === 0) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `❌ **No approved requirements found**\\n\\nTo generate system suggestions, you need:\\n\\n1. ✅ **Create requirement documents** using dialogue with AYA\\n2. ✅ **Complete the review process** for each requirement\\n3. ✅ **Get requirements approved** by reviewers\\n4. 🔄 **Request system suggestions** based on approved requirements\\n\\nWould you like me to help you create requirement documents first?`,
            timestamp: new Date().toISOString(),
          },
        ]);
        return;
      }

      // Show approved requirements and generate suggestions
      const requirementsList = approvedRequirements
        .map(
          (req, idx) =>
            `${idx + 1}. **${req.title}** (v${req.version}) - Approved ${new Date(req.approvedAt!).toLocaleDateString()}`,
        )
        .join('\\n');

      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `✅ **Found ${approvedRequirements.length} approved requirement${approvedRequirements.length > 1 ? 's' : ''}:**\\n\\n${requirementsList}\\n\\n🚀 **Generating system suggestions...**\\n\\nAnalyzing requirements and creating optimal system designs with component recommendations, cost estimates, and technical specifications.`,
          timestamp: new Date().toISOString(),
        },
      ]);

      // Generate system suggestions based on all approved requirements
      const requirementIds = approvedRequirements.map((req) => req.id);
      const systemData =
        await systemManager.getSystemSuggestionsWithTraceability(
          requirementIds,
        );

      // Display analysis results
      const analysisText =
        `📊 **Requirements Analysis:**\\n\\n` +
        `• **System Type**: ${systemData.analysis.systemType.replace(/-/g, ' ').toUpperCase()}\\n` +
        `• **Key Specifications**: ${
          Object.entries(systemData.analysis.keySpecs)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ') || 'To be determined from detailed requirements'
        }\\n` +
        `• **Constraints**: ${systemData.analysis.constraints.join(', ') || 'None specified'}\\n` +
        `• **Priorities**: ${systemData.analysis.priorities.join(', ') || 'Standard development priorities'}`;

      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: analysisText,
          timestamp: new Date().toISOString(),
        },
      ]);

      // Store the latest system suggestion for software generation
      if (systemData.suggestions.length > 0) {
        setLatestSystemSuggestion({
          suggestion: systemData.suggestions[0],
          requirements: systemData.requirements[0],
          analysis: systemData.analysis,
        });
        setSoftwarePromptGenerated(false);
      }

      // Display each system suggestion
      systemData.suggestions.forEach((suggestion, idx) => {
        const suggestionText =
          `🏗️ **System Option ${idx + 1}: ${suggestion.name}**\\n\\n` +
          `**Description**: ${suggestion.description}\\n\\n` +
          `**Technical Specifications:**\\n` +
          `• **Complexity**: ${suggestion.technicalComplexity.toUpperCase()}\\n` +
          `• **Estimated Cost**: $${suggestion.estimatedCost.min} - $${suggestion.estimatedCost.max} ${suggestion.estimatedCost.currency}\\n` +
          `• **Development Time**: ${suggestion.estimatedDevelopmentTime.min}-${suggestion.estimatedDevelopmentTime.max} ${suggestion.estimatedDevelopmentTime.unit}\\n\\n` +
          `**Key Components** (${suggestion.components.length} items):\\n` +
          suggestion.components
            .slice(0, 3)
            .map(
              (comp) =>
                `• **${comp.name}** (${comp.modelNumber || comp.type}) - $${comp.cost.estimated} ${comp.cost.currency}`,
            )
            .join('\\n') +
          (suggestion.components.length > 3
            ? `\\n• ...and ${suggestion.components.length - 3} more components`
            : '') +
          `\\n\\n**Advantages:**\\n${suggestion.advantages.map((adv) => `✅ ${adv}`).join('\\n')}` +
          (suggestion.limitations.length > 0
            ? `\\n\\n**Limitations:**\\n${suggestion.limitations.map((lim) => `⚠️ ${lim}`).join('\\n')}`
            : '') +
          `\\n\\n**Recommended for**: ${suggestion.recommendedFor.join(', ')}`;

        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: suggestionText,
            timestamp: new Date().toISOString(),
          },
        ]);
      });

      // Add requirement mapping information
      const mappingsByRequirement = systemData.mappings.reduce(
        (acc, mapping) => {
          if (!acc[mapping.requirementId]) {
            acc[mapping.requirementId] = [];
          }
          acc[mapping.requirementId].push(mapping);
          return acc;
        },
        {} as Record<string, typeof systemData.mappings>,
      );

      const mappingText =
        `🔗 **Requirements Traceability:**\\n\\n` +
        Object.entries(mappingsByRequirement)
          .map(([reqId, mappings]) => {
            const req = systemData.requirements.find((r) => r.id === reqId);
            const satisfiedCount = mappings.filter(
              (m) => m.satisfaction === 'full',
            ).length;
            const totalCount = mappings.length;
            return (
              `📋 **${req?.title}**\\n` +
              `• Satisfaction: ${satisfiedCount}/${totalCount} fully addressed\\n` +
              `• Components: ${mappings.map((m) => m.componentIds.length).reduce((a, b) => a + b, 0)} components assigned`
            );
          })
          .join('\\n\\n');

      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content:
            mappingText +
            `\\n\\n💡 **Next Steps:**\\n\\n1. Review the suggested system options above\\n2. Ask for detailed component specifications if needed\\n3. Request cost breakdowns or alternative approaches\\n4. I can add the preferred system components to your project diagram\\n5. Generate software development prompt for external LLM\\n\\nWhich system option interests you most, or would you like me to generate a software development prompt?`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error(
        'Error generating requirements-based system suggestions:',
        error,
      );
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content:
            '❌ Failed to generate system suggestions. Please try again or check that your requirements are properly approved.',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject, setChatMessages]);

  // Handle software prompt generation
  const handleSoftwarePromptGeneration = useCallback(async () => {
    console.log('🤖 handleSoftwarePromptGeneration called');
    console.log('🤖 latestSystemSuggestion:', latestSystemSuggestion);
    console.log('🤖 nodes length:', nodes.length);
    console.log('🤖 connections length:', connections.length);

    // Get nodes from project data if local nodes are empty
    let projectNodes = nodes;
    if (nodes.length === 0 && currentProject?.id) {
      console.log('🤖 Local nodes empty, fetching from project data...');
      try {
        const response = await fetch('/api/projects/get-or-create-new', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          projectNodes = data.project.nodes || [];
          console.log('🤖 Fetched nodes from project:', projectNodes.length);
        }
      } catch (error) {
        console.error('Failed to fetch project nodes:', error);
      }
    }

    // Check if we have nodes but no latestSystemSuggestion
    if (!latestSystemSuggestion && projectNodes.length > 0) {
      console.log(
        '🤖 No latestSystemSuggestion but nodes exist, creating from current state',
      );

      // Create a system suggestion from current nodes
      const systemComponents = projectNodes
        .filter(
          (node) =>
            node.data && (node.data.modelNumber || node.data.basePartId),
        )
        .map((node) => ({
          name: node.data.title || node.data.instanceName || 'Component',
          type: node.data.category || 'component',
          modelNumber: node.data.modelNumber || '',
          quantity: node.data.quantity || 1,
          description: node.data.description || '',
          cost: {
            estimated: parseInt(node.data.price) || 0,
            currency: 'JPY',
          },
          specifications: node.data.specifications || {},
        }));

      if (systemComponents.length > 0) {
        // Create temporary system suggestion from current nodes
        const tempSystemSuggestion = {
          suggestion: {
            name: 'Current System Design',
            description: 'Hardware system design from current components',
            components: systemComponents,
            technicalComplexity: 'medium',
            estimatedCost: { min: 0, max: 10000, currency: 'JPY' },
            estimatedDevelopmentTime: { min: 1, max: 2, unit: 'weeks' },
            advantages: [],
            limitations: [],
            recommendedFor: [],
          },
          requirements: {
            contentText: 'System requirements',
            title: 'System Requirements',
          },
          analysis: {
            systemType: 'embedded-system',
            keySpecs: {},
            constraints: [],
            priorities: [],
          },
        };

        // Generate software prompt with temporary data
        try {
          const generator = new SoftwarePromptGenerator();
          const prompt = generator.generatePrompt({
            systemSuggestion: tempSystemSuggestion.suggestion,
            requirements: tempSystemSuggestion.requirements,
            nodes: projectNodes,
            connections,
          });

          // Display in chat
          setChatMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: `🤖 **Software Development Prompt Generated!**

Copy the following prompt to your preferred LLM service (ChatGPT, Claude, etc.):

\`\`\`markdown
${prompt}
\`\`\`

📋 Click the copy button above to copy the entire prompt.

**Tips for best results:**
- Use with GPT-4, Claude 3, or similar advanced models
- Provide any additional context specific to your use case
- Review and customize the generated code as needed
- Test thoroughly before deployment`,
              timestamp: new Date().toISOString(),
            },
          ]);

          setSoftwarePromptGenerated(true);
          return;
        } catch (error) {
          console.error('Error generating software prompt:', error);
        }
      }
    }

    if (!latestSystemSuggestion) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content:
            '⚠️ Please complete hardware system design first before generating software prompt.',
          timestamp: new Date().toISOString(),
        },
      ]);
      return;
    }

    try {
      // Generate software prompt
      const generator = new SoftwarePromptGenerator();
      const prompt = generator.generatePrompt({
        systemSuggestion: latestSystemSuggestion.suggestion,
        requirements: latestSystemSuggestion.requirements,
        nodes: projectNodes,
        connections,
      });

      // Display in chat with copy functionality
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `🤖 **Software Development Prompt Generated!**

Copy the following prompt to your preferred LLM service (ChatGPT, Claude, etc.):

\`\`\`markdown
${prompt}
\`\`\`

📋 Click the copy button above to copy the entire prompt.

**Tips for best results:**
- Use with GPT-4, Claude 3, or similar advanced models
- Provide any additional context specific to your use case
- Review and customize the generated code as needed
- Test thoroughly before deployment`,
          timestamp: new Date().toISOString(),
        },
      ]);

      setSoftwarePromptGenerated(true);
    } catch (error) {
      console.error('Error generating software prompt:', error);
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: '❌ Failed to generate software prompt. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [
    latestSystemSuggestion,
    nodes,
    connections,
    setChatMessages,
    currentProject?.id,
  ]);

  // Removed unused isSystemProposalRequest function

  // Handle system proposal request
  const handleSystemProposalRequest = useCallback(async () => {
    try {
      // Check for latest requirements document
      const response = await fetch(
        `/api/auto-devlog/documents?projectId=${currentProject?.id}&type=requirements`,
      );
      if (!response.ok) {
        throw new Error('Failed to fetch requirements');
      }

      const { data: documents } = await response.json();
      // Documents are already sorted by updatedAt in descending order
      const latestRequirement = documents?.[0];

      if (
        latestRequirement &&
        latestRequirement.metadata?.approvalStatus === 'approved'
      ) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `A system has been generated based on the approved requirements document "${latestRequirement.title}".\nLast updated: ${new Date(latestRequirement.metadata.updatedAt).toLocaleString()}\n\nTo generate a new system, edit the requirements document and re-approve it.\n\nYou can review the requirements document in the Auto Devlog tab.`,
            timestamp: new Date().toISOString(),
          },
        ]);
      } else if (
        latestRequirement &&
        latestRequirement.metadata?.approvalStatus === 'draft'
      ) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `To generate a system proposal, please first approve the requirements document "${latestRequirement.title}".\nLast updated: ${new Date(latestRequirement.metadata.updatedAt).toLocaleString()}\n\nReview the requirements document in the Auto Devlog tab and click the "Approve & Build System" button.`,
            timestamp: new Date().toISOString(),
          },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content:
              'To generate a system proposal, you first need to create a requirements document.\n\nType what you want to build to start requirements definition.',
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error checking requirements status:', error);
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content:
            'An error occurred while checking requirements document. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [currentProject?.id, setChatMessages]);

  // Handle structured requirements update from AI response
  const handleStructuredRequirementsUpdate = useCallback(
    async (aiResponse: string) => {
      const structuredData = extractStructuredDataFromResponse(aiResponse);
      if (!structuredData) {
        console.log('❌ No structured data found in AI response');
        return false;
      }

      console.log('📋 Structured data extracted:', structuredData);

      try {
        // Check for existing requirements document
        const response = await fetch(
          `/api/auto-devlog/documents?projectId=${currentProject?.id}&type=requirements`,
        );
        if (!response.ok) {
          throw new Error('Failed to fetch existing requirements');
        }

        const { data: documents } = await response.json();
        const existingRequirement = documents?.[0];

        if (existingRequirement) {
          // Update existing requirements
          console.log(
            '📝 Updating existing requirements document:',
            existingRequirement.id,
          );

          const userId =
            session?.user?.id ||
            (process.env.NODE_ENV === 'development' ? 'dev-user-123' : null);
          if (!userId) {
            console.error('No user ID available for requirements update');
            return;
          }
          const reqManager = new RequirementsDefManager(
            userId,
            currentProject!.id,
          );

          // Convert structured data to markdown and TipTap format
          const updatedMarkdown =
            convertStructuredDataToMarkdown(structuredData);
          const tiptapContent = convertMarkdownToTiptap(updatedMarkdown);

          // Update the document
          await reqManager.updateRequirement(existingRequirement.id, {
            contentText: updatedMarkdown,
            content: tiptapContent,
          });

          setChatMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: `✅ Requirements document updated.\n\nThe following sections have been updated from structured data:\n• System Purpose and Overview\n• Functional Requirements\n• Performance Requirements\n• Constraints\n• Hardware Requirements\n• Software Requirements\n\nYou can review the requirements document in the Auto Devlog tab.`,
              timestamp: new Date().toISOString(),
            },
          ]);

          return true;
        } else {
          // No existing requirements - suggest creating one
          setChatMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: `📝 Structured requirements data detected, but no existing requirements document found.\n\nPlease type "Create requirements document" to create a new requirements document first, then try updating again.`,
              timestamp: new Date().toISOString(),
            },
          ]);
          return true;
        }
      } catch (error) {
        console.error('Error updating structured requirements:', error);
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `❌ Error processing structured requirements data. Please try again.`,
            timestamp: new Date().toISOString(),
          },
        ]);
        return true;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentProject?.id, setChatMessages],
  );

  // Enhanced message sending with structured data processing
  // ストリーミングメッセージ送信
  const handleStreamingMessage = useCallback(
    async (
      message: string,
      files?: FileList | null,
      skipUserMessage = false,
      isFirstMessage = false,
    ) => {
      // ユーザーメッセージを追加（すでに追加済みの場合はスキップ）
      if (!skipUserMessage) {
        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          content: message,
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, userMessage]);
      }

      // AIメッセージのプレースホルダーを追加（毎回新しいIDを生成）
      const aiMessageId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const aiMessage: ChatMessage = {
        id: aiMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, aiMessage]);

      // 既存のストリーミングハンドラーをクローズ
      if (streamHandlerRef.current) {
        streamHandlerRef.current.close();
        streamHandlerRef.current = null;
      }

      // 新しいストリーミングハンドラーを作成（毎回新規作成）
      streamHandlerRef.current = new ChatStreamHandler({
        onMessage: (content) => {
          // ストリーミング中フラグをON
          setIsStreaming(true);
          // ストリーミングコンテンツを追加
          setChatMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? { ...msg, content: msg.content + content }
                : msg,
            ),
          );
        },
        onStatus: (status) => {
          console.log('🔄 Stream status:', status);
          if (status === '応答生成中...') {
            setIsStreaming(true);
          }
        },
        onComplete: (fullContent) => {
          console.log('✅ Stream complete');
          // ストリーミング終了
          setIsStreaming(false);
          // 最終的なコンテンツを設定
          setChatMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId ? { ...msg, content: fullContent } : msg,
            ),
          );
          // ハンドラーをクリア
          streamHandlerRef.current = null;
        },
        onError: (error) => {
          console.error('❌ Stream error:', error);
          // ストリーミング終了
          setIsStreaming(false);
          setChatMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? { ...msg, content: `Error: ${error}` }
                : msg,
            ),
          );
          // ハンドラーをクリア
          streamHandlerRef.current = null;
        },
      });

      // ストリーミングを開始
      const conversationHistory = chatMessages.slice(-10); // 直近10件の履歴
      await streamHandlerRef.current.startStream(
        message,
        files,
        conversationHistory,
        currentProject?.id,
        isFirstMessage,
      );
    },
    [chatMessages, currentProject?.id, setChatMessages],
  );

  const handleEnhancedSendMessage = useCallback(
    async (
      message: string,
      files?: FileList | null,
      isFirstMessage = false,
    ) => {
      // First, send the message normally or with streaming
      // Note: User message already added in handleExtendedSendMessageInternal
      if (process.env.NEXT_PUBLIC_ENABLE_STREAMING === 'true') {
        await handleStreamingMessage(message, files, true, isFirstMessage); // Skip user message (already added)
      } else {
        await handleSendMessage(message, files, true); // Skip user message (already added)
      }

      // Save chat messages to database after sending
      // Increase wait time to ensure messages are properly added to store
      setTimeout(async () => {
        if (currentProject?.id) {
          try {
            console.log('💾 Saving chat messages after enhanced send...');
            const { saveProjectData } = await import(
              '@/utils/project/projectUtils'
            );

            // Get the latest chat messages from the store
            const { useChatStore } = await import('@/stores/chatStore');
            const latestChatMessages = useChatStore.getState().chatMessages;
            console.log(
              '📊 Latest chat messages count:',
              latestChatMessages.length,
            );

            // Also get isSaving and setIsSaving from project store
            const { useProjectStore } = await import('@/stores/projectStore');
            const projectStore = useProjectStore.getState();

            await saveProjectData(
              connections, // Use the connections from props
              currentProject,
              nodes, // Use the nodes from props
              latestChatMessages, // Use latest messages from store
              projectStore.isSaving, // Use actual isSaving state
              projectStore.setIsSaving, // Use actual setIsSaving function
            );
            console.log('✅ Chat messages saved to database');
          } catch (saveError) {
            console.error('Failed to save chat messages:', saveError);
          }
        }
      }, 1500); // Increased wait time to 1.5 seconds for message to be properly added to store

      // Then check the AI response for structured data
      // We need to wait a moment for the AI response to be processed
      setTimeout(async () => {
        try {
          // Get the latest chat messages to find the AI response
          const { useChatStore } = await import('@/stores/chatStore');
          const latestMessages = useChatStore.getState().chatMessages;
          const lastAssistantMessage = latestMessages
            .filter((msg: ChatMessage) => msg.role === 'assistant')
            .pop();

          if (lastAssistantMessage && lastAssistantMessage.content) {
            await handleStructuredRequirementsUpdate(
              lastAssistantMessage.content,
            );
          }
        } catch (error) {
          console.error(
            'Error processing structured data from AI response:',
            error,
          );
        }
      }, 3000); // Increased wait time for AI response
    },
    [
      handleSendMessage,
      handleStreamingMessage,
      handleStructuredRequirementsUpdate,
      currentProject?.id,
      chatMessages,
      nodes,
      connections,
    ],
  );

  // メッセージ送信の重複防止フラグ
  const [isSending, setIsSending] = useState(false);

  // ストリーミング状態管理
  const [isStreaming, setIsStreaming] = useState(false);

  // ストリーミングハンドラー
  const streamHandlerRef = useRef<ChatStreamHandler | null>(null);

  // 拡張メッセージ送信処理（内部実装）
  const handleExtendedSendMessageInternal = useCallback(
    async (
      message: string,
      files?: FileList | null,
      onChatActivated?: () => void,
      options?: { isFirstMessage?: boolean },
    ) => {
      // 重複送信防止
      if (isSending || !message.trim()) return;

      setIsSending(true);
      console.log('🔍 handleExtendedSendMessage called with:', {
        message,
        hasFiles: !!files,
        activeRequirementId,
        // pendingQuestionsLength: pendingQuestions.length,
        pendingQuestionsLength: 0,
        chatMode,
        isFirstMessage: options?.isFirstMessage,
      });

      // 🚀 ユーザーメッセージを即座にチャットに追加（最初に実行）
      const userMessage = {
        id: Date.now().toString(),
        role: 'user' as const,
        content: message,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, userMessage]);
      // setCurrentMessage("")は呼び出し元（ChatPanel）で処理される
      if (onChatActivated) onChatActivated();

      try {
        // 🎯 First message from welcome page: Always use questioning mode
        if (options?.isFirstMessage) {
          console.log(
            '🎯 First message detected - using questioning mode (skipping requirements mode)',
          );
          await handleEnhancedSendMessage(message, files, true);
          if (onChatActivated) onChatActivated();
          return;
        }

        // 要件更新モードの場合、既存の要件書があれば更新、なければ新規作成
        if (chatMode === 'requirements') {
          console.log('📝 Requirements mode active');

          try {
            // 既存の要件書をチェック
            const response = await fetch(
              `/api/auto-devlog/documents?projectId=${currentProject?.id}&type=requirements`,
            );
            if (response.ok) {
              const { data: documents } = await response.json();
              const latestRequirement = documents?.[0];

              if (latestRequirement) {
                // 既存の要件書があれば更新モードへ
                console.log(
                  '📝 Updating existing requirements document:',
                  latestRequirement.id,
                  'Status:',
                  latestRequirement.status,
                );

                // Check if document is approved
                if (latestRequirement.status === 'APPROVED') {
                  // Detect language from user message
                  const msgLanguage = detectLanguage(message);
                  const approvedMessage =
                    msgLanguage === 'ja'
                      ? `⚠️ **承認済みの要件定義書があります**\n\n現在の要件定義書「${latestRequirement.title}」は承認済みです。\n\n以下のオプションから選択してください：\n\n1. **「ドラフトに戻す」** - 承認済みドキュメントを編集可能な状態に戻す\n2. **「新しい要件定義書を作成」** - 新規に要件定義書を作成する\n3. **「新しいバージョンを作成」** - 現在の内容をコピーして新しいバージョンを作成する\n\n例: "ドラフトに戻す" と入力してください`
                      : `⚠️ **Approved requirements document exists**\n\nThe current requirements document "${latestRequirement.title}" is approved.\n\nPlease choose one of the following options:\n\n1. **"revert to draft"** - Make the approved document editable\n2. **"create new requirements document"** - Create a new requirements document\n3. **"create new version"** - Copy current content and create a new version\n\nExample: Type "revert to draft"`;

                  setChatMessages((prev) => [
                    ...prev,
                    {
                      id: Date.now().toString(),
                      role: 'assistant',
                      content: approvedMessage,
                      timestamp: new Date().toISOString(),
                    },
                  ]);
                  if (onChatActivated) onChatActivated();
                  return;
                }

                setActiveRequirementId(latestRequirement.id);
                // すでにユーザーメッセージは追加済みなのでskipUserMessage=true
                await handleRequirementsAnswer(
                  message,
                  latestRequirement.id,
                  true,
                );
              } else {
                // 要件書がなければ新規作成
                console.log('📝 Creating new requirements document');
                await handleRequirementsDefinitionRequest(message);
              }
              if (onChatActivated) onChatActivated();
              return;
            }
          } catch (error) {
            console.error('Error checking requirements:', error);
          }
        }

        // Check for approved document action requests
        const lowerMessage = message.toLowerCase();
        if (
          lowerMessage.includes('ドラフトに戻す') ||
          lowerMessage.includes('revert to draft')
        ) {
          console.log('📝 User requested to revert approved document to draft');

          // Get the latest approved document
          try {
            const response = await fetch(
              `/api/auto-devlog/documents?projectId=${currentProject?.id}&type=requirements`,
            );
            if (response.ok) {
              const { data: documents } = await response.json();
              const approvedDoc = documents?.find(
                (doc: { status: string }) => doc.status === 'APPROVED',
              );

              if (approvedDoc) {
                // Call revert-to-draft API
                const revertResponse = await fetch(
                  `/api/requirements/${approvedDoc.id}/revert-to-draft`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                  },
                );

                if (revertResponse.ok) {
                  // Detect language from user message
                  const revertLanguage = detectLanguage(message);
                  const successMessage =
                    revertLanguage === 'ja'
                      ? `✅ **要件定義書をドラフト状態に戻しました**\n\n「${approvedDoc.title}」を編集可能な状態に戻しました。\n要件更新モードで内容を更新できます。`
                      : `✅ **Requirements document reverted to draft**\n\n"${approvedDoc.title}" is now editable.\nYou can update the content in requirements update mode.`;

                  setChatMessages((prev) => [
                    ...prev,
                    {
                      id: Date.now().toString(),
                      role: 'assistant',
                      content: successMessage,
                      timestamp: new Date().toISOString(),
                    },
                  ]);
                  setActiveRequirementId(approvedDoc.id);
                } else {
                  // Detect language from user message
                  const errorLanguage = detectLanguage(message);
                  const errorMessage =
                    errorLanguage === 'ja'
                      ? `❌ ドラフト状態への変更に失敗しました。もう一度お試しください。`
                      : `❌ Failed to revert to draft status. Please try again.`;

                  setChatMessages((prev) => [
                    ...prev,
                    {
                      id: Date.now().toString(),
                      role: 'assistant',
                      content: errorMessage,
                      timestamp: new Date().toISOString(),
                    },
                  ]);
                }
              }
            }
          } catch (error) {
            console.error('Error reverting to draft:', error);
          }
          if (onChatActivated) onChatActivated();
          return;
        }

        // Check for new version request
        if (
          lowerMessage.includes('新しいバージョンを作成') ||
          lowerMessage.includes('create new version')
        ) {
          console.log(
            '📝 User requested to create new version from approved document',
          );

          try {
            const response = await fetch(
              `/api/auto-devlog/documents?projectId=${currentProject?.id}&type=requirements`,
            );
            if (response.ok) {
              const { data: documents } = await response.json();
              const approvedDoc = documents?.find(
                (doc: { status: string }) => doc.status === 'APPROVED',
              );

              if (approvedDoc) {
                // Detect language from user message
                const versionLanguage = detectLanguage(message);
                const versionMessage =
                  versionLanguage === 'ja'
                    ? `📝 **新しいバージョンの要件定義書を作成します**\n\n承認済みの「${approvedDoc.title}」の内容をベースに新しいバージョンを作成します。\n\n既存の内容を保持しながら、必要な変更を追加してください。`
                    : `📝 **Creating a new version of requirements document**\n\nCreating a new version based on the approved "${approvedDoc.title}".\n\nPlease add your changes while keeping the existing content.`;

                setChatMessages((prev) => [
                  ...prev,
                  {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: versionMessage,
                    timestamp: new Date().toISOString(),
                  },
                ]);

                // Create new document based on approved one
                const newTitle = `${approvedDoc.title} v2`;
                const existingContent =
                  approvedDoc.contentText || approvedDoc.content || '';
                const additionalReqLabel =
                  versionLanguage === 'ja'
                    ? '追加の要件'
                    : 'Additional requirements';
                await handleRequirementsDefinitionRequest(
                  `${newTitle}\n\n${existingContent}\n\n${additionalReqLabel}：${message}`,
                );
              }
            }
          } catch (error) {
            console.error('Error creating new version:', error);
          }
          if (onChatActivated) onChatActivated();
          return;
        }

        // Check for software prompt generation request BEFORE checking requirements dialogue
        // This ensures software prompt commands are handled correctly even during requirements mode
        const softwareKeywords = [
          'generate software prompt',
          'software development prompt',
          'create software prompt',
          'generate code prompt',
          'software prompt',
          'code generation prompt',
          'generate prompt for software',
          'prompt for code',
          'ソフトウェアプロンプト',
          'コード生成プロンプト',
        ];
        const isSoftwarePromptRequestEarly = softwareKeywords.some((keyword) =>
          message.toLowerCase().includes(keyword.toLowerCase()),
        );

        if (isSoftwarePromptRequestEarly) {
          console.log(
            '🤖 Software prompt generation request detected (priority check)',
          );
          await handleSoftwarePromptGeneration();
          return;
        }

        // Check if this is an answer to a pending requirements question OR continuation of requirements dialogue
        if (activeRequirementId) {
          console.log('📋 Processing message as part of requirements dialogue');
          // if (pendingQuestions.length > 0) {
          if (false) {
            // 質問機能無効化中なので常にfalse
            // すでにユーザーメッセージは追加済み
            await handleRequirementsAnswer(message, undefined, true);
          } else {
            // Even without pending questions, treat as requirements refinement
            // すでにユーザーメッセージは追加済み
            await handleRequirementsAnswer(message, undefined, true);
          }
          return;
        }

        // Special case: If user explicitly asks for new requirements document
        if (
          message.toLowerCase().includes('create new requirements document') ||
          lowerMessage.includes('新しい要件定義書を作成')
        ) {
          console.log('📝 Explicit new requirements request');
          await handleRequirementsDefinitionRequest(message);
          if (onChatActivated) onChatActivated();
          return;
        }

        // 一度だけ翻訳を実行して、各検出関数で使い回す
        let translatedMessage: string | null = null;
        const getTranslatedMessage = async () => {
          if (translatedMessage === null) {
            console.log(
              '🔤 Translating message once for all detection functions...',
            );
            translatedMessage = await translateToEnglish(message);
          }
          return translatedMessage;
        };

        // Check for system proposal request first
        console.log('🔍 Checking if system proposal request...');
        const englishMsg1 = await getTranslatedMessage();
        const isSystemProposal = await (async () => {
          const patterns = [
            'suggest system',
            'propose system',
            'system proposal',
            'recommend system',
            'build system diagram',
            'create system',
          ];
          return patterns.some((pattern) =>
            englishMsg1.toLowerCase().includes(pattern.toLowerCase()),
          );
        })();
        console.log('🔍 Is system proposal:', isSystemProposal);
        if (isSystemProposal) {
          console.log('🏗️ System proposal request detected');
          // Add user message first
          setChatMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'user',
              content: message,
              timestamp: new Date().toISOString(),
            },
          ]);
          await handleSystemProposalRequest();
          if (onChatActivated) onChatActivated();
          return;
        }

        // 特別なリクエストをチェック
        // 要件定義を最優先でチェック（より具体的なキーワードが多いため）
        console.log('🔍 Checking if requirements definition request...');
        const englishMsg2 = await getTranslatedMessage();
        const isRequirementsDefinition = await (async () => {
          const requirementsKeywords = [
            'create requirements',
            'define requirements',
            'help me define requirements',
            'create a specification',
            'define system requirements',
            'want to build',
            'want to create',
            'want to develop',
            'want to construct',
            'need to build',
            'need to create',
            'need to develop',
            'what I want to build',
            'need to define',
            'system requirements',
            'requirement document',
            'requirements document',
            'create new requirements document',
          ];
          const exclusionPatterns = [
            'add',
            'update',
            'modify',
            'change',
            'edit',
            'revise',
          ];
          const hasRequirementKeyword = requirementsKeywords.some((keyword) =>
            englishMsg2.toLowerCase().includes(keyword.toLowerCase()),
          );
          const hasExclusionPattern = exclusionPatterns.some((pattern) =>
            englishMsg2.toLowerCase().includes(pattern.toLowerCase()),
          );
          return hasRequirementKeyword && !hasExclusionPattern;
        })();
        console.log('🔍 Is requirements definition:', isRequirementsDefinition);
        if (isRequirementsDefinition) {
          console.log('📝 Requirements definition request detected');
          await handleRequirementsDefinitionRequest(message);
          if (onChatActivated) onChatActivated();
          return;
        }

        console.log('🔍 Checking if compatibility check request...');
        const englishMsg3 = await getTranslatedMessage();
        const isCompatibilityCheck = await (async () => {
          const compatibilityKeywords = [
            'compatibility',
            'compatible',
            'check compatibility',
            'compatibility check',
            'compatibility analysis',
            'analyze compatibility',
            'compatibility issues',
          ];
          return compatibilityKeywords.some((keyword) =>
            englishMsg3.toLowerCase().includes(keyword.toLowerCase()),
          );
        })();
        console.log('🔍 Is compatibility check:', isCompatibilityCheck);
        if (isCompatibilityCheck) {
          console.log('🔗 Compatibility check request detected');
          // Add user message first
          setChatMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'user',
              content: message,
              timestamp: new Date().toISOString(),
            },
          ]);
          handleCompatibilityRequest();
          if (onChatActivated) onChatActivated();
          return;
        }

        console.log('🔍 Checking if requirements-based system request...');
        const englishMsg4 = await getTranslatedMessage();
        const isRequirementsBasedSystem = await (async () => {
          const systemSuggestionKeywords = [
            'system suggestion',
            'system design',
            'system proposal',
            'suggest system',
            'design system',
            'propose system',
            'based on requirements',
            'from requirements',
            'using requirements',
            'optimal system',
            'recommended system',
            'best system',
            'approved requirements',
            'requirement document',
            'build system',
            'create system based on',
          ];
          return systemSuggestionKeywords.some((keyword) =>
            englishMsg4.toLowerCase().includes(keyword.toLowerCase()),
          );
        })();
        console.log(
          '🔍 Is requirements-based system:',
          isRequirementsBasedSystem,
        );
        if (isRequirementsBasedSystem) {
          console.log('🏗️ Requirements-based system request detected');
          // Add user message first
          setChatMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'user',
              content: message,
              timestamp: new Date().toISOString(),
            },
          ]);
          await handleRequirementsBasedSystemRequest();
          if (onChatActivated) onChatActivated();
          return;
        }

        // Software prompt generation is now handled earlier in the function
        // to ensure it takes priority over requirements dialogue processing

        // 通常のメッセージ送信（構造化データの自動処理付き）
        console.log(
          '💬 Sending as normal message with structured data processing',
        );
        await handleEnhancedSendMessage(
          message,
          files,
          options?.isFirstMessage,
        );
        if (onChatActivated) onChatActivated();
      } finally {
        setIsSending(false);
      }
    },
    [
      isSending,
      activeRequirementId,
      // pendingQuestions, // 質問機能無効化中のため除外
      handleRequirementsAnswer,
      handleSystemProposalRequest,
      handleCompatibilityRequest,
      handleRequirementsDefinitionRequest,
      handleRequirementsBasedSystemRequest,
      handleEnhancedSendMessage,
      handleSoftwarePromptGeneration,
      chatMode,
      currentProject?.id,
      setChatMessages,
      setActiveRequirementId,
    ],
  );

  // デバウンスされたメッセージ送信（連続送信防止）
  const handleExtendedSendMessage = useMemo(
    () => debounce(handleExtendedSendMessageInternal, 100), // 100msのデバウンス
    [handleExtendedSendMessageInternal],
  );

  // 提案受け入れ処理
  const handleAcceptSuggestion = useCallback(
    async (suggestionId: string, alternativeId: string) => {
      try {
        const response = await fetch('/api/suggestions/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            suggestionId,
            alternativeId,
            projectId: currentProject?.id,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setChatMessages((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                role: 'assistant',
                content: `✅ **Alternative part applied successfully!**\n\nUpdated component: ${result.updatedComponent}\nNew part: ${result.newPart}`,
                timestamp: new Date().toISOString(),
              },
            ]);
          }
        }
      } catch (error) {
        console.error('Error applying suggestion:', error);
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content:
              '❌ Failed to apply the alternative part suggestion. Please try again.',
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    },

    [currentProject, setChatMessages],
  );

  // Auto-suggest software prompt generation after system suggestion
  // Temporarily disabled automatic software prompt suggestion
  /*
  useEffect(() => {
    if (latestSystemSuggestion && !softwarePromptGenerated) {
      // Wait 3 seconds then suggest
      const timer = setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content:
              '💡 **Would you like me to generate a software development prompt for this hardware system?**\n\nI can create a detailed prompt that you can use with ChatGPT, Claude, or other LLM services to generate the embedded software code for your system.\n\nJust say "generate software prompt" to proceed.',
            timestamp: new Date().toISOString(),
          },
        ]);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [latestSystemSuggestion, softwarePromptGenerated, setChatMessages]);
  */

  // Listen for system construction completion event
  useEffect(() => {
    const handleSystemConstructionCompleted = () => {
      console.log(
        '🏗️ System construction completed, clearing requirements mode',
      );
      setActiveRequirementId(null);
      setPendingQuestions([]);
    };

    const handleSystemDesignReady = () => {
      console.log(
        '🎯 System design ready, storing for software prompt generation',
      );
      // Placeholder for system design handling
      // This will be implemented when event data is properly passed
      setSoftwarePromptGenerated(false);
    };

    window.addEventListener(
      'systemConstructionCompleted',
      handleSystemConstructionCompleted as EventListener,
    );
    window.addEventListener(
      'systemDesignReady',
      handleSystemDesignReady as EventListener,
    );

    return () => {
      window.removeEventListener(
        'systemConstructionCompleted',
        handleSystemConstructionCompleted as EventListener,
      );
      window.removeEventListener(
        'systemDesignReady',
        handleSystemDesignReady as EventListener,
      );
    };
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      streamHandlerRef.current?.close();
    };
  }, []);

  return {
    // extractAndAddSuggestedComponents, // 一時的にコメントアウト
    // extractAndAddSystemSuggestions, // 一時的にコメントアウト
    checkAndSuggestAlternatives,
    handleCompatibilityRequest,
    // handleAlternativePartsRequest, // 一時的にコメントアウト
    handleRequirementsDefinitionRequest,
    handleRequirementsBasedSystemRequest,
    handleExtendedSendMessage,
    handleAcceptSuggestion,
    isCompatibilityCheckRequest,
    // isAlternativePartsRequest, // 一時的にコメントアウト
    isRequirementsDefinitionRequest,
    isRequirementsBasedSystemRequest,
    isStreaming, // ストリーミング状態を返す
  };
}
