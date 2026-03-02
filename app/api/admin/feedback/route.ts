import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const adminCheck = await requireAdmin()
  if (adminCheck) return adminCheck

  try {
    const feedback = await prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(feedback)
  } catch (error) {
    console.error('Feedback fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}