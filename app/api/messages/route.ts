import { NextRequest, NextResponse } from 'next/server';
import { getAllMessages, getStats } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const siteId = searchParams.get('site_id') || undefined;
  const status = searchParams.get('status') || undefined;
  const search = searchParams.get('search') || undefined;

  const [messages, stats] = await Promise.all([
    getAllMessages({ siteId, status, search }),
    getStats(),
  ]);

  return NextResponse.json({ messages, stats });
}
