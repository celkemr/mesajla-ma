import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  getSiteByApiKey,
  getOrCreateConversation,
  addChatMessage,
  getConversationMessages,
  updateConversationVisitor,
  getConversationMessageCount,
  updateConversationSummary,
  getLeadByConversation,
  createLead,
} from '@/lib/db';
import {
  sendTelegramMessage,
  sendWebhook,
  createHubSpotContact,
  createPipedriveContact,
  generateConversationSummary,
} from '@/lib/integrations';

export const dynamic = 'force-dynamic';

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

function isAllowedOrigin(origin: string | null, siteDomain: string): boolean {
  if (!origin) return true;
  try {
    const originHost = new URL(origin).hostname.replace(/^www\./, '');
    const siteHost = siteDomain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    return originHost === siteHost || originHost === 'localhost' || originHost.endsWith('.localhost');
  } catch {
    return false;
  }
}

function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    Vary: 'Origin',
  };
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');

  const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('api_key');
  if (!apiKey) return NextResponse.json({ error: 'API anahtarı gerekli' }, { status: 401 });

  const site = await getSiteByApiKey(apiKey);
  if (!site) return NextResponse.json({ error: 'Geçersiz API anahtarı' }, { status: 401 });

  if (origin && !isAllowedOrigin(origin, site.domain)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
  }
  const headers = corsHeaders(origin || site.domain);

  const { message, sessionId, visitorName, visitorEmail, visitorPhone, fileData, fileName } = await req.json();
  if ((!message && !fileData) || !sessionId) {
    return NextResponse.json({ error: 'message/fileData ve sessionId gerekli' }, { status: 400, headers });
  }

  const conversation = await getOrCreateConversation(site.id, sessionId);

  if (visitorName || visitorEmail || visitorPhone) {
    await updateConversationVisitor(conversation.id, { visitor_name: visitorName, visitor_email: visitorEmail, visitor_phone: visitorPhone });
  }

  // Dosya içeriği varsa ayrı mesaj olarak ekle
  const userContent = fileData
    ? (message ? message + `\n[Dosya: ${fileName || 'dosya'}]` : `[Dosya: ${fileName || 'dosya'}]`)
    : message;
  await addChatMessage(conversation.id, 'user', userContent, fileData || null);

  // Kaç mesaj var?
  const msgCount = await getConversationMessageCount(conversation.id);

  // İlk mesaj ise: Lead oluştur + Telegram + CRM tetikle (fire & forget)
  if (msgCount === 1) {
    const visitorInfo = {
      name: visitorName || conversation.visitor_name,
      email: visitorEmail || conversation.visitor_email,
      phone: visitorPhone || conversation.visitor_phone,
    };

    // Yerel lead oluştur (ziyaretçi bilgisi varsa)
    if (visitorInfo.name || visitorInfo.email || visitorInfo.phone) {
      getLeadByConversation(conversation.id).then(existing => {
        if (!existing) {
          createLead({
            siteId: site.id,
            conversationId: conversation.id,
            name: visitorInfo.name || undefined,
            email: visitorInfo.email || undefined,
            phone: visitorInfo.phone || undefined,
          }).catch(console.error);
        }
      }).catch(console.error);
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const convLink = appUrl ? `\n🔗 <a href="${appUrl}/conversations/${conversation.id}">Konuşmaya git</a>` : '';

    if (site.telegram_bot_token && site.telegram_chat_id) {
      sendTelegramMessage(
        site.telegram_bot_token,
        site.telegram_chat_id,
        `🔔 <b>Yeni Konuşma!</b>\n` +
        `📌 Site: ${site.name}\n` +
        `👤 Ziyaretçi: ${visitorInfo.name || 'Anonim'}\n` +
        (visitorInfo.phone ? `📞 ${visitorInfo.phone}\n` : '') +
        (visitorInfo.email ? `✉️ ${visitorInfo.email}\n` : '') +
        `💬 Mesaj: ${userContent.slice(0, 200)}` +
        convLink,
      ).catch(console.error);
    }

    // CRM - sadece email ya da telefon varsa lead oluştur
    if (visitorInfo.email || visitorInfo.phone || visitorInfo.name) {
      if (site.hubspot_api_key) {
        createHubSpotContact(site.hubspot_api_key, visitorInfo).catch(console.error);
      }
      if (site.pipedrive_api_key && site.pipedrive_domain) {
        createPipedriveContact(site.pipedrive_api_key, site.pipedrive_domain, visitorInfo).catch(console.error);
      }
    }
  }

  // Webhook: her kullanıcı mesajında tetikle
  if (site.webhook_url) {
    sendWebhook(site.webhook_url, {
      event: 'message',
      role: 'user',
      content: userContent,
      conversationId: conversation.id,
      siteId: site.id,
      siteName: site.name,
      visitorName: visitorName || conversation.visitor_name,
      timestamp: new Date().toISOString(),
    }).catch(console.error);
  }

  if (conversation.mode === 'human') {
    return NextResponse.json({ reply: null, humanMode: true, conversationId: conversation.id }, { headers });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ reply: 'Bot henüz yapılandırılmadı. Lütfen yönetici ile iletişime geçin.', conversationId: conversation.id }, { headers });
  }

  const languageInstructions: Record<string, string> = {
    tr: 'ZORUNLU: Kullanıcı hangi dilde yazarsa yazsın, yalnızca ve yalnızca Türkçe yanıt ver. Başka dil kullanma.',
    en: 'MANDATORY: Always respond ONLY in English, regardless of the language the user writes in.',
    de: 'PFLICHT: Antworte IMMER NUR auf Deutsch, egal in welcher Sprache der Nutzer schreibt.',
    fr: 'OBLIGATOIRE: Réponds UNIQUEMENT en français, quelle que soit la langue utilisée.',
    es: 'OBLIGATORIO: Responde SOLO en español, sin importar el idioma del usuario.',
    ar: 'إلزامي: أجب دائماً باللغة العربية فقط بغض النظر عن لغة المستخدم.',
    ru: 'ОБЯЗАТЕЛЬНО: Всегда отвечай ТОЛЬКО на русском языке, независимо от языка пользователя.',
    nl: 'VERPLICHT: Antwoord ALTIJD ALLEEN in het Nederlands, ongeacht de taal van de gebruiker.',
    it: 'OBBLIGATORIO: Rispondi SOLO in italiano, indipendentemente dalla lingua dell\'utente.',
    pt: 'OBRIGATÓRIO: Responda SOMENTE em português, independentemente do idioma do usuário.',
  };
  const lang = site.widget_language || 'tr';
  const langNote = languageInstructions[lang] || languageInstructions['tr'];
  const systemPrompt = `[DİL KURALI / LANGUAGE RULE]: ${langNote}\n\n${site.system_prompt}`;

  const history = await getConversationMessages(conversation.id);
  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-20).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: openaiMessages,
    max_tokens: 1000,
  });

  const reply = completion.choices[0]?.message?.content || 'Bir hata oluştu.';
  await addChatMessage(conversation.id, 'assistant', reply);

  // Webhook: asistan yanıtında
  if (site.webhook_url) {
    sendWebhook(site.webhook_url, {
      event: 'message',
      role: 'assistant',
      content: reply,
      conversationId: conversation.id,
      siteId: site.id,
      siteName: site.name,
      timestamp: new Date().toISOString(),
    }).catch(console.error);
  }

  // Her 6 mesajda bir AI özet üret (fire & forget)
  const newCount = msgCount + 1; // user + assistant
  if (process.env.OPENAI_API_KEY && newCount >= 6 && newCount % 6 === 0) {
    const allMessages = await getConversationMessages(conversation.id);
    generateConversationSummary(process.env.OPENAI_API_KEY, allMessages)
      .then(summary => { if (summary) updateConversationSummary(conversation.id, summary); })
      .catch(console.error);
  }

  return NextResponse.json({ reply, conversationId: conversation.id }, { headers });
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');

  const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('api_key');
  if (!apiKey) return NextResponse.json({ error: 'API anahtarı gerekli' }, { status: 401 });

  const site = await getSiteByApiKey(apiKey);
  if (!site) return NextResponse.json({ error: 'Geçersiz API anahtarı' }, { status: 401 });

  if (origin && !isAllowedOrigin(origin, site.domain)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
  }
  const headers = corsHeaders(origin || site.domain);

  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ messages: [] }, { headers });

  const conversation = await getOrCreateConversation(site.id, sessionId);
  const messages = await getConversationMessages(conversation.id);

  return NextResponse.json({
    messages,
    config: {
      botName: site.bot_name,
      buttonColor: site.widget_color,
      welcomeMessage: site.widget_welcome_message,
      typingIndicator: site.widget_typing_indicator,
      onlineIndicator: site.widget_online_indicator,
      widgetPosition: site.widget_position,
    },
  }, { headers });
}

// Preflight'ta tarayıcı x-api-key göndermez, bu yüzden burada site doğrulaması
// yapılamaz. Origin'i olduğu gibi onaylıyoruz; asıl yetki kontrolü POST/GET
// içinde yapılıyor (origin site domain'iyle eşleşmezse 403).
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    },
  });
}
