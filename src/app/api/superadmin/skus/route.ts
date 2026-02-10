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
        skus: {
          where: { active: true },
          orderBy: { skuCode: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Also get SKUs without a range
    const unassignedSkus = await prisma.sKU.findMany({
      where: { active: true, rangeId: null },
      orderBy: { skuCode: 'asc' },
    });

    return NextResponse.json({ ranges, unassignedSkus });
  } catch (error) {
    console.error('SKUs list error:', error);
    return NextResponse.json({ error: 'Failed to load SKUs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { skuCode, name, packSize, rangeId, imageUrl, linnworksStockItemId } = body;

    if (!skuCode || !name) {
      return NextResponse.json({ error: 'SKU code and name are required' }, { status: 400 });
    }

    const sku = await prisma.sKU.create({
      data: {
        skuCode,
        name,
        basePrice: 0,
        packSize: packSize || 6,
        rangeId: rangeId || null,
        imageUrl: imageUrl || null,
        linnworksStockItemId: linnworksStockItemId || null,
      },
    });

    return NextResponse.json({ sku });
  } catch (error) {
    console.error('SKU creation error:', error);
    return NextResponse.json({ error: 'Failed to create SKU' }, { status: 500 });
  }
}
