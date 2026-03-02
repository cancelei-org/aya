import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { feedback } = body
  
  if (!feedback || typeof feedback !== 'string' || !feedback.trim()) {
    return NextResponse.json({ error: 'Feedback is required' }, { status: 400 })
  }

  try {
    // Save feedback to database
    await prisma.feedback.create({
      data: {
        userEmail: session.user.email,
        userName: session.user.name || session.user.email.split('@')[0],
        content: feedback.trim(),
        createdAt: new Date()
      }
    })

    // Reset user's chat count to 0 (giving them 100 more chats)
    await prisma.user.upsert({
      where: { email: session.user.email },
      update: { chatCount: 0 },
      create: {
        email: session.user.email,
        name: session.user.name || session.user.email.split('@')[0],
        chatCount: 0,
        isPremium: false
      }
    })

    return NextResponse.json({ success: true, message: 'Feedback submitted and chat count reset' })
  } catch (error) {
    console.error('Feedback submission error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}