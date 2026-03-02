import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { query, category } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 },
      );
    }

    console.log('🔍 Searching components:', { query, category });

    // 簡易的なコンポーネント検索ロジック
    const mockComponents = [
      {
        id: 'comp-1',
        name: 'Arduino Uno R3',
        category: 'microcontroller',
        price: 25,
        stock: 'in stock',
      },
      {
        id: 'comp-2',
        name: 'Raspberry Pi 4',
        category: 'single-board-computer',
        price: 75,
        stock: 'in stock',
      },
      {
        id: 'comp-3',
        name: 'Servo Motor SG90',
        category: 'actuator',
        price: 5,
        stock: 'in stock',
      },
    ];

    // フィルタリング
    const results = mockComponents.filter(
      (comp) =>
        comp.name.toLowerCase().includes(query.toLowerCase()) ||
        comp.category.includes(query.toLowerCase()),
    );

    console.log('✅ Component search completed:', {
      resultsCount: results.length,
    });

    return NextResponse.json({
      success: true,
      components: results,
      total: results.length,
    });
  } catch (error) {
    console.error('Component search error:', error);
    return NextResponse.json(
      {
        error: 'Failed to search components',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
