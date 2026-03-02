import React from 'react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { Mic, MicOff, Pause, Play } from 'lucide-react';

interface AudioRecorderProps {
  onTranscription?: (text: string) => void;
  onAudioData?: (audioBlob: Blob) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onTranscription,
  onAudioData
}) => {
  const {
    isRecording,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording
  } = useAudioRecorder({
    onTranscription,
    onAudioData
  });

  const [isPaused, setIsPaused] = React.useState(false);

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
      setIsPaused(false);
    } else {
      startRecording();
    }
  };

  const handleTogglePause = () => {
    if (isPaused) {
      resumeRecording();
      setIsPaused(false);
    } else {
      pauseRecording();
      setIsPaused(true);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-6">
      {error && (
        <div className="text-red-500 text-sm mb-2">
          エラー: {error}
        </div>
      )}
      
      <div className="flex items-center space-x-4">
        <button
          onClick={handleToggleRecording}
          className={`p-4 rounded-full transition-all ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white`}
          aria-label={isRecording ? '録音停止' : '録音開始'}
        >
          {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        {isRecording && (
          <button
            onClick={handleTogglePause}
            className="p-3 rounded-full bg-gray-200 hover:bg-gray-300 transition-all"
            aria-label={isPaused ? '録音再開' : '録音一時停止'}
          >
            {isPaused ? <Play size={20} /> : <Pause size={20} />}
          </button>
        )}
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          {isRecording 
            ? isPaused 
              ? '録音一時停止中...' 
              : '録音中...'
            : 'マイクボタンをクリックして録音開始'}
        </p>
      </div>
    </div>
  );
};