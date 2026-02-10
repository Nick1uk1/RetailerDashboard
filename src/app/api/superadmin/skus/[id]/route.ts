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

    const sku = await prisma.sKU.findUnique({
      where: { id },
      include: {
        range: true,
        retailers: {
          include: {
            retailer: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    if (!sku) {
      return NextResponse.json({ error: 'SKU not found' }, { status: 404 });
    }

    return NextResponse.json({
      sku: {
        ...sku,
        basePrice: Number(sku.basePrice),
        retailers: sku.retailers.map(rs => ({
          retailerId: rs.retailerId,
          retailerName: rs.retailer.name,
          retailerCode: rs.retailer.code,
          priceOverride: rs.priceOverride ? Number(rs.priceOverride) : null,
        })),
      },
    });
  } catch (error) {
    console.error('SKU fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch SKU' }, { status: 500 });
  }
}

export async function PATCH(
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
    const { basePrice, name, packSize, imageUrl } = body;

    const updateData: Record<string, unknown> = {};

    if (basePrice !== undefined) {
      updateData.basePrice = basePrice;
    }
    if (name !== undefined) {
      updateData.name = name;
    }
    if (packSize !== undefined) {
      updateData.packSize = packSize;
    }
    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl;
    }

    const sku = await prisma.sKU.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      sku: {
        ...sku,
        basePrice: Number(sku.basePrice),
      },
    });
  } catch (error) {
    console.error('SKU update error:', error);
    return NextResponse.json({ error: 'Failed to update SKU' }, { status: 500 });
  }
}
