import { NextRequest, NextResponse } from 'next/server';
import { getVisitorStats } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  const stats = await getVisitorStats(user.userId);
  return NextResponse.json(stats);
}
