export const dynamic = 'force-dynamic';
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

    // Superadmins see all active SKUs with base pricing
    if (user.role === 'SUPERADMIN') {
      const allSkus = await prisma.sKU.findMany({
        where: { active: true },
        include: { range: true },
        orderBy: { skuCode: 'asc' },
      });

      const catalog = allSkus.map((sku) => ({
        id: sku.id,
        skuCode: sku.skuCode,
        name: sku.name,
        price: Number(sku.basePrice),
        packSize: sku.packSize,
        unitOfMeasure: sku.unitOfMeasure,
        imageUrl: sku.imageUrl,
        rangeName: sku.range?.name || 'Other',
        rangeId: sku.rangeId,
      }));

      return NextResponse.json({ catalog });
    }

    // Regular users - load their retailer's catalog
    if (!user.retailerId) {
      return NextResponse.json(
        { error: 'No retailer associated with account' },
        { status: 400 }
      );
    }

    // Get retailer's case price
    const retailer = await prisma.retailer.findUnique({
      where: { id: user.retailerId },
      select: { casePrice: true },
    });

    const retailerSkus = await prisma.retailerSKU.findMany({
      where: {
        retailerId: user.retailerId,
        active: true,
        sku: {
          active: true,
        },
      },
      include: {
        sku: {
          include: {
            range: true,
          },
        },
      },
      orderBy: {
        sku: {
          skuCode: 'asc',
        },
      },
    });

    // Use retailer's case price if set, otherwise fall back to SKU price
    const catalog = retailerSkus.map((rs) => {
      // If retailer has a case price, use that (divided by pack size to get unit price)
      // Otherwise use the SKU-specific price override or base price
      const unitPrice = retailer?.casePrice
        ? Number(retailer.casePrice) / rs.sku.packSize
        : (rs.priceOverride ?? rs.sku.basePrice);

      return {
        id: rs.sku.id,
        skuCode: rs.sku.skuCode,
        name: rs.sku.name,
        price: unitPrice,
        packSize: rs.sku.packSize,
        unitOfMeasure: rs.sku.unitOfMeasure,
        imageUrl: rs.sku.imageUrl,
        rangeName: rs.sku.range?.name || 'Other',
        rangeId: rs.sku.rangeId,
      };
    });

    return NextResponse.json({ catalog });
  } catch (error) {
    console.error('Catalog error:', error);
    return NextResponse.json(
      { error: 'Failed to load catalog' },
      { status: 500 }
    );
  }
}
