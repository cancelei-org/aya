"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { Camera, CameraOff, Loader2, Mic, MicOff, Volume2, Eye } from "lucide-react"
import { useAudioRecorder } from "@/hooks/useAudioRecorder"
import { useAudioPlayer } from "@/hooks/useAudioPlayer"

interface Message {
  id: string
  type: 'user' | 'assistant' | 'tool'
  text: string
  timestamp: Date
  image?: string
}

export function VisualInformation() {
  const [isWebcamOn, setIsWebcamOn] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isAnalyzingVision, setIsAnalyzingVision] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>("")
  const [capturedImages, setCapturedImages] = useState<string[]>([])
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
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
        // Check if user is asking about what they see
        const visionKeywords = ['see', 'look', 'show', 'what is', "what's", 'this', 'that', 'describe', 'analyze']
        const needsVision = visionKeywords.some(keyword => text.toLowerCase().includes(keyword))

        let assistantResponse = ''
        
        if (needsVision && isWebcamOn) {
          // Capture and analyze image
          const imageData = await captureImage()
          if (imageData) {
            // Show tool message
            const toolMessage: Message = {
              id: (Date.now() + 0.5).toString(),
              type: 'tool',
              text: '🔍 Analyzing what I see...',
              timestamp: new Date()
            }
            setMessages(prev => [...prev, toolMessage])
            setIsAnalyzingVision(true)

            // Analyze image
            const visionResult = await analyzeImage(imageData.base64)
            
            // Show captured image with analysis
            const analysisMessage: Message = {
              id: (Date.now() + 0.6).toString(),
              type: 'tool',
              text: `📸 Vision Analysis: ${visionResult}`,
              timestamp: new Date(),
              image: imageData.dataUrl
            }
            setMessages(prev => [...prev, analysisMessage])
            setIsAnalyzingVision(false)

            // Generate response with vision context
            assistantResponse = await generateResponse(text, visionResult)
          } else {
            assistantResponse = "I couldn't capture an image. Please make sure the camera is working properly."
          }
        } else {
          // Generate response without vision
          assistantResponse = await generateResponse(text)
        }

        // Add assistant message
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          text: assistantResponse,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])

        // Play response
        await playTextAsSpeech(assistantResponse, 'nova', 1.0)

      } catch (err) {
        console.error('Voice chat error:', err)
        setError('Failed to process request. Please try again.')
      } finally {
        setIsProcessing(false)
        setIsAnalyzingVision(false)
      }
    }
  })

  // Capture image from video
  const captureImage = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return null
    
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return null
    
    // Set canvas size to video size
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // Get image data
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    const base64 = dataUrl.split(',')[1]
    
    // Store captured image
    setCapturedImages(prev => [...prev.slice(-4), dataUrl])
    
    return { dataUrl, base64 }
  }, [])

  // Analyze image with GPT-4V
  const analyzeImage = async (base64: string) => {
    try {
      const response = await fetch('/api/analyze-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: base64,
          text: "Describe in detail what hardware components, circuit boards, electronics, or objects you see in this image."
        })
      })
      
      if (response.ok) {
        const { analysis } = await response.json()
        return analysis
      }
      return "Unable to analyze the image."
    } catch (err) {
      console.error('Vision analysis error:', err)
      return "Error analyzing the image."
    }
  }

  // Generate AI response
  const generateResponse = async (userText: string, visionContext?: string) => {
    try {
      const messages = [{
        role: 'user',
        content: visionContext 
          ? `${userText}\n\nContext: I can see ${visionContext}`
          : userText
      }]
      
      const response = await fetch('/api/voice-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      })

      if (response.ok) {
        const { response: text } = await response.json()
        return text
      }
      return "Sorry, I couldn't generate a response."
    } catch (err) {
      console.error('Response generation error:', err)
      return "Error generating response."
    }
  }

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

  // Start webcam
  const startWebcam = useCallback(async () => {
    try {
      setError(null)
      
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      
      const constraints: MediaStreamConstraints = {
        video: selectedCameraId 
          ? { deviceId: { exact: selectedCameraId } }
          : { facingMode: 'user' },
        audio: false // We handle audio separately
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // Ensure video plays
        videoRef.current.play().catch(err => {
          console.error('Error playing video:', err)
        })
      }
      
      setIsWebcamOn(true)
      
    } catch (err: any) {
      console.error('Camera access error:', err)
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow permissions.')
      } else if (err.name === 'NotFoundError') {
        setError('No camera found.')
      } else {
        setError(`Camera error: ${err.message}`)
      }
    }
  }, [selectedCameraId])

  // Stop webcam
  const stopWebcam = useCallback(() => {
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
  }, [isMuted])

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else if (!isMuted) {
      startRecording()
    }
  }, [isRecording, isMuted, startRecording, stopRecording])

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
            Show your hardware and speak to get real-time AI assistance with vision
          </p>
        </div>

        {/* Main content area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Webcam view */}
          <div className="relative bg-black rounded-lg overflow-hidden shadow-xl aspect-video">
            {isWebcamOn ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }} // Mirror the video
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Status indicators */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {isRecording && (
                    <div className="flex items-center gap-2 bg-black bg-opacity-50 rounded-full px-3 py-1">
                      <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-white text-sm">Recording</span>
                    </div>
                  )}
                  {isAnalyzingVision && (
                    <div className="flex items-center gap-2 bg-black bg-opacity-50 rounded-full px-3 py-1">
                      <Eye className="w-4 h-4 text-blue-400 animate-pulse" />
                      <span className="text-white text-sm">Analyzing...</span>
                    </div>
                  )}
                </div>
                
                {/* Recent captures */}
                {capturedImages.length > 0 && (
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    {capturedImages.slice(-3).map((img, idx) => (
                      <img 
                        key={idx}
                        src={img} 
                        alt={`Capture ${idx}`}
                        className="w-12 h-12 rounded border-2 border-white shadow-lg object-cover"
                      />
                    ))}
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
              className="flex-1 overflow-y-auto p-4"
              style={{ maxHeight: '500px' }}
            >
              {messages.length === 0 ? (
                <div className="text-center text-gray-400">
                  <p>Start the camera and press "Start Speaking"</p>
                  <p className="text-sm mt-2">Say "what do you see?" to analyze the view</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.type === 'user' ? 'justify-end' 
                        : message.type === 'tool' ? 'justify-center'
                        : 'justify-start'
                      }`}
                    >
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          message.type === 'user'
                            ? 'bg-blue-500 text-white max-w-[80%]'
                            : message.type === 'tool'
                            ? 'bg-purple-100 text-purple-800 text-sm'
                            : 'bg-gray-100 text-gray-800 max-w-[80%]'
                        }`}
                      >
                        {message.image && (
                          <img 
                            src={message.image} 
                            alt="Analyzed" 
                            className="mb-2 rounded max-w-xs"
                          />
                        )}
                        <p className="text-sm">{message.text}</p>
                        <p className={`text-xs mt-1 ${
                          message.type === 'user' ? 'text-blue-100' 
                          : message.type === 'tool' ? 'text-purple-600'
                          : 'text-gray-500'
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
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
                ${isMuted 
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
              disabled={isMuted || isProcessing || isPlaying}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
                ${isMuted || isProcessing || isPlaying
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
          <p>Show your hardware to the camera and say "what do you see?" or "analyze this"</p>
          <p>The AI will capture and analyze the image when you mention vision-related keywords</p>
        </div>
      </div>
    </div>
  )
}