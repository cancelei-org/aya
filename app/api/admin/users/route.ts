import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const adminCheck = await requireAdmin()
    if (adminCheck) return adminCheck

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                isPremium: true,
                isAdmin: true,
                chatCount: true,
                createdAt: true,
                lastActiveAt: true,
                _count: {
                    select: {
                        projects: true,
                        chatUsage: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(users)
    } catch (error) {
        console.error('Users fetch error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}