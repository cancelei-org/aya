'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Globe } from 'lucide-react';
import Image from 'next/image';

// Language content
const content = {
  ja: {
    title: 'AYA - HARDWARE design COPILOT',
    subtitle: 'Arduino/Raspberry Piプロトタイプ — アイデアからBOMまで10分で',
    valueProposition: '回路の知識は不要。アイデアを説明するだけ。',
    inputLabel: '今日は何を作りますか？',
    placeholder:
      '例: 温度と湿度をモニターして、しきい値を超えたらファンを自動制御するArduinoシステムを作りたい...',
    enterKey: 'Enter',
    shiftEnterKey: 'Shift+Enter',
    sendText: 'で送信、',
    newLineText: 'で改行',
    buttonText: '設計を開始',
    buttonSubmitting: '送信中...',
    features: [
      { icon: '💡', title: 'アイデア入力', description: '作りたいものを説明' },
      { icon: '📋', title: '仕様定義', description: 'AIが要件を作成' },
      { icon: '🔌', title: '配線図生成', description: '接続と配線を自動化' },
      { icon: '✓', title: '互換性確認', description: '電圧・信号をチェック' },
      {
        icon: '🛒',
        title: 'ショッピングリスト',
        description: 'すぐに注文可能な部品表',
      },
    ],
  },
  en: {
    title: 'AYA - HARDWARE design COPILOT',
    subtitle:
      'Arduino/Raspberry Pi Prototypes — From Zero to BOM in 10 Minutes',
    valueProposition: 'No circuit knowledge required. Just describe your idea.',
    inputLabel: 'What would you like to build today?',
    placeholder:
      'Example: I want to build an Arduino system that monitors temperature and humidity, and automatically controls a fan when thresholds are exceeded...',
    enterKey: 'Enter',
    shiftEnterKey: 'Shift+Enter',
    sendText: ' to send, ',
    newLineText: ' for new line',
    buttonText: 'Start Building',
    buttonSubmitting: 'Sending...',
    features: [
      {
        icon: '💡',
        title: 'Input Idea',
        description: 'Describe what you want',
      },
      {
        icon: '📋',
        title: 'Define Specs',
        description: 'AI creates requirements',
      },
      {
        icon: '🔌',
        title: 'Generate Diagram',
        description: 'Wiring & connections',
      },
      {
        icon: '✓',
        title: 'Verify Compatibility',
        description: 'Check voltage & signals',
      },
      {
        icon: '🛒',
        title: 'Shopping List',
        description: 'Ready to order parts',
      },
    ],
  },
};

export default function WelcomePage() {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [language, setLanguage] = useState<'ja' | 'en'>('ja');
  const router = useRouter();
  const { status } = useSession();

  const t = content[language];

  // All hooks must be called before any conditional returns
  const handleSubmit = useCallback(async () => {
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Store the first message in localStorage to be picked up by the main page
      localStorage.setItem('pendingFirstMessage', message.trim());

      // Navigate to the main page
      router.push('/');
    } catch (error) {
      console.error('Failed to navigate:', error);
      setIsSubmitting(false);
    }
  }, [message, router, isSubmitting]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Authentication redirect - after all hooks
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-cyan-100 via-blue-100 via-purple-100 to-pink-100 p-4 py-8">
      <div className="w-full max-w-5xl space-y-4 my-auto">
        {/* Language Switcher */}
        <div className="flex justify-end items-center">
          <div className="inline-flex items-center gap-2 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
            <button
              onClick={() => setLanguage('ja')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                language === 'ja'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Globe className="h-4 w-4" />
              日本語
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                language === 'en'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Globe className="h-4 w-4" />
              English
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center">
            <Image
              src="/aya-logo.jpg"
              alt="AYA Logo"
              width={80}
              height={80}
              className="rounded-lg"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-lg text-gray-600">{t.subtitle}</p>
          <p className="text-base text-gray-700 font-medium">
            {t.valueProposition}
          </p>
        </div>

        {/* Chat Input Box */}
        <div className="bg-white rounded-lg shadow-xl p-4 border border-gray-200">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {t.inputLabel}
            </label>
            <textarea
              placeholder={t.placeholder}
              className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px] text-sm"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              autoFocus
            />
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs">
                  {t.enterKey}
                </kbd>
                {t.sendText}
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs">
                  {t.shiftEnterKey}
                </kbd>
                {t.newLineText}
              </p>
              <button
                onClick={handleSubmit}
                disabled={!message.trim() || isSubmitting}
                className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isSubmitting ? t.buttonSubmitting : t.buttonText}
              </button>
            </div>
          </div>
        </div>

        {/* Features - 5 Step Process */}
        <div className="grid grid-cols-5 gap-3 text-center">
          {t.features.map((feature, index) => (
            <div
              key={index}
              className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm"
            >
              <div className="text-3xl mb-2">{feature.icon}</div>
              <h3 className="font-semibold text-xs text-gray-900">
                {feature.title}
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
