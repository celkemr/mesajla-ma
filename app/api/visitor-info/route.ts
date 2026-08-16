import { NextRequest, NextResponse } from 'next/server';
import {
  getSiteByApiKey,
  getOrCreateConversation,
  updateConversationVisitor,
  getLeadByConversation,
  createLead,
} from '@/lib/db';
import { sendTelegramMessage, sendWebhook } from '@/lib/integrations';

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

  // Formu doldurup hiç yazmadan çıkanlar da müşteri adayıdır. Lead oluşturmak
  // eskiden yalnızca ilk mesaj yazıldığında tetikleniyordu, bu yüzden telefon/
  // e-posta bırakıp ayrılan ziyaretçiler hiçbir yerde görünmüyordu.
  if (visitorName || visitorEmail || visitorPhone) {
    try {
      const mevcut = await getLeadByConversation(conversation.id);
      if (!mevcut) {
        await createLead({
          siteId: site.id,
          conversationId: conversation.id,
          name: visitorName || undefined,
          email: visitorEmail || undefined,
          phone: visitorPhone || undefined,
        });

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
        const link = appUrl ? `\n🔗 <a href="${appUrl}/conversations/${conversation.id}">Konuşmaya git</a>` : '';

        if (site.telegram_bot_token && site.telegram_chat_id) {
          sendTelegramMessage(
            site.telegram_bot_token,
            site.telegram_chat_id,
            `📝 <b>Yeni Form Kaydı</b>\n` +
            `📌 Site: ${site.name}\n` +
            `👤 ${visitorName || 'İsimsiz'}\n` +
            (visitorPhone ? `📞 ${visitorPhone}\n` : '') +
            (visitorEmail ? `✉️ ${visitorEmail}\n` : '') +
            `⚠️ Henüz mesaj yazmadı — geri dönülmeli.` +
            link,
          ).catch(console.error);
        }

        if (site.webhook_url) {
          sendWebhook(site.webhook_url, {
            event: 'lead',
            source: 'prechat_form',
            conversationId: conversation.id,
            siteId: site.id,
            siteName: site.name,
            name: visitorName || null,
            email: visitorEmail || null,
            phone: visitorPhone || null,
            timestamp: new Date().toISOString(),
          }).catch(console.error);
        }
      }
    } catch (err) {
      // Lead oluşturulamazsa ziyaretçi akışı bozulmasın
      console.error('visitor-info lead hatası', err);
    }
  }

  return NextResponse.json({ ok: true }, { headers: corsHeaders });
}

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
