import { useEffect, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';

interface UseSocketOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: unknown) => void;
}

// グローバルなSocket.io接続を管理（シングルトンパターン）
let globalSocket: Socket | null = null;
let connectionCount = 0;

export const useSocket = (options: UseSocketOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const optionsRef = useRef(options);
  const instanceId = useRef(Math.random().toString(36).substr(2, 9));

  // 最新のoptionsを常に保持
  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    connectionCount++;
    console.log(`Socket hook instance ${instanceId.current} connecting (total: ${connectionCount})`);

    // グローバルソケットが存在しない場合のみ作成
    if (!globalSocket) {
      console.log('Creating new global Socket.io connection');
      // Socket.IOサーバーが実装されていない場合はnullを返す
      // これによりエラーを防ぐ
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.warn('Socket.IO server not available, skipping connection');
        return () => {
          connectionCount--;
        };
      }
      globalSocket = io({
        path: '/api/socket',
      });
    }

    const socket = globalSocket;

    // 接続状態を初期化
    setIsConnected(socket.connected);

    // このインスタンス用のイベントハンドラー
    const handleConnect = () => {
      console.log(`Socket connected for instance ${instanceId.current}`);
      setIsConnected(true);
      if (optionsRef.current.onConnect) optionsRef.current.onConnect();
    };

    const handleDisconnect = () => {
      console.log(`Socket disconnected for instance ${instanceId.current}`);
      setIsConnected(false);
      if (optionsRef.current.onDisconnect) optionsRef.current.onDisconnect();
    };

    const handleError = (error: unknown) => {
      // エラーオブジェクトを正規化
      let normalizedError = error;

      if (
        !error ||
        (typeof error === 'object' && Object.keys(error).length === 0)
      ) {
        // 空のオブジェクトや null/undefined の場合
        normalizedError = {
          message: 'Socket connection error occurred',
          type: 'socket_error',
        };
      } else if (typeof error === 'string') {
        // 文字列の場合
        normalizedError = {
          message: error,
          type: 'socket_error',
        };
      } else if (error && typeof error === 'object') {
        // オブジェクトの場合
        const errorObj = error as any;
        normalizedError = {
          message: errorObj.message || errorObj.code || errorObj.reason || 'Socket error',
          type: errorObj.type || 'socket_error',
          code: errorObj.code,
          details: errorObj.details,
        };
      }

      console.error(`Socket error for instance ${instanceId.current}:`, normalizedError);

      if (optionsRef.current.onError) optionsRef.current.onError(normalizedError);
    };

    // イベントリスナーを追加
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);  
    socket.on('error', handleError);

    // 既に接続済みの場合は即座にonConnectを呼ぶ
    if (socket.connected && optionsRef.current.onConnect) {
      optionsRef.current.onConnect();
    }

    return () => {
      connectionCount--;
      console.log(`Socket hook instance ${instanceId.current} disconnecting (remaining: ${connectionCount})`);
      
      // イベントリスナーを削除
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('error', handleError);

      // すべてのインスタンスが削除された場合のみ接続を切断
      if (connectionCount === 0 && globalSocket) {
        console.log('Disconnecting global Socket.io connection');
        globalSocket.disconnect();
        globalSocket = null;
      }
    };
  }, []);  

  const emit = (event: string, data: unknown) => {
    if (globalSocket && isConnected) {
      globalSocket.emit(event, data);
    }
  };

  const on = (event: string, handler: (data: unknown) => void) => {
    if (globalSocket) {
      globalSocket.on(event, handler);
    }
  };

  const off = (event: string, handler?: (data: unknown) => void) => {
    if (globalSocket) {
      if (handler) {
        globalSocket.off(event, handler);
      } else {
        globalSocket.off(event);
      }
    }
  };

  return {
    socket: globalSocket,
    isConnected,
    emit,
    on,
    off,
  };
};
