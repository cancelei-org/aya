'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, CameraOff, Mic, MicOff, Loader2, Image } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';

// ユーティリティ関数
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
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

interface VisualInformationRealtimeProps {
  onMessageSend?: (message: any) => void;
}

export function VisualInformationRealtime({ onMessageSend }: VisualInformationRealtimeProps = {}) {
  // Socket.io接続
  const { isConnected: socketConnected, emit, on, off } = useSocket();

  // 状態管理
  const [isWebcamOn, setIsWebcamOn] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<
    'disconnected' | 'connecting' | 'connected'
  >('disconnected');
  const [userVoicePrompt, setUserVoicePrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionConfiguredRef = useRef(false);
  const connectionStateRef = useRef<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const audioBufferRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const storedImagesRef = useRef<{ timestamp: number; base64: string }[]>([]);
  const maxStoredImages = 60; // 最大60秒分の画像を保存
  const aiResponseRef = useRef<string>('');

  // connectionStateの変更をrefに反映
  useEffect(() => {
    connectionStateRef.current = connectionState;
    console.log('Connection state updated:', connectionState);
  }, [connectionState]);

  // ビデオ要素の状態を監視
  useEffect(() => {
    if (videoRef.current && isWebcamOn) {
      console.log('Video element state:', {
        mounted: !!videoRef.current,
        dimensions: {
          width: videoRef.current.offsetWidth,
          height: videoRef.current.offsetHeight,
          clientWidth: videoRef.current.clientWidth,
          clientHeight: videoRef.current.clientHeight
        },
        srcObject: videoRef.current.srcObject,
        readyState: videoRef.current.readyState,
        paused: videoRef.current.paused
      });

      // ストリームが存在し、ビデオにまだ設定されていない場合は設定
      if (streamRef.current && !videoRef.current.srcObject) {
        console.log('Setting video srcObject from useEffect');
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(e => {
          console.error('Video play error in useEffect:', e);
        });
      }
    }
  }, [isWebcamOn]);

  // カメラ一覧を取得
  useEffect(() => {
    async function getCameras() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        console.log('Available cameras:', cameras);
        setAvailableCameras(cameras);

        // デフォルトカメラを設定
        if (cameras.length > 0 && !selectedCameraId) {
          setSelectedCameraId(cameras[0].deviceId);
        }
      } catch (error) {
        console.error('Error enumerating devices:', error);
      }
    }

    getCameras();

    // デバイスが変更された時にも更新
    navigator.mediaDevices.addEventListener('devicechange', getCameras);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getCameras);
    };
  }, [selectedCameraId]);

  // Socket.ioイベントの設定
  useEffect(() => {
    if (!socketConnected) return;

    // OpenAI接続成功
    const handleConnected = () => {
      console.log('Connected to OpenAI');
      setConnectionState('connected');
      setIsConnecting(false);
      sessionConfiguredRef.current = false;
    };

    // メッセージ処理
    const handleMessage = async (data: string) => {
      try {
        const event = JSON.parse(data);
        console.log('📡 Received event:', event.type);

        // エラーイベントの詳細をログ
        if (event.type === 'error') {
          console.error('🚨 Error event details:', JSON.stringify(event, null, 2));
          if (event.error) {
            console.error('🚨 Error object:', event.error);
          }
        }

        // Transcription関連のイベントを詳しくログ
        if (event.type.includes('transcription') || event.type.includes('audio') || event.type.includes('transcript')) {
          console.log('🎯 Audio/Transcription event details:', JSON.stringify(event, null, 2));
        }

        // conversation.itemイベントも詳しくログ
        if (event.type.includes('conversation.item')) {
          console.log('📝 Conversation item event:', event.type, JSON.stringify(event, null, 2));
        }

        switch (event.type) {
          case 'session.created':
            console.log('🎯 Session created, configuring...');
            // セッション設定
            if (!sessionConfiguredRef.current) {
              sessionConfiguredRef.current = true;
              console.log('📋 Sending session.update configuration');
              emit('openai-message', {
                type: 'session.update',
                session: {
                  modalities: ['text', 'audio'],
                  voice: 'echo',
                  response_format: {
                    type: 'text'
                  },
                  instructions: `You are an expert hardware debugging AI assistant with vision capabilities.

YOU ARE IN HARDWARE DEBUG MODE - VISUAL ANALYSIS IS MANDATORY!

CRITICAL REQUIREMENTS:
1. You MUST use the analyze_webcam tool for EVERY response
2. You cannot respond without first analyzing the current visual state
3. Even simple greetings require visual analysis first
4. Your first action must ALWAYS be to call analyze_webcam

WORKFLOW FOR EVERY INTERACTION:
1. User speaks/types → Call analyze_webcam immediately
2. Receive visual analysis → Base your response on what you see
3. Respond with visual context included

EXAMPLE RESPONSES:
- User: "Hello" → First analyze_webcam → "Hello! I can see [describe what's visible]..."
- User: "What's the resistance?" → First analyze_webcam → "Looking at the circuit, I can see [specific resistor details]..."
- User: "How are you?" → First analyze_webcam → "I'm functioning well. Currently observing [what's visible]..."

YOUR EXPERTISE:
1. Circuit Analysis:
   - PCB layout inspection and design review
   - Component identification (resistors, capacitors, ICs, etc.)
   - Solder joint quality assessment
   - Short circuit and open circuit detection
   - Power supply and ground plane analysis

2. Debugging Skills:
   - Visual inspection for physical damage
   - Component orientation verification
   - Connection and wiring continuity check
   - Heat damage and burn mark detection
   - LED status and indicator interpretation

3. Measurement Guidance:
   - Multimeter usage recommendations
   - Oscilloscope measurement points
   - Logic analyzer setup suggestions
   - Thermal imaging interpretation

4. Problem Identification:
   - Common failure modes recognition
   - Component value verification
   - Signal integrity issues
   - EMI/EMC problem indicators
   - Manufacturing defects

RESPONSE APPROACH:
- ALWAYS check visual state first with analyze_webcam
- Be specific about component locations (e.g., "near the upper-left corner")
- Identify components by their markings when visible
- Suggest concrete debugging steps based on visual inspection
- Prioritize safety warnings (high voltage, hot components)
- Provide measurement points and expected values
- Even for theoretical questions, relate answer to current visual state

LANGUAGE RULES:
- Respond in Japanese if spoken to in Japanese
- Respond in English if spoken to in English
- Use technical terms appropriately for the user's level

REMEMBER: You are in HARDWARE DEBUG MODE. Every response must include visual analysis.`,
                  // temperature: 0.8,
                  input_audio_transcription: { model: 'whisper-1' },
                  turn_detection: {
                    type: 'server_vad',
                    threshold: 0.5,  // 感度を調整
                    prefix_padding_ms: 300,
                    silence_duration_ms: 1000,  // より長い沈黙を許容
                    create_response: true
                  },
                  max_response_output_tokens: 4096,
                  tools: [
                    {
                      type: 'function',
                      function: {
                        name: 'analyze_webcam',
                        description: 'Captures and analyzes the current webcam view to see what is visible in the camera feed.',
                        parameters: {
                          type: 'object',
                          properties: {},
                          required: []
                        }
                      }
                    }
                  ],
                  tool_choice: 'required'  // ツールの使用を必須にする
                },
              });

              // 自動画像キャプチャを開始
              startFrameCapture();
            }
            break;

          case 'response.output_item.added':
            console.log('📦 Output item added:', event);
            if (event.item && event.item.type === 'function_call') {
              console.log('🎯 Function call output item detected:', event.item);
              console.log('🎯 Function name:', event.item.name);
            }
            break;

          case 'response.function_call_arguments.started':
            console.log('🔧 Function call started:', event);
            break;

          case 'response.function_call_arguments.delta':
            console.log('🔧 Function call delta:', event);
            break;

          case 'response.function_call_arguments.done':
            console.log('🔧 Function call complete:', event);
            console.log('🔧 Function name:', event.name);
            console.log('🔧 Call ID:', event.call_id);
            console.log('🔧 Arguments:', event.arguments);

            if (event.name === 'analyze_webcam') {
              console.log('🎥 AI requested webcam analysis');
              console.log('🎥 Stored images count:', storedImagesRef.current.length);
              setAiResponse('映像を確認しています...');

              // 最新の画像を取得して解析
              const latestImage = getLatestImage();
              console.log('🎥 Latest image exists:', !!latestImage);
              console.log('🎥 Latest image length:', latestImage?.length || 0);

              if (latestImage) {
                analyzeImage(latestImage).then((result) => {
                  if (result && socketConnected) {
                    console.log('Sending vision analysis result:', result);

                    // 解析結果をOpenAIに送信
                    emit('openai-message', {
                      type: 'conversation.item.create',
                      item: {
                        type: 'function_call_output',
                        call_id: event.call_id,
                        output: result
                      }
                    });

                    // 関数呼び出しの結果送信後、OpenAIが自動的に応答を生成します

                    // ChatPanelにビジュアルデバッグメッセージを送信
                    if (onMessageSend) {
                      onMessageSend({
                        role: 'assistant',
                        content: result,
                        source: 'vision',
                        debugMetadata: {
                          imageBase64: latestImage
                        },
                        timestamp: new Date().toISOString()
                      });
                    }
                  }
                }).catch(err => {
                  console.error('Vision analysis error:', err);
                  emit('openai-message', {
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: event.call_id,
                      output: '画像の解析に失敗しました'
                    }
                  });
                });
              } else {
                emit('openai-message', {
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: event.call_id,
                    output: 'まだ画像がキャプチャされていません'
                  }
                });
              }
            }
            break;

          case 'conversation.item.input_audio_transcription.completed':
          case 'conversation.item.input_audio_transcription.done':
          case 'input_audio_transcription.completed':
          case 'audio.transcription.completed':
            // イベント構造を詳しくログ出力
            console.log('🎤 Transcription completed event:', JSON.stringify(event, null, 2));

            // 様々な形式でtranscriptを取得
            const userText = event.transcript ||
              event.item?.transcript ||
              event.item?.content?.[0]?.transcript ||
              event.data?.transcript ||
              '';

            console.log('🎤 Extracted transcript:', userText || '(empty)');

            if (userText) {
              console.log('🎤 User said:', userText);
              setUserVoicePrompt(userText);

              // ChatPanelにデバッグメッセージとして送信
              if (onMessageSend) {
                console.log('🎤 Sending voice message to ChatPanel:', userText);
                const debugMessage = {
                  id: `debug-audio-${Date.now()}`,
                  role: 'user' as const,
                  content: userText,
                  timestamp: new Date().toISOString(),
                  type: 'debug-audio' as const,  // 重要：typeを追加
                  source: 'voice',
                  debugMetadata: {
                    audioTranscript: userText
                  }
                };
                onMessageSend(debugMessage);
              } else {
                console.warn('onMessageSend is not defined');
              }
            } else {
              console.warn('No transcript found in event');
            }
            break;

          case 'response.audio.delta':
            if (event.delta && audioContextRef.current) {
              try {
                console.log('Received audio delta, length:', event.delta.length);
                setIsAISpeaking(true);

                // Base64からArrayBufferに変換
                const audioData = base64ToArrayBuffer(event.delta);
                console.log('Converted audio data length:', audioData.byteLength);
                audioBufferRef.current.push(audioData);

                // バッファが溜まったら再生開始
                if (!isPlayingRef.current && audioBufferRef.current.length > 0) {
                  console.log('Starting audio playback, buffer count:', audioBufferRef.current.length);
                  playAudioBuffer();
                }
              } catch (error) {
                console.error('Error processing audio delta:', error);
              }
            } else {
              console.warn('Audio delta received but AudioContext not ready');
            }
            break;

          case 'response.audio_transcript.delta':
            const deltaText = event.delta || '';
            console.log('Transcript delta received:', deltaText);
            setAiResponse((prev) => {
              const newResponse = prev + deltaText;
              aiResponseRef.current = newResponse;
              return newResponse;
            });
            break;

          case 'response.audio_transcript.done':
            console.log('AI response complete. Final response:', aiResponse);
            // 音声再生が完了するまでisAISpeakingを維持

            // ChatPanelにAI応答を送信
            const finalResponse = aiResponse || aiResponseRef.current;
            if (onMessageSend && finalResponse) {
              console.log('Sending AI response to ChatPanel:', finalResponse);
              const message = {
                id: `debug-response-${Date.now()}`,
                role: 'assistant' as const,
                content: finalResponse,
                source: 'voice',
                type: 'debug-response' as const,
                timestamp: new Date().toISOString()
              };
              onMessageSend(message);
              // 送信後にリセット
              setAiResponse('');
              aiResponseRef.current = '';
            }
            break;

          case 'response.audio.done':
            console.log('Audio response complete');
            // 全ての音声が再生されるまで待機
            setTimeout(() => {
              if (!isPlayingRef.current && audioBufferRef.current.length === 0) {
                setIsAISpeaking(false);
              }
            }, 1000);
            break;

          case 'input_audio_buffer.speech_started':
            console.log('🎤 User started speaking');
            setIsAISpeaking(false);
            break;

          case 'input_audio_buffer.speech_stopped':
            console.log('🔇 User stopped speaking');
            // OpenAIが自動的にバッファをコミットするため、ここでは何もしない
            break;

          case 'input_audio_buffer.committed':
            console.log('✅ Audio buffer committed');
            break;

          case 'response.text.delta':
            const textDelta = event.delta || '';
            console.log('Text delta received:', textDelta);
            setAiResponse((prev) => prev + textDelta);
            break;

          case 'response.text.done':
            console.log('Text response complete. Final text:', event.text || aiResponse);
            setIsAISpeaking(false);

            const finalText = event.text || aiResponse;
            if (onMessageSend && finalText) {
              onMessageSend({
                role: 'assistant',
                content: finalText,
                source: 'voice',
                timestamp: new Date().toISOString()
              });
              setAiResponse('');
            }
            break;

          case 'conversation.item.created':
            console.log('📝 Conversation item created:', JSON.stringify(event, null, 2));
            if (event.item && event.item.type === 'function_call') {
              console.log('🔧 Function call item detected:', event.item.name);
            }
            break;

          case 'response.done':
            console.log('Response done event received');
            break;

          case 'error':
            console.error('🚨 OpenAI error event:', event);
            if (event.error) {
              console.error('Error details:', {
                type: event.error.type,
                message: event.error.message,
                code: event.error.code,
                full: event.error
              });

              // エラーメッセージをユーザーに表示
              const errorMsg = event.error.message || 'OpenAI Realtime APIでエラーが発生しました';
              setError(errorMsg);
            }
            break;
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    };

    // エラー処理
    const handleError = (error: unknown) => {
      console.error('Socket error:', error);

      // 様々なエラー形式に対応
      let errorMessage = 'Unknown error occurred';

      if (error && typeof error === 'object') {
        if (error.message) {
          errorMessage = error.message;
        } else if (error.type) {
          switch (error.type) {
            case 'openai_connection_error':
              errorMessage =
                'OpenAI接続エラー: ' +
                (error.details?.message || 'Connection failed');
              break;
            case 'openai_not_available':
              errorMessage =
                'OpenAI接続が利用できません: ' +
                (error.connectionState === 0
                  ? '接続中'
                  : error.connectionState === 3
                    ? '接続終了'
                    : '未接続');
              break;
            default:
              errorMessage = `エラータイプ: ${error.type}`;
          }
        } else if (Object.keys(error).length === 0) {
          errorMessage = 'Socket通信エラーが発生しました';
        } else {
          errorMessage = JSON.stringify(error);
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      setError(errorMessage);
    };

    // イベントリスナー登録
    on('openai-connected', handleConnected);
    on('openai-message', handleMessage);
    on('error', handleError);

    // クリーンアップ
    return () => {
      off('openai-connected', handleConnected);
      off('openai-message', handleMessage);
      off('error', handleError);
    };
  }, [socketConnected, emit, on, off, onMessageSend, aiResponse]);

  // 音声バッファを再生する関数
  const playAudioBuffer = async () => {
    if (!audioContextRef.current || isPlayingRef.current) return;

    isPlayingRef.current = true;

    try {
      // 複数のバッファを一つに結合（最低1秒分）
      const minBuffers = Math.max(4, Math.floor(24000 / 6000)); // 最低1秒分

      while (audioBufferRef.current.length > 0) {
        // 十分なバッファが溜まるまで待機
        if (audioBufferRef.current.length < minBuffers && audioBufferRef.current.length < 20) {
          await new Promise(resolve => setTimeout(resolve, 50));
          if (audioBufferRef.current.length === 0) break;
        }

        // 複数のバッファを結合
        const buffersToPlay = Math.min(audioBufferRef.current.length, 10);
        const combinedBuffers: ArrayBuffer[] = [];
        let totalLength = 0;

        for (let i = 0; i < buffersToPlay; i++) {
          const buffer = audioBufferRef.current.shift()!;
          combinedBuffers.push(buffer);
          totalLength += buffer.byteLength;
        }

        // 結合されたバッファを作成
        const combinedInt16 = new Int16Array(totalLength / 2);
        let offset = 0;

        for (const buffer of combinedBuffers) {
          const int16 = new Int16Array(buffer);
          combinedInt16.set(int16, offset);
          offset += int16.length;
        }

        // PCM16データをFloat32に変換
        const float32Array = new Float32Array(combinedInt16.length);
        for (let i = 0; i < combinedInt16.length; i++) {
          float32Array[i] = combinedInt16[i] / 32768.0;
        }

        // AudioBufferを作成
        const sampleRate = audioContextRef.current.sampleRate;
        const audioBuffer = audioContextRef.current.createBuffer(
          1, // モノラル
          float32Array.length,
          sampleRate
        );

        console.log('Playing combined audio buffer, samples:', float32Array.length, 'duration:', float32Array.length / sampleRate, 's');

        audioBuffer.getChannelData(0).set(float32Array);

        // 再生
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);

        // AudioContextがsuspendedの場合はresume
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        source.start();

        // 再生完了まで待機
        await new Promise(resolve => {
          source.onended = resolve;
        });
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    } finally {
      isPlayingRef.current = false;

      // 残りのバッファがあれば再度再生
      if (audioBufferRef.current.length > 0) {
        setTimeout(() => playAudioBuffer(), 100);
      }
    }
  };

  // フレームキャプチャを開始
  const startFrameCapture = () => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // 既存のインターバルをクリア
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
    }

    frameIntervalRef.current = setInterval(() => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // パフォーマンスのため画像を50%にスケール
        const scale = 0.5;
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // 画像をbase64に変換
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64 = imageDataUrl.split(',')[1];

        if (base64) {
          // メモリに画像を保存
          const now = Date.now();
          storedImagesRef.current.push({ timestamp: now, base64 });

          // 古い画像を削除
          if (storedImagesRef.current.length > maxStoredImages) {
            storedImagesRef.current.shift();
          }

          console.log(`📸 Stored frame. Total frames: ${storedImagesRef.current.length}, Image size: ${base64.length}`);
        }
      }
    }, 1000); // 1秒ごとにキャプチャ
  };

  // 最新の画像を取得
  const getLatestImage = () => {
    if (storedImagesRef.current.length === 0) return null;
    return storedImagesRef.current[storedImagesRef.current.length - 1].base64;
  };

  // 画像を解析
  const analyzeImage = async (base64Image: string) => {
    try {
      // OpenAI Vision APIに送信
      const response = await fetch('/api/analyze-vision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          prompt: `ハードウェアデバッグモード：画像を詳細に分析してください。

現在の状態を観察:
- 何が見えるか（部品、基板、配線、測定器具など）
- 全体的な構成と接続状態
- LED、ディスプレイ、インジケータの状態

1. 見える部品とその配置:
   - IC、抵抗、コンデンサ、コネクタなどの部品を特定
   - 部品の向き、マーキング、値を読み取る
   - 基板のレイアウトと配線パターン

2. 潜在的な問題箇所:
   - はんだ付けの品質（ブリッジ、未接続、フラックス残渣）
   - 部品の破損や変色（過熱の兆候）
   - 配線の断線や短絡の可能性
   - 部品の誤実装（逆向き、間違った値）

3. デバッグ推奨事項:
   - 測定すべきポイント
   - 確認すべき接続
   - 安全上の注意事項

4. 前回からの変化（もしあれば）:
   - 新しく追加された接続や部品
   - 変更された配線
   - 状態の変化

可能な限り具体的に、位置を明確にして説明してください。`
        })
      });

      if (!response.ok) {
        throw new Error('Vision API request failed');
      }

      const result = await response.json();
      return result.description;
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw error;
    }
  };

  // カメラとマイクを開始
  const startSession = async () => {
    try {
      setIsConnecting(true);
      setConnectionState('connecting');
      setError(null);

      // メディアストリームを取得（常にマイクも要求）
      console.log('Requesting user media with camera:', selectedCameraId);
      const constraints: MediaStreamConstraints = {
        video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // ミュート状態に応じて音声トラックを設定
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !isMuted;
        console.log(`Initial audio track ${track.id} enabled:`, !isMuted);
      });

      console.log('Media stream obtained:', stream);
      console.log('Video tracks:', stream.getVideoTracks());
      console.log('Audio tracks:', stream.getAudioTracks());

      streamRef.current = stream;

      // AudioContext初期化（サンプルレートを指定）
      audioContextRef.current = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)({ sampleRate: 24000 });

      console.log('AudioContext initialized with sample rate:', audioContextRef.current.sampleRate);

      // ビデオ表示を先に開始
      setIsWebcamOn(true);

      // OpenAIに接続（非同期で実行）
      if (socketConnected) {
        emit('openai-connect', {});
        console.log('Requested OpenAI connection, waiting for response...');
      } else {
        setError('Socket not connected');
      }

      // 音声録音開始（常に開始、ミュート状態はトラックで制御）
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(
        16384, // バッファサイズを増加（約0.68秒）
        1,
        1,
      );

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

      // 音声バッファリング用の変数
      let audioChunkCount = 0;
      let audioAccumulator: Float32Array[] = [];
      let lastSendTime = Date.now();
      const MIN_SEND_INTERVAL = 1000; // 最小送信間隔（1秒）

      processor.onaudioprocess = (e) => {
        // OpenAI接続が確立されている場合のみ音声データを送信
        if (connectionStateRef.current === 'connected') {
          const inputData = e.inputBuffer.getChannelData(0);

          // 音声レベルをチェック
          const audioLevel = Math.max(...inputData.map(Math.abs));

          // 音声データがある場合のみ蓄積
          if (audioLevel > 0.01) { // 閾値を調整可能
            audioAccumulator.push(new Float32Array(inputData));

            // 十分な時間が経過したら送信
            const now = Date.now();
            if (now - lastSendTime >= MIN_SEND_INTERVAL && audioAccumulator.length > 0) {
              // 蓄積したデータを結合
              const totalLength = audioAccumulator.reduce((sum, arr) => sum + arr.length, 0);

              // 最小100ms（2400サンプル）のデータがある場合のみ送信
              const MIN_SAMPLES = 2400; // 100ms at 24kHz
              if (totalLength >= MIN_SAMPLES) {
                const combinedData = new Float32Array(totalLength);
                let offset = 0;
                for (const chunk of audioAccumulator) {
                  combinedData.set(chunk, offset);
                  offset += chunk.length;
                }

                // PCM16に変換して送信
                const pcm16 = floatTo16BitPCM(combinedData);
                const base64 = arrayBufferToBase64(pcm16);
                audioChunkCount++;

                console.log(`Sending audio buffer ${audioChunkCount}: ${totalLength} samples (${(totalLength / 24000).toFixed(2)}s), level: ${audioLevel.toFixed(3)}`);

                console.log(`📥 Appending audio to buffer: ${base64.length} chars, ${pcm16.byteLength} bytes`);
                emit('openai-message', {
                  type: 'input_audio_buffer.append',
                  audio: base64,
                });

                // 音声データが実際に送信された場合のみコミット
                if (pcm16.byteLength > 0) {
                  setTimeout(() => {
                    console.log(`📤 Committing audio buffer: ${pcm16.byteLength} bytes`);
                    emit('openai-message', {
                      type: 'input_audio_buffer.commit',
                    });
                  }, 100);
                } else {
                  console.warn('⚠️ Skipping commit: PCM16 buffer is empty');
                }

                // バッファをクリア
                audioAccumulator = [];
                lastSendTime = now;
              } else {
                console.log(`⏸️ Buffering audio: ${totalLength} samples (need at least ${MIN_SAMPLES})`);
              }
            }
          } else {
            // 無音でも一定時間経過したらバッファを送信（音声認識のため）
            const now = Date.now();
            if (now - lastSendTime >= MIN_SEND_INTERVAL && audioAccumulator.length > 0) {
              const totalLength = audioAccumulator.reduce((sum, arr) => sum + arr.length, 0);

              // 最小100ms（2400サンプル）のデータがある場合のみ送信
              const MIN_SAMPLES = 2400; // 100ms at 24kHz
              if (totalLength >= MIN_SAMPLES) {
                const combinedData = new Float32Array(totalLength);
                let offset = 0;
                for (const chunk of audioAccumulator) {
                  combinedData.set(chunk, offset);
                  offset += chunk.length;
                }

                const pcm16 = floatTo16BitPCM(combinedData);
                const base64 = arrayBufferToBase64(pcm16);
                audioChunkCount++;

                console.log(`Sending audio buffer ${audioChunkCount} (silence): ${totalLength} samples (${(totalLength / 24000).toFixed(2)}s)`);

                console.log(`📥 Appending audio to buffer: ${base64.length} chars, ${pcm16.byteLength} bytes`);
                emit('openai-message', {
                  type: 'input_audio_buffer.append',
                  audio: base64,
                });

                // 音声データが実際に送信された場合のみコミット
                if (pcm16.byteLength > 0) {
                  setTimeout(() => {
                    console.log(`📤 Committing audio buffer (silence): ${pcm16.byteLength} bytes`);
                    emit('openai-message', {
                      type: 'input_audio_buffer.commit',
                    });
                  }, 100);
                } else {
                  console.warn('⚠️ Skipping commit: PCM16 buffer is empty (silence)');
                }

                audioAccumulator = [];
                lastSendTime = now;
              }
            }
          }
        } else {
          if (audioChunkCount === 0) {
            console.log('Waiting for OpenAI connection to send audio... Current state:', connectionStateRef.current);
          }
        }
      };
    } catch (error) {
      console.error('Failed to start session:', error);

      // カメラ・マイクアクセスエラーの詳細ハンドリング
      let userFriendlyMessage = 'セッションの開始に失敗しました';

      if (error instanceof DOMException || (error as Error)?.name) {
        const errorName = (error as Error).name;
        switch (errorName) {
          case 'NotAllowedError':
            userFriendlyMessage =
              'カメラとマイクへのアクセスが拒否されました。ブラウザの設定でアクセスを許可してください。';
            break;
          case 'NotFoundError':
            userFriendlyMessage =
              'カメラまたはマイクが見つかりません。デバイスが接続されているか確認してください。';
            break;
          case 'NotReadableError':
            userFriendlyMessage =
              'カメラまたはマイクが他のアプリケーションによって使用されています。';
            break;
          case 'OverconstrainedError':
            userFriendlyMessage = 'カメラまたはマイクの設定に問題があります。';
            break;
          case 'AbortError':
            userFriendlyMessage =
              'カメラまたはマイクのアクセス要求がキャンセルされました。';
            break;
          default:
            userFriendlyMessage = `カメラ・マイクエラー: ${errorName}`;
        }
      } else if ((error as Error).message.includes('Socket not connected')) {
        userFriendlyMessage =
          'サーバーとの接続に失敗しました。ページを再読み込みしてください。';
      } else {
        userFriendlyMessage = `エラー: ${(error as Error).message}`;
      }

      setError(userFriendlyMessage);
      setIsConnecting(false);
    }
  };

  // セッションを停止
  const stopSession = () => {
    // フレームキャプチャを停止
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }

    // 保存された画像をクリア
    storedImagesRef.current = [];

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsWebcamOn(false);
    setConnectionState('disconnected');
    sessionConfiguredRef.current = false;
    audioBufferRef.current = [];
    isPlayingRef.current = false;

    // OpenAI接続を切断
    if (socketConnected) {
      emit('openai-disconnect');
    }
  };

  // 手動で画像解析をトリガー（オプション）
  const manualAnalyzeImage = async () => {
    if (!connectionState === 'connected') return;

    setIsCapturing(true);

    try {
      const latestImage = getLatestImage();
      if (!latestImage) {
        setError('まだ画像がキャプチャされていません');
        return;
      }

      setCapturedImage(`data:image/jpeg;base64,${latestImage}`);

      console.log('Manually triggering image analysis...');

      // ユーザーメッセージとして画像解析をリクエスト
      emit('openai-message', {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'text',
              text: '現在の画面を見て、ハードウェアの状態を教えてください。'
            }
          ]
        }
      });

      // 応答を促す
      emit('openai-message', {
        type: 'response.create'
      });
    } catch (error) {
      console.error('Error in manual analysis:', error);
      setError('画像解析に失敗しました');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Hardware Debug Support
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Show your hardware to the AI for debugging assistance
            </p>
          </div>
          <div className="flex items-center gap-2">
            {connectionState === 'connected' && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                Connected
              </span>
            )}
            {connectionState === 'connecting' && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                Connecting...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col p-6">
        {/* ビデオ */}
        <div className="flex-1 bg-black rounded-lg overflow-hidden relative mb-4" style={{ minHeight: '400px' }}>
          {!isWebcamOn ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">Camera is off</p>
                <button
                  onClick={startSession}
                  disabled={isConnecting || !socketConnected}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                      Connecting...
                    </>
                  ) : (
                    'Start Hardware Debug'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain bg-gray-900"
                onLoadedMetadata={() => console.log('Video metadata loaded')}
                onPlay={() => console.log('Video started playing')}
                onError={(e) => console.error('Video error:', e)}
              />
              {isAISpeaking && (
                <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-2 rounded-lg">
                  AI Speaking...
                </div>
              )}
            </>
          )}
        </div>

        {/* コントロール */}
        <div className="flex items-center gap-4">
          <button
            onClick={isWebcamOn ? stopSession : startSession}
            disabled={isConnecting}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${isWebcamOn
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
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

          <button
            onClick={() => {
              const newMutedState = !isMuted;
              setIsMuted(newMutedState);

              // アクティブな音声トラックをミュート/アンミュート
              if (streamRef.current) {
                const audioTracks = streamRef.current.getAudioTracks();
                audioTracks.forEach(track => {
                  track.enabled = !newMutedState;
                  console.log(`Audio track ${track.id} enabled:`, !newMutedState);
                });
              }
            }}
            disabled={!isWebcamOn}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${isMuted ? 'bg-gray-200 text-gray-700' : 'bg-blue-600 text-white'
              }`}
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

          {/* 手動画像解析ボタン（オプション） */}
          <button
            onClick={manualAnalyzeImage}
            disabled={!isWebcamOn || connectionState !== 'connected' || isCapturing || storedImagesRef.current.length === 0}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${isCapturing
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
              } disabled:bg-gray-300 disabled:cursor-not-allowed`}
          >
            {isCapturing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Image className="w-5 h-5" />
                Analyze Now
              </>
            )}
          </button>

          {/* 自動キャプチャ状態表示 */}
          {isWebcamOn && connectionState === 'connected' && (
            <span className="text-sm text-gray-600">
              自動キャプチャ中 ({storedImagesRef.current.length}/60枚)
            </span>
          )}

          {/* カメラ選択 */}
          {availableCameras.length > 1 && (
            <select
              value={selectedCameraId}
              onChange={(e) => {
                setSelectedCameraId(e.target.value);
                // カメラが変更されたら現在のセッションを停止
                if (isWebcamOn) {
                  stopSession();
                }
              }}
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

        {/* エラー表示 */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* 会話表示 */}
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

        {/* キャプチャした画像のプレビュー */}
        {capturedImage && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2">キャプチャした画像:</h3>
            <img
              src={capturedImage}
              alt="Captured hardware"
              className="max-w-xs rounded-lg border border-gray-300"
            />
          </div>
        )}
      </div>

      {/* 非表示canvas（画像キャプチャ用） */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
