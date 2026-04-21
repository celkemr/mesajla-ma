import { NextRequest, NextResponse } from 'next/server';
import { getVisitorStats } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const siteId = req.nextUrl.searchParams.get('siteId') || undefined;
  const days = Math.min(Number(req.nextUrl.searchParams.get('days') || '7'), 90);

  const stats = await getVisitorStats(user.userId, siteId, days);
  return NextResponse.json(stats);
}
