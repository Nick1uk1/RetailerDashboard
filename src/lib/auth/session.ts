import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { config } from '@/lib/config';
import { logger } from '@/lib/utils/logging';
import type { RetailerUser, Retailer } from '@prisma/client';

const SESSION_COOKIE_NAME = 'session_token';

interface UserWithRetailer extends RetailerUser {
  retailer: Retailer | null;
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const cfg = config();
  const expiresAt = new Date(Date.now() + cfg.sessionExpiryDays * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  logger.info('Session created', { userId });

  return token;
}

export async function setSessionCookie(token: string): Promise<void> {
  const cfg = config();
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: cfg.sessionExpiryDays * 24 * 60 * 60,
  });
}

export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

export async function getCurrentUser(): Promise<UserWithRetailer | null> {
  const token = await getSessionToken();
  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        include: { retailer: true },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt < new Date()) {
    // Session expired, clean it up
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  if (!session.user.active) {
    return null;
  }

  // Superadmins don't have a retailer, regular users need an active retailer
  if (session.user.role !== 'SUPERADMIN' && (!session.user.retailer || !session.user.retailer.active)) {
    return null;
  }

  return session.user;
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'ADMIN';
}

export async function requireAuth(): Promise<UserWithRetailer> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireAdmin(): Promise<UserWithRetailer> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  if (user.role !== 'ADMIN') {
    throw new Error('Forbidden');
  }
  return user;
}

export function isSuperadmin(user: UserWithRetailer | null): boolean {
  return user?.role === 'SUPERADMIN';
}

export async function requireSuperadmin(): Promise<UserWithRetailer> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  if (user.role !== 'SUPERADMIN') {
    throw new Error('Forbidden');
  }
  return user;
}

export async function destroySession(): Promise<void> {
  const token = await getSessionToken();
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);

  logger.info('Session destroyed');
}
