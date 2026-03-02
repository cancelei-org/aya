import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/requirements/[id]/delete - 要件ドキュメントを削除
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
    console.log(`🗑️ Attempting to delete requirement: ${id}`);

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
        console.error(`❌ Requirement not found: ${id}`);
        return NextResponse.json(
          { error: 'Requirements document not found' },
          { status: 404 },
        );
      }

      console.log(`📋 Found requirement:`, {
        id: requirement.id,
        status: requirement.status,
        projectId: requirement.projectId,
        userId: requirement.project.userId,
      });

      // 権限チェック
      if (
        process.env.NODE_ENV !== 'development' &&
        session?.user?.email &&
        requirement.project.userId !== ((session.user as any).id || 'unknown')
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // 承認済みドキュメントの削除を許可（警告ログを出力）
      if (requirement.status === 'APPROVED') {
        console.warn(`⚠️ Deleting approved document: ${id}`);
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
