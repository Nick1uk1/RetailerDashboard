export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperadmin } from '@/lib/auth/session';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSuperadmin();
    const { id } = await params;

    const body = await request.json();
    const { status, creditAmount, resolutionNote } = body;

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be APPROVED or REJECTED' },
        { status: 400 }
      );
    }

    if (status === 'APPROVED' && (creditAmount === undefined || creditAmount <= 0)) {
      return NextResponse.json(
        { error: 'Credit amount is required for approved requests' },
        { status: 400 }
      );
    }

    const creditRequest = await prisma.creditRequest.update({
      where: { id },
      data: {
        status,
        creditAmount: status === 'APPROVED' ? creditAmount : null,
        resolutionNote: resolutionNote || null,
        resolvedById: user.id,
        resolvedAt: new Date(),
      },
    });

    return NextResponse.json({
      creditRequest: {
        ...creditRequest,
        affectedItems: JSON.parse(creditRequest.affectedItems),
        photoUrls: JSON.parse(creditRequest.photoUrls),
        creditAmount: creditRequest.creditAmount ? Number(creditRequest.creditAmount) : null,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    console.error('Update credit request error:', error);
    return NextResponse.json({ error: 'Failed to update credit request' }, { status: 500 });
  }
}
