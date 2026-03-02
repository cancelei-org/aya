import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/requirements/[id]/reject - 要件ドキュメントを却下
export async function POST(
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
    const { comments } = body;

    // モックデータの場合
    if (id.startsWith('req-mock-')) {
      return NextResponse.json({
        id,
        status: 'REJECTED',
        message: 'Mock document rejected (simulated)',
        rejectedAt: new Date(),
        rejectedBy: session?.user?.name || 'System',
        comments,
      });
    }

    // データベースで却下処理
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

      // 却下処理
      const updated = await prisma.requirementsDocument.update({
        where: { id },
        data: {
          status: 'REJECTED',
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        id: updated.id,
        status: updated.status,
        message: 'Requirements document rejected',
        rejectedAt: updated.updatedAt,
        comments,
      });
    }

    return NextResponse.json(
      { error: 'Database not available' },
      { status: 503 },
    );
  } catch (error) {
    console.error('Error rejecting requirements:', error);
    return NextResponse.json(
      { error: 'Failed to reject requirements document' },
      { status: 500 },
    );
  }
}
