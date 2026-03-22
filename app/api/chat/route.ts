import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  getSiteByApiKey,
  getOrCreateConversation,
  addChatMessage,
  getConversationMessages,
  updateConversationVisitor,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

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

  const { message, sessionId, visitorName, visitorEmail } = await req.json();
  if (!message || !sessionId) {
    return NextResponse.json({ error: 'message ve sessionId gerekli' }, { status: 400, headers: corsHeaders });
  }

  const conversation = await getOrCreateConversation(site.id, sessionId);

  if (visitorName || visitorEmail) {
    await updateConversationVisitor(conversation.id, { visitor_name: visitorName, visitor_email: visitorEmail });
  }

  await addChatMessage(conversation.id, 'user', message);

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ reply: 'Bot henüz yapılandırılmadı. Lütfen yönetici ile iletişime geçin.', conversationId: conversation.id }, { headers: corsHeaders });
  }

  const languageInstructions: Record<string, string> = {
    tr: 'Her zaman Türkçe yanıt ver.',
    en: 'Always respond in English.',
    de: 'Antworte immer auf Deutsch.',
    fr: 'Réponds toujours en français.',
    es: 'Responde siempre en español.',
    ar: 'أجب دائماً باللغة العربية.',
    ru: 'Всегда отвечай на русском языке.',
    nl: 'Antwoord altijd in het Nederlands.',
    it: 'Rispondi sempre in italiano.',
    pt: 'Responda sempre em português.',
  };
  const langNote = languageInstructions[site.widget_language || 'tr'] || languageInstructions['tr'];
  const systemPrompt = `${site.system_prompt}\n\n${langNote}`;

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

  return NextResponse.json({ reply, conversationId: conversation.id }, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
  };

  const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('api_key');
  if (!apiKey) return NextResponse.json({ error: 'API anahtarı gerekli' }, { status: 401, headers: corsHeaders });

  const site = await getSiteByApiKey(apiKey);
  if (!site) return NextResponse.json({ error: 'Geçersiz API anahtarı' }, { status: 401, headers: corsHeaders });

  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ messages: [] }, { headers: corsHeaders });

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
  }, { headers: corsHeaders });
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    },
  });
}
