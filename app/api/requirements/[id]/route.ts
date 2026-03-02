import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { convertMarkdownToTiptap } from '@/lib/utils/markdownToTiptap';

// GET /api/requirements/[id] - 要件ドキュメントを取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // モックデータの場合
    if (id.startsWith('req-mock-')) {
      const mockDocument = {
        id,
        projectId: 'default-project',
        userId: (session?.user as any)?.id || 'user-123',
        title: 'Robotic Arm Requirements',
        content: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [
                { type: 'text', text: 'Robotic Arm Requirements Document' },
              ],
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'This document defines the requirements for a robotic arm system.',
                },
              ],
            },
          ],
        },
        contentText: `# Robotic Arm Requirements Document

## 1. System Purpose and Overview
This document defines the requirements for a robotic arm system. The system aims to provide reliable and efficient operation for the intended application.

## 2. Functional Requirements
- 6-axis movement capability
- Precise positioning and control
- Safety and operational features
- User interface requirements

## 3. Non-functional Requirements
- Payload capacity: 5kg maximum
- Positioning accuracy: ±0.1mm
- Operating// temperature: 0°C to 45°C
- Safety compliance requirements`,
        status: 'DRAFT',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return NextResponse.json(mockDocument);
    }

    // データベースから取得
    if (prisma) {
      const requirement = await prisma.requirementsDocument.findUnique({
        where: { id },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              userId: true,
            },
          },
        },
      });

      if (!requirement) {
        return NextResponse.json(
          { error: 'Requirements document not found' },
          { status: 404 },
        );
      }

      // 権限チェック（開発環境以外）
      if (process.env.NODE_ENV !== 'development' && session?.user?.email) {
        // プロジェクトの所有者のメールアドレスを確認
        const projectOwner = await prisma.user.findUnique({
          where: { id: requirement.project.userId },
          select: { email: true },
        });

        if (projectOwner?.email !== session.user.email) {
          console.log('[AUTH] Permission check failed:', {
            projectOwnerEmail: projectOwner?.email,
            sessionEmail: session.user.email,
            projectUserId: requirement.project.userId,
          });
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      // RequirementsViewer形式に変換
      // contentがstring（Markdown）の場合はTipTap形式に変換
      let processedContent: any = requirement.content;
      if (typeof requirement.content === 'string') {
        processedContent = convertMarkdownToTiptap(requirement.content);
      }

      const document = {
        id: requirement.id,
        projectId: requirement.projectId,
        userId: requirement.project.userId,
        title: requirement.title,
        content: processedContent,
        contentText: requirement.contentText || requirement.content || '',
        status: requirement.status,
        version: requirement.version,
        createdAt: requirement.createdAt,
        updatedAt: requirement.updatedAt,
        approvedAt: requirement.approvedAt,
        approvedBy: requirement.approvedBy,
      };

      return NextResponse.json(document);
    }

    return NextResponse.json(
      { error: 'Database not available' },
      { status: 503 },
    );
  } catch (error) {
    console.error('Error fetching requirements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requirements document' },
      { status: 500 },
    );
  }
}

// PATCH /api/requirements/[id] - 要件ドキュメントを更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { content, title, status } = body;

    // モックデータの場合は更新をスキップ
    if (id.startsWith('req-mock-')) {
      return NextResponse.json({
        id,
        message: 'Mock document updated (simulated)',
        content,
        title,
        status,
      });
    }

    // データベースで更新
    if (prisma) {
      const requirement = await prisma.requirementsDocument.findUnique({
        where: { id },
        include: {
          project: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!requirement) {
        return NextResponse.json(
          { error: 'Requirements document not found' },
          { status: 404 },
        );
      }

      // 権限チェック
      if (
        process.env.NODE_ENV !== 'development' &&
        session?.user?.email &&
        requirement.project.userId !== ((session.user as any).id || 'unknown')
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // 更新データの準備
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (content !== undefined) {
        updateData.content = content;
        // contentTextも更新（簡易的な実装）
        if (typeof content === 'object' && content.content) {
          updateData.contentText = extractTextFromContent(content);
        }
      }

      if (title !== undefined) {
        updateData.title = title;
      }

      if (status !== undefined) {
        updateData.status = status;
      }

      const updated = await prisma.requirementsDocument.update({
        where: { id },
        data: updateData,
      });

      return NextResponse.json({
        id: updated.id,
        message: 'Requirements document updated successfully',
        updatedAt: updated.updatedAt,
      });
    }

    return NextResponse.json(
      { error: 'Database not available' },
      { status: 503 },
    );
  } catch (error) {
    console.error('Error updating requirements:', error);
    return NextResponse.json(
      { error: 'Failed to update requirements document' },
      { status: 500 },
    );
  }
}

// DELETE /api/requirements/[id] - 要件ドキュメントを削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // モックデータの場合
    if (id.startsWith('req-mock-')) {
      return NextResponse.json({
        message: 'Mock document deleted (simulated)',
        id,
      });
    }

    // データベースから削除
    if (prisma) {
      const requirement = await prisma.requirementsDocument.findUnique({
        where: { id },
        include: {
          project: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!requirement) {
        return NextResponse.json(
          { error: 'Requirements document not found' },
          { status: 404 },
        );
      }

      // 権限チェック
      if (
        process.env.NODE_ENV !== 'development' &&
        session?.user?.email &&
        requirement.project.userId !== ((session.user as any).id || 'unknown')
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      await prisma.requirementsDocument.delete({
        where: { id },
      });

      return NextResponse.json({
        message: 'Requirements document deleted successfully',
        id,
      });
    }

    return NextResponse.json(
      { error: 'Database not available' },
      { status: 503 },
    );
  } catch (error) {
    console.error('Error deleting requirements:', error);
    return NextResponse.json(
      { error: 'Failed to delete requirements document' },
      { status: 500 },
    );
  }
}

// Helper function to extract text from content object
function extractTextFromContent(
  content:
    | {
        content?: Array<{
          type: string;
          text?: string;
          attrs?: { level?: number };
          content?: unknown[];
        }>;
      }
    | string,
): string {
  if (typeof content === 'string') return content;

  let text = '';

  const extractFromNode = (node: any) => {
    if (node.type === 'text') {
      text += node.text || '';
    } else if (node.type === 'heading') {
      const level = node.attrs?.level || 1;
      text += '#'.repeat(level) + ' ';
      if (node.content) {
        node.content.forEach(extractFromNode);
      }
      text += '\n\n';
    } else if (node.type === 'paragraph') {
      if (node.content) {
        node.content.forEach(extractFromNode);
      }
      text += '\n\n';
    } else if (node.content && Array.isArray(node.content)) {
      node.content.forEach(extractFromNode);
    }
  };

  if (content.content && Array.isArray(content.content)) {
    content.content.forEach(extractFromNode);
  }

  return text.trim();
}
