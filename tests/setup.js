const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

module.exports = async () => {
  console.log('Setting up test environment...')
  
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
  
  console.log('Test environment setup complete')
}
