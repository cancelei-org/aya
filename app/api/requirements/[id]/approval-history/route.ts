import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/requirements/[id]/approval-history - 承認履歴を取得
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

    // 承認履歴のデフォルトデータ（空配列）
    let history: Array<{
      id: string;
      action: string;
      timestamp: string;
      actor: string;
      notes?: string;
    }> = [];

    // データベースから実際の履歴を取得
    if (prisma && !id.startsWith('req-mock-')) {
      try {
        const requirement = await prisma.requirementsDocument.findUnique({
          where: { id },
          select: {
            status: true,
            approvedAt: true,
            approvedBy: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (requirement) {
          // 簡易的な履歴を生成
          history = [];

          // 作成履歴
          history.push({
            id: `${id}-created`,
            action: 'CREATED',
            timestamp: requirement.createdAt.toISOString(),
            actor: 'System',
            notes: 'Document created',
          });

          // 承認済みの場合、承認履歴を追加
          if (requirement.status === 'APPROVED' && requirement.approvedAt) {
            history.push({
              id: `${id}-approved`,
              action: 'APPROVED',
              timestamp: requirement.approvedAt.toISOString(),
              actor: requirement.approvedBy || 'Unknown',
              notes: 'Document approved',
            });
          }

          // 却下された場合
          if (requirement.status === 'REJECTED') {
            history.push({
              id: `${id}-rejected`,
              action: 'REJECTED',
              timestamp: requirement.updatedAt.toISOString(),
              actor: 'System',
              notes: 'Document rejected',
            });
          }

          // 最終更新
          if (requirement.updatedAt > requirement.createdAt) {
            history.push({
              id: `${id}-updated`,
              action: 'UPDATED',
              timestamp: requirement.updatedAt.toISOString(),
              actor: 'System',
              notes: 'Document updated',
            });
          }

          // タイムスタンプで降順ソート（新しいものが先）
          history.sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          );
        }
      } catch (dbError) {
        console.error(
          'Database error while fetching approval history:',
          dbError,
        );
        // デフォルト値（空配列）を使用
      }
    }

    // モックデータの場合の履歴
    if (id.startsWith('req-mock-')) {
      history = [
        {
          id: `${id}-created`,
          action: 'CREATED',
          timestamp: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 7日前
          actor: 'System',
          notes: 'Initial draft created',
        },
        {
          id: `${id}-updated`,
          action: 'UPDATED',
          timestamp: new Date(
            Date.now() - 3 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 3日前
          actor: 'System',
          notes: 'Requirements updated with additional details',
        },
      ];
    }

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error fetching approval history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch approval history' },
      { status: 500 },
    );
  }
}
