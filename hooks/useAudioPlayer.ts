import { useState, useCallback, useRef } from 'react';

interface UseAudioPlayerProps {
  onEnded?: () => void;
  onError?: (error: Error) => void;
}

export const useAudioPlayer = ({
  onEnded,
  onError
}: UseAudioPlayerProps = {}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playTextAsSpeech = useCallback(async (text: string, voice?: string, speed?: number) => {
    try {
      setIsLoading(true);
      setError(null);

      // TTS APIを呼び出して音声を生成
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voice, speed }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      // 音声データをBlobとして取得
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // 既存の音声を停止
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      // 新しい音声を作成して再生
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        if (onEnded) onEnded();
      };
      audio.onerror = (e) => {
        const error = new Error('Audio playback failed');
        setError(error.message);
        setIsPlaying(false);
        if (onError) onError(error);
      };

      await audio.play();
      setIsLoading(false);

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error.message);
      setIsLoading(false);
      if (onError) onError(error);
    }
  }, [onEnded, onError]);

  const playAudioBlob = useCallback(async (audioBlob: Blob) => {
    try {
      setError(null);
      
      const audioUrl = URL.createObjectURL(audioBlob);

      // 既存の音声を停止
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      // 新しい音声を作成して再生
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        if (onEnded) onEnded();
      };
      audio.onerror = (e) => {
        const error = new Error('Audio playback failed');
        setError(error.message);
        setIsPlaying(false);
        if (onError) onError(error);
      };

      await audio.play();

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error.message);
      if (onError) onError(error);
    }
  }, [onEnded, onError]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  }, []);

  return {
    isPlaying,
    isLoading,
    error,
    playTextAsSpeech,
    playAudioBlob,
    stop,
    pause,
    resume
  };
};