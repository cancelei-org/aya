import { useRef, useState, useCallback } from 'react';

interface UseAudioRecorderProps {
  onAudioData?: (audioBlob: Blob) => void;
  onTranscription?: (text: string) => void;
  mimeType?: string;
  timeslice?: number;
}

export const useAudioRecorder = ({
  onAudioData,
  onTranscription,
  mimeType = 'audio/webm',
  timeslice = 1000
}: UseAudioRecorderProps = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // マイクへのアクセス許可を取得
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });
      
      streamRef.current = stream;
      
      // MediaRecorderを作成
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'audio/webm'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // 音声データが利用可能になったとき
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          
          // リアルタイムで音声データを送信
          if (onAudioData) {
            onAudioData(event.data);
          }
        }
      };

      // 録音が停止したとき
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        
        // Whisper APIに送信して文字起こし
        if (onTranscription) {
          try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'audio.webm');
            
            const response = await fetch('/api/speech-to-text', {
              method: 'POST',
              body: formData
            });
            
            if (response.ok) {
              const { text } = await response.json();
              onTranscription(text);
            }
          } catch (err) {
            console.error('Transcription error:', err);
          }
        }
      };

      // 録音開始
      mediaRecorder.start(timeslice);
      setIsRecording(true);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      console.error('Recording error:', err);
    }
  }, [mimeType, timeslice, onAudioData, onTranscription]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      // ストリームのトラックを停止
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      setIsRecording(false);
    }
  }, [isRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
    }
  }, [isRecording]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
    }
  }, [isRecording]);

  return {
    isRecording,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording
  };
};