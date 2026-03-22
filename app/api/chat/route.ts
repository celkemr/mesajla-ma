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

  const history = await getConversationMessages(conversation.id);
  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: site.system_prompt },
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

  return NextResponse.json({ messages }, { headers: corsHeaders });
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
