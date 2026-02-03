import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!user.retailerId) {
      return NextResponse.json(
        { error: 'Superadmin accounts cannot access catalog' },
        { status: 403 }
      );
    }

    const retailerSkus = await prisma.retailerSKU.findMany({
      where: {
        retailerId: user.retailerId,
        active: true,
        sku: {
          active: true,
        },
      },
      include: {
        sku: true,
      },
      orderBy: {
        sku: {
          skuCode: 'asc',
        },
      },
    });

    const catalog = retailerSkus.map((rs) => ({
      id: rs.sku.id,
      skuCode: rs.sku.skuCode,
      name: rs.sku.name,
      price: rs.priceOverride ?? rs.sku.basePrice,
      packSize: rs.sku.packSize,
      unitOfMeasure: rs.sku.unitOfMeasure,
      imageUrl: rs.sku.imageUrl,
    }));

    return NextResponse.json({ catalog });
  } catch (error) {
    console.error('Catalog error:', error);
    return NextResponse.json(
      { error: 'Failed to load catalog' },
      { status: 500 }
    );
  }
}
