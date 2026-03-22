'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface ConvDetail {
  id: string;
  site_name: string;
  bot_name: string;
  visitor_name: string | null;
  visitor_email: string | null;
  status: string;
  created_at: string;
  messages: ChatMsg[];
}

export default function ConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [conv, setConv] = useState<ConvDetail | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchConv = useCallback(() => {
    fetch(`/api/conversations/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setConv((prev) => {
          // Sadece mesaj sayısı değiştiyse state'i güncelle
          if (!prev || prev.messages.length !== data.messages.length) {
            return data;
          }
          return prev;
        });
      });
  }, [id]);

  useEffect(() => {
    fetchConv();
    const interval = setInterval(fetchConv, 3000);
    return () => clearInterval(interval);
  }, [fetchConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conv?.messages.length]);

  async function closeConv() {
    await fetch(`/api/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'closed' }),
    });
    setConv((c) => c ? { ...c, status: 'closed' } : c);
  }

  async function deleteConv() {
    if (!confirm('Bu konuşmayı silmek istediğinize emin misiniz?')) return;
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    router.push('/conversations');
  }

  async function sendReply() {
    if (!reply.trim() || sending) return;
    setSending(true);
    const res = await fetch(`/api/conversations/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: reply }),
    });
    if (res.ok) {
      setReply('');
      textareaRef.current && (textareaRef.current.style.height = 'auto');
      fetchConv();
    }
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  }

  if (!conv) return <div className="p-8 text-slate-400">Yükleniyor...</div>;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 bg-white flex items-start justify-between shrink-0">
        <div>
          <button onClick={() => router.back()} className="text-sm text-slate-400 hover:text-slate-600 mb-2 flex items-center gap-1">
            ← Geri
          </button>
          <h2 className="text-xl font-bold text-slate-800">
            {conv.visitor_name || 'Anonim'} ile Konuşma
          </h2>
          <div className="flex gap-3 mt-1 text-sm text-slate-500 flex-wrap">
            {conv.visitor_email && <span>{conv.visitor_email}</span>}
            <span>Site: {conv.site_name}</span>
            <span>{new Date(conv.created_at).toLocaleString('tr-TR')}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              conv.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {conv.status === 'active' ? 'Aktif' : 'Kapalı'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {conv.status === 'active' && (
            <button onClick={closeConv} className="text-sm border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
              Kapat
            </button>
          )}
          <button onClick={deleteConv} className="text-sm border border-red-200 text-red-500 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">
            Sil
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {conv.messages.length === 0 && (
          <p className="text-center text-slate-400 py-8">Mesaj yok.</p>
        )}
        {conv.messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-lg px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-slate-100 text-slate-800 rounded-bl-sm'
            }`}>
              <div className="text-xs opacity-60 mb-1 font-medium">
                {msg.role === 'user' ? (conv.visitor_name || 'Ziyaretçi') : conv.bot_name}
              </div>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              <div className="text-xs mt-1 opacity-50 text-right">
                {new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply box */}
      <div className="shrink-0 border-t border-slate-100 bg-white p-4">
        <div className="flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={reply}
            onChange={(e) => {
              setReply(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder="Yanıt yaz... (Enter gönd, Shift+Enter satır)"
            rows={1}
            className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32 overflow-y-auto"
          />
          <button
            onClick={sendReply}
            disabled={!reply.trim() || sending}
            className="bg-blue-600 text-white px-5 py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 shrink-0"
          >
            {sending ? '...' : 'Gönder'}
          </button>
        </div>
      </div>
    </div>
  );
}
