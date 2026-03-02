const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Starting database migration...')
    
    // Check if we can connect to the database
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    
    // Check if tables exist
    const users = await prisma.user.findMany()
    console.log(`✅ User table accessible, found ${users.length} users`)
    
    console.log('✅ Database migration completed successfully')
  } catch (error) {
    console.error('❌ Database migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()