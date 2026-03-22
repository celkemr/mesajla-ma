import { NextRequest, NextResponse } from 'next/server';
import { getSiteByApiKey } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
  };

  const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('api_key');
  if (!apiKey) return NextResponse.json({ error: 'API anahtarı gerekli' }, { status: 401, headers: corsHeaders });

  const site = await getSiteByApiKey(apiKey);
  if (!site) return NextResponse.json({ error: 'Geçersiz API anahtarı' }, { status: 401, headers: corsHeaders });

  return NextResponse.json({
    buttonColor: site.widget_color,
    botName: site.bot_name,
    welcomeMessage: site.widget_welcome_message,
    typingIndicator: site.widget_typing_indicator,
    onlineIndicator: site.widget_online_indicator,
    widgetPosition: site.widget_position,
    language: site.widget_language || 'tr',
  }, { headers: corsHeaders });
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    },
  });
}
