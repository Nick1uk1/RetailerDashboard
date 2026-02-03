import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperadmin } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    await requireSuperadmin();

    const searchParams = request.nextUrl.searchParams;
    const retailerId = searchParams.get('retailerId');

    const users = await prisma.retailerUser.findMany({
      where: retailerId ? { retailerId } : undefined,
      include: {
        retailer: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [
        { retailer: { name: 'asc' } },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({ users });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('Superadmin users error:', error);
    return NextResponse.json(
      { error: 'Failed to load users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSuperadmin();

    const body = await request.json();
    const { email, name, role, retailerId } = body;

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['BUYER', 'ADMIN', 'SUPERADMIN'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be BUYER, ADMIN, or SUPERADMIN' },
        { status: 400 }
      );
    }

    // Non-superadmin users need a retailer
    if (role !== 'SUPERADMIN' && !retailerId) {
      return NextResponse.json(
        { error: 'Retailer is required for BUYER and ADMIN users' },
        { status: 400 }
      );
    }

    // Check if email is unique
    const existing = await prisma.retailerUser.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    const user = await prisma.retailerUser.create({
      data: {
        email,
        name,
        role: role || 'BUYER',
        retailerId: role === 'SUPERADMIN' ? null : retailerId,
      },
      include: {
        retailer: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
