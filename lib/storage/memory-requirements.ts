// In-memory storage for requirements documents (for development/testing)
import { RequirementsDocument } from '@/types/requirements';

// Simple in-memory storage
const requirementsStore: Map<string, RequirementsDocument> = new Map();

export function saveRequirementDocument(
  doc: RequirementsDocument,
): RequirementsDocument {
  requirementsStore.set(doc.id, {
    ...doc,
    updatedAt: new Date().toISOString(),
  });
  return requirementsStore.get(doc.id)!;
}

export function getRequirementDocument(
  id: string,
): RequirementsDocument | null {
  return requirementsStore.get(id) || null;
}

export function getAllRequirementDocuments(
  projectId?: string,
): RequirementsDocument[] {
  const docs = Array.from(requirementsStore.values());
  return projectId ? docs.filter((doc) => doc.projectId === projectId) : docs;
}

export function updateRequirementDocument(
  id: string,
  updates: Partial<RequirementsDocument>,
): RequirementsDocument | null {
  const existing = requirementsStore.get(id);
  if (!existing) return null;

  const updated = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  requirementsStore.set(id, updated);
  return updated;
}

export function deleteRequirementDocument(id: string): boolean {
  return requirementsStore.delete(id);
}

// Clear all documents (for testing)
export function clearAllDocuments(): void {
  requirementsStore.clear();
}

// Get document count
export function getDocumentCount(): number {
  return requirementsStore.size;
}
