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

    // Get all ranges with their assignment status for this retailer
    const ranges = await prisma.productRange.findMany({
      where: { active: true },
      include: {
        skus: {
          where: { active: true },
          include: {
            retailers: {
              where: { retailerId: id, active: true },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const rangesWithStatus = ranges.map(range => {
      const totalSkus = range.skus.length;
      const assignedSkus = range.skus.filter(s => s.retailers.length > 0).length;
      return {
        id: range.id,
        name: range.name,
        description: range.description,
        totalSkus,
        assignedSkus,
        fullyAssigned: totalSkus > 0 && assignedSkus === totalSkus,
        partiallyAssigned: assignedSkus > 0 && assignedSkus < totalSkus,
      };
    });

    return NextResponse.json({ ranges: rangesWithStatus });
  } catch (error) {
    console.error('Retailer ranges error:', error);
    return NextResponse.json({ error: 'Failed to load retailer ranges' }, { status: 500 });
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
    const { rangeId, action } = body; // action: 'assign' or 'unassign'

    if (!rangeId) {
      return NextResponse.json({ error: 'Range ID required' }, { status: 400 });
    }

    // Get all SKUs in this range
    const skusInRange = await prisma.sKU.findMany({
      where: { rangeId, active: true },
      select: { id: true },
    });

    const skuIds = skusInRange.map(s => s.id);

    if (action === 'assign') {
      // Assign all SKUs in range to retailer
      for (const skuId of skuIds) {
        await prisma.retailerSKU.upsert({
          where: { retailerId_skuId: { retailerId: id, skuId } },
          update: { active: true },
          create: { retailerId: id, skuId, active: true },
        });
      }
    } else if (action === 'unassign') {
      // Remove all SKUs in range from retailer
      await prisma.retailerSKU.updateMany({
        where: { retailerId: id, skuId: { in: skuIds } },
        data: { active: false },
      });
    }

    return NextResponse.json({ success: true, skusUpdated: skuIds.length });
  } catch (error) {
    console.error('Retailer range assignment error:', error);
    return NextResponse.json({ error: 'Failed to update retailer ranges' }, { status: 500 });
  }
}
