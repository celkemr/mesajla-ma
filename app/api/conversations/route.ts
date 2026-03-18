import { NextRequest, NextResponse } from 'next/server';
import { getAllConversations } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const siteId = searchParams.get('site_id') || undefined;
  const status = searchParams.get('status') || undefined;
  return NextResponse.json(getAllConversations({ siteId, status }));
}
