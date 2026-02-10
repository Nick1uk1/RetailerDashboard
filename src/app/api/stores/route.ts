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

    // Superadmins can see all stores
    if (user.role === 'SUPERADMIN') {
      const stores = await prisma.retailer.findMany({
        where: { active: true },
        select: {
          id: true,
          name: true,
          code: true,
          paymentTermsDays: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      return NextResponse.json({
        isSuperadmin: true,
        stores,
        defaultStoreId: stores[0]?.id || '',
      });
    }

    if (!user.retailerId) {
      return NextResponse.json(
        { error: 'No retailer associated with account' },
        { status: 403 }
      );
    }

    // Get the user's retailer to check for group
    const userRetailer = await prisma.retailer.findUnique({
      where: { id: user.retailerId },
    });

    if (!userRetailer) {
      return NextResponse.json(
        { error: 'Retailer not found' },
        { status: 404 }
      );
    }

    // If retailer has a group, return all stores in that group
    if (userRetailer.groupName) {
      const stores = await prisma.retailer.findMany({
        where: {
          groupName: userRetailer.groupName,
          active: true,
        },
        select: {
          id: true,
          name: true,
          code: true,
          paymentTermsDays: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      return NextResponse.json({
        isChain: true,
        groupName: userRetailer.groupName,
        stores,
        defaultStoreId: userRetailer.id,
      });
    }

    // Not a chain - return single store
    return NextResponse.json({
      isChain: false,
      stores: [{
        id: userRetailer.id,
        name: userRetailer.name,
        code: userRetailer.code,
        paymentTermsDays: userRetailer.paymentTermsDays,
      }],
      defaultStoreId: userRetailer.id,
    });
  } catch (error) {
    console.error('Stores fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to load stores' },
      { status: 500 }
    );
  }
}
