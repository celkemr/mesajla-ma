import { NextRequest, NextResponse } from 'next/server';
import { getSiteByApiKey, upsertVisitor, cleanupVisitors } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
  };

  const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('api_key');
  if (!apiKey) return NextResponse.json({ ok: false }, { status: 401, headers: corsHeaders });

  const site = await getSiteByApiKey(apiKey);
  if (!site) return NextResponse.json({ ok: false }, { status: 401, headers: corsHeaders });

  const { sessionId, currentPage, visitorName } = await req.json();
  if (!sessionId) return NextResponse.json({ ok: false }, { status: 400, headers: corsHeaders });

  // IP adresi
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || undefined;

  // Ülke kodu (Vercel otomatik ekler)
  const countryCode = req.headers.get('x-vercel-ip-country') || undefined;

  const userAgent = req.headers.get('user-agent') || undefined;

  await upsertVisitor({ siteId: site.id, sessionId, ipAddress: ip, countryCode, currentPage, userAgent, visitorName });

  // Ara sıra eski kayıtları temizle
  if (Math.random() < 0.1) await cleanupVisitors();

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
