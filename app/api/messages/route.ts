import { NextRequest, NextResponse } from 'next/server';
import { getAllMessages, countAllMessages, getStats } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const VARSAYILAN_LIMIT = 50;

export async function GET(req: NextRequest) {
  const user = getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const siteId = searchParams.get('site_id') || undefined;
  const status = searchParams.get('status') || undefined;
  const search = searchParams.get('search') || undefined;
  const limit = Math.max(1, Math.min(Number(searchParams.get('limit')) || VARSAYILAN_LIMIT, 200));
  const offset = Math.max(0, Number(searchParams.get('offset')) || 0);

  const filtreler = { siteId, status, search, userId: user.userId };

  const [messages, total, stats] = await Promise.all([
    getAllMessages({ ...filtreler, limit, offset }),
    countAllMessages(filtreler),
    getStats(user.userId),
  ]);

  return NextResponse.json({
    messages,
    stats,
    pagination: { total, limit, offset, hasMore: offset + messages.length < total },
  });
}
