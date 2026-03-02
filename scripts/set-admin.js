const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function setAdmin(email) {
    try {
        const user = await prisma.user.update({
            where: { email },
            data: { isAdmin: true },
            select: { id: true, name: true, email: true, isAdmin: true }
        })

        console.log('✅ Admin privileges granted to:', user)
    } catch (error) {
        if (error.code === 'P2025') {
            console.error('❌ User not found with email:', email)
        } else {
            console.error('❌ Error setting admin privileges:', error)
        }
    } finally {
        await prisma.$disconnect()
    }
}

// Get email from command line arguments
const email = process.argv[2]

if (!email) {
    console.error('❌ Please provide an email address')
    console.log('Usage: node scripts/set-admin.js user@example.com')
    process.exit(1)
}

setAdmin(email)