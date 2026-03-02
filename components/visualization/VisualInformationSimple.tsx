"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { Camera, CameraOff, Loader2, Upload, X, Mic, MicOff } from "lucide-react"

export function VisualInformation() {
  const [isWebcamOn, setIsWebcamOn] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visionDescription, setVisionDescription] = useState<string>("")
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>("")
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Get available cameras
  const getAvailableCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter(device => device.kind === 'videoinput')
      setAvailableCameras(cameras)
      
      // Set default camera if not selected
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
    } catch (err: any) {
      console.error('Camera access error:', err)
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow permissions and try again.')
      } else if (err.name === 'NotFoundError') {
        setError('No camera found. Please connect a camera and try again.')
      } else {
        setError(`Camera error: ${err.message}`)
      }
    }
  }, [selectedCameraId, isMuted])

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
  }, [])

  // Capture and analyze image
  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return
    
    setIsAnalyzing(true)
    setError(null)
    
    try {
      // Capture current frame
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      
      if (!ctx) throw new Error('Canvas context not available')
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      // Convert to base64
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      const base64 = dataUrl.split(',')[1]
      setCapturedImage(dataUrl)
      
      // Analyze with GPT-4 Vision
      const response = await fetch('/api/analyze-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: base64,
          text: "Describe what hardware components, circuit boards, or electronics you see in this image. If no electronics are visible, describe what you see."
        })
      })
      
      if (response.ok) {
        const { analysis } = await response.json()
        setVisionDescription(analysis)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to analyze image')
      }
    } catch (err) {
      console.error('Analysis error:', err)
      setError('Failed to analyze image. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  // Clear captured image
  const clearCapture = useCallback(() => {
    setCapturedImage(null)
    setVisionDescription("")
  }, [])

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
        track.enabled = isMuted // Toggle is opposite
      })
    }
  }, [isMuted])

  // Switch camera
  const switchCamera = useCallback(async (deviceId: string) => {
    setSelectedCameraId(deviceId)
    
    // If webcam is on, restart with new camera
    if (isWebcamOn) {
      stopWebcam()
      setTimeout(() => {
        startWebcam()
      }, 100)
    }
  }, [isWebcamOn, stopWebcam, startWebcam])

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
            Show your hardware components to the camera and analyze them with AI
          </p>
        </div>

        {/* Main content area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Webcam/Image view */}
          <div className="relative bg-black rounded-lg overflow-hidden shadow-xl">
            {capturedImage ? (
              <>
                <img 
                  src={capturedImage} 
                  alt="Captured" 
                  className="w-full h-full object-contain"
                />
                <button
                  onClick={clearCapture}
                  className="absolute top-4 right-4 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                  title="Clear capture"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : isWebcamOn ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
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

          {/* Analysis result area */}
          <div className="flex flex-col bg-white rounded-lg shadow-xl">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-800">Analysis Result</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {visionDescription ? (
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700">{visionDescription}</p>
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  <p>No analysis yet</p>
                  <p className="text-sm mt-2">
                    {isWebcamOn 
                      ? "Click 'Analyze' to capture and analyze the current view"
                      : "Start the camera to begin"
                    }
                  </p>
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
                disabled={isAnalyzing}
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
              onClick={captureAndAnalyze}
              disabled={!isWebcamOn || isAnalyzing}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
                ${!isWebcamOn || isAnalyzing
                  ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
                }
              `}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Analyze
                </>
              )}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 text-center text-sm text-gray-600">
          <p>Show your hardware components, circuit boards, or diagrams to the camera.</p>
          <p>Click "Analyze" to capture the image and get AI analysis.</p>
        </div>
      </div>
    </div>
  )
}