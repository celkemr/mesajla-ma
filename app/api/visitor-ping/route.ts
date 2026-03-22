import { NextRequest, NextResponse } from 'next/server';
import { getSiteByApiKey, upsertVisitor, cleanupVisitors } from '@/lib/db';

export const dynamic = 'force-dynamic';

function detectDevice(ua: string): string {
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  if (/mobile|android|iphone|ipod/i.test(ua)) return 'mobile';
  return 'desktop';
}

function detectBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\/|OPR\//i.test(ua)) return 'Opera';
  if (/firefox\//i.test(ua)) return 'Firefox';
  if (/chrome\//i.test(ua)) return 'Chrome';
  if (/safari\//i.test(ua)) return 'Safari';
  return 'Diğer';
}

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

  const { sessionId, currentPage, referrer, visitorName } = await req.json();
  if (!sessionId) return NextResponse.json({ ok: false }, { status: 400, headers: corsHeaders });

  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || undefined;
  const countryCode = req.headers.get('x-vercel-ip-country') || undefined;
  const ua = req.headers.get('user-agent') || '';

  await upsertVisitor({
    siteId: site.id,
    sessionId,
    ipAddress: ip,
    countryCode,
    currentPage,
    referrer: referrer || undefined,
    deviceType: ua ? detectDevice(ua) : undefined,
    browser: ua ? detectBrowser(ua) : undefined,
    userAgent: ua || undefined,
    visitorName,
  });

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
