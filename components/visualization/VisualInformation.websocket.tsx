"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { Camera, CameraOff, Mic, MicOff, Loader2 } from "lucide-react"
import type { DebugContext, DebugChatMessage } from "@/types/debug"
import { useSocket } from "@/hooks/useSocket"

interface RealtimeEvent {
  type: string
  event_id?: string
  conversation_id?: string
  item?: any
  response?: any
  delta?: any
  audio?: ArrayBuffer
}

interface VisualInformationProps {
  projectId: string
  onMessageSend?: (message: any) => void
}

// Check browser support
function checkBrowserSupport() {
  const issues: string[] = []

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    issues.push('getUserMedia not supported')
  }

  if (!window.MediaRecorder) {
    issues.push('MediaRecorder not supported')
  }

  if (!window.AudioContext && !(window as any).webkitAudioContext) {
    issues.push('AudioContext not supported')
  }

  if (!window.WebSocket) {
    issues.push('WebSocket not supported')
  }

  return {
    supported: issues.length === 0,
    issues
  }
}

export function VisualInformation({ projectId, onMessageSend }: VisualInformationProps) {
  // Socket.io接続
  const { socket, isConnected: socketConnected, emit, on, off } = useSocket({
    onConnect: () => {
      console.log('Socket.io connected')
      // Socket接続後にOpenAI接続を開始
      emit('openai-connect', {});
    },
    onDisconnect: () => {
      console.log('Socket.io disconnected')
      setIsConnected(false)
      setOpenAIConnected(false)
      setConnectionState('disconnected')
    },
    onError: (error) => {
      console.error('Socket error:', error)
      setError('Connection error: ' + error.message)
    }
  })
  const [isWebcamOn, setIsWebcamOn] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [openAIConnected, setOpenAIConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userVoicePrompt, setUserVoicePrompt] = useState<string>("")
  const [aiResponse, setAiResponse] = useState<string>("")
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>("")
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const maxReconnectAttempts = 3
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('disconnected')
  const [isOnline, setIsOnline] = useState(true)
  const [offlineMessageQueue, setOfflineMessageQueue] = useState<Array<{ type: string; timestamp: number }>>([])

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const wsRef = useRef<any>(null) // Reference to track OpenAI connection state
  const audioContextRef = useRef<AudioContext | null>(null)
  // const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null)
  // const lastVisionAnalysisRef = useRef<number>(0)
  const [visionDescription, setVisionDescription] = useState<string>("")
  const storedImagesRef = useRef<{ timestamp: number; base64: string }[]>([])
  const maxStoredImages = 60 // Store last 60 seconds of images (60 * 1 second)
  const aiResponseRef = useRef<string>("")
  const [isAISpeaking, setIsAISpeaking] = useState(false)
  const debugSessionIdRef = useRef<string | null>(null)
  // const audioQueueRef = useRef<AudioBufferSourceNode[]>([])
  // const isPlayingAudioRef = useRef<boolean>(false)
  const currentResponseIdRef = useRef<string | null>(null)
  const audioBuffersRef = useRef<ArrayBuffer[]>([])
  const isAISpeakingRef = useRef<boolean>(false)
  const sessionConfiguredRef = useRef<boolean>(false)
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const noiseFloorRef = useRef<number>(0.01)  // Dynamic noise floor
  const noiseBufferRef = useRef<number[]>([])  // Buffer for noise level samples
  const maxNoiseBufferSize = 50  // Keep last 50 samples for noise floor calculation
  const audioDataSentRef = useRef<number>(0)  // Track amount of audio data sent
  const pendingResponseRef = useRef<boolean>(false)  // Track if we're waiting to create a response

  // Initialize WebRTC and WebSocket connection
  const startRealtimeSession = useCallback(async () => {
    try {
      setIsConnecting(true)
      setConnectionState('connecting')
      setError(null)

      // Get user media (webcam + microphone)
      let stream: MediaStream
      try {
        const constraints: MediaStreamConstraints = {
          video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : true,
          audio: !isMuted ? {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false,  // Disabled to prevent AGC from amplifying ambient noise
            sampleRate: 48000,  // Higher sample rate for better quality
            channelCount: 1,    // Mono for consistency
            latency: 0          // Low latency
          } : false
        }
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      } catch (mediaErr: any) {
        console.error('Media access error:', mediaErr)
        if (mediaErr.name === 'NotAllowedError') {
          setError('📷 Camera and microphone access denied. Please allow permissions in your browser settings and try again.')
        } else if (mediaErr.name === 'NotFoundError') {
          setError('🎤 No camera or microphone found. Please connect a device and try again.')
        } else if (mediaErr.name === 'NotReadableError') {
          setError('🔒 Camera or microphone is already in use by another application. Please close other apps and try again.')
        } else if (mediaErr.name === 'OverconstrainedError') {
          setError('⚠️ The selected camera does not meet the requirements. Trying with default camera...')
          // Retry with default camera
          try {
            const defaultStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: !isMuted })
            stream = defaultStream
          } catch (retryErr) {
            setError('❌ Failed to access camera. Please check your device settings.')
            setIsConnecting(false)
            setIsWebcamOn(false)
            return
          }
        } else {
          setError(`❌ Media access error: ${mediaErr.message}`)
        }
        if (!stream) {
          setIsConnecting(false)
          setIsWebcamOn(false)
          return
        }
      }

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // Initialize audio context for processing
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass()
        console.log('AudioContext initialized, sample rate:', audioContextRef.current.sampleRate)

        // Resume audio context if suspended (required in some browsers)
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().then(() => {
            console.log('AudioContext resumed')
          }).catch(err => {
            console.warn('Failed to resume AudioContext:', err)
          })
        }
      } else {
        console.warn('Audio playback may not work - AudioContext not supported')
      }

      // Connect to OpenAI via our Socket.io server
      // Initialize OpenAI connection through Socket.IO
      if (socketConnected) {
        console.log('Initiating OpenAI connection through Socket.IO...')
        emit('openai-connect')
      }

      // Handle successful OpenAI connection
      const handleOpenAIConnected = () => {
        console.log('Connected to OpenAI Realtime API through Socket.IO')
        wsRef.current = { readyState: 1 } // Mock WebSocket.OPEN state
        setIsConnected(true)
        setOpenAIConnected(true)
        setIsConnecting(false)
        setConnectionState('connected')
        setReconnectAttempts(0) // Reset reconnect attempts on successful connection
        setError(null) // Clear any previous errors
        sessionConfiguredRef.current = false // Reset session configuration flag
        // Wait for session.created before sending configuration

        // Start capturing and storing video frames
        if (canvasRef.current && videoRef.current) {
          const canvas = canvasRef.current
          const video = videoRef.current
          const ctx = canvas.getContext('2d')

          if (ctx) {
            frameIntervalRef.current = setInterval(() => {
              if (video.readyState === video.HAVE_ENOUGH_DATA) {
                // Optimize canvas size for performance
                const scale = 0.5 // Scale down to 50% for better performance
                canvas.width = video.videoWidth * scale
                canvas.height = video.videoHeight * scale
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

                canvas.toBlob(async (blob) => {
                  if (blob && wsRef.current?.readyState === 1) { // WebSocket.OPEN equivalent
                    const reader = new FileReader()
                    reader.onloadend = () => {
                      const base64 = reader.result?.toString().split(',')[1]
                      if (base64) {
                        // Store image in memory
                        const now = Date.now()
                        storedImagesRef.current.push({ timestamp: now, base64 })

                        // Keep only the last N images
                        if (storedImagesRef.current.length > maxStoredImages) {
                          storedImagesRef.current.shift()
                        }

                        // Garbage collection hint for old images
                        if (storedImagesRef.current.length > maxStoredImages / 2) {
                          storedImagesRef.current = storedImagesRef.current.slice(-maxStoredImages / 2)
                        }
                      }
                    }
                    reader.readAsDataURL(blob)
                  }
                }, 'image/jpeg', 0.7) // Reduced quality for better performance
              }
            }, 1000) // Capture every 1 second for more responsive debugging
          }
        }

        // Start audio recording if not muted
        if (!isMuted) {
          console.log('🎤 Starting audio recording (muted=false)')
          startAudioRecording(stream)
        } else {
          console.log('🔇 Skipping audio recording (muted=true)')
        }
      }

      // Set up Socket.IO event listeners
      on('openai-connected', handleOpenAIConnected)

      on('openai-message', (data: string) => {
        try {
          const message: RealtimeEvent = JSON.parse(data)
          // Log all message types for debugging
          console.log('Received message type:', message.type)
          // Handle different message types
          handleRealtimeMessage(message)
        } catch (err) {
          console.error('Failed to parse OpenAI message:', err)
        }
      })

      on('error', (error: any) => {
        console.error('Socket.IO error:', error)

        // Don't show error if we're already handling reconnection
        if (connectionState !== 'reconnecting') {
          const errorMessage = 'Connection error. Socket.IO server may not be running.'
          setError(errorMessage)
        }
        setIsConnected(false)
        wsRef.current = null

        // Attempt reconnection
        if (reconnectAttempts < maxReconnectAttempts && isWebcamOn) {
          setConnectionState('reconnecting')
          // Check network status before attempting reconnection
          if (!navigator.onLine) {
            setError('📡 No internet connection. Will retry when connection is restored.')
            setConnectionState('disconnected')
            return
          }
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000) // Exponential backoff
          console.log(`Attempting reconnection in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`)
          setError(`Connection lost. Reconnecting... (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`)

          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1)
            startRealtimeSession()
          }, delay)
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          setError('Failed to connect after multiple attempts. Please check your connection and try again.')
          setConnectionState('disconnected')
        }
      })

      // Handle disconnection
      const handleDisconnection = () => {
        console.log('Disconnected from OpenAI Realtime API through Socket.IO')
        setIsConnected(false)
        wsRef.current = null

        // Don't clean up if we're going to reconnect
        const shouldReconnect = reconnectAttempts < maxReconnectAttempts && isWebcamOn

        // Reset session configuration when connection closes
        sessionConfiguredRef.current = false

        if (shouldReconnect) {
          setConnectionState('reconnecting')
          setError(`Connection lost. Reconnecting... (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`)

          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000)
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1)
            startRealtimeSession()
          }, delay)
        } else {
          setError('Connection lost. Please check Socket.IO server.')
          cleanupSession()
        }
      }

      // If Socket.IO is already disconnected, handle it
      if (!socketConnected) {
        handleDisconnection()
      }

    } catch (err) {
      console.error('Error starting realtime session:', err)
      setError(err instanceof Error ? err.message : 'Failed to start session')
      setIsConnecting(false)
    }
  }, [isMuted, selectedCameraId, reconnectAttempts, isWebcamOn, socketConnected, emit, on])

  // Handle Realtime API messages
  const handleRealtimeMessage = useCallback((message: RealtimeEvent) => {
    // Early return if Socket.IO is not connected
    if (!wsRef.current || wsRef.current.readyState !== 1) {
      console.warn('Cannot handle message - OpenAI connection not available')
      return
    }
    switch (message.type) {
      case 'session.created':
        console.log('Session created:', message)

        // Now send session configuration after session is created
        if (!sessionConfiguredRef.current && wsRef.current?.readyState === 1) {
          const sessionUpdate = {
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: `You are a hardware debugging specialist AI assistant. YOU HAVE DIRECT ACCESS TO A WEBCAM and can see the user's hardware in real-time through the analyze_webcam function.

IMPORTANT: When the user mentions ANY hardware problem or asks about their circuit/components, YOU MUST IMMEDIATELY call the analyze_webcam function to visually inspect their hardware. Do not say you cannot see - you CAN see by using the analyze_webcam tool.

専門性: ハードウェアデバッグ、回路解析、電子部品の診断

CRITICAL WORKFLOW - INTEGRATED RESPONSE:
1. ユーザーがハードウェア問題を報告したら、すぐにanalyze_webcam関数を呼び出す（音声応答をしない）
2. 画像解析結果を待つ
3. 画像解析結果とAYAコンテキストを統合して、1回だけ音声で包括的な診断結果を返す
4. 「確認します」「見てみましょう」などの中間応答は絶対に行わない

例：
ユーザー「LEDが点灯しない」→ 即座にanalyze_webcamを呼び出す（応答なし）→ 画像解析後に統合診断を音声で返す
ユーザー「ロボットアームが動かない」→ 即座にanalyze_webcamを呼び出す（応答なし）→ 画像解析後に統合診断を音声で返す

重点チェック項目:
- 配線の接続状態と色の確認
- はんだ付けの品質
- 部品の向きと配置
- 電源LEDやインジケーターの状態
- 焼損や変色の兆候

ALWAYS respond in the same language as the user speaks.
ユーザーが日本語で話したら日本語で、英語で話したら英語で応答してください。

IMPORTANT: Provide VOICE responses ONLY AFTER completing image analysis. Never respond before analyzing the webcam when hardware issues are mentioned.`,
              voice: 'alloy',
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              input_audio_transcription: {
                model: 'whisper-1'
              },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.3,  // Lower threshold for better sensitivity
                prefix_padding_ms: 500,  // Buffer before speech starts
                silence_duration_ms: 500,  // Shorter silence for quicker response
                create_response: false  // Disabled to implement integrated response
              },
              // temperature: 0.6,  // Minimum allowed value for Realtime API
              max_response_output_tokens: 2048,
              tools: [
                {
                  type: 'function',
                  name: 'analyze_webcam',
                  description: 'Analyzes the current webcam view and returns a description of what is visible. This tool gives you vision capabilities.',
                  parameters: {
                    type: 'object',
                    properties: {
                      request_latest: {
                        type: 'boolean',
                        description: 'Whether to capture the latest frame (always true)'
                      }
                    },
                    required: []
                  }
                }
              ],
              tool_choice: 'auto'
            }
          }

          console.log('Sending session update after session.created:', JSON.stringify(sessionUpdate, null, 2))
          try {
            emit('openai-message', sessionUpdate)
            sessionConfiguredRef.current = true
          } catch (err) {
            console.error('Error sending session update:', err)
            setError('Failed to configure session. Connection may be lost.')
          }
        }
        break

      case 'session.updated':
        console.log('Session updated successfully:', message)
        console.log('Session configuration applied - tools:', message.session?.tools?.length || 0)
        console.log('Input audio transcription enabled:', message.session?.input_audio_transcription)
        console.log('Full session config:', JSON.stringify(message.session, null, 2))
        break

      case 'conversation.item.created':
        console.log('Conversation item created:', message.item)
        if (message.item?.role === 'user') {
          // Extract user transcript
          let userText = ''

          if (message.item?.content && Array.isArray(message.item.content)) {
            const textContent = message.item.content.find((c: any) => c.type === 'input_text')
            const audioContent = message.item.content.find((c: any) => c.type === 'input_audio')

            if (textContent?.text) {
              userText = textContent.text
            } else if (textContent?.transcript) {
              userText = textContent.transcript
            } else if (audioContent?.transcript) {
              userText = audioContent.transcript
            }
          }

          if (!userText && message.item?.transcript) {
            userText = message.item.transcript
          }

          if (userText) {
            console.log('🎤 User said:', userText)
            setUserVoicePrompt(userText)
            // ChatPanelにデバッグメッセージとして送信
            if (onMessageSend) {
              // デバッグメッセージとして送信
              const debugMessage = {
                id: `debug-audio-${Date.now()}`,
                role: 'user' as const,
                content: userText,
                timestamp: new Date().toISOString(),
                type: 'debug-audio' as const,
                debugMetadata: {
                  audioTranscript: userText
                }
              }
              onMessageSend(debugMessage)
            }
          }
        }
        break

      case 'conversation.item.input_audio_transcription.completed':
        if (message.transcript) {
          console.log('🎤 User said (transcription completed):', message.transcript)
          setUserVoicePrompt(message.transcript)
          // ChatPanelにデバッグメッセージとして送信
          if (onMessageSend) {
            const debugMessage = {
              id: `debug-audio-${Date.now()}`,
              role: 'user' as const,
              content: message.transcript,
              timestamp: new Date().toISOString(),
              type: 'debug-audio' as const,
              debugMetadata: {
                audioTranscript: message.transcript
              }
            }
            onMessageSend(debugMessage)
          }

          // Request AI response with tool usage capability
          if (wsRef.current?.readyState === 1 && socketConnected && openAIConnected) {
            console.log('Transcription completed - requesting AI response with tool choice...')
            emit('openai-message', {
              type: 'response.create',
              response: {
                modalities: ['audio', 'text'],  // Enable both audio and text
                tool_choice: 'auto'    // Allow AI to use tools if needed
              }
            })
          }
          pendingResponseRef.current = false
        } else {
          console.log('⚠️ Transcription completed but no transcript available')
        }
        break

      case 'response.audio_transcript.delta':
        if (message.delta?.transcript) {
          setAiResponse(prev => {
            const newResponse = prev + message.delta.transcript
            aiResponseRef.current = newResponse
            return newResponse
          })
        }
        break

      case 'response.created':
        console.log('Response created:', message)
        console.log('Response modalities:', message.response?.modalities)
        console.log('Response status:', message.response?.status)
        console.log('Response output items:', message.response?.output)
        currentResponseIdRef.current = message.response?.id || null
        audioBuffersRef.current = []
        if (message.response?.modalities?.includes('audio')) {
          console.log('Audio modality detected, setting AI speaking state')
          isAISpeakingRef.current = true
          setIsAISpeaking(true)
        } else {
          console.log('No audio modality in response')
        }
        break

      case 'response.function_call_arguments.done':
        console.log('Function call complete:', message)
        if (message.name === 'analyze_webcam') {
          console.log('AI requested webcam analysis')
          setAiResponse('Looking at your webcam...')

          // Analyze vision
          analyzeVision().then((result) => {
            if (result && wsRef.current?.readyState === 1) {
              console.log('Sending function result:', result)

              // Send visual debug message to ChatPanel
              if (onMessageSend && storedImagesRef.current.length > 0) {
                const latestImage = storedImagesRef.current[storedImagesRef.current.length - 1]
                const debugMessage = {
                  id: `debug-visual-${Date.now()}`,
                  role: 'assistant' as const,
                  content: result,
                  timestamp: new Date().toISOString(),
                  type: 'debug-visual' as const,
                  debugMetadata: {
                    imageBase64: latestImage.base64
                  }
                }
                onMessageSend(debugMessage)
              }

              if (wsRef.current?.readyState === 1) {
                emit('openai-message', {
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: message.call_id,
                    output: result
                  }
                })

                // Request a response after sending function result
                // Add a small delay to ensure the function result is processed
                setTimeout(() => {
                  if (wsRef.current?.readyState === 1) {
                    console.log('Requesting audio response after function call...')
                    emit('openai-message', {
                      type: 'response.create',
                      response: {
                        modalities: ['audio', 'text']
                      }
                    })
                  } else {
                    console.log('OpenAI connection not open, cannot request response')
                  }
                }, 100)
              } else if (!isOnline) {
                setError('Cannot send analysis result while offline. Will retry when connection is restored.')
              }
              setAiResponse('')
            }
          }).catch(err => {
            console.error('Vision analysis error:', err)
            if (wsRef.current?.readyState === 1) {
              emit('openai-message', {
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: message.call_id,
                  output: 'Failed to analyze image'
                }
              })

              // Request a response even on error
              setTimeout(() => {
                if (wsRef.current?.readyState === 1) {
                  console.log('Requesting audio response after function error...')
                  emit('openai-message', {
                    type: 'response.create',
                    response: {
                      modalities: ['audio', 'text']
                    }
                  })
                } else {
                  console.log('OpenAI connection not open after error, cannot request response')
                }
              }, 100)
            }
            setAiResponse('')
          })
        }
        break

      case 'response.audio.delta':
        if (message.response_id === currentResponseIdRef.current && message.delta && audioContextRef.current) {
          try {
            const audioBytes = atob(message.delta)
            const arrayBuffer = new ArrayBuffer(audioBytes.length)
            const view = new Uint8Array(arrayBuffer)

            for (let i = 0; i < audioBytes.length; i++) {
              view[i] = audioBytes.charCodeAt(i)
            }

            audioBuffersRef.current.push(arrayBuffer)
          } catch (err) {
            console.error('Error decoding audio delta:', err)
          }
        }
        break

      case 'response.audio_transcript.done':
        if (message.transcript) {
          // AIの応答をChatPanelに送信
          if (onMessageSend) {
            const debugMessage = {
              id: `debug-assistant-${Date.now()}`,
              role: 'assistant' as const,
              content: message.transcript,
              timestamp: new Date().toISOString(),
              type: 'debug-audio' as const
            }
            onMessageSend(debugMessage)
          }
        }
        break

      case 'response.audio.done':
        console.log('Audio done, playing collected audio chunks')
        if (audioBuffersRef.current.length > 0 && audioContextRef.current) {
          playCollectedAudio()
        }
        break

      case 'response.done':
        console.log('Response done:', message)
        console.log('Response status details:', message.response)
        aiResponseRef.current = ''
        setAiResponse('')
        if (audioBuffersRef.current.length === 0) {
          isAISpeakingRef.current = false
          setIsAISpeaking(false)
        }
        // Clear audio buffers to free memory
        audioBuffersRef.current = []
        break

      case 'input_audio_buffer.speech_stopped':
        console.log('Speech stopped detected')
        // Since create_response is false, we need to decide when to create response
        // Mark that we're pending a response - will be created after analyze_webcam if needed
        pendingResponseRef.current = true
        console.log('Marked pending response - waiting for AI to decide if image analysis is needed')
        break

      case 'input_audio_buffer.speech_started':
        console.log('Speech started detected')
        break

      case 'input_audio_buffer.committed':
        console.log('Audio buffer committed')
        break

      case 'conversation.item.truncated':
        console.log('Conversation item truncated:', message)
        break

      case 'error':
        console.error('Realtime API error - Full message:', JSON.stringify(message, null, 2))
        const errorDetails = message.error || message || {}
        let errorMessage = 'Unknown error'

        if (typeof errorDetails === 'string') {
          errorMessage = errorDetails
        } else if (errorDetails.message) {
          errorMessage = errorDetails.message
        } else if (errorDetails.type) {
          errorMessage = errorDetails.type
        } else if (errorDetails.code) {
          errorMessage = errorDetails.code
        } else if (message.type === 'error' && Object.keys(errorDetails).length === 0) {
          // Empty error object - likely a connection or configuration issue
          errorMessage = 'Connection error. Please check your API key and proxy server.'
        } else {
          errorMessage = JSON.stringify(errorDetails)
        }

        // Don't show error for initial session setup
        if (!sessionConfiguredRef.current) {
          console.log('Ignoring error before session configuration')
        } else {
          setError(`API error: ${errorMessage}`)
        }
        break
    }
  }, [emit, onMessageSend, analyzeVision, socketConnected])

  // Start audio recording with proper PCM16 conversion
  const startAudioRecording = useCallback((stream: MediaStream) => {
    if (!wsRef.current || !audioContextRef.current || !socketConnected) return

    const audioTracks = stream.getAudioTracks()
    if (audioTracks.length === 0) {
      console.error('No audio tracks available')
      setError('No microphone detected. Please check your audio settings.')
      return
    }

    const audioContext = audioContextRef.current

    try {
      const source = audioContext.createMediaStreamSource(stream)
      const bufferSize = 4096
      const scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1)

        ; (scriptProcessor as any)._isActive = true
        ; (scriptProcessor as any)._isMuted = false  // Always start unmuted when recording starts

      console.log(`🎙️ Audio recording initialized - _isMuted: ${(scriptProcessor as any)._isMuted}, isMuted state: ${isMuted}`)

      scriptProcessor.onaudioprocess = (e) => {
        if (!(scriptProcessor as any)._isActive || wsRef.current?.readyState !== 1) {
          return
        }

        // Check if muted
        if ((scriptProcessor as any)._isMuted) {
          console.log('🔇 Audio blocked by mute flag')
          return  // Don't process audio when muted
        }

        if (isAISpeakingRef.current) {
          return
        }

        const inputData = e.inputBuffer.getChannelData(0)

        // Calculate RMS (Root Mean Square) for audio level detection
        let sum = 0
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i]
        }
        const rms = Math.sqrt(sum / inputData.length)

        // Update dynamic noise floor
        noiseBufferRef.current.push(rms)
        if (noiseBufferRef.current.length > maxNoiseBufferSize) {
          noiseBufferRef.current.shift()
        }

        // Calculate noise floor as the 20th percentile of recent RMS values
        if (noiseBufferRef.current.length >= 10) {
          const sortedBuffer = [...noiseBufferRef.current].sort((a, b) => a - b)
          const percentileIndex = Math.floor(sortedBuffer.length * 0.2)
          noiseFloorRef.current = Math.max(0.01, sortedBuffer[percentileIndex] * 1.5)
        }

        // Skip processing if audio level is too low (noise gate)
        const staticMinLevel = 0.05  // Lowered to capture speech while filtering most ambient noise
        const dynamicMinLevel = Math.max(staticMinLevel, noiseFloorRef.current * 2)  // Dynamic threshold based on noise floor
        const minAudioLevel = staticMinLevel  // Use static threshold for now due to high ambient noise

        // Enhanced debugging - log all audio levels temporarily
        if (rms > 0.01) {  // Only log significant audio levels
          console.log(`🎵 Audio RMS: ${rms.toFixed(4)} (threshold: ${minAudioLevel.toFixed(4)}, noise floor: ${noiseFloorRef.current.toFixed(4)})`)
        }

        if (rms < minAudioLevel) {
          console.log(`🔇 Audio too quiet: ${rms.toFixed(4)} < ${minAudioLevel.toFixed(4)}`)
          return  // Don't send low-level noise
        }

        // Additional noise filtering: Check for significant increase above noise floor
        if (rms < noiseFloorRef.current * 2.5) {  // Must be 2.5x louder than noise floor
          console.log(`🔇 Audio filtered (noise floor): ${rms.toFixed(4)} < ${(noiseFloorRef.current * 2.5).toFixed(4)}`)
          return
        }

        console.log(`✅ Audio processing: RMS=${rms.toFixed(4)}`)

        // Convert to 24kHz mono PCM16
        const targetSampleRate = 24000
        const sourceSampleRate = audioContext.sampleRate
        const resampleRatio = targetSampleRate / sourceSampleRate
        const outputLength = Math.floor(inputData.length * resampleRatio)
        const pcm16Data = new Int16Array(outputLength)

        for (let i = 0; i < outputLength; i++) {
          const sourceIndex = i / resampleRatio
          const sampleIndex = Math.floor(sourceIndex)
          const fraction = sourceIndex - sampleIndex

          let sample
          if (sampleIndex < inputData.length - 1) {
            sample = inputData[sampleIndex] * (1 - fraction) + inputData[sampleIndex + 1] * fraction
          } else {
            sample = inputData[sampleIndex]
          }

          pcm16Data[i] = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)))
        }

        // Convert to base64
        const bytes = new Uint8Array(pcm16Data.buffer)
        let binary = ''
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        const base64 = btoa(binary)

        // Send to Realtime API via Socket.IO
        try {
          if (wsRef.current && wsRef.current.readyState === 1 && socketConnected) {
            const audioMessage = {
              type: 'input_audio_buffer.append',
              audio: base64
            }
            emit('openai-message', audioMessage)
            audioDataSentRef.current += base64.length

            // Log successful send (reduce frequency for performance)
            if (Math.random() < 0.1) { // Log 10% of sends
              console.log(`📤 Audio sent: ${base64.length} bytes (total: ${audioDataSentRef.current})`)
            }
          } else {
            console.warn(`❌ OpenAI connection not ready: state=${wsRef.current?.readyState}, socketConnected=${socketConnected}`)
          }
        } catch (err) {
          console.error('❌ Error sending audio data:', err)
        }
      }

      source.connect(scriptProcessor)
      scriptProcessor.connect(audioContext.destination)

        ; (stream as any)._audioSource = source
        ; (stream as any)._scriptProcessor = scriptProcessor

      console.log('Audio recording started with PCM16 conversion')

    } catch (err) {
      console.error('Failed to initialize audio recording:', err)
      setError('Failed to start audio recording. Please try again.')
    }
  }, [isMuted])

  // Analyze vision when requested
  const analyzeVision = async () => {
    // Get AYA context if available
    let ayaContext = null
    if (projectId) {
      try {
        const contextResponse = await fetch(`/api/debug/context/${projectId}`)
        if (contextResponse.ok) {
          ayaContext = await contextResponse.json()
        }
      } catch (err) {
        console.error('Failed to fetch AYA context:', err)
      }
    }
    if (storedImagesRef.current.length === 0) {
      console.log('No stored images to analyze')
      return 'No webcam image available. Please ensure the camera is on.'
    }

    const latestImage = storedImagesRef.current[storedImagesRef.current.length - 1]
    console.log('Analyzing image from', new Date(latestImage.timestamp).toLocaleTimeString())

    try {
      const response = await fetch('/api/analyze-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: latestImage.base64,
          text: userVoicePrompt || "Describe what hardware components, circuit boards, or electronics you see in this image.",
          context: ayaContext
        })
      })

      if (response.ok) {
        const { analysis } = await response.json()
        console.log('Vision analysis result:', analysis)
        setVisionDescription(analysis)
        return analysis
      } else {
        const error = await response.json()
        console.error('Vision API error response:', error)
        return 'Unable to analyze image at this time.'
      }
    } catch (err) {
      console.error('Vision analysis error:', err)
      return 'Error analyzing image. Please try again.'
    }
  }

  // Play collected audio
  const playCollectedAudio = () => {
    if (!audioContextRef.current || audioBuffersRef.current.length === 0) return

    const audioContext = audioContextRef.current

    // Combine all audio buffers
    const totalLength = audioBuffersRef.current.reduce((sum, buf) => sum + buf.byteLength, 0)
    const combinedBuffer = new ArrayBuffer(totalLength)
    const combinedView = new Uint8Array(combinedBuffer)

    let offset = 0
    for (const buffer of audioBuffersRef.current) {
      combinedView.set(new Uint8Array(buffer), offset)
      offset += buffer.byteLength
    }

    // Convert PCM16 to Float32 and play
    try {
      const pcm16Length = combinedBuffer.byteLength / 2
      const audioBuffer = audioContext.createBuffer(1, pcm16Length, 24000)
      const channelData = audioBuffer.getChannelData(0)

      const dataView = new DataView(combinedBuffer)
      for (let i = 0; i < pcm16Length; i++) {
        const sample = dataView.getInt16(i * 2, true)
        channelData[i] = sample / 32768.0
      }

      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContext.destination)

      source.onended = () => {
        console.log('AI finished speaking')
        isAISpeakingRef.current = false
        setIsAISpeaking(false)
      }

      source.start()
      console.log('Playing combined audio:', pcm16Length, 'samples')
    } catch (err) {
      console.error('Error playing combined audio:', err)
    }

    audioBuffersRef.current = []
  }

  // Clean up session
  const cleanupSession = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current)
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (streamRef.current) {
      const stream = streamRef.current as any
      if (stream._scriptProcessor) {
        stream._scriptProcessor._isActive = false
        stream._scriptProcessor.disconnect()
      }
      if (stream._audioSource) {
        stream._audioSource.disconnect()
      }

      streamRef.current.getTracks().forEach(track => track.stop())
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => { })
    }

    setIsWebcamOn(false)
  }

  // Stop the session
  const stopSession = useCallback(() => {
    cleanupSession()

    // Clear OpenAI connection reference
    wsRef.current = null

    setIsWebcamOn(false)
    setIsConnected(false)
    storedImagesRef.current = []
  }, [])

  // Toggle webcam
  const toggleWebcam = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().then(() => {
        console.log('AudioContext resumed on user interaction')
      })
    }

    if (isWebcamOn) {
      stopSession()
    } else {
      setIsWebcamOn(true)
      setTimeout(() => {
        startRealtimeSession()
      }, 0)
    }
  }, [isWebcamOn, stopSession, startRealtimeSession])

  // Toggle mute
  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted
    setIsMuted(newMutedState)
    console.log(`🔇 Mute toggled: ${newMutedState ? 'ON' : 'OFF'}`)

    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks()
      audioTracks.forEach(track => {
        track.enabled = !newMutedState  // Disable track when muted
      })

      const stream = streamRef.current as any
      if (stream._scriptProcessor) {
        // Update the muted state on script processor
        stream._scriptProcessor._isMuted = newMutedState
        console.log(`🎤 Script processor muted: ${newMutedState}`)
      }

      // Clear audio buffer when muting
      if (newMutedState && wsRef.current?.readyState === 1 && socketConnected) {
        console.log('🗑️ Clearing audio buffer...')
        emit('openai-message', {
          type: 'input_audio_buffer.clear'
        })
      }
    }
  }, [isMuted, socketConnected, emit])

  // Get available cameras
  const getAvailableCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter(device => device.kind === 'videoinput')
      setAvailableCameras(cameras)

      if (!selectedCameraId && cameras.length > 0) {
        setSelectedCameraId(cameras[0].deviceId)
      }
    } catch (err) {
      console.error('Error getting cameras:', err)
    }
  }, [selectedCameraId])

  // Switch camera
  const switchCamera = useCallback(async (deviceId: string) => {
    setSelectedCameraId(deviceId)

    if (isWebcamOn && isConnected) {
      stopSession()
      setTimeout(() => {
        setIsWebcamOn(true)
        startRealtimeSession()
      }, 100)
    }
  }, [isWebcamOn, isConnected, stopSession, startRealtimeSession])

  // Manual commit audio buffer (for testing)
  const commitAudioBuffer = useCallback(() => {
    // Option 1: Directly perform image analysis
    console.log('🎯 Manual trigger: Analyzing webcam image...')
    analyzeVision().then((result) => {
      console.log('Vision analysis result:', result)

      // Send the result to ChatPanel
      if (onMessageSend && storedImagesRef.current.length > 0) {
        const latestImage = storedImagesRef.current[storedImagesRef.current.length - 1]
        const debugMessage = {
          id: `debug-visual-manual-${Date.now()}`,
          role: 'assistant' as const,
          content: result,
          timestamp: new Date().toISOString(),
          type: 'debug-visual' as const,
          debugMetadata: {
            imageBase64: latestImage.base64
          }
        }
        onMessageSend(debugMessage)
      }

      // Option 2: Also send a conversation item to trigger AI response
      if (wsRef.current?.readyState === 1 && socketConnected) {
        // Create a user message asking for hardware debug
        emit('openai-message', {
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [{
              type: 'input_text',
              text: 'Please analyze the hardware shown in the webcam and provide debugging assistance.'
            }]
          }
        })

        // Request response with analyze_webcam function
        setTimeout(() => {
          if (wsRef.current?.readyState === 1 && socketConnected) {
            console.log('Requesting AI response with hardware analysis...')
            emit('openai-message', {
              type: 'response.create',
              response: {
                modalities: ['audio', 'text'],
                tool_choice: 'required'  // Force tool usage
              }
            })
          }
        }, 100)
      }
    }).catch(err => {
      console.error('Manual vision analysis error:', err)
    })
  }, [analyzeVision, onMessageSend, socketConnected, emit])

  // Check browser support and get cameras on mount
  useEffect(() => {
    const support = checkBrowserSupport()
    if (!support.supported) {
      console.error('Browser compatibility issues:', support.issues)
      setError(`Browser compatibility issues: ${support.issues.join(', ')}. Please use a modern browser like Chrome, Firefox, or Edge.`)
    } else {
      getAvailableCameras()
    }
  }, [])

  // Listen for device changes
  useEffect(() => {
    const handleDeviceChange = () => {
      getAvailableCameras()
    }

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
    }
  }, [getAvailableCameras])

  // Handle Socket.IO connection state changes
  useEffect(() => {
    if (socketConnected && isWebcamOn && !isConnected) {
      console.log('Socket.IO connected, attempting to connect to OpenAI...')
      // The OpenAI connection will be initiated when startRealtimeSession is called
    } else if (!socketConnected && isConnected) {
      console.log('Socket.IO disconnected, cleaning up OpenAI connection...')
      setIsConnected(false)
      setConnectionState('disconnected')
      wsRef.current = null
    }
  }, [socketConnected, isWebcamOn, isConnected])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSession()
    }
  }, [stopSession])

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
      <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Hardware Debug Support</h2>
          <p className="text-gray-600">
            Show your hardware components to the AI assistant for real-time debugging assistance
          </p>
        </div>

        {/* Main content area - Single column layout with larger camera view */}
        <div className="flex-1 flex flex-col">
          {/* Webcam view - Larger size */}
          <div className="relative bg-black rounded-lg overflow-hidden shadow-xl flex-1 min-h-[500px]">
            {isWebcamOn ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Status indicator */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${connectionState === 'connected' ? 'bg-green-500' :
                      connectionState === 'connecting' ? 'bg-yellow-500' :
                        connectionState === 'reconnecting' ? 'bg-orange-500' :
                          'bg-red-500'
                    } animate-pulse`} />
                  <span className="text-white text-sm">
                    {connectionState === 'connected' ? '🟢 Connected' :
                      connectionState === 'connecting' ? '🟡 Connecting...' :
                        connectionState === 'reconnecting' ? `🟠 Reconnecting (${reconnectAttempts}/${maxReconnectAttempts})...` :
                          '🔴 Disconnected'}
                  </span>
                </div>

                {/* Vision description */}
                {visionDescription && (
                  <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 text-white p-3 rounded-lg">
                    <div className="text-xs font-semibold mb-1">AI Vision:</div>
                    <div className="text-sm">{visionDescription}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">Camera is off</p>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="absolute bottom-4 left-4 right-4 bg-red-500 text-white p-3 rounded-lg">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Control buttons */}
        <div className="mt-4 flex flex-col items-center gap-4">
          {/* Camera selector */}
          {availableCameras.length > 1 && (
            <div className="flex items-center gap-2">
              <label htmlFor="camera-select" className="text-sm font-medium text-gray-700">
                Camera:
              </label>
              <select
                id="camera-select"
                value={selectedCameraId}
                onChange={(e) => switchCamera(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isConnecting}
              >
                {availableCameras.map((camera, index) => (
                  <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || `Camera ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={toggleWebcam}
              disabled={isConnecting}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
                ${isWebcamOn
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : isWebcamOn ? (
                <>
                  <CameraOff className="w-5 h-5" />
                  Stop Session
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  Start Session
                </>
              )}
            </button>

            <button
              onClick={toggleMute}
              disabled={!isWebcamOn || !isConnected || isAISpeaking}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
                ${isMuted
                  ? 'bg-gray-500 hover:bg-gray-600 text-white'
                  : isAISpeaking
                    ? 'bg-orange-500 text-white cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isMuted ? (
                <>
                  <MicOff className="w-5 h-5" />
                  Unmute
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  {isAISpeaking ? 'AI Speaking...' : 'Mute'}
                </>
              )}
            </button>
          </div>

          {/* Debug button for manual audio commit */}
          {isConnected && (
            <button
              onClick={commitAudioBuffer}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-all text-sm"
            >
              Analyze Image (Debug)
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-4 text-center text-sm text-gray-600">
          <p>Show your hardware components, circuit boards, or diagrams to the camera.</p>
          <p>The AI will analyze what it sees and provide guidance through voice conversation.</p>
          <p className="mt-2 font-semibold">Ensure Socket.IO server is running for OpenAI connection.</p>
          {isConnected && (
            <p className="mt-1 text-xs">VAD Settings: threshold={0.5}, silence_duration={500}ms, noise_gate={0.05}</p>
          )}
        </div>
      </div>
    </div>
  )
}