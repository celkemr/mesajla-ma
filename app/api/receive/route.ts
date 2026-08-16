import { NextRequest, NextResponse } from 'next/server';
import { getSiteByApiKey, createMessage } from '@/lib/db';

function isAllowedOrigin(origin: string | null, siteDomain: string): boolean {
  if (!origin) return true; // server-to-server
  try {
    const originHost = new URL(origin).hostname.replace(/^www\./, '');
    const siteHost = siteDomain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    return originHost === siteHost || originHost === 'localhost' || originHost.endsWith('.localhost');
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  try {
    const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('api_key');
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const site = await getSiteByApiKey(apiKey);
    if (!site) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    if (!isAllowedOrigin(origin, site.domain)) {
      return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
    }

    const body = await req.json();
    const { sender_name, sender_email, subject, content, ...extra } = body;

    if (!content && !subject) {
      return NextResponse.json({ error: 'content or subject is required' }, { status: 400 });
    }

    const extraFields = Object.keys(extra).length > 0 ? extra : undefined;
    const message = await createMessage(site.id, {
      sender_name,
      sender_email,
      subject,
      content: content || subject,
      extra_fields: extraFields,
    });

    return NextResponse.json(
      { success: true, message_id: (message as unknown as { id: string }).id },
      origin ? { headers: { 'Access-Control-Allow-Origin': origin } } : undefined
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Preflight'ta tarayıcı x-api-key göndermez, bu yüzden burada site doğrulaması
// yapılamaz. Origin'i olduğu gibi onaylıyoruz; asıl yetki kontrolü POST içinde
// yapılıyor (origin site domain'iyle eşleşmezse 403).
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    },
  });
}
