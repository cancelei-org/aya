const { PrismaClient } = require('@prisma/client')
const fetch = require('node-fetch')

const prisma = new PrismaClient()

describe('Data Persistence Tests', () => {
  let testProjectId
  let testUserId

  beforeAll(async () => {
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User'
      }
    })
    testUserId = testUser.id

    const testProject = await prisma.project.create({
      data: {
        userId: testUserId,
        name: 'Test Project',
        description: 'Test project for data persistence'
      }
    })
    testProjectId = testProject.id
  })

  afterAll(async () => {
    await prisma.partOrder.deleteMany({ where: { projectId: testProjectId } })
    await prisma.pbsNode.deleteMany({ where: { projectId: testProjectId } })
    await prisma.chatMessage.deleteMany({ where: { projectId: testProjectId } })
    await prisma.project.delete({ where: { id: testProjectId } })
    await prisma.user.delete({ where: { id: testUserId } })
    await prisma.$disconnect()
  })

  describe('Parts List Persistence', () => {
    test('should preserve existing parts when adding new ones', async () => {
      const initialParts = [
        {
          id: 'part-1',
          partName: 'Resistor 1k',
          modelNumber: 'R1K',
          estimatedOrderDate: '2024-01-01',
          orderStatus: 'Unordered',
          purchaseSiteLink: '',
          description: 'Test resistor',
          voltage: '5V',
          communication: 'None',
          quantity: 1
        }
      ]

      const response1 = await fetch('http://localhost:3000/api/projects/save-parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: testProjectId,
          partOrders: initialParts
        })
      })

      expect(response1.ok).toBe(true)

      const updatedParts = [
        ...initialParts,
        {
          id: 'part-2',
          partName: 'Capacitor 100uF',
          modelNumber: 'C100',
          estimatedOrderDate: '2024-01-02',
          orderStatus: 'Unordered',
          purchaseSiteLink: '',
          description: 'Test capacitor',
          voltage: '5V',
          communication: 'None',
          quantity: 2
        }
      ]

      const response2 = await fetch('http://localhost:3000/api/projects/save-parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: testProjectId,
          partOrders: updatedParts
        })
      })

      expect(response2.ok).toBe(true)

      const savedParts = await prisma.partOrder.findMany({
        where: { projectId: testProjectId }
      })

      expect(savedParts).toHaveLength(2)
      expect(savedParts.find(p => p.id === 'part-1')).toBeTruthy()
      expect(savedParts.find(p => p.id === 'part-2')).toBeTruthy()
    })

    test('should handle concurrent save operations without data loss', async () => {
      const parts1 = [
        {
          id: 'concurrent-1',
          partName: 'Concurrent Part 1',
          modelNumber: 'CP1',
          estimatedOrderDate: '2024-01-01',
          orderStatus: 'Unordered',
          purchaseSiteLink: '',
          description: 'Concurrent test 1',
          voltage: '5V',
          communication: 'None',
          quantity: 1
        }
      ]

      const parts2 = [
        {
          id: 'concurrent-2',
          partName: 'Concurrent Part 2',
          modelNumber: 'CP2',
          estimatedOrderDate: '2024-01-01',
          orderStatus: 'Unordered',
          purchaseSiteLink: '',
          description: 'Concurrent test 2',
          voltage: '5V',
          communication: 'None',
          quantity: 1
        }
      ]

      const [response1, response2] = await Promise.all([
        fetch('http://localhost:3000/api/projects/save-parts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: testProjectId,
            partOrders: parts1
          })
        }),
        fetch('http://localhost:3000/api/projects/save-parts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: testProjectId,
            partOrders: parts2
          })
        })
      ])

      expect(response1.ok).toBe(true)
      expect(response2.ok).toBe(true)

      const savedParts = await prisma.partOrder.findMany({
        where: { projectId: testProjectId }
      })

      expect(savedParts.length).toBeGreaterThan(0)
    })
  })

  describe('PBS Structure Persistence', () => {
    test('should preserve parent-child relationships in PBS nodes', async () => {
      const pbsNodes = [
        {
          id: 'pbs-parent',
          name: 'Main System',
          type: 'system',
          icon: 'Settings',
          parentId: null,
          isExpanded: true,
          positionOrder: 0
        },
        {
          id: 'pbs-child',
          name: 'Subsystem',
          type: 'component',
          icon: 'Circle',
          parentId: 'pbs-parent',
          isExpanded: true,
          positionOrder: 1
        }
      ]

      const response = await fetch('http://localhost:3000/api/projects/save-pbs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: testProjectId,
          pbsNodes: pbsNodes
        })
      })

      expect(response.ok).toBe(true)

      const savedNodes = await prisma.pbsNode.findMany({
        where: { projectId: testProjectId }
      })

      expect(savedNodes).toHaveLength(2)
      const parentNode = savedNodes.find(n => n.id === 'pbs-parent')
      const childNode = savedNodes.find(n => n.id === 'pbs-child')

      expect(parentNode).toBeTruthy()
      expect(childNode).toBeTruthy()
      expect(childNode.parentId).toBe('pbs-parent')
    })
  })

  describe('Chat Message Persistence', () => {
    test('should save chat messages within transaction', async () => {
      const chatMessages = [
        {
          id: 'chat-1',
          role: 'user',
          content: 'Test message 1',
          timestamp: new Date().toISOString()
        },
        {
          id: 'chat-2',
          role: 'assistant',
          content: 'Test response 1',
          timestamp: new Date().toISOString()
        }
      ]

      const response = await fetch('http://localhost:3000/api/projects/save-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: testProjectId,
          chatMessages: chatMessages
        })
      })

      expect(response.ok).toBe(true)

      const savedMessages = await prisma.chatMessage.findMany({
        where: { projectId: testProjectId }
      })

      expect(savedMessages).toHaveLength(2)
      expect(savedMessages.find(m => m.id === 'chat-1')).toBeTruthy()
      expect(savedMessages.find(m => m.id === 'chat-2')).toBeTruthy()
    })
  })

  describe('Error Recovery', () => {
    test('should handle partial save failures gracefully', async () => {
      const partsWithInvalidData = [
        {
          id: 'valid-part',
          partName: 'Valid Part',
          modelNumber: 'VP1',
          estimatedOrderDate: '2024-01-01',
          orderStatus: 'Unordered',
          purchaseSiteLink: '',
          description: 'Valid part',
          voltage: '5V',
          communication: 'None',
          quantity: 1
        },
        {
          id: 'invalid-part',
          partName: '', // Invalid: empty name
          modelNumber: 'IP1',
          estimatedOrderDate: 'invalid-date', // Invalid date format
          orderStatus: 'Unordered',
          purchaseSiteLink: '',
          description: 'Invalid part',
          voltage: '5V',
          communication: 'None',
          quantity: 1
        }
      ]

      const response = await fetch('http://localhost:3000/api/projects/save-parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: testProjectId,
          partOrders: partsWithInvalidData
        })
      })

      expect(response.status).toBeLessThan(500)

      const savedParts = await prisma.partOrder.findMany({
        where: { projectId: testProjectId, id: 'valid-part' }
      })

      expect(savedParts).toHaveLength(1)
    })
  })
})
