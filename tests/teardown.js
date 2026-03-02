const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

module.exports = async () => {
  console.log('Tearing down test environment...')
  
  await prisma.partOrder.deleteMany({
    where: {
      project: {
        user: {
          email: 'test@example.com'
        }
      }
    }
  })
  
  await prisma.pbsNode.deleteMany({
    where: {
      project: {
        user: {
          email: 'test@example.com'
        }
      }
    }
  })
  
  await prisma.chatMessage.deleteMany({
    where: {
      project: {
        user: {
          email: 'test@example.com'
        }
      }
    }
  })
  
  await prisma.project.deleteMany({
    where: {
      user: {
        email: 'test@example.com'
      }
    }
  })
  
  await prisma.user.deleteMany({
    where: {
      email: 'test@example.com'
    }
  })
  
  await prisma.$disconnect()
  console.log('Test environment teardown complete')
}
