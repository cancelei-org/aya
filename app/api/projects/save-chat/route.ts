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
  const { projectId, chatMessages } = body;

  if (!projectId) {
    return NextResponse.json(
      { error: 'Project ID is required' },
      { status: 400 },
    );
  }

  try {
    // ChatMessageテーブルに保存（トランザクション）
    await prisma.$transaction(async (tx) => {
      // 既存のメッセージを削除
      await tx.chatMessage.deleteMany({
        where: { projectId },
      });

      // 新しいメッセージを一括保存
      if (chatMessages && chatMessages.length > 0) {
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

    // プロジェクトの更新日時を更新
    const project = await prisma.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
      select: {
        id: true,
        name: true,
        updatedAt: true,
      },
    });

    console.log('💬 Chat saved:', {
      projectId: project.id,
      messagesCount: chatMessages?.length || 0,
    });

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        updatedAt: project.updatedAt,
      },
    });
  } catch (error) {
    console.error('Save chat error:', error);
    return NextResponse.json(
      {
        error: 'Failed to save chat',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
