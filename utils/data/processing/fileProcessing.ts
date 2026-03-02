// ファイル処理ユーティリティ
// 画像、PDF、Excelファイルの処理を担当

import type { FileAttachment, UploadStatus } from '@/types'
import * as XLSX from 'xlsx'

// ============================================
// ファイル検証
// ============================================

const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  pdf: ['application/pdf'],
  excel: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv' // .csv
  ]
}

const MAX_FILE_SIZE = 6 * 1024 * 1024 // 6MB (Vercel制限)

export function validateFile(file: File): { isValid: boolean; error?: string } {
  // ファイルサイズチェック
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `ファイルサイズが大きすぎます。${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB以下にしてください。`
    }
  }

  // ファイルタイプチェック
  const allAllowedTypes = [
    ...ALLOWED_FILE_TYPES.image,
    ...ALLOWED_FILE_TYPES.pdf,
    ...ALLOWED_FILE_TYPES.excel
  ]

  if (!allAllowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'サポートされていないファイル形式です。画像（JPEG, PNG, GIF, WebP）、PDF、Excel（XLSX, XLS, CSV）のみ対応しています。'
    }
  }

  return { isValid: true }
}

export function getFileType(file: File): 'image' | 'pdf' | 'excel' | 'unknown' {
  if (ALLOWED_FILE_TYPES.image.includes(file.type)) return 'image'
  if (ALLOWED_FILE_TYPES.pdf.includes(file.type)) return 'pdf'
  if (ALLOWED_FILE_TYPES.excel.includes(file.type)) return 'excel'
  return 'unknown'
}

// ============================================
// ファイル変換処理
// ============================================

/**
 * ファイルをBase64エンコードに変換
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to convert file to base64'))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsDataURL(file)
  })
}

/**
 * ExcelファイルをJSONに変換
 */
export async function excelToJson(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        
        const result: any = {}
        
        // 各シートを処理
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
          result[sheetName] = jsonData
        })
        
        resolve({
          sheets: result,
          sheetNames: workbook.SheetNames,
          metadata: {
            totalSheets: workbook.SheetNames.length,
            processedAt: new Date().toISOString()
          }
        })
      } catch (error) {
        reject(new Error(`Excel file processing failed: ${error}`))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read Excel file'))
    }
    
    reader.readAsArrayBuffer(file)
  })
}

// ============================================
// ファイル処理メイン関数
// ============================================

/**
 * ファイルリストを処理してAttachmentに変換
 */
export async function processFiles(
  files: FileList,
  setUploadStatus?: (status: UploadStatus) => void
): Promise<FileAttachment[]> {
  const attachments: FileAttachment[] = []
  const totalFiles = files.length
  
  console.log(`📁 Processing ${totalFiles} files...`)
  
  for (let i = 0; i < totalFiles; i++) {
    const file = files[i]
    const progress = Math.round(((i + 1) / totalFiles) * 100)
    
    // プログレス更新
    if (setUploadStatus) {
      setUploadStatus({ 
        isUploading: true, 
        progress,
        error: undefined 
      })
    }
    
    console.log(`📄 Processing file ${i + 1}/${totalFiles}: ${file.name}`)
    
    // ファイル検証
    const validation = validateFile(file)
    if (!validation.isValid) {
      console.error(`❌ File validation failed: ${validation.error}`)
      throw new Error(validation.error)
    }
    
    const fileType = getFileType(file)
    const attachmentId = `${Date.now()}-${i}`
    
    try {
      if (fileType === 'image') {
        // 画像処理：Base64エンコード
        console.log(`🖼️ Processing image: ${file.name}`)
        const base64Content = await fileToBase64(file)
        
        attachments.push({
          id: attachmentId,
          type: 'image',
          filename: file.name,
          size: file.size,
          content: base64Content
        })
        
      } else if (fileType === 'pdf') {
        // PDF処理：アップロード（今回は簡易実装でBase64）
        console.log(`📄 Processing PDF: ${file.name}`)
        const base64Content = await fileToBase64(file)
        
        attachments.push({
          id: attachmentId,
          type: 'pdf',
          filename: file.name,
          size: file.size,
          content: base64Content
        })
        
      } else if (fileType === 'excel') {
        // Excel処理：JSON変換
        console.log(`📊 Processing Excel: ${file.name}`)
        const jsonData = await excelToJson(file)
        
        attachments.push({
          id: attachmentId,
          type: 'excel',
          filename: file.name,
          size: file.size,
          content: JSON.stringify(jsonData)
        })
        
      } else {
        throw new Error(`Unsupported file type: ${file.type}`)
      }
      
      console.log(`✅ Successfully processed: ${file.name}`)
      
    } catch (error) {
      console.error(`❌ Failed to process ${file.name}:`, error)
      throw new Error(`Failed to process ${file.name}: ${error}`)
    }
  }
  
  console.log(`🎉 All files processed successfully: ${attachments.length} attachments`)
  return attachments
}

// ============================================
// ファイルプレビュー
// ============================================

/**
 * ファイルのプレビューURL生成（画像のみ）
 */
export function createPreviewUrl(file: File): string | null {
  if (getFileType(file) === 'image') {
    return URL.createObjectURL(file)
  }
  return null
}

/**
 * プレビューURLのクリーンアップ
 */
export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url)
}

// ============================================
// ファイル情報表示
// ============================================

/**
 * ファイルサイズを人間が読める形式に変換
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * ファイルタイプのアイコン取得
 */
export function getFileIcon(file: File): string {
  const type = getFileType(file)
  
  switch (type) {
    case 'image':
      return '🖼️'
    case 'pdf':
      return '📄'
    case 'excel':
      return '📊'
    default:
      return '📁'
  }
}

/**
 * ファイル情報の要約
 */
export function getFileInfo(file: File): {
  name: string
  size: string
  type: string
  icon: string
} {
  return {
    name: file.name,
    size: formatFileSize(file.size),
    type: getFileType(file),
    icon: getFileIcon(file)
  }
}