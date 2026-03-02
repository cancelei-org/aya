import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  console.log('🆕 New get-or-create API called (React Flow JSON)');

  const session = await auth();

  // 🔧 開発環境での認証バイパス
  const isDevelopment = process.env.NODE_ENV === 'development';
  const devUserEmail = 'dev@localhost';

  if (!session?.user?.email && !isDevelopment) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userEmail =
    session?.user?.email || (isDevelopment ? devUserEmail : null);
  if (!userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Get or create API called for user:', userEmail);

    // Prismaクライアントの可用性チェック
    if (!prisma) {
      console.log('⚠️ Prisma not available, returning fallback data');
      return NextResponse.json({
        success: true,
        user: {
          id: 'fallback-user-1',
          email: userEmail,
          name: userEmail.split('@')[0],
          chatCount: 0,
          isPremium: false,
        },
        project: {
          id: 'fallback-project-1',
          name: 'Fallback Project',
          description: 'Temporary project (database unavailable)',
          nodes: [], // React Flow形式
          connections: [],
          chatMessages: [],
          pbsStructure: [],
        },
      });
    }

    // PrismaAdapter経由で既にユーザーが作成されているので、取得のみ
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            description: true,
            nodesData: true, // JSON フィールド
            connectionsData: true, // JSON フィールド
            pbsStructure: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    // ユーザーが見つからない場合（通常は発生しないはず）
    if (!user) {
      console.error('User not found in database:', userEmail);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // デフォルトプロジェクトが存在しない場合は作成
    let project = user.projects.find((p) => p.name === 'Default Project');

    if (!project) {
      project = await prisma.project.create({
        data: {
          userId: user.id,
          name: 'Default Project',
          description: 'Hardware Assembly Copilot Project',
          nodesData: JSON.stringify([]), // 空のReact Flow nodes
          connectionsData: JSON.stringify([]), // 空のconnections
          pbsStructure: JSON.stringify([]), // 空のPBS
        },
        select: {
          id: true,
          name: true,
          description: true,
          nodesData: true,
          connectionsData: true,
          pbsStructure: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    // JSON フィールドをパース
    const nodes = project.nodesData
      ? JSON.parse(project.nodesData as string)
      : [];
    const connections = project.connectionsData
      ? JSON.parse(project.connectionsData as string)
      : [];
    const pbsStructure = project.pbsStructure
      ? JSON.parse(project.pbsStructure as string)
      : [];

    // ChatMessageテーブルから取得
    const chatMessages = await prisma.chatMessage.findMany({
      where: { projectId: project.id },
      orderBy: { timestamp: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        timestamp: true,
      },
    });

    // React Flow形式でレスポンス
    const responseData = {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        chatCount: user.chatCount,
        isPremium: user.isPremium,
      },
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        nodes, // React Flow nodes
        connections,
        chatMessages,
        pbsStructure,
      },
    };

    console.log('✅ Sending project data (React Flow JSON):', {
      projectId: project.id,
      nodesCount: nodes.length,
      connectionsCount: connections.length,
      chatMessagesCount: chatMessages.length,
    });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Get or create project error:', error);

    // エラー時のフォールバック
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load project',
        fallback: true,
        user: {
          id: 'error-user-1',
          email: userEmail,
          name: userEmail.split('@')[0],
          chatCount: 0,
          isPremium: false,
        },
        project: {
          id: 'error-project-1',
          name: 'Temporary Project',
          description: 'Temporary project (error recovery)',
          nodes: [],
          connections: [],
          chatMessages: [],
          pbsStructure: [],
        },
      },
      { status: 500 },
    );
  }
}
