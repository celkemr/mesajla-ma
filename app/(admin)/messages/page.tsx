'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

interface Site {
  id: string;
  name: string;
  domain: string;
}

interface Message {
  id: string;
  sender_name: string;
  sender_email: string;
  subject: string;
  content: string;
  status: string;
  site_name: string;
  site_id: string;
  created_at: string;
  reply_count: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  unread: { label: 'Okunmamış', color: 'bg-blue-100 text-blue-700' },
  read: { label: 'Okundu', color: 'bg-slate-100 text-slate-600' },
  replied: { label: 'Yanıtlandı', color: 'bg-green-100 text-green-700' },
  archived: { label: 'Arşivlendi', color: 'bg-amber-100 text-amber-700' },
};

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const siteId = searchParams.get('site') || '';
  const status = searchParams.get('status') || '';

  const fetchMessages = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (siteId) params.set('site_id', siteId);
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    fetch(`/api/messages?${params}`)
      .then((r) => r.json())
      .then((data) => { setMessages(data.messages); setLoading(false); });
  }, [siteId, status, search]);

  useEffect(() => {
    fetch('/api/sites').then((r) => r.json()).then(setSites);
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  function updateFilter(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value); else p.delete(key);
    router.push(`/messages?${p}`);
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Mesajlar</h2>
        <p className="text-slate-500 mt-1">{messages.length} mesaj listeleniyor</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-100 mb-4 sm:mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Mesajlarda ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchMessages()}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={siteId}
          onChange={(e) => updateFilter('site', e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tüm Siteler</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => updateFilter('status', e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tüm Durumlar</option>
          <option value="unread">Okunmamış</option>
          <option value="read">Okundu</option>
          <option value="replied">Yanıtlandı</option>
          <option value="archived">Arşivlendi</option>
        </select>
        <button
          onClick={fetchMessages}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          Ara
        </button>
      </div>

      {/* Message List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Yükleniyor...</div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-4xl mb-3">📭</p>
            <p>Mesaj bulunamadı.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {messages.map((msg) => {
              const s = STATUS_LABELS[msg.status] || STATUS_LABELS.read;
              return (
                <Link
                  key={msg.id}
                  href={`/messages/${msg.id}`}
                  className={`flex items-start gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-slate-50 active:bg-slate-100 transition-colors ${msg.status === 'unread' ? 'bg-blue-50/40' : ''}`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {(msg.sender_name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold text-sm ${msg.status === 'unread' ? 'text-slate-900' : 'text-slate-700'}`}>
                        {msg.sender_name || 'Anonim'}
                      </span>
                      {msg.sender_email && (
                        <span className="text-slate-400 text-xs">&lt;{msg.sender_email}&gt;</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
                      {msg.reply_count > 0 && (
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{msg.reply_count} yanıt</span>
                      )}
                    </div>
                    <p className={`text-sm truncate mt-0.5 ${msg.status === 'unread' ? 'text-slate-800 font-medium' : 'text-slate-600'}`}>
                      {msg.subject || msg.content}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{msg.site_name}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(msg.created_at).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Yükleniyor...</div>}>
      <MessagesContent />
    </Suspense>
  );
}
