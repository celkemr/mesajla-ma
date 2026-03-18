'use client';
import { useEffect, useState } from 'react';
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

  useEffect(() => {
    fetch(`/api/conversations/${id}`).then((r) => r.json()).then(setConv);
  }, [id]);

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

  if (!conv) return <div className="p-8 text-slate-400">Yükleniyor...</div>;

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button onClick={() => router.back()} className="text-sm text-slate-400 hover:text-slate-600 mb-2 flex items-center gap-1">
            ← Geri
          </button>
          <h2 className="text-2xl font-bold text-slate-800">
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

      {/* Chat messages */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="space-y-4">
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
                <div className={`text-xs mt-1 opacity-50 text-right`}>
                  {new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
