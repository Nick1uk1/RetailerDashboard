export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { syncOrderStatuses } from '@/lib/linnworks/sync';
import { requireSuperadmin, getCurrentUser } from '@/lib/auth/session';

// Sync secret for cron jobs (set in .env)
const SYNC_SECRET = process.env.SYNC_SECRET || 'sync-secret-change-me';

export async function POST(request: NextRequest) {
  try {
    // Allow either superadmin auth OR sync secret
    const secret = request.headers.get('x-sync-secret') ||
                   request.nextUrl.searchParams.get('secret');

    if (secret === SYNC_SECRET) {
      // Valid secret - proceed with sync
    } else {
      // Check for superadmin auth
      const user = await getCurrentUser();
      if (!user || user.role !== 'SUPERADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const result = await syncOrderStatuses();

    return NextResponse.json({
      success: true,
      message: `Synced ${result.synced} orders, ${result.errors} errors`,
      ...result,
    });

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint for checking sync status
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'Linnworks sync endpoint active',
    usage: 'POST to trigger sync',
    auth: 'Requires superadmin login or x-sync-secret header',
  });
}
