/**
 * ストリーミングチャット応答のハンドラー
 */

import type { ChatMessage } from '@/types';

export interface StreamHandlerOptions {
  onMessage: (content: string) => void;
  onStatus?: (status: string) => void;
  onComplete?: (fullContent: string) => void;
  onError?: (error: string) => void;
}

export class ChatStreamHandler {
  private eventSource: EventSource | null = null;
  private accumulatedContent: string = '';
  private options: StreamHandlerOptions;

  constructor(options: StreamHandlerOptions) {
    this.options = options;
  }

  /**
   * ストリーミングを開始
   */
  async startStream(
    message: string,
    attachments?: FileList | null,
    conversationHistory?: ChatMessage[],
    projectId?: string | null,
    isFirstMessage?: boolean,
  ): Promise<void> {
    // 既存の接続があれば閉じる
    this.close();

    try {
      // 通常のPOSTリクエストでストリーミングエンドポイントを呼び出し
      const response = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          attachments: attachments
            ? await this.processAttachments(attachments)
            : null,
          conversationHistory,
          projectId,
          isFirstMessage,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // ReadableStreamを処理
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      // ストリーミングデータを読み取り
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') {
              // Stream completed
              this.options.onComplete?.(this.accumulatedContent);
              break;
            } else if (dataStr) {
              try {
                const data = JSON.parse(dataStr);
                this.handleStreamData(data);
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream error:', error);
      this.options.onError?.(
        error instanceof Error ? error.message : 'Stream connection failed',
      );
    }
  }

  /**
   * EventSourceを使用したストリーミング（代替実装）
   */
  async startEventSourceStream(
    message: string,
    attachments?: FileList | null,
    conversationHistory?: ChatMessage[],
    projectId?: string | null,
  ): Promise<void> {
    // 既存の接続があれば閉じる
    this.close();

    try {
      // クエリパラメータを構築
      const params = new URLSearchParams({
        message,
        projectId: projectId || '',
      });

      // EventSourceで接続
      this.eventSource = new EventSource(`/api/chat-stream?${params}`);

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleStreamData(data);
        } catch (e) {
          console.error('Failed to parse SSE data:', e);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        this.options.onError?.('Stream connection lost');
        this.close();
      };
    } catch (error) {
      console.error('EventSource setup error:', error);
      this.options.onError?.(
        error instanceof Error ? error.message : 'Failed to setup stream',
      );
    }
  }

  /**
   * ストリーミングデータを処理
   */
  private handleStreamData(data: any) {
    switch (data.type) {
      case 'status':
        this.options.onStatus?.(data.content);
        break;

      case 'content':
        this.accumulatedContent += data.content;
        this.options.onMessage(data.content);
        break;

      case 'done':
        this.options.onComplete?.(data.fullContent || this.accumulatedContent);
        this.close();
        break;

      case 'error':
        this.options.onError?.(data.error);
        this.close();
        break;
    }
  }

  /**
   * 添付ファイルを処理
   */
  private async processAttachments(files: FileList): Promise<any[]> {
    const attachments = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileType = this.getFileType(file);

      // ファイルを読み込み
      const content = await this.readFile(file);

      attachments.push({
        filename: file.name,
        type: fileType,
        content: content,
      });
    }

    return attachments;
  }

  /**
   * ファイルタイプを判定
   */
  private getFileType(file: File): string {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return 'image';
    } else if (['xls', 'xlsx'].includes(extension || '')) {
      return 'excel';
    } else if (extension === 'pdf') {
      return 'pdf';
    }

    return 'other';
  }

  /**
   * ファイルを読み込み
   */
  private readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };

      reader.onerror = reject;

      // 画像の場合はData URLとして読み込み
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  }

  /**
   * ストリーミングを閉じる
   */
  close() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.accumulatedContent = '';
  }

  /**
   * 現在の累積コンテンツを取得
   */
  getAccumulatedContent(): string {
    return this.accumulatedContent;
  }
}
