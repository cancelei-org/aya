import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const documentType = searchParams.get('type');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 },
      );
    }

    console.log(
      `📄 Fetching ${documentType || 'all'} documents for project: ${projectId}`,
    );

    // デフォルトのレスポンス（データベースがない場合）
    let documents: any[] = [];

    // Prismaが利用可能な場合、実際のドキュメントを取得
    if (prisma) {
      try {
        // プロジェクトが存在するか確認
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          include: {
            requirements: true,
          },
        });

        if (project && project.requirements) {
          // RequirementsDocumentをDevLogDocument形式に変換
          documents = project.requirements.map((req) => ({
            id: req.id,
            type: 'requirements',
            title: req.title,
            content:
              typeof req.content === 'string'
                ? req.content
                : JSON.stringify(req.content),
            metadata: {
              createdAt: req.createdAt.toISOString(),
              updatedAt: req.updatedAt.toISOString(),
              author: 'System',
              approvalStatus:
                req.status === 'APPROVED'
                  ? 'approved'
                  : req.status === 'PENDING_APPROVAL'
                    ? 'pending'
                    : 'draft',
              version: req.version?.toString() || '1.0',
            },
          }));
        }
      } catch (dbError) {
        console.error('Database query error:', dbError);
        // データベースエラーの場合も空配列を返す
      }
    }

    return NextResponse.json({
      success: true,
      data: documents,
      projectId,
      type: documentType,
    });
  } catch (error) {
    console.error('Auto-devlog documents error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch documents',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, type, content, title } = body;

    if (!projectId || !type || !content) {
      return NextResponse.json(
        { error: 'Project ID, type, and content are required' },
        { status: 400 },
      );
    }

    console.log(`📝 Creating ${type} document for project: ${projectId}`);

    let document = {
      id: `doc_${Date.now()}`,
      projectId,
      type,
      title: title || `${type} Document`,
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Prismaが利用可能な場合、データベースに保存
    if (prisma) {
      try {
        // RequirementsDocumentモデルを使用
        if (type === 'requirements') {
          const created = await prisma.requirementsDocument.create({
            data: {
              projectId,
              title: title || 'Requirements Document',
              content: content,
              status: 'DRAFT',
            },
          });
          document = {
            ...created,
            type: 'requirements',
          };
        }
      } catch (dbError) {
        console.error('Database save error:', dbError);
        // データベースエラーでも仮のドキュメントを返す
      }
    }

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error('Auto-devlog create document error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create document',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
