import { NextRequest, NextResponse } from 'next/server';
import { deleteSite, getSiteById, updateSite } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = await getSiteById(id);
  if (!site) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(site);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();
  const allowed = ['bot_name', 'system_prompt', 'widget_position', 'widget_color', 'widget_welcome_message', 'widget_typing_indicator', 'widget_online_indicator', 'widget_language', 'telegram_bot_token', 'telegram_chat_id', 'webhook_url', 'hubspot_api_key', 'pipedrive_api_key', 'pipedrive_domain'];
  const filtered = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
  const site = await updateSite(id, filtered);
  return NextResponse.json(site);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteSite(id);
  return NextResponse.json({ success: true });
}
