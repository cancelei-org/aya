// Requirements definition data access layer
import { prisma } from '@/lib/prisma'
import { 
  RequirementsDocument,
  CreateRequirementsRequest,
  UpdateRequirementsRequest,
  ApproveRequirementsRequest,
  RequirementsSearchParams
} from '@/types/requirements'
import { Prisma } from '@prisma/client'

// Create a new requirements document
export async function createRequirementsDocument(
  data: CreateRequirementsRequest & { userId: string }
): Promise<RequirementsDocument> {
  const document = await prisma.requirementsDocument.create({
    data: {
      projectId: data.projectId,
      title: 'Requirements Definition',
      content: { type: 'doc', content: [] }, // Empty TipTap document
      contentText: data.initialPrompt,
      status: 'DRAFT',
      project: {
        connect: { id: data.projectId }
      }
    },
    include: {
      project: true
    }
  })

  // Note: Document versioning is disabled for now

  return document as RequirementsDocument
}

// Get requirements document by ID
export async function getRequirementsDocument(
  documentId: string
): Promise<RequirementsDocument | null> {
  console.log(`[DB] Fetching requirements document with ID: ${documentId}`);
  try {
    const document = await prisma.requirementsDocument.findUnique({
      where: { id: documentId },
      include: {
        project: true
      }
    });
    console.log(`[DB] Document fetch result:`, document ? 'found' : 'not found');
    return document as RequirementsDocument | null;
  } catch (error) {
    console.error(`[DB] Error fetching requirements document:`, error);
    throw error;
  }
}

// Update requirements document
export async function updateRequirementsDocument(
  documentId: string,
  data: UpdateRequirementsRequest
): Promise<RequirementsDocument> {
  const currentDoc = await prisma.requirementsDocument.findUnique({
    where: { id: documentId }
  })

  if (!currentDoc) {
    throw new Error('Requirements document not found')
  }

  const updatedDoc = await prisma.requirementsDocument.update({
    where: { id: documentId },
    data: {
      content: data.content || currentDoc.content,
      contentHtml: data.content ? generateHtmlFromContent(data.content) : currentDoc.contentHtml,
      contentText: data.content ? extractTextFromContent(data.content) : currentDoc.contentText,
      status: data.status || currentDoc.status,
      version: data.version || currentDoc.version,
      updatedAt: new Date()
    },
    include: {
      project: true
    }
  })

  // Note: Document versioning is disabled for now

  return updatedDoc as unknown as RequirementsDocument
}

// Approve requirements document
export async function approveRequirementsDocument(
  documentId: string,
  data: ApproveRequirementsRequest
): Promise<RequirementsDocument> {
  const document = await prisma.requirementsDocument.update({
    where: { id: documentId },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedBy: data.approvedBy
    },
    include: {
      project: true
    }
  })

  return document as RequirementsDocument
}

// Unapprove requirements document (revert to DRAFT status)
export async function unapproveRequirementsDocument(
  documentId: string
): Promise<RequirementsDocument> {
  const document = await prisma.requirementsDocument.update({
    where: { id: documentId },
    data: {
      status: 'DRAFT',
      approvedAt: null,
      approvedBy: null
    },
    include: {
      project: true
    }
  })

  console.log(`[DB] Document ${documentId} unapproved successfully`)
  return document as RequirementsDocument
}

// Search requirements documents
export async function searchRequirementsDocuments(
  params: RequirementsSearchParams
): Promise<RequirementsDocument[]> {
  const where: Prisma.RequirementsDocumentWhereInput = {}

  if (params.projectId) {
    where.projectId = params.projectId
  }

  if (params.status) {
    where.status = params.status
  }

  if (params.searchTerm) {
    where.OR = [
      { title: { contains: params.searchTerm, mode: 'insensitive' } },
      { contentText: { contains: params.searchTerm, mode: 'insensitive' } }
    ]
  }

  if (params.createdAfter || params.createdBefore) {
    where.createdAt = {}
    if (params.createdAfter) {
      where.createdAt.gte = params.createdAfter
    }
    if (params.createdBefore) {
      where.createdAt.lte = params.createdBefore
    }
  }

  if (params.approvedBy) {
    where.approvedBy = params.approvedBy
  }

  const documents = await prisma.requirementsDocument.findMany({
    where,
    include: {
      project: true
    },
    orderBy: { updatedAt: 'desc' }
  })

  return documents as unknown as RequirementsDocument[]
}

// Note: Document versioning and comments functionality has been disabled
// The following functions were removed due to missing database tables:
// - createDocumentVersion
// - addComment
// - resolveComment
// - getDocumentVersions


// Helper functions
function generateHtmlFromContent(content: Prisma.JsonValue): string {
  // Simple implementation - in production, use TipTap/Lexical's HTML export
  const contentObj = content as { content?: Array<{ type: string; attrs?: { level?: number }; content?: Array<{ text?: string }> }> }
  if (!contentObj || !contentObj.content) return ''
  
  return contentObj.content
    .map((node) => {
      if (node.type === 'paragraph') {
        const text = node.content?.[0]?.text || ''
        return `<p>${text}</p>`
      }
      if (node.type === 'heading') {
        const level = node.attrs?.level || 1
        const text = node.content?.[0]?.text || ''
        return `<h${level}>${text}</h${level}>`
      }
      return ''
    })
    .join('\n')
}

function extractTextFromContent(content: Prisma.JsonValue): string {
  // Simple implementation - in production, use TipTap/Lexical's text export
  const contentObj = content as { content?: Array<{ content?: Array<{ text?: string }> }> }
  if (!contentObj || !contentObj.content) return ''
  
  return contentObj.content
    .map((node) => {
      if (node.content && Array.isArray(node.content)) {
        return node.content
          .map((child) => child.text || '')
          .join(' ')
      }
      return ''
    })
    .join('\n')
    .trim()
}

// Note: Transaction functionality for complex operations has been disabled
// since document versioning is no longer supported