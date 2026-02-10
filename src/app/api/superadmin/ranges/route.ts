export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ranges = await prisma.productRange.findMany({
      where: { active: true },
      include: {
        _count: {
          select: { skus: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ ranges });
  } catch (error) {
    console.error('Ranges list error:', error);
    return NextResponse.json({ error: 'Failed to load ranges' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, sortOrder } = body;

    if (!name) {
      return NextResponse.json({ error: 'Range name is required' }, { status: 400 });
    }

    const range = await prisma.productRange.create({
      data: {
        name,
        description: description || null,
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json({ range });
  } catch (error) {
    console.error('Range creation error:', error);
    return NextResponse.json({ error: 'Failed to create range' }, { status: 500 });
  }
}
