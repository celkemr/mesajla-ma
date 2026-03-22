import { NextRequest, NextResponse } from 'next/server';
import { getSiteById, createProactiveMessage } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { sessionId, siteId, message } = await req.json();
  if (!sessionId || !siteId || !message?.trim()) {
    return NextResponse.json({ error: 'Eksik alan' }, { status: 400 });
  }

  const site = await getSiteById(siteId);
  if (!site) return NextResponse.json({ error: 'Site bulunamadı' }, { status: 404 });

  const conv = await createProactiveMessage(siteId, sessionId, message.trim());
  return NextResponse.json({ conversationId: conv.id });
}
