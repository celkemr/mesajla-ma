import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { botToken, chatId, action } = await req.json();
  if (!botToken) {
    return NextResponse.json({ ok: false, error: 'Bot Token gerekli' }, { status: 400 });
  }

  // getUpdates: bota mesaj atan son kişinin chat ID'sini döndür
  if (action === 'getUpdates') {
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=10&offset=-10`);
      const data = await res.json();
      if (!res.ok) return NextResponse.json({ ok: false, error: data.description || 'Geçersiz token' });
      const updates = data.result || [];
      if (updates.length === 0) {
        return NextResponse.json({ ok: false, error: 'Bota henüz mesaj gönderilmemiş. Bota /start yazın.' });
      }
      // Son mesajdaki chat ID'yi al
      const last = updates[updates.length - 1];
      const chat = last.message?.chat || last.channel_post?.chat;
      if (!chat) return NextResponse.json({ ok: false, error: 'Chat bulunamadı.' });
      return NextResponse.json({ ok: true, chatId: String(chat.id), chatTitle: chat.title || chat.first_name || chat.username || String(chat.id) });
    } catch (e) {
      return NextResponse.json({ ok: false, error: String(e) });
    }
  }

  // sendMessage: test mesajı gönder
  if (!chatId) return NextResponse.json({ ok: false, error: 'Chat ID gerekli' }, { status: 400 });
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: '✅ Mesajla.ma Telegram bağlantısı başarılı!' }),
    });
    const data = await res.json();
    if (res.ok) return NextResponse.json({ ok: true });
    return NextResponse.json({ ok: false, error: data.description || 'Telegram hatası' });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) });
  }
}
