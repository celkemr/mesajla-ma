import { NextRequest, NextResponse } from 'next/server';
import { getFunnel, getTrafficSources } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const siteId = searchParams.get('siteId') || undefined;
  const days = Number(searchParams.get('days') || '30');

  const [funnel, sources] = await Promise.all([
    getFunnel({ userId: user.userId, siteId, days }),
    getTrafficSources({ userId: user.userId, siteId, days }),
  ]);

  return NextResponse.json({ funnel, sources });
}
