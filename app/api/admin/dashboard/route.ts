import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const adminCheck = await requireAdmin()
    if (adminCheck) return adminCheck

    try {
        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

        // Get basic counts
        const [
            totalUsers,
            totalProjects,
            totalChatMessages,
            premiumUsers,
            feedbackCount,
            newUsersToday,
            projectsCreatedToday,
            chatMessagesToday,
            activeUsers
        ] = await Promise.all([
            prisma.user.count(),
            prisma.project.count(),
            prisma.chatMessage.count(),
            prisma.user.count({ where: { isPremium: true } }),
            prisma.feedback.count(),
            prisma.user.count({
                where: { createdAt: { gte: todayStart } }
            }),
            prisma.project.count({
                where: { createdAt: { gte: todayStart } }
            }),
            prisma.chatMessage.count({
                where: { timestamp: { gte: todayStart } }
            }),
            prisma.user.count({
                where: {
                    lastActiveAt: { gte: thirtyDaysAgo }
                }
            })
        ])

        const stats = {
            totalUsers,
            activeUsers,
            totalProjects,
            totalChatMessages,
            premiumUsers,
            feedbackCount,
            recentActivity: {
                newUsersToday,
                projectsCreatedToday,
                chatMessagesToday
            }
        }

        return NextResponse.json(stats)
    } catch (error) {
        console.error('Dashboard stats error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}