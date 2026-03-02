// Prisma-based storage for requirements documents
import { prisma } from '@/lib/prisma'
import { 
  RequirementsDocument,
  RequirementStatus
} from '@/types/requirements'

// Save a new requirements document
export async function saveRequirementDocument(
  doc: Omit<RequirementsDocument, 'createdAt' | 'updatedAt'>
): Promise<RequirementsDocument> {
  try {
    const saved = await prisma.requirementsDocument.create({
      data: {
        id: doc.id,
        projectId: doc.projectId,
        title: doc.title,
        content: doc.content, // Prisma Json type
        contentText: doc.contentText || null,
        contentHtml: doc.contentHtml || null,
        status: doc.status as RequirementStatus,
        version: doc.version || 1,
      },
      include: {
        project: true,
      }
    })

    // Convert Prisma result to our type
    return {
      ...saved,
      content: saved.content,
      version: saved.version,
      createdAt: saved.createdAt.toISOString(),
      updatedAt: saved.updatedAt.toISOString(),
      approvedAt: saved.approvedAt?.toISOString() || null,
    } as RequirementsDocument
  } catch (error) {
    console.error('Error saving requirements document:', error)
    throw error
  }
}

// Get a requirements document by ID
export async function getRequirementDocument(
  id: string
): Promise<RequirementsDocument | null> {
  try {
    const doc = await prisma.requirementsDocument.findUnique({
      where: { id },
      include: {
        project: true,
      }
    })

    if (!doc) return null

    return {
      ...doc,
      content: doc.content,
      version: doc.version,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      approvedAt: doc.approvedAt?.toISOString() || null,
    } as RequirementsDocument
  } catch (error) {
    console.error('Error getting requirements document:', error)
    return null
  }
}

// Get all requirements documents for a project
export async function getAllRequirementDocuments(
  projectId?: string
): Promise<RequirementsDocument[]> {
  try {
    const docs = await prisma.requirementsDocument.findMany({
      where: projectId ? { projectId } : undefined,
      include: {
        project: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    return docs.map(doc => ({
      ...doc,
      content: doc.content,
      version: doc.version,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      approvedAt: doc.approvedAt?.toISOString() || null,
    } as RequirementsDocument))
  } catch (error) {
    console.error('Error getting all requirements documents:', error)
    return []
  }
}

// Update a requirements document
export async function updateRequirementDocument(
  id: string,
  updates: Partial<RequirementsDocument>
): Promise<RequirementsDocument | null> {
  try {
    const updated = await prisma.requirementsDocument.update({
      where: { id },
      data: {
        title: updates.title,
        content: updates.content,
        contentText: updates.contentText,
        contentHtml: updates.contentHtml,
        status: updates.status as RequirementStatus,
        version: updates.version,
        approvedAt: updates.approvedAt ? new Date(updates.approvedAt) : undefined,
        approvedBy: updates.approvedBy,
      },
      include: {
        project: true,
      }
    })

    return {
      ...updated,
      content: updated.content,
      version: updated.version,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      approvedAt: updated.approvedAt?.toISOString() || null,
    } as RequirementsDocument
  } catch (error) {
    console.error('Error updating requirements document:', error)
    return null
  }
}

// Delete a requirements document
export async function deleteRequirementDocument(id: string): Promise<boolean> {
  try {
    await prisma.requirementsDocument.delete({
      where: { id }
    })
    return true
  } catch (error) {
    console.error('Error deleting requirements document:', error)
    return false
  }
}

// Get document count for a project
export async function getDocumentCount(projectId?: string): Promise<number> {
  try {
    return await prisma.requirementsDocument.count({
      where: projectId ? { projectId } : undefined
    })
  } catch (error) {
    console.error('Error getting document count:', error)
    return 0
  }
}

