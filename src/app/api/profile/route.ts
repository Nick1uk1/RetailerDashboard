export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
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
        { error: 'Superadmin accounts do not have a retailer profile' },
        { status: 403 }
      );
    }

    const retailer = await prisma.retailer.findUnique({
      where: { id: user.retailerId },
      select: {
        id: true,
        name: true,
        code: true,
        contactEmail: true,
        addressLine1: true,
        addressLine2: true,
        addressLine3: true,
        city: true,
        county: true,
        postcode: true,
        country: true,
        phone: true,
      },
    });

    return NextResponse.json({ retailer });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to load profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
        { error: 'Superadmin accounts do not have a retailer profile' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      contactEmail,
      addressLine1,
      addressLine2,
      addressLine3,
      city,
      county,
      postcode,
      country,
      phone,
    } = body;

    const retailer = await prisma.retailer.update({
      where: { id: user.retailerId },
      data: {
        contactEmail,
        addressLine1,
        addressLine2,
        addressLine3,
        city,
        county,
        postcode,
        country,
        phone,
      },
    });

    return NextResponse.json({ retailer });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
