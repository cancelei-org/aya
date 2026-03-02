"use client"

import type { DebugChatMessage } from '@/types/debug'
import { Camera, Mic, Eye } from 'lucide-react'
import { useState } from 'react'

interface DebugMessageRendererProps {
  message: DebugChatMessage
  messageMaxWidth: string
}

export function DebugMessageRenderer({ message, messageMaxWidth }: DebugMessageRendererProps) {
  const [imageExpanded, setImageExpanded] = useState(false)
  
  // Standard message style based on role
  const messageStyle = message.role === "user" 
    ? "bg-[#00AEEF] text-white" 
    : "bg-gray-100 text-gray-900"
  
  // Enhanced style for debug messages
  let enhancedStyle = messageStyle
  let icon = null
  
  if (message.type === 'debug-visual') {
    enhancedStyle = message.role === "user" 
      ? "bg-purple-600 text-white" 
      : "bg-purple-50 text-purple-900 border border-purple-200"
    icon = <Camera className="w-4 h-4 inline-block mr-1" />
  } else if (message.type === 'debug-audio') {
    enhancedStyle = message.role === "user" 
      ? "bg-orange-600 text-white" 
      : "bg-orange-50 text-orange-900 border border-orange-200"
    icon = <Mic className="w-4 h-4 inline-block mr-1" />
  }
  
  return (
    <div className={`${messageMaxWidth} rounded-lg px-3 py-2 ${enhancedStyle}`}>
      {/* Message header for debug messages */}
      {(message.type === 'debug-visual' || message.type === 'debug-audio') && (
        <div className={`text-xs font-semibold mb-1 ${
          message.role === "user" ? "text-white/80" : "text-gray-600"
        }`}>
          {icon}
          {message.type === 'debug-visual' ? 'Vision Analysis' : 'Voice Input'}
        </div>
      )}
      
      {/* Main content */}
      <div className="text-sm break-words whitespace-pre-wrap overflow-wrap-break-word hyphens-auto">
        {message.content}
      </div>
      
      {/* Image thumbnail if available */}
      {message.debugMetadata?.imageBase64 && (
        <div className="mt-2">
          <div 
            className="relative cursor-pointer group"
            onClick={() => setImageExpanded(!imageExpanded)}
          >
            <img
              src={`data:image/jpeg;base64,${message.debugMetadata.imageBase64}`}
              alt="Debug capture"
              className={`rounded-md border ${
                message.role === "user" ? "border-white/30" : "border-gray-300"
              } ${imageExpanded ? "max-w-full" : "max-w-[200px]"} transition-all duration-200`}
            />
            <div className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
              message.role === "user" ? "bg-black/30" : "bg-black/20"
            } rounded-md`}>
              <Eye className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className={`text-xs mt-1 ${
            message.role === "user" ? "text-white/70" : "text-gray-500"
          }`}>
            Click to {imageExpanded ? 'collapse' : 'expand'} image
          </div>
        </div>
      )}
      
      {/* Audio transcript indicator */}
      {message.debugMetadata?.audioTranscript && (
        <div className={`mt-2 text-xs italic ${
          message.role === "user" ? "text-white/70" : "text-gray-600"
        }`}>
          🎤 &ldquo;{message.debugMetadata.audioTranscript}&rdquo;
        </div>
      )}
      
      {/* AYA Context indicator */}
      {message.debugMetadata?.ayaContext && (
        <div className={`mt-2 text-xs ${
          message.role === "user" ? "text-white/70" : "text-gray-500"
        }`}>
          📋 With AYA context: {message.debugMetadata.ayaContext.systemDesign.length} nodes, {message.debugMetadata.ayaContext.compatibilityIssues.length} issues
        </div>
      )}
      
      {/* Timestamp */}
      <div className={`text-xs mt-1 ${
        message.role === "user" ? "text-blue-100" : "text-gray-500"
      }`}>
        {new Date(message.timestamp).toLocaleTimeString("ja-JP", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </div>
  )
}