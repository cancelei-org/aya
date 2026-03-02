import React, { useState, useCallback, useEffect } from 'react';
import { AudioRecorder } from './AudioRecorder';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useSocket } from '@/hooks/useSocket';
import { Volume2, Loader2, WifiOff, Wifi } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export const RealtimeVoiceChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [openAIConnected, setOpenAIConnected] = useState(false);
  const { playTextAsSpeech, isPlaying, isLoading } = useAudioPlayer();

  const { isConnected, emit, on, off } = useSocket({
    onConnect: () => {
      console.log('Socket connected');
      // Socket接続後にOpenAI接続を開始
      emit('openai-connect', {});
    },
    onDisconnect: () => {
      console.log('Socket disconnected');
      setOpenAIConnected(false);
    },
    onError: (error) => console.error('Socket error:', error),
  });

  useEffect(() => {
    // WebSocketイベントリスナーを設定
    const handleOpenAIConnected = () => {
      console.log('OpenAI connected');
      setOpenAIConnected(true);
    };

    const handleTranscription = (data: unknown) => {
      const typedData = data as { text: string; timestamp: string };
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        text: typedData.text,
        timestamp: new Date(typedData.timestamp),
      };
      setMessages((prev) => [...prev, userMessage]);
    };

    const handleAIResponse = async (data: unknown) => {
      const typedData = data as { text: string; timestamp: string };
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        text: typedData.text,
        timestamp: new Date(typedData.timestamp),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // 音声で応答を再生
      await playTextAsSpeech(typedData.text, 'nova', 1.0);
      setIsProcessing(false);
    };

    const handleError = (data: unknown) => {
      const typedData = data as { message: string };
      console.error('Socket error:', typedData.message);
      setIsProcessing(false);
    };

    on('openai-connected', handleOpenAIConnected);
    on('transcription', handleTranscription);
    on('ai-response', handleAIResponse);
    on('error', handleError);

    return () => {
      off('openai-connected');
      off('transcription');
      off('ai-response');
      off('error');
    };
  }, [on, off, playTextAsSpeech]);

  const handleAudioData = useCallback(
    (audioBlob: Blob) => {
      if (isConnected && openAIConnected) {
        setIsProcessing(true);
        emit('audio-stream', audioBlob);
      }
    },
    [isConnected, openAIConnected, emit],
  );

  const handleTranscription = useCallback(
    (text: string) => {
      if (isConnected && openAIConnected) {
        setIsProcessing(true);
        emit('chat-message', { message: text });
      }
    },
    [isConnected, openAIConnected, emit],
  );

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">リアルタイム音声チャット</h1>
        <div className="flex items-center space-x-2">
          {isConnected && openAIConnected ? (
            <>
              <Wifi className="text-green-500" size={20} />
              <span className="text-sm text-green-500">接続済み</span>
            </>
          ) : isConnected ? (
            <>
              <Loader2 className="text-yellow-500 animate-spin" size={20} />
              <span className="text-sm text-yellow-500">OpenAI接続中</span>
            </>
          ) : (
            <>
              <WifiOff className="text-red-500" size={20} />
              <span className="text-sm text-red-500">未接続</span>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mb-4 border rounded-lg p-4 bg-gray-50">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center">
            マイクボタンをクリックして話しかけてください
          </p>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.type === 'user'
                        ? 'text-blue-100'
                        : 'text-gray-500'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString('ja-JP')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center justify-center space-x-4">
          <AudioRecorder
            onTranscription={handleTranscription}
            onAudioData={handleAudioData}
          />

          {(isProcessing || isLoading) && (
            <div className="flex items-center space-x-2 text-gray-600">
              <Loader2 className="animate-spin" size={20} />
              <span className="text-sm">処理中...</span>
            </div>
          )}

          {isPlaying && (
            <div className="flex items-center space-x-2 text-green-600">
              <Volume2 className="animate-pulse" size={20} />
              <span className="text-sm">再生中</span>
            </div>
          )}
        </div>

        {!isConnected && (
          <p className="text-center text-sm text-red-500 mt-2">
            WebSocket接続を確立しています...
          </p>
        )}
        {isConnected && !openAIConnected && (
          <p className="text-center text-sm text-yellow-600 mt-2">
            OpenAI接続を確立しています...
          </p>
        )}
      </div>
    </div>
  );
};
