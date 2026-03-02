import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/requirements/[id]/unapprove - 要件ドキュメントの承認を取り消す
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
    await request.json();

    // モックデータの場合
    if (id.startsWith('req-mock-')) {
      return NextResponse.json({
        id,
        status: 'DRAFT',
        message: 'Mock document unapproved (simulated)',
        unapprovedAt: new Date(),
        unapprovedBy: session?.user?.name || 'System',
      });
    }

    // データベースで承認取り消し処理
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

      // 承認されていない場合
      if (requirement.status !== 'APPROVED') {
        return NextResponse.json(
          { error: 'Document is not approved' },
          { status: 400 },
        );
      }

      // 承認取り消し処理
      const updated = await prisma.requirementsDocument.update({
        where: { id },
        data: {
          status: 'DRAFT',
          approvedAt: null,
          approvedBy: null,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        id: updated.id,
        status: updated.status,
        message: 'Requirements document unapproved successfully',
        unapprovedAt: updated.updatedAt,
      });
    }

    return NextResponse.json(
      { error: 'Database not available' },
      { status: 503 },
    );
  } catch (error) {
    console.error('Error unapproving requirements:', error);
    return NextResponse.json(
      { error: 'Failed to unapprove requirements document' },
      { status: 500 },
    );
  }
}
