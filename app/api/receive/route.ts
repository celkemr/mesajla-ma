import { NextRequest, NextResponse } from 'next/server';
import { getSiteByApiKey, createMessage } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('api_key');
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const site = await getSiteByApiKey(apiKey);
    if (!site) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
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

    return NextResponse.json({ success: true, message_id: (message as unknown as { id: string }).id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    },
  });
}
