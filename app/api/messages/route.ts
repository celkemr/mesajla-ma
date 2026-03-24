import { NextRequest, NextResponse } from 'next/server';
import { getAllMessages, getStats } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const siteId = searchParams.get('site_id') || undefined;
  const status = searchParams.get('status') || undefined;
  const search = searchParams.get('search') || undefined;

  const [messages, stats] = await Promise.all([
    getAllMessages({ siteId, status, search, userId: user.userId }),
    getStats(user.userId),
  ]);

  return NextResponse.json({ messages, stats });
}
