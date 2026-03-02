import { useState } from 'react';

// LLMステータスの型定義
type LLMStatus = {
  isRunning: boolean;
  currentTask: string;
  currentStep?: number;
  totalSteps?: number;
};

// ハードウェアコンテキストステータスの型定義
type HardwareContextStatus = {
  isLoading: boolean;
  componentCount: number;
  summary: string;
};

// LLM状態管理関連のカスタムフック
export const useLLMState = () => {
  // LLM関連のstate
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [llmStatus, setLlmStatus] = useState<LLMStatus>({
    isRunning: false,
    currentTask: '',
  });
  const [hardwareContextStatus, setHardwareContextStatus] =
    useState<HardwareContextStatus>({
      isLoading: false,
      componentCount: 0,
      summary: '',
    });

  return {
    // States
    isAnalyzing,
    llmStatus,
    hardwareContextStatus,

    // Setters
    setIsAnalyzing,
    setLlmStatus,
    setHardwareContextStatus,
  };
};
