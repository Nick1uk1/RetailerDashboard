import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperadmin } from '@/lib/auth/session';

export async function GET() {
  try {
    await requireSuperadmin();

    const retailers = await prisma.retailer.findMany({
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            active: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({ retailers });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('Superadmin retailers error:', error);
    return NextResponse.json(
      { error: 'Failed to load retailers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSuperadmin();

    const body = await request.json();
    const { name, code, contactEmail, paymentTermsDays, casePrice, addressLine1, city, postcode, phone } = body;

    if (!name || !code || !contactEmail) {
      return NextResponse.json(
        { error: 'Name, code, and contact email are required' },
        { status: 400 }
      );
    }

    // Check if code is unique
    const existing = await prisma.retailer.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json(
        { error: 'Retailer code already exists' },
        { status: 400 }
      );
    }

    const retailer = await prisma.retailer.create({
      data: {
        name,
        code,
        contactEmail,
        paymentTermsDays: paymentTermsDays || 14,
        casePrice: casePrice ? parseFloat(casePrice) : null,
        addressLine1,
        city,
        postcode,
        phone,
      },
    });

    return NextResponse.json({ retailer }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('Create retailer error:', error);
    return NextResponse.json(
      { error: 'Failed to create retailer' },
      { status: 500 }
    );
  }
}
