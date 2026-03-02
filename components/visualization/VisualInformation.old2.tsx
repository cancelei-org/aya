"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { Camera, CameraOff, Loader2, Mic, MicOff, Volume2 } from "lucide-react"
import { useAudioRecorder } from "@/hooks/useAudioRecorder"
import { useAudioPlayer } from "@/hooks/useAudioPlayer"

interface Message {
  id: string
  type: 'user' | 'assistant'
  text: string
  timestamp: Date
}

export function VisualInformation() {
  const [isWebcamOn, setIsWebcamOn] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>("")
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const conversationRef = useRef<HTMLDivElement>(null)
  
  const { playTextAsSpeech, isPlaying } = useAudioPlayer()
  const { 
    isRecording, 
    startRecording, 
    stopRecording 
  } = useAudioRecorder({
    onTranscription: async (text) => {
      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        text,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, userMessage])
      setIsProcessing(true)

      try {
        // Capture current frame for context
        let imageBase64 = null
        if (canvasRef.current && videoRef.current && isWebcamOn) {
          const canvas = canvasRef.current
          const video = videoRef.current
          const ctx = canvas.getContext('2d')
          
          if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
            imageBase64 = dataUrl.split(',')[1]
          }
        }

        // Send to voice chat API with optional image
        const response = await fetch('/api/voice-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            messages: [{ role: 'user', content: text }],
            image: imageBase64 // Include image if available
          })
        })

        if (!response.ok) throw new Error('Failed to get response')

        const { response: assistantText } = await response.json()

        // Add assistant message
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          text: assistantText,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])

        // Play response
        await playTextAsSpeech(assistantText, 'nova', 1.0)

      } catch (err) {
        console.error('Voice chat error:', err)
        setError('Failed to process voice. Please try again.')
      } finally {
        setIsProcessing(false)
      }
    }
  })

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

  // Start webcam and audio
  const startWebcam = useCallback(async () => {
    try {
      setError(null)
      const constraints: MediaStreamConstraints = {
        video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : true,
        audio: !isMuted
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      
      setIsWebcamOn(true)
      
      // Start continuous frame capture for visual context
      if (!frameIntervalRef.current) {
        frameIntervalRef.current = setInterval(() => {
          // Frame is captured on-demand when user speaks
        }, 1000)
      }
      
    } catch (err: any) {
      console.error('Camera access error:', err)
      if (err.name === 'NotAllowedError') {
        setError('Camera and microphone access denied. Please allow permissions.')
      } else if (err.name === 'NotFoundError') {
        setError('No camera or microphone found.')
      } else {
        setError(`Error: ${err.message}`)
      }
    }
  }, [selectedCameraId, isMuted])

  // Stop webcam
  const stopWebcam = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current)
      frameIntervalRef.current = null
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    setIsWebcamOn(false)
    if (isRecording) {
      stopRecording()
    }
  }, [isRecording, stopRecording])

  // Toggle webcam
  const toggleWebcam = useCallback(() => {
    if (isWebcamOn) {
      stopWebcam()
    } else {
      startWebcam()
    }
  }, [isWebcamOn, startWebcam, stopWebcam])

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted)
    
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks()
      audioTracks.forEach(track => {
        track.enabled = isMuted
      })
    }
  }, [isMuted])

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else if (isWebcamOn && !isMuted) {
      startRecording()
    }
  }, [isRecording, isWebcamOn, isMuted, startRecording, stopRecording])

  // Switch camera
  const switchCamera = useCallback(async (deviceId: string) => {
    setSelectedCameraId(deviceId)
    
    if (isWebcamOn) {
      stopWebcam()
      setTimeout(() => {
        startWebcam()
      }, 100)
    }
  }, [isWebcamOn, stopWebcam, startWebcam])

  // Auto-scroll conversation
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight
    }
  }, [messages])

  // Get cameras on mount
  useEffect(() => {
    getAvailableCameras()
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWebcam()
    }
  }, [stopWebcam])

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Visual AI Assistant</h2>
          <p className="text-gray-600">
            Show your hardware and speak to get real-time AI assistance
          </p>
        </div>

        {/* Main content area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Webcam view */}
          <div className="relative bg-black rounded-lg overflow-hidden shadow-xl">
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
                
                {/* Recording indicator */}
                {isRecording && (
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-white text-sm">Recording</span>
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

          {/* Conversation area */}
          <div className="flex flex-col bg-white rounded-lg shadow-xl">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-800">Conversation</h3>
            </div>
            
            <div 
              ref={conversationRef}
              className="flex-1 overflow-y-auto p-4 max-h-[400px]"
            >
              {messages.length === 0 ? (
                <div className="text-center text-gray-400">
                  <p>Start the camera and press the microphone to speak</p>
                </div>
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
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.type === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <p className="text-sm">{message.text}</p>
                        <p className={`text-xs mt-1 ${
                          message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(isProcessing || isPlaying) && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg px-4 py-2 flex items-center gap-2">
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm text-gray-600">Thinking...</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-4 h-4 animate-pulse text-green-600" />
                            <span className="text-sm text-gray-600">Speaking...</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
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
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
                ${isWebcamOn 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
                }
              `}
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
              onClick={toggleMute}
              disabled={!isWebcamOn}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
                ${!isWebcamOn
                  ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                  : isMuted 
                  ? 'bg-gray-500 hover:bg-gray-600 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
                }
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
                  Mute
                </>
              )}
            </button>

            <button
              onClick={toggleRecording}
              disabled={!isWebcamOn || isMuted || isProcessing || isPlaying}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
                ${!isWebcamOn || isMuted || isProcessing || isPlaying
                  ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                  : isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                  : 'bg-green-500 hover:bg-green-600 text-white'
                }
              `}
            >
              <Mic className="w-5 h-5" />
              {isRecording ? 'Stop Speaking' : 'Start Speaking'}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 text-center text-sm text-gray-600">
          <p>Show your hardware to the camera and press "Start Speaking" to talk to the AI.</p>
          <p>The AI can see what you're showing and respond with voice.</p>
        </div>
      </div>
    </div>
  )
}