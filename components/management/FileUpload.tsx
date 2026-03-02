"use client"

import React, { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Upload, X, Image, FileText, Sheet, File } from 'lucide-react'
import { getFileInfo } from '@/utils/data/processing/fileProcessing'
import type { UploadStatus } from '@/types'

interface FileUploadProps {
  selectedFiles: File[]
  uploadStatus: UploadStatus
  filePreviewUrls: Record<string, string>
  onFileSelect: (files: FileList) => void
  onClearFiles: () => void
  className?: string
}

export function FileUpload({
  selectedFiles,
  uploadStatus,
  filePreviewUrls,
  onFileSelect,
  onClearFiles,
  className = ""
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  // ファイル選択ボタンクリック
  const handleClick = () => {
    fileInputRef.current?.click()
  }

  // ファイル選択時の処理
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      onFileSelect(files)
    }
  }

  // ドラッグ&ドロップ処理
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files)
    }
  }

  // ファイルアイコン取得
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-4 w-4" />
    if (file.type === 'application/pdf') return <FileText className="h-4 w-4" />
    if (file.type.includes('sheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) 
      return <Sheet className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* ファイル選択エリア */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
          ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${uploadStatus.isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
        onClick={handleClick}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          id="file-upload-input"
          name="file-upload-input"
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
          disabled={uploadStatus.isUploading}
        />
        
        <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600 mb-1">
          Drag & drop files, or click to select
        </p>
        <p className="text-xs text-gray-500">
          Images (JPEG, PNG, GIF, WebP), PDF, Excel (XLSX, XLS, CSV)  Max 6 MB
        </p>
      </div>

      {/* アップロード進捗 */}
      {uploadStatus.isUploading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">
              ファイル処理中...
            </span>
            <span className="text-sm text-blue-600">
              {uploadStatus.progress}%
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadStatus.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* エラー表示 */}
      {uploadStatus.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">
            ❌ {uploadStatus.error}
          </p>
        </div>
      )}

      {/* 選択されたファイル一覧 */}
      {selectedFiles.length > 0 && !uploadStatus.isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">
              選択されたファイル ({selectedFiles.length})
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFiles}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              <X className="h-3 w-3 mr-1" />
              クリア
            </Button>
          </div>
          
          <div className="space-y-2">
            {selectedFiles.map((file, index) => {
              const fileInfo = getFileInfo(file)
              const previewUrl = filePreviewUrls[file.name]
              
              return (
                <div 
                  key={index}
                  className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg border"
                >
                  {/* ファイルアイコン/プレビュー */}
                  <div className="flex-shrink-0">
                    {previewUrl ? (
                      <img 
                        src={previewUrl} 
                        alt={file.name}
                        className="h-10 w-10 object-cover rounded"
                      />
                    ) : (
                      <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center">
                        {getFileIcon(file)}
                      </div>
                    )}
                  </div>
                  
                  {/* ファイル情報 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {fileInfo.size} • {fileInfo.type}
                    </p>
                  </div>
                  
                  {/* ファイルアイコン */}
                  <div className="flex-shrink-0">
                    <span className="text-lg">
                      {fileInfo.icon}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}