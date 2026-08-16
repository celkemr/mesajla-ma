import { NextRequest, NextResponse } from 'next/server';
import { getAllLeads, createLead, getSiteById } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const siteId = searchParams.get('site_id') || undefined;
  const status = searchParams.get('status') || undefined;
  const followUp = searchParams.get('follow_up') === '1';
  return NextResponse.json(await getAllLeads({ siteId, status, followUp, userId: user.userId }));
}

export async function POST(req: NextRequest) {
  const user = getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const data = await req.json();
  if (!data?.site_id) {
    return NextResponse.json({ error: 'site_id gerekli' }, { status: 400 });
  }

  // Süper admin (userId undefined) her siteye ekleyebilir; diğerleri yalnızca kendi sitesine.
  const site = await getSiteById(data.site_id);
  if (!site) return NextResponse.json({ error: 'Site bulunamadı' }, { status: 404 });
  if (user.userId && site.user_id !== user.userId) {
    return NextResponse.json({ error: 'Bu siteye erişiminiz yok' }, { status: 403 });
  }

  const lead = await createLead({
    siteId: data.site_id,
    conversationId: data.conversation_id,
    name: data.name,
    email: data.email,
    phone: data.phone,
  });
  return NextResponse.json(lead);
}
