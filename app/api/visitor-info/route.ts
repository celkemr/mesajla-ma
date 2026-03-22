import { NextRequest, NextResponse } from 'next/server';
import { getSiteByApiKey, getOrCreateConversation, updateConversationVisitor } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
  };

  const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('api_key');
  if (!apiKey) return NextResponse.json({ error: 'API anahtarı gerekli' }, { status: 401, headers: corsHeaders });

  const site = await getSiteByApiKey(apiKey);
  if (!site) return NextResponse.json({ error: 'Geçersiz API anahtarı' }, { status: 401, headers: corsHeaders });

  const { sessionId, visitorName, visitorEmail, visitorPhone } = await req.json();
  if (!sessionId) return NextResponse.json({ error: 'sessionId gerekli' }, { status: 400, headers: corsHeaders });

  const conversation = await getOrCreateConversation(site.id, sessionId);
  await updateConversationVisitor(conversation.id, {
    visitor_name: visitorName,
    visitor_email: visitorEmail,
    visitor_phone: visitorPhone,
  });

  return NextResponse.json({ ok: true }, { headers: corsHeaders });
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    },
  });
}
