import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { writeFile } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const requirementId = formData.get('requirementId') as string

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    console.log('📤 Uploading image for requirement:', requirementId)

    // ファイルをバッファとして読み込み
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // ファイル名を生成
    const filename = `${Date.now()}-${file.name}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    const filepath = path.join(uploadDir, filename)

    try {
      // ファイルを保存
      await writeFile(filepath, buffer)
      
      const imageUrl = `/uploads/${filename}`

      console.log('✅ Image uploaded successfully:', imageUrl)

      return NextResponse.json({
        success: true,
        imageUrl,
        filename,
        requirementId
      })
    } catch (error) {
      console.error('File save error:', error)
      
      // ファイル保存が失敗した場合はBase64として返す
      const base64 = buffer.toString('base64')
      const dataUrl = `data:${file.type};base64,${base64}`

      return NextResponse.json({
        success: true,
        imageUrl: dataUrl,
        filename: file.name,
        requirementId,
        isDataUrl: true
      })
    }
  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}