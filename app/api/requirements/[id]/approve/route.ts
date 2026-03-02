import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/requirements/[id]/approve - 要件ドキュメントを承認
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
        status: 'APPROVED',
        message: 'Mock document approved (simulated)',
        approvedAt: new Date(),
        approvedBy: session?.user?.name || 'System',
        comments,
      });
    }

    // データベースで承認処理
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

      // 権限チェック (開発環境以外ではスキップ)
      // Note: session.user.idは存在しないため、権限チェックは実装保留
      if (process.env.NODE_ENV !== 'development') {
        // 将来的にはemailやプロジェクトの所有者チェックを実装
      }

      // すでに承認されている場合
      if (requirement.status === 'APPROVED') {
        return NextResponse.json(
          { error: 'Document is already approved' },
          { status: 400 },
        );
      }

      // 承認処理
      const updated = await prisma.requirementsDocument.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          approvedBy: session?.user?.name || session?.user?.email || 'System',
          updatedAt: new Date(),
        },
      });

      // システム生成のトリガーイベントを発火（オプション）
      // これは別のコンポーネントで処理される想定

      return NextResponse.json({
        id: updated.id,
        status: updated.status,
        message: 'Requirements document approved successfully',
        approvedAt: updated.approvedAt,
        approvedBy: updated.approvedBy,
      });
    }

    return NextResponse.json(
      { error: 'Database not available' },
      { status: 503 },
    );
  } catch (error) {
    console.error('Error approving requirements:', error);
    return NextResponse.json(
      { error: 'Failed to approve requirements document' },
      { status: 500 },
    );
  }
}
