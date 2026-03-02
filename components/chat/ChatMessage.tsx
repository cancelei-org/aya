import React, { memo } from 'react';
import type { ChatMessage as ChatMessageType } from '@/types';
import type { DebugChatMessage } from '@/types/debug';
import { DebugMessageRenderer } from './DebugMessageRenderer';

interface ChatMessageProps {
  message: ChatMessageType | DebugChatMessage;
  messageMaxWidth: string;
}

/**
 * メッセージ比較関数
 * contentとtimestampが同じなら再レンダリング不要
 */
function areMessagesEqual(
  prevProps: ChatMessageProps,
  nextProps: ChatMessageProps,
): boolean {
  const prevMsg = prevProps.message;
  const nextMsg = nextProps.message;

  // メッセージIDが同じで内容も同じなら再レンダリング不要
  if (
    prevMsg.id === nextMsg.id &&
    prevMsg.content === nextMsg.content &&
    prevMsg.timestamp === nextMsg.timestamp
  ) {
    return true;
  }

  return false;
}

/**
 * チャットメッセージコンポーネント（最適化済み）
 * React.memoで不要な再レンダリングを防止
 */
export const ChatMessage = memo<ChatMessageProps>(
  ({ message, messageMaxWidth }) => {
    // デバッグメッセージかどうかチェック
    const isDebugMessage =
      'type' in message &&
      (message.type === 'debug-visual' || message.type === 'debug-audio');

    // AIメッセージで内容が空の場合は3つの点のアニメーションを表示
    if (message.role === 'assistant' && message.content === '') {
      return (
        <div className="flex justify-start">
          <div
            className={`${messageMaxWidth} rounded-lg px-3 py-2 bg-gray-100`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Processing</span>
              <div className="flex space-x-1">
                <span
                  className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms', animationDuration: '1.4s' }}
                />
                <span
                  className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: '200ms', animationDuration: '1.4s' }}
                />
                <span
                  className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: '400ms', animationDuration: '1.4s' }}
                />
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(message.timestamp).toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
      >
        {isDebugMessage ? (
          <DebugMessageRenderer
            message={message as DebugChatMessage}
            messageMaxWidth={messageMaxWidth}
          />
        ) : (
          <div
            className={`${messageMaxWidth} rounded-lg px-3 py-2 ${
              message.role === 'user'
                ? 'bg-[#00AEEF] text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            <div className="text-sm break-words whitespace-pre-wrap overflow-wrap-break-word hyphens-auto">
              {message.content}
            </div>
            <div
              className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}
            >
              {new Date(message.timestamp).toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        )}
      </div>
    );
  },
  areMessagesEqual,
);

ChatMessage.displayName = 'ChatMessage';
