import { NextRequest, NextResponse } from 'next/server';
import { getActiveVisitors } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const siteId = req.nextUrl.searchParams.get('site_id') || undefined;
  const visitors = await getActiveVisitors(siteId, user.userId);
  return NextResponse.json({ visitors });
}
