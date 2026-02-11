export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { config } from '@/lib/config';

// TEMPORARY endpoint for generating magic links during development
// Remove this in production!
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');

  if (!email) {
    // List available users
    const users = await prisma.retailerUser.findMany({
      where: { active: true },
      include: { retailer: true },
      take: 20,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      message: 'Add ?email=user@example.com to generate a link',
      availableUsers: users.map(u => ({
        email: u.email,
        name: u.name,
        retailer: u.retailer?.name || 'Superadmin',
        role: u.role,
      })),
    });
  }

  const user = await prisma.retailerUser.findUnique({
    where: { email },
    include: { retailer: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const token = randomBytes(32).toString('hex');
  const cfg = config();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.magicLinkToken.create({
    data: { email, token, expiresAt },
  });

  const magicLink = `${cfg.appUrl}/login?token=${token}`;

  return NextResponse.json({
    user: {
      email: user.email,
      name: user.name,
      retailer: user.retailer?.name || 'Superadmin',
      role: user.role,
    },
    magicLink,
    expiresAt,
  });
}
