import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function requireAdmin() {
    const session = await auth()

    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { isAdmin: true }
    })

    if (!user?.isAdmin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    return null // No error, user is admin
}

export async function isUserAdmin(email: string): Promise<boolean> {
    try {
        const user = await prisma.user.findUnique({
            where: { email },
            select: { isAdmin: true }
        })
        return user?.isAdmin || false
    } catch (error) {
        console.error('Error checking admin status:', error)
        return false
    }
}