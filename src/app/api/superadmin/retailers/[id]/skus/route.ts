export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get all SKUs with their assignment status for this retailer
    const allSkus = await prisma.sKU.findMany({
      where: { active: true },
      include: {
        range: true,
        retailers: {
          where: { retailerId: id },
        },
      },
      orderBy: { skuCode: 'asc' },
    });

    const skusWithStatus = allSkus.map(sku => ({
      id: sku.id,
      skuCode: sku.skuCode,
      name: sku.name,
      packSize: sku.packSize,
      imageUrl: sku.imageUrl,
      rangeName: sku.range?.name || 'Unassigned',
      rangeId: sku.rangeId,
      assigned: sku.retailers.length > 0 && sku.retailers[0].active,
      priceOverride: sku.retailers[0]?.priceOverride || null,
    }));

    return NextResponse.json({ skus: skusWithStatus });
  } catch (error) {
    console.error('Retailer SKUs error:', error);
    return NextResponse.json({ error: 'Failed to load retailer SKUs' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { skuIds, action } = body; // action: 'assign' or 'unassign'

    if (!skuIds || !Array.isArray(skuIds)) {
      return NextResponse.json({ error: 'SKU IDs required' }, { status: 400 });
    }

    if (action === 'assign') {
      // Assign SKUs to retailer
      for (const skuId of skuIds) {
        await prisma.retailerSKU.upsert({
          where: { retailerId_skuId: { retailerId: id, skuId } },
          update: { active: true },
          create: { retailerId: id, skuId, active: true },
        });
      }
    } else if (action === 'unassign') {
      // Remove SKUs from retailer
      await prisma.retailerSKU.updateMany({
        where: { retailerId: id, skuId: { in: skuIds } },
        data: { active: false },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Retailer SKU assignment error:', error);
    return NextResponse.json({ error: 'Failed to update retailer SKUs' }, { status: 500 });
  }
}
