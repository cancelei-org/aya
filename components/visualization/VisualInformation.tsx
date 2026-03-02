'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CameraOff, Mic, MicOff, Loader2 } from 'lucide-react';
// import type { DebugContext, DebugChatMessage } from "@/types/debug"
import { useSocket } from '@/hooks/useSocket';

// Utility functions - defined at module level to avoid initialization issues
function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

interface RealtimeEvent {
  type: string;
  event_id?: string;
  conversation_id?: string;
  item?: {
    content?: Array<{
      transcript?: string;
    }>;
  };
  response?: Record<string, unknown>;
  delta?: string;
  audio?: ArrayBuffer;
}

interface VisualInformationProps {
  projectId?: string;
  onMessageSend?: (message: Record<string, unknown>) => void;
}

// Check browser support
function checkBrowserSupport() {
  const issues: string[] = [];

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    issues.push('getUserMedia not supported');
  }

  if (!window.MediaRecorder) {
    issues.push('MediaRecorder not supported');
  }

  if (
    !window.AudioContext &&
    !(window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext
  ) {
    issues.push('AudioContext not supported');
  }

  return {
    supported: issues.length === 0,
    issues,
  };
}

export function VisualInformation({ }: VisualInformationProps) {
  // Socket.io接続
  const {
    socket,
    isConnected: socketConnected,
    emit,
    on,
    off,
  } = useSocket({
    onConnect: () => {
      console.log('Socket.io connected');
      // Socket接続後にOpenAI接続を開始
      emit('openai-connect', {});
    },
    onDisconnect: () => {
      console.log('Socket.io disconnected');
      setIsConnected(false);
      setOpenAIConnected(false);
      setConnectionState('disconnected');
    },
    onError: (error) => {
      console.error('Socket error:', error);
      setError('Connection error: ' + error.message);
    },
  });

  const [isWebcamOn, setIsWebcamOn] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [, setIsConnected] = useState(false);
  const [openAIConnected, setOpenAIConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userVoicePrompt, setUserVoicePrompt] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>(
    [],
  );
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [connectionState, setConnectionState] = useState<
    'disconnected' | 'connecting' | 'connected' | 'reconnecting'
  >('disconnected');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const storedImagesRef = useRef<{ timestamp: number; base64: string }[]>([]);
  const maxStoredImages = 60; // Store last 60 seconds of images
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const sessionConfiguredRef = useRef<boolean>(false);
  const audioDataSentRef = useRef<number>(0);

  // Send message via Socket.io
  const sendMessage = useCallback(
    (message: unknown) => {
      if (socketConnected && openAIConnected) {
        emit('openai-message', message);
      }
    },
    [socketConnected, openAIConnected, emit],
  );

  // Play audio chunk - defined before handleRealtimeMessage
  const playAudioChunk = useCallback(async (audioData: ArrayBuffer) => {
    if (!audioContextRef.current) return;

    try {
      const audioBuffer =
        await audioContextRef.current.decodeAudioData(audioData);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
      setIsAISpeaking(true);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }, []);

  // Handle realtime messages from OpenAI
  const handleRealtimeMessage = useCallback(
    async (event: RealtimeEvent) => {
      // Implementation similar to original but using Socket.io
      console.log('Realtime event:', event.type, event);

      switch (event.type) {
        case 'session.created':
          if (!sessionConfiguredRef.current) {
            sessionConfiguredRef.current = true;
            // Configure session
            sendMessage({
              type: 'session.update',
              session: {
                modalities: ['text', 'audio'],
                voice: 'echo',
                instructions: `You are a hardware debugging specialist AI assistant.`,
                // temperature: 0.8,
                input_audio_transcription: {
                  model: 'whisper-1',
                },
                turn_detection: {
                  type: 'server_vad',
                  threshold: 0.5,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 200,
                },
                tools: [
                  {
                    type: 'function',
                    name: 'analyze_webcam',
                    description:
                      'Analyze the current webcam image to help with hardware debugging',
                    parameters: {
                      type: 'object',
                      properties: {
                        user_prompt: {
                          type: 'string',
                          description:
                            'What the user wants to know about their hardware',
                        },
                      },
                      required: ['user_prompt'],
                    },
                  },
                ],
              },
            });
          }
          break;

        case 'input_audio_buffer.speech_started':
          console.log('👂 User started speaking');
          setIsAISpeaking(false);
          break;

        case 'conversation.item.input_audio_transcription.completed':
          const userText = event.item?.content?.[0]?.transcript || '';
          if (userText) {
            console.log('📝 User said:', userText);
            setUserVoicePrompt(userText);
          }
          break;

        case 'response.audio.delta':
          if (event.delta && audioContextRef.current) {
            const audioData = base64ToArrayBuffer(event.delta);
            playAudioChunk(audioData);
          }
          break;

        case 'response.audio_transcript.delta':
          const delta = event.delta || '';
          setAiResponse((prev) => prev + delta);
          break;

        case 'response.audio_transcript.done':
          console.log(
            '✅ AI response complete:',
            event.item?.content?.[0]?.transcript,
          );
          setIsAISpeaking(false);
          break;
      }
    },
    [sendMessage, playAudioChunk],
  );

  // Audio recording function - simplified version without AudioWorklet for now
  const startAudioRecording = useCallback(
    (stream: MediaStream) => {
      if (!audioContextRef.current) return;

      try {
        const source = audioContextRef.current.createMediaStreamSource(stream);
        const processor = audioContextRef.current.createScriptProcessor(
          4096,
          1,
          1,
        );

        source.connect(processor);
        processor.connect(audioContextRef.current.destination);

        processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = floatTo16BitPCM(inputData);
          const base64 = arrayBufferToBase64(pcm16);

          sendMessage({
            type: 'input_audio_buffer.append',
            audio: base64,
          });

          audioDataSentRef.current += pcm16.byteLength;
        };

        console.log('Audio recording started');
      } catch (error) {
        console.error('Error starting audio recording:', error);
      }
    },
    [sendMessage],
  );

  // Socket.ioイベントリスナーの設定
  useEffect(() => {
    if (!socket) return;

    // OpenAI接続成功
    const handleOpenAIConnected = () => {
      console.log('Connected to OpenAI Realtime API via Socket.io');
      setIsConnected(true);
      setOpenAIConnected(true);
      setIsConnecting(false);
      setConnectionState('connected');
      setError(null);
      sessionConfiguredRef.current = false;
    };

    // OpenAIからのメッセージ
    const handleOpenAIMessage = (data: string) => {
      try {
        const message = JSON.parse(data);
        handleRealtimeMessage(message);
      } catch (error) {
        console.error('Failed to parse OpenAI message:', error, data);
      }
    };

    // エラーメッセージ
    const handleError = (error: { message: string }) => {
      console.error('Socket error:', error);
      setError(error.message);
    };

    on('openai-connected', handleOpenAIConnected);
    on('openai-message', handleOpenAIMessage);
    on('error', handleError);

    return () => {
      off('openai-connected', handleOpenAIConnected);
      off('openai-message', handleOpenAIMessage);
      off('error', handleError);
    };
  }, [socket, on, off, handleRealtimeMessage]);

  // Initialize WebRTC and Socket.io connection
  const startRealtimeSession = useCallback(async () => {
    try {
      setIsConnecting(true);
      setConnectionState('connecting');
      setError(null);

      // Get user media (webcam + microphone)
      let stream: MediaStream;
      try {
        const constraints: MediaStreamConstraints = {
          video: selectedCameraId
            ? { deviceId: { exact: selectedCameraId } }
            : true,
          audio: !isMuted
            ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: false,
              sampleRate: 48000,
              channelCount: 1,
              latency: 0,
            }
            : false,
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (mediaErr) {
        console.error('Media access error:', mediaErr);
        setError(`❌ Media access error: ${(mediaErr as Error).message}`);
        setIsConnecting(false);
        setIsWebcamOn(false);
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Initialize audio context
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass();
        console.log('AudioContext initialized');
      }

      // Connect to OpenAI via Socket.io
      if (socketConnected) {
        emit('openai-connect', {});
      } else {
        setError('Socket.io not connected. Please refresh and try again.');
        setIsConnecting(false);
        return;
      }

      // Start capturing video frames
      if (canvasRef.current && videoRef.current) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          frameIntervalRef.current = setInterval(() => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
              const scale = 0.5;
              canvas.width = video.videoWidth * scale;
              canvas.height = video.videoHeight * scale;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

              canvas.toBlob(
                async (blob) => {
                  if (blob) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const base64 = reader.result?.toString().split(',')[1];
                      if (base64) {
                        const now = Date.now();
                        storedImagesRef.current.push({
                          timestamp: now,
                          base64,
                        });

                        if (storedImagesRef.current.length > maxStoredImages) {
                          storedImagesRef.current.shift();
                        }
                      }
                    };
                    reader.readAsDataURL(blob);
                  }
                },
                'image/jpeg',
                0.7,
              );
            }
          }, 1000);
        }
      }

      // Start audio recording if not muted
      if (!isMuted) {
        console.log('🎤 Starting audio recording');
        startAudioRecording(stream);
      }
    } catch (error) {
      console.error('Failed to start session:', error);
      setError('Failed to start hardware debug session');
      setIsConnecting(false);
    }
  }, [selectedCameraId, isMuted, socketConnected, emit, startAudioRecording]);

  // Stop session
  const stopRealtimeSession = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }

    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
      audioContextRef.current = null;
    }

    setIsWebcamOn(false);
    setIsConnected(false);
    setConnectionState('disconnected');
    setError(null);
    sessionConfiguredRef.current = false;
  }, []);

  // Get available cameras
  useEffect(() => {
    async function getCameras() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(
          (device) => device.kind === 'videoinput',
        );
        setAvailableCameras(cameras);
        if (cameras.length > 0 && !selectedCameraId) {
          setSelectedCameraId(cameras[0].deviceId);
        }
      } catch (error) {
        console.error('Error enumerating devices:', error);
      }
    }
    getCameras();
  }, [selectedCameraId]);

  // Browser support check
  const browserSupport = checkBrowserSupport();
  if (!browserSupport.supported) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            Browser Not Supported
          </h2>
          <p className="text-gray-600 mb-4">
            Your browser doesn&apos;t support required features:
          </p>
          <ul className="text-left text-sm text-gray-500">
            {browserSupport.issues.map((issue, index) => (
              <li key={index}>• {issue}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-gray-500">
            Please use a modern browser like Chrome, Edge, or Firefox.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Hardware Debug Support
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Show your hardware components to the AI assistant for real-time
              debugging assistance
            </p>
          </div>
          <div className="flex items-center gap-2">
            {connectionState === 'connected' && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                Connected
              </span>
            )}
            {connectionState === 'connecting' && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Connecting...
              </span>
            )}
            {connectionState === 'disconnected' && isWebcamOn && (
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                Disconnected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-6">
        {/* Video Container */}
        <div className="flex-1 bg-black rounded-lg overflow-hidden relative mb-4">
          {!isWebcamOn ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">Camera is off</p>
                <button
                  onClick={startRealtimeSession}
                  disabled={isConnecting || !socketConnected}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Camera className="w-5 h-5" />
                      Start Hardware Debug
                    </>
                  )}
                </button>
                {!socketConnected && (
                  <p className="text-red-500 text-sm mt-2">
                    Waiting for connection...
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* AI Speaking Indicator */}
              {isAISpeaking && (
                <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-2 rounded-lg flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1 h-4 bg-white rounded-full animate-pulse" />
                    <div className="w-1 h-4 bg-white rounded-full animate-pulse animation-delay-200" />
                    <div className="w-1 h-4 bg-white rounded-full animate-pulse animation-delay-400" />
                  </div>
                  <span className="text-sm">AI Speaking</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Camera Toggle */}
            <button
              onClick={isWebcamOn ? stopRealtimeSession : startRealtimeSession}
              disabled={isConnecting || !socketConnected}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${isWebcamOn
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isWebcamOn ? (
                <>
                  <CameraOff className="w-5 h-5" />
                  Stop Camera
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  Start Camera
                </>
              )}
            </button>

            {/* Microphone Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              disabled={!isWebcamOn}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${isMuted
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isMuted ? (
                <>
                  <MicOff className="w-5 h-5" />
                  Unmute
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  Mute
                </>
              )}
            </button>
          </div>

          {/* Camera Selection */}
          {availableCameras.length > 1 && (
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              disabled={isWebcamOn}
              className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {availableCameras.map((camera) => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `Camera ${camera.deviceId.slice(0, 5)}...`}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Transcription Display */}
        {(userVoicePrompt || aiResponse) && (
          <div className="mt-4 space-y-2">
            {userVoicePrompt && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>You:</strong> {userVoicePrompt}
                </p>
              </div>
            )}
            {aiResponse && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>AI:</strong> {aiResponse}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
