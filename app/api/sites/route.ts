import { NextRequest, NextResponse } from 'next/server';
import { getAllSites, createSite } from '@/lib/db';

export async function GET() {
  return NextResponse.json(await getAllSites());
}

export async function POST(req: NextRequest) {
  const { name, domain, botName, systemPrompt, widgetPosition, widgetColor, widgetWelcomeMessage, widgetTypingIndicator, widgetOnlineIndicator } = await req.json();
  if (!name?.trim() || !domain?.trim()) {
    return NextResponse.json({ error: 'name and domain are required' }, { status: 400 });
  }
  const site = await createSite(
    name.trim(),
    domain.trim(),
    botName?.trim(),
    systemPrompt?.trim(),
    widgetPosition ?? 'bottom-right',
    widgetColor ?? '#2563eb',
    widgetWelcomeMessage?.trim() ?? 'Merhaba! Size nasıl yardımcı olabilirim?',
    widgetTypingIndicator ?? 1,
    widgetOnlineIndicator ?? 1,
  );
  return NextResponse.json(site);
}
