import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await auth();

  // 開発環境での認証バイパス
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (!session?.user?.email && !isDevelopment) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { projectId, nodes, connections, pbsStructure, chatMessages } = body;

  if (!projectId) {
    return NextResponse.json(
      { error: 'Project ID is required' },
      { status: 400 },
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      // React Flow nodes/connections を JSON として保存
      await tx.project.update({
        where: { id: projectId },
        data: {
          nodesData: JSON.stringify(nodes || []),
          connectionsData: JSON.stringify(connections || []),
          pbsStructure: JSON.stringify(pbsStructure || []),
          updatedAt: new Date(),
        },
      });

      // チャットメッセージは ChatMessage テーブルに保存
      if (chatMessages && chatMessages.length > 0) {
        // 既存のメッセージを削除
        await tx.chatMessage.deleteMany({
          where: { projectId },
        });

        // 新しいメッセージを一括保存
        await tx.chatMessage.createMany({
          data: chatMessages.map((msg: any) => ({
            id: msg.id,
            projectId: projectId,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
          })),
          skipDuplicates: true,
        });
      }
    });

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        updatedAt: true,
      },
    });

    console.log('✅ Canvas saved (React Flow JSON):', {
      projectId: project?.id,
      nodesCount: nodes?.length || 0,
      connectionsCount: connections?.length || 0,
      chatMessagesCount: chatMessages?.length || 0,
    });

    return NextResponse.json({
      success: true,
      project: {
        id: project?.id,
        name: project?.name,
        updatedAt: project?.updatedAt,
      },
    });
  } catch (error) {
    console.error('Save canvas error:', error);
    return NextResponse.json(
      {
        error: 'Failed to save canvas',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
