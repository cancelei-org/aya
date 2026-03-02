import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminCheck = await requireAdmin();
  if (adminCheck) return adminCheck;

  try {
    const { id } = await params;
    const body = await request.json();
    const { isPremium, isAdmin } = body;

    const updateData: { isPremium?: boolean; isAdmin?: boolean } = {};
    if (typeof isPremium === 'boolean') updateData.isPremium = isPremium;
    if (typeof isAdmin === 'boolean') updateData.isAdmin = isAdmin;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        isPremium: true,
        isAdmin: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('User update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
