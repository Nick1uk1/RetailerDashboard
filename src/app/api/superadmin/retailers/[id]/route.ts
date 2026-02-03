import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperadmin } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperadmin();
    const { id } = await params;

    const retailer = await prisma.retailer.findUnique({
      where: { id },
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
            skus: true,
          },
        },
      },
    });

    if (!retailer) {
      return NextResponse.json({ error: 'Retailer not found' }, { status: 404 });
    }

    return NextResponse.json({ retailer });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('Get retailer error:', error);
    return NextResponse.json(
      { error: 'Failed to load retailer' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperadmin();
    const { id } = await params;
    const body = await request.json();

    const {
      name,
      code,
      contactEmail,
      paymentTermsDays,
      casePrice,
      addressLine1,
      addressLine2,
      addressLine3,
      city,
      county,
      postcode,
      phone,
      active,
    } = body;

    // Check if code is unique (if being changed)
    if (code) {
      const existing = await prisma.retailer.findFirst({
        where: { code, NOT: { id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'Retailer code already exists' },
          { status: 400 }
        );
      }
    }

    const retailer = await prisma.retailer.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(contactEmail !== undefined && { contactEmail }),
        ...(paymentTermsDays !== undefined && { paymentTermsDays }),
        ...(casePrice !== undefined && { casePrice: casePrice ? parseFloat(casePrice) : null }),
        ...(addressLine1 !== undefined && { addressLine1 }),
        ...(addressLine2 !== undefined && { addressLine2 }),
        ...(addressLine3 !== undefined && { addressLine3 }),
        ...(city !== undefined && { city }),
        ...(county !== undefined && { county }),
        ...(postcode !== undefined && { postcode }),
        ...(phone !== undefined && { phone }),
        ...(active !== undefined && { active }),
      },
    });

    return NextResponse.json({ retailer });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('Update retailer error:', error);
    return NextResponse.json(
      { error: 'Failed to update retailer' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperadmin();
    const { id } = await params;

    // Soft delete - just deactivate
    const retailer = await prisma.retailer.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ retailer, message: 'Retailer deactivated' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('Delete retailer error:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate retailer' },
      { status: 500 }
    );
  }
}
