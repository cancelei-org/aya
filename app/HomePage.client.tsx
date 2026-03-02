'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { Node } from '@xyflow/react';
import type { ChatMessage } from '@/types';
import { useProjectStore } from '@/stores';
import { useStores } from '@/hooks/useStores';
import { processSystemDesign } from '@/utils/parts/systemDesignHandler';

// Heavy component loaded only after authentication
const AppLayout = dynamic(() => import('@/app/layout/AppLayout'), {
  loading: () => <div>Loading...</div>,
  ssr: false,
});

const MainCanvas = dynamic(
  () =>
    import('@/components/canvas/MainCanvas').then((mod) => ({
      default: mod.MainCanvas,
    })),
  { ssr: false },
);

const ChatPanel = dynamic(
  () =>
    import('@/components/chat/ChatPanel').then((mod) => ({
      default: mod.ChatPanel,
    })),
  { ssr: false },
);

export default function HomePageClient() {
  // Authentication
  const { data: session, status } = useSession();
  const router = useRouter();

  // Get state from stores (shared state)
  const {
    nodes,
    connections,
    chatMessages,
    currentProject,
    isSaving,
    setNodes: setCanvasNodes,
    setConnections,
    setIsSaving,
    setChatMessages,
    // AI Processing states
    isAnalyzing,
    setIsAnalyzing,
    llmStatus,
    setLlmStatus,
    setFailedConnections,
  } = useStores();

  // Local state only for this component
  const [isGenerating, setIsGenerating] = useState(false);
  const [, setGenerationStage] = useState('');
  const [, setGenerationMessage] = useState('');
  const [, setGenerationProgress] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [showEnhanced, setShowEnhanced] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [, setIsEnhancing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isQuickChatOpen, setIsQuickChatOpen] = useState(false);
  const [quickChatHistory, setQuickChatHistory] = useState<ChatMessage[]>([]);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [devLogId, setDevLogId] = useState('');
  const [projectData, setProjectData] = useState<Record<
    string,
    unknown
  > | null>(null);
  const { setCurrentProject } = useProjectStore();
  const [, setDevLogLoadingState] = useState({
    isLoading: false,
    error: null as string | null,
    currentStep: '',
  });
  // isAnalyzing, llmStatus, failedConnections are now from stores
  const [, setIsAdmin] = useState(false);
  const [, setUserId] = useState('');

  // Save state to localStorage
  const saveProjectState = useCallback(() => {
    if (!projectData) return;

    const stateToSave = {
      nodes,
      connections,
      chatMessages,
      showChat,
      showEnhanced,
      isQuickChatOpen,
      quickChatHistory,
      selectedNodeIds,
      selectedCards: Array.from(selectedCards),
      devLogId,
    };

    // Save to localStorage
    const projectId =
      (projectData?.project as { id?: string })?.id || 'default';
    localStorage.setItem(`project-${projectId}`, JSON.stringify(stateToSave));
  }, [
    nodes,
    connections,
    chatMessages,
    showChat,
    showEnhanced,
    isQuickChatOpen,
    quickChatHistory,
    selectedNodeIds,
    selectedCards,
    devLogId,
    projectData,
  ]);

  // Load state from localStorage or API data
  const loadProjectState = useCallback(
    (projectData: Record<string, unknown>) => {
      const projectId =
        (projectData?.project as { id?: string })?.id || 'default';
      const savedStateStr = localStorage.getItem(`project-${projectId}`);

      console.log('📂 Loading project state...');
      console.log('  localStorage exists:', !!savedStateStr);

      if (savedStateStr) {
        // Priority 1: Load from localStorage (most recent temporary state)
        try {
          const savedState = JSON.parse(savedStateStr);
          console.log('  Loading from localStorage:', {
            nodes: savedState.nodes?.length || 0,
            chatMessages: savedState.chatMessages?.length || 0,
          });
          setCanvasNodes(savedState.nodes || []);
          setConnections(savedState.connections || []);
          setChatMessages(savedState.chatMessages || []);
          setShowChat(savedState.showChat || false);
          setShowEnhanced(savedState.showEnhanced || false);
          setIsQuickChatOpen(savedState.isQuickChatOpen || false);
          setQuickChatHistory(savedState.quickChatHistory || []);
          setSelectedNodeIds(savedState.selectedNodeIds || []);
          setSelectedCards(new Set(savedState.selectedCards || []));
          setDevLogId(savedState.devLogId || '');
        } catch (error) {
          console.error('Failed to load project state:', error);
        }
      } else {
        // Priority 2: Load from database via API (persistent data)
        const project = projectData.project as {
          nodes?: unknown[];
          connections?: unknown[];
          chatMessages?: unknown[];
          pbsStructure?: unknown;
        };
        console.log('  Loading from API:', {
          hasProject: !!project,
          chatMessages: (project?.chatMessages as unknown[])?.length || 0,
          nodes: (project?.nodes as unknown[])?.length || 0,
        });
        if (project) {
          if (project.nodes) setCanvasNodes(project.nodes as []);
          if (project.connections) setConnections(project.connections as []);
          if (project.chatMessages) {
            console.log(
              '  Setting chat messages from API:',
              (project.chatMessages as unknown[]).length,
            );
            setChatMessages(project.chatMessages as []);
          }
          if (project.pbsStructure) {
            // Handle PBS structure if needed
            console.log(
              'PBS Structure loaded from database:',
              project.pbsStructure,
            );
          }
        }
      }
    },
    [setCanvasNodes, setConnections, setChatMessages],
  );

  // Authentication check - redirect to login if not authenticated
  useEffect(() => {
    if (status === 'loading') return; // Wait for session to load

    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
  }, [status, router]);

  // Check admin status - do this first (only if authenticated)
  useEffect(() => {
    if (status !== 'authenticated') return;

    async function checkAdminStatus() {
      try {
        const response = await fetch('/api/admin/dashboard');
        const data = await response.json();
        setIsAdmin(data.isAdmin || false);
      } catch (error) {
        console.error('Failed to check admin status:', error);
        setIsAdmin(false);
      }
    }
    checkAdminStatus();
  }, [status]);

  // Initialize project - do this second (only if authenticated)
  useEffect(() => {
    if (status !== 'authenticated') return;

    async function initializeProject() {
      try {
        const response = await fetch('/api/projects/get-or-create-new');

        // Double-check for 401 (shouldn't happen, but just in case)
        if (response.status === 401) {
          router.push('/auth/signin');
          return;
        }

        const data = await response.json();

        if (data.error) {
          setError(data.error);
          setIsLoading(false);
          return;
        }

        setProjectData(data);
        setUserId(data.user?.id || '');

        // Set current project in the store for ChatPanel
        setCurrentProject(data.project);

        // Load state after getting project data
        loadProjectState(data);

        // 🎯 Check if this is a new user (no chat messages)
        // Redirect to welcome page if no messages

        // 🚧 DEV MODE: Always show welcome page for testing
        // 🎯 Redirect to welcome page only for new users (production mode)
        const project = data.project as { chatMessages?: unknown[] };
        const hasMessages = (project?.chatMessages as unknown[])?.length > 0;
        const hasPendingMessage = localStorage.getItem('pendingFirstMessage');
        if (!hasMessages && !hasPendingMessage) {
          router.push('/welcome');
          return;
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize project:', err);
        setError('Failed to load project. Please try refreshing the page.');
        setIsLoading(false);
      }
    }

    initializeProject();
  }, [status, loadProjectState, setCurrentProject, router]);

  // 🎯 Handle pending first message from welcome page
  // Note: The actual message sending is handled in ChatPanel.tsx
  // This useEffect is kept for backwards compatibility but does nothing now
  useEffect(() => {
    // ChatPanel now handles the pendingFirstMessage directly
    // No action needed here
  }, []);

  // Auto-save timer - do this third
  useEffect(() => {
    if (!projectData) return;

    // Save immediately on mount and when state changes
    saveProjectState();

    // Also set up periodic auto-save
    const timer = setInterval(() => {
      saveProjectState();
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(timer);
  }, [
    nodes,
    connections,
    chatMessages,
    showChat,
    showEnhanced,
    isQuickChatOpen,
    quickChatHistory,
    selectedNodeIds,
    selectedCards,
    devLogId,
    projectData,
    saveProjectState,
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Toggle enhanced view with Shift+E
      if (event.shiftKey && event.key === 'E') {
        event.preventDefault();
        setShowEnhanced((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setShowEnhanced]);

  // Auto-enhance when showEnhanced is turned on
  useEffect(() => {
    if (showEnhanced && nodes.length > 0) {
      handleEnhanceAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEnhanced, nodes]);

  const handleToggleQuickChat = useCallback(() => {
    const newIsOpen = !isQuickChatOpen;
    setIsQuickChatOpen(newIsOpen);

    if (!newIsOpen) {
      setQuickChatHistory([]);
    } else {
      // Add greeting message when opening
      setQuickChatHistory([
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content:
            'Hi! I can help you design your robot system. Just tell me what you want to build! 🤖',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, []);

  const handleAdminDashboard = useCallback(() => {
    router.push('/admin');
  }, [router]);

  const handleCardSelect = useCallback((cardId: string) => {
    setSelectedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  }, []);

  const handleMultiSelectModeChange = useCallback((enabled: boolean) => {
    if (!enabled) {
      setSelectedCards(new Set());
    }
  }, []);

  const enhanceNode = async (node: Node): Promise<Node> => {
    try {
      const response = await fetch('/api/search-parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: node.data.label || node.data.title || '',
        }),
      });

      const results = await response.json();

      if (results.length > 0) {
        const bestMatch = results[0];
        return {
          ...node,
          data: {
            ...node.data,
            ...bestMatch,
            label: bestMatch.title || node.data.label,
            specifications:
              bestMatch.specifications || node.data.specifications,
            enhanced: true,
            modelNumber: bestMatch.model || node.data.modelNumber,
          },
        };
      }

      return node;
    } catch (error) {
      console.error('Failed to enhance node:', error);
      return node;
    }
  };

  const handleSystemGenerated = async (
    systemDesign: Record<string, unknown>,
  ) => {
    try {
      const pbsStructure = systemDesign.pbsStructure as unknown[] | undefined;
      const partOrders = systemDesign.partOrders as unknown[] | undefined;
      const systemConnections = systemDesign.systemConnections as
        | unknown[]
        | undefined;
      const nodes = systemDesign.nodes as unknown[] | undefined;

      console.log('📦 System design received:', {
        pbsStructure: pbsStructure?.length || 0,
        partOrders: partOrders?.length || 0,
        systemConnections: systemConnections?.length || 0,
        hasNodeLayout: !!systemDesign.nodeLayout,
      });

      // Validate that we have actual data
      const hasValidDesign =
        (partOrders?.length || 0) > 0 ||
        (nodes?.length || 0) > 0 ||
        (pbsStructure?.length || 0) > 0;

      if (!hasValidDesign) {
        console.error('Invalid system design: no parts or nodes found');
        setChatMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: 'assistant' as const,
            content: '❌ Failed to generate system design. Please try again.',
            timestamp: new Date().toISOString(),
          },
        ]);
        return;
      }

      // Call processSystemDesign to handle the system design
      console.log('🚀 Processing system design with processSystemDesign...');
      await processSystemDesign(
        systemDesign,
        setIsAnalyzing,
        setLlmStatus,
        setCanvasNodes, // Use the correct setNodes from useStores
        nodes || [],
        connections,
        setConnections,
        setFailedConnections,
        setChatMessages,
        currentProject, // Use currentProject from useStores
        chatMessages,
        isSaving,
        setIsSaving,
      );

      console.log('✅ System design processed successfully');
    } catch (error) {
      console.error('Failed to process system design:', error);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: 'assistant' as const,
          content:
            '❌ Failed to process system design. Please check the console for details.',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  async function handleEnhanceAll() {
    if (nodes.length === 0) {
      console.log('No components to enhance');
      return;
    }

    setIsEnhancing(true);

    try {
      const enhancedNodes = await Promise.all(nodes.map(enhanceNode));
      setCanvasNodes(enhancedNodes as []);

      const enhancedCount = enhancedNodes.filter(
        (n) => (n.data as { enhanced?: boolean }).enhanced,
      ).length;
      console.log(`Enhanced ${enhancedCount} components`);
    } catch (error) {
      console.error('Enhancement failed:', error);
      console.error('Failed to enhance components');
    } finally {
      setIsEnhancing(false);
    }
  }

  const handleEnhanceSelected = useCallback(async () => {
    if (selectedNodeIds.length === 0) {
      console.log('No components selected');
      return;
    }

    setIsEnhancing(true);

    try {
      const enhancedNodes = await Promise.all(
        nodes.map(async (node) => {
          if (selectedNodeIds.includes(node.id)) {
            return await enhanceNode(node);
          }
          return node;
        }),
      );

      setCanvasNodes(enhancedNodes as []);

      const enhancedCount = enhancedNodes.filter(
        (n) =>
          selectedNodeIds.includes(n.id) &&
          (n.data as { enhanced?: boolean }).enhanced,
      ).length;

      console.log(`Enhanced ${enhancedCount} components`);
    } catch (error) {
      console.error('Enhancement failed:', error);
      console.error('Failed to enhance selected components');
    } finally {
      setIsEnhancing(false);
    }
  }, [nodes, selectedNodeIds, setCanvasNodes]);

  const handleClearCanvas = useCallback(() => {
    if (nodes.length === 0 && connections.length === 0) {
      console.log('Canvas is already empty');
      return;
    }

    if (
      window.confirm(
        'Are you sure you want to clear the entire canvas? This action cannot be undone.',
      )
    ) {
      setCanvasNodes([]);
      setConnections([]);
      setSelectedNodeIds([]);
      setChatMessages([]);
      setQuickChatHistory([]);
      console.log('Canvas cleared');
    }
  }, [
    nodes.length,
    connections.length,
    setCanvasNodes,
    setConnections,
    setChatMessages,
  ]);

  // Handle requirements approval and trigger system suggestion
  const handleApprove = async (
    requirementId: string,
    document: { contentText?: string; content?: string; id: string },
  ) => {
    console.log(
      '📋 Requirements approved, generating system suggestion...',
      requirementId,
    );

    try {
      setIsGenerating(true);
      setIsAnalyzing(true); // Show AppLayout progress UI
      setLlmStatus({
        // Set status for AppLayout progress UI
        isRunning: true,
        currentTask: 'Stage 1: Extracting components from requirements',
        currentStep: 1,
        totalSteps: 4,
      });
      console.log(
        '🔍 DEBUG: isGenerating set to true, isAnalyzing set to true',
      );
      setGenerationStage('stage1');
      setGenerationMessage('Analyzing requirements...');
      setGenerationProgress(2); // 初期値を2%に設定
      console.log('🔍 DEBUG: Generation state:', {
        isGenerating: true,
        stage: 'stage1',
        message: 'Analyzing requirements...',
        progress: 2,
      });

      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: 'assistant' as const,
          content:
            '🔄 Requirements have been approved. Generating system suggestion...',
          timestamp: new Date().toISOString(),
        },
      ]);

      // タイマーIDを保存する配列
      const timers: NodeJS.Timeout[] = [];

      // 擬似的な進捗更新を開始（3分間で70%まで到達）
      const progressInterval = setInterval(() => {
        setGenerationProgress((prev) => {
          if (prev < 70) return prev + 1; // 1%ずつ増加、上限を70%に
          return prev;
        });
      }, 2500); // 2.5秒ごとに1%更新（175秒で70%到達）

      // 段階的な進捗メッセージ更新（4分間に分散）
      timers.push(
        setTimeout(() => {
          setGenerationStage('stage2-1');
          setGenerationMessage('Detailing component specifications...');
          setGenerationProgress(15); // Stage 1: 15%
          setLlmStatus({
            isRunning: true,
            currentTask: 'Stage 2-1: Adding technical specifications',
            currentStep: 2,
            totalSteps: 5,
          });
        }, 40000),
      ); // 40秒後

      timers.push(
        setTimeout(() => {
          setGenerationStage('ports');
          setGenerationMessage('Generating dynamic ports...');
          setGenerationProgress(30); // Ports: 30%
          setLlmStatus({
            isRunning: true,
            currentTask: 'Stage 2-2: Generating dynamic ports',
            currentStep: 3,
            totalSteps: 5,
          });
        }, 80000),
      ); // 80秒後（1分20秒後）

      timers.push(
        setTimeout(() => {
          setGenerationStage('connections');
          setGenerationMessage('Calculating optimal connections...');
          setGenerationProgress(45); // Connections: 45%
          setLlmStatus({
            isRunning: true,
            currentTask: 'Stage 2-3: Calculating optimal connections',
            currentStep: 4,
            totalSteps: 5,
          });
        }, 120000),
      ); // 120秒後（2分後）

      // レイアウト最適化段階
      timers.push(
        setTimeout(() => {
          setGenerationStage('layout');
          setGenerationMessage('Optimizing visual layout...');
          setGenerationProgress(60); // Layout: 60%
          setLlmStatus({
            isRunning: true,
            currentTask: 'Stage 2-4: Optimizing visual layout',
            currentStep: 5,
            totalSteps: 5,
          });
        }, 160000),
      ); // 160秒後（2分40秒後）

      // 最終調整段階を追加
      timers.push(
        setTimeout(() => {
          setGenerationStage('validation');
          setGenerationMessage('Validating system design...');
          setGenerationProgress(70); // Validation: 70%
          setLlmStatus({
            isRunning: true,
            currentTask: 'Finalizing and validating system design...',
            currentStep: 5,
            totalSteps: 5,
          });
        }, 200000),
      ); // 200秒後（3分20秒後）

      // Call system suggestion generation API (using the staged processing endpoint)
      const response = await fetch('/api/requirements/generate-system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementsContent:
            document.contentText ||
            (typeof document.content === 'string' ? document.content : ''),
          projectId: (projectData?.project as { id?: string })?.id || '',
        }),
      });

      // すべてのタイマーをクリア
      clearInterval(progressInterval);
      timers.forEach((timer) => clearTimeout(timer));

      if (!response.ok) {
        // エラー時も即座に進捗UIを非表示
        setIsGenerating(false);
        setIsAnalyzing(false);
        setLlmStatus({
          isRunning: false,
          currentTask: '',
          currentStep: 0,
          totalSteps: 0,
        });
        setGenerationStage('');
        setGenerationMessage('');
        setGenerationProgress(0);
        throw new Error(
          `Failed to generate system suggestion: ${response.status}`,
        );
      }

      // API応答後の最終処理段階
      setGenerationStage('finalizing');
      setGenerationMessage('Finalizing system design...');
      setGenerationProgress(80); // 80%に設定
      setLlmStatus({
        isRunning: true,
        currentTask: 'Finalizing system design...',
        currentStep: 5,
        totalSteps: 5,
      });

      const systemDesign = await response.json();
      console.log('✅ System suggestion generated:', systemDesign);

      setGenerationProgress(100);
      setGenerationMessage('Completed!');

      // Process the system design and update canvas
      if (
        systemDesign &&
        (systemDesign.partOrders ||
          systemDesign.nodes ||
          systemDesign.pbsStructure)
      ) {
        await handleSystemGenerated(systemDesign);

        setChatMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: 'assistant' as const,
            content:
              '✅ System suggestion completed! Components have been placed on the canvas.',
            timestamp: new Date().toISOString(),
          },
        ]);

        // 成功時は即座に進捗UIを非表示
        setIsGenerating(false);
        setIsAnalyzing(false);
        setLlmStatus({
          isRunning: false,
          currentTask: '',
          currentStep: 0,
          totalSteps: 0,
        });
        setGenerationStage('');
        setGenerationMessage('');
        setGenerationProgress(0);
      } else {
        // エラー時も即座に進捗UIを非表示
        setIsGenerating(false);
        setIsAnalyzing(false);
        setLlmStatus({
          isRunning: false,
          currentTask: '',
          currentStep: 0,
          totalSteps: 0,
        });
        setGenerationStage('');
        setGenerationMessage('');
        setGenerationProgress(0);
        throw new Error('Invalid system design response');
      }
    } catch (error) {
      console.error('Failed to generate system suggestion:', error);

      // エラー時も即座に進捗UIを非表示
      setIsGenerating(false);
      setIsAnalyzing(false);
      setLlmStatus({
        isRunning: false,
        currentTask: '',
        currentStep: 0,
        totalSteps: 0,
      });
      setGenerationStage('');
      setGenerationMessage('');
      setGenerationProgress(0);

      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: 'assistant' as const,
          content: `❌ Failed to generate system suggestion: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  const handleShowOnboarding = useCallback(() => {
    console.log('Onboarding not available');
  }, []);

  const loadDevLog = useCallback(async (fileId: string) => {
    setDevLogLoadingState({
      isLoading: true,
      error: null,
      currentStep: 'Loading requirements...',
    });
    try {
      setDevLogLoadingState({
        isLoading: true,
        error: null,
        currentStep: 'Fetching requirements document...',
      });

      const response = await fetch(`/api/requirements/${fileId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load requirements');
      }

      setDevLogLoadingState((prev) => ({
        ...prev,
        currentStep: 'Processing document content...',
      }));

      console.log('Requirements loaded:', data.content);

      setDevLogLoadingState({
        isLoading: false,
        error: null,
        currentStep: '',
      });

      console.log('Requirements loaded successfully');
      setDevLogLoadingState({
        isLoading: false,
        error: null,
        currentStep: '',
      });
    } catch (error) {
      console.error('Failed to load requirements:', error);
      setDevLogLoadingState({
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load requirements',
        currentStep: '',
      });
      console.error('Failed to load requirements');
      setDevLogLoadingState({
        isLoading: false,
        error: 'Failed to load requirements',
        currentStep: '',
      });
    }
  }, []);

  const handleRequirementsOpen = useCallback(() => {
    console.log('Requirements management not available');
  }, []);

  // Show loading screen while checking authentication or loading project
  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {status === 'loading'
              ? 'Checking authentication...'
              : 'Loading project...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <AppLayout session={null} onApprove={handleApprove} />;
}
