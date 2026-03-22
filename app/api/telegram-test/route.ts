import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { botToken, chatId } = await req.json();
  if (!botToken || !chatId) {
    return NextResponse.json({ ok: false, error: 'Token ve Chat ID gerekli' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: '✅ Mesajla.ma Telegram bağlantısı başarılı!' }),
    });
    const data = await res.json();
    if (res.ok) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: data.description || 'Telegram hatası' });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) });
  }
}
