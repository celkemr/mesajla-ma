'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats {
  total: number;
  unread: number;
  replied: number;
  sites: number;
}

interface Message {
  id: string;
  sender_name: string;
  sender_email: string;
  subject: string;
  content: string;
  status: string;
  site_name: string;
  site_domain: string;
  created_at: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Message[]>([]);

  useEffect(() => {
    fetch('/api/messages?status=')
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setRecent(data.messages.slice(0, 5));
      });
  }, []);

  const statCards = stats
    ? [
        { label: 'Toplam Mesaj', value: stats.total, color: 'bg-blue-500', icon: '💬' },
        { label: 'Okunmamış', value: stats.unread, color: 'bg-amber-500', icon: '🔔' },
        { label: 'Yanıtlanan', value: stats.replied, color: 'bg-green-500', icon: '✅' },
        { label: 'Aktif Site', value: stats.sites, color: 'bg-purple-500', icon: '🌐' },
      ]
    : [];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Gösterge Paneli</h2>
        <p className="text-slate-500 mt-1">Tüm sitelerinizden gelen mesajlar</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center text-lg mb-3`}>
              {card.icon}
            </div>
            <p className="text-3xl font-bold text-slate-800">{card.value}</p>
            <p className="text-slate-500 text-sm mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Messages */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Son Mesajlar</h3>
          <Link href="/messages" className="text-blue-600 text-sm hover:underline">Tümünü gör →</Link>
        </div>
        {recent.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-4xl mb-3">📭</p>
            <p>Henüz mesaj yok.</p>
            <p className="text-sm mt-1">Önce bir site ekleyin ve API anahtarını kullanın.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recent.map((msg) => (
              <Link key={msg.id} href={`/messages/${msg.id}`} className="flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-600 shrink-0">
                  {(msg.sender_name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800 text-sm">{msg.sender_name || 'Anonim'}</span>
                    {msg.status === 'unread' && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                  </div>
                  <p className="text-slate-600 text-sm truncate">{msg.subject || msg.content}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{msg.site_name}</span>
                    <span className="text-xs text-slate-400">{new Date(msg.created_at).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
