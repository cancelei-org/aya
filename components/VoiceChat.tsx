import React, { useState, useCallback } from 'react';
import { AudioRecorder } from './AudioRecorder';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { Volume2, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export const VoiceChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { playTextAsSpeech, isPlaying, isLoading } = useAudioPlayer();

  const handleTranscription = useCallback(async (text: string) => {
    // ユーザーメッセージを追加
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // GPT-4で応答を生成
      const response = await fetch('/api/voice-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messages: [
            { role: 'user', content: text }
          ] 
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const { response: assistantText } = await response.json();

      // アシスタントメッセージを追加
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        text: assistantText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);

      // 音声で応答を再生
      await playTextAsSpeech(assistantText, 'nova', 1.0);

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        text: 'エラーが発生しました。もう一度お試しください。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  }, [playTextAsSpeech]);

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">音声チャット</h1>
      
      <div className="flex-1 overflow-y-auto mb-4 border rounded-lg p-4 bg-gray-50">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center">
            マイクボタンをクリックして話しかけてください
          </p>
        ) : (
          <div className="space-y-4">
            {messages.map(message => (
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
                  <p className={`text-xs mt-1 ${
                    message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
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
      </div>
    </div>
  );
};