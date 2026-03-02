import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const adminCheck = await requireAdmin()
    if (adminCheck) return adminCheck

    try {
        const projects = await prisma.project.findMany({
            select: {
                id: true,
                name: true,
                description: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                },
                _count: {
                    select: {
                        chatMessages: true,
                        canvas_nodes: true
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        })

        return NextResponse.json(projects)
    } catch (error) {
        console.error('Projects fetch error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}