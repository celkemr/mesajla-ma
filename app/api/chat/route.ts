import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  getSiteByApiKey,
  getOrCreateConversation,
  addChatMessage,
  getConversationMessages,
  updateConversationVisitor,
} from '@/lib/db';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  // CORS
  const origin = req.headers.get('origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
  };

  const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('api_key');
  if (!apiKey) return NextResponse.json({ error: 'API anahtarı gerekli' }, { status: 401, headers: corsHeaders });

  const site = getSiteByApiKey(apiKey);
  if (!site) return NextResponse.json({ error: 'Geçersiz API anahtarı' }, { status: 401, headers: corsHeaders });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API anahtarı sunucuda tanımlı değil' }, { status: 500, headers: corsHeaders });
  }

  const { message, sessionId, visitorName, visitorEmail } = await req.json();
  if (!message || !sessionId) {
    return NextResponse.json({ error: 'message ve sessionId gerekli' }, { status: 400, headers: corsHeaders });
  }

  // Konuşmayı al veya oluştur
  const conversation = getOrCreateConversation(site.id, sessionId);

  // Ziyaretçi bilgilerini güncelle
  if (visitorName || visitorEmail) {
    updateConversationVisitor(conversation.id, { visitor_name: visitorName, visitor_email: visitorEmail });
  }

  // Kullanıcı mesajını kaydet
  addChatMessage(conversation.id, 'user', message);

  // Önceki mesajları getir (OpenAI context için)
  const history = getConversationMessages(conversation.id);
  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: site.system_prompt },
    ...history.slice(-20).map((m) => ({ // son 20 mesaj
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  // OpenAI'ya gönder
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: openaiMessages,
    max_tokens: 1000,
  });

  const reply = completion.choices[0]?.message?.content || 'Bir hata oluştu.';

  // Asistan yanıtını kaydet
  addChatMessage(conversation.id, 'assistant', reply);

  return NextResponse.json({
    reply,
    conversationId: conversation.id,
  }, { headers: corsHeaders });
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
