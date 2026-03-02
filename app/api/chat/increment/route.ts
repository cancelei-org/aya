import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
  const session = await auth();
  console.log(
    '🔍 Chat increment session:',
    session ? 'authenticated' : 'not authenticated',
    session?.user?.email,
  );

  // 開発環境では認証をバイパス
  if (!session && process.env.NODE_ENV !== 'development') {
    console.log('❌ Chat increment: No session in production');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 開発環境でセッションがない場合はデフォルトユーザーを使用
  const userEmail = session?.user?.email || 'dev@example.com';

  try {
    // ユーザーを取得または作成
    let user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, isPremium: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userEmail,
          name: session?.user?.name || userEmail.split('@')[0],
          chatCount: 0,
          isPremium: false,
        },
        select: { id: true, isPremium: true },
      });
    }

    // プレミアムユーザーはカウントしない
    if (!user.isPremium) {
      // チャット数を増加
      await prisma.user.update({
        where: { id: user.id },
        data: { chatCount: { increment: 1 } },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Chat increment error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userEmail,
    });
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
