export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperadmin } from '@/lib/auth/session';

// One-time endpoint to convert Go Puff to On the Rocks chain
// Visit this URL while logged in as superadmin to run
export async function GET() {
  try {
    await requireSuperadmin();

    // Find Go Puff retailer
    const goPuff = await prisma.retailer.findFirst({
      where: { name: { contains: 'Go Puff', mode: 'insensitive' } },
      include: { skus: true },
    });

    if (!goPuff) {
      return NextResponse.json({ error: 'Go Puff retailer not found' }, { status: 404 });
    }

    // Check if already converted
    if (goPuff.groupName === 'On the Rocks') {
      return NextResponse.json({
        message: 'Already converted to On the Rocks chain',
        london: goPuff.name,
      });
    }

    // Update Go Puff to On the Rocks London
    const london = await prisma.retailer.update({
      where: { id: goPuff.id },
      data: {
        name: 'On the Rocks London',
        code: 'OTR-LON',
        groupName: 'On the Rocks',
        addressLine1: 'Unit 5 Sperrin Business Centre',
        addressLine2: 'Stonefield Way',
        city: 'Ruislip',
        county: 'London',
        country: 'United Kingdom',
      },
    });

    // Create On the Rocks Birmingham with same settings
    const birmingham = await prisma.retailer.create({
      data: {
        name: 'On the Rocks Birmingham',
        code: 'OTR-BHM',
        contactEmail: goPuff.contactEmail,
        groupName: 'On the Rocks',
        paymentTermsDays: goPuff.paymentTermsDays,
        casePrice: goPuff.casePrice,
        addressLine1: 'Unit 33, Electra Park Electric Avenue',
        addressLine2: 'Aston',
        city: 'Birmingham',
        county: 'West Midlands',
        postcode: 'B6 7EB',
        country: 'United Kingdom',
        active: true,
      },
    });

    // Copy SKU access from London to Birmingham
    if (goPuff.skus.length > 0) {
      await prisma.retailerSKU.createMany({
        data: goPuff.skus.map(sku => ({
          retailerId: birmingham.id,
          skuId: sku.skuId,
          priceOverride: sku.priceOverride,
          active: sku.active,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Converted Go Puff to On the Rocks chain',
      london: {
        id: london.id,
        name: london.name,
        code: london.code,
        groupName: london.groupName,
      },
      birmingham: {
        id: birmingham.id,
        name: birmingham.name,
        code: birmingham.code,
        groupName: birmingham.groupName,
      },
      skusCopied: goPuff.skus.length,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    console.error('Setup OTR chain error:', error);
    return NextResponse.json({ error: 'Failed to setup chain' }, { status: 500 });
  }
}
