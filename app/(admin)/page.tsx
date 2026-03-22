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

interface VisitorStats {
  todayCount: number;
  topCountries: { country_code: string; count: number }[];
  hourlyData: { hour: number; count: number }[];
}

const COUNTRY_NAMES: Record<string, string> = {
  TR: 'Türkiye', US: 'ABD', GB: 'İngiltere', DE: 'Almanya', FR: 'Fransa',
  IT: 'İtalya', ES: 'İspanya', NL: 'Hollanda', AE: 'BAE', SA: 'S. Arabistan',
  RU: 'Rusya', CN: 'Çin', IN: 'Hindistan', BR: 'Brezilya', AU: 'Avustralya',
};

function countryFlag(code: string) {
  return code.toUpperCase().split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Message[]>([]);
  const [visitorStats, setVisitorStats] = useState<VisitorStats | null>(null);

  useEffect(() => {
    fetch('/api/messages?status=')
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setRecent(data.messages.slice(0, 5));
      });

    fetch('/api/visitor-stats')
      .then(r => r.json())
      .then(setVisitorStats)
      .catch(() => {});
  }, []);

  const statCards = stats
    ? [
        { label: 'Toplam Mesaj', value: stats.total, color: 'bg-blue-500', icon: '💬' },
        { label: 'Okunmamış', value: stats.unread, color: 'bg-amber-500', icon: '🔔' },
        { label: 'Yanıtlanan', value: stats.replied, color: 'bg-green-500', icon: '✅' },
        { label: 'Aktif Site', value: stats.sites, color: 'bg-purple-500', icon: '🌐' },
      ]
    : [];

  const maxHourly = visitorStats ? Math.max(...visitorStats.hourlyData.map(h => h.count), 1) : 1;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Gösterge Paneli</h2>
        <p className="text-slate-500 mt-1">Tüm sitelerinizden gelen mesajlar</p>
      </div>

      {/* Stat kartları */}
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

      {/* Ziyaretçi istatistikleri */}
      {visitorStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Bugünkü ziyaretçiler */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700">Bugünkü Ziyaretçiler</h3>
              <Link href="/visitors" className="text-blue-500 text-xs hover:underline">Canlı →</Link>
            </div>
            <p className="text-4xl font-bold text-slate-800">{visitorStats.todayCount}</p>
            <p className="text-slate-500 text-sm mt-1">tekil ziyaretçi</p>
          </div>

          {/* Top ülkeler */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-700 mb-4">En Çok Gelen Ülkeler</h3>
            {visitorStats.topCountries.length === 0 ? (
              <p className="text-slate-400 text-sm">Henüz veri yok</p>
            ) : (
              <div className="space-y-2">
                {visitorStats.topCountries.map((c, i) => {
                  const maxCount = visitorStats.topCountries[0]?.count || 1;
                  return (
                    <div key={c.country_code} className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-3">{i + 1}</span>
                      <span>{countryFlag(c.country_code)}</span>
                      <span className="text-sm text-slate-700 flex-1">{COUNTRY_NAMES[c.country_code] || c.country_code}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 bg-blue-200 rounded-full w-16 overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(c.count / maxCount) * 100}%` }} />
                        </div>
                        <span className="text-xs text-slate-400 w-4 text-right">{c.count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Saatlik trafik */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-700 mb-4">Son 24 Saat Trafiği</h3>
            {visitorStats.hourlyData.length === 0 ? (
              <p className="text-slate-400 text-sm">Henüz veri yok</p>
            ) : (
              <div className="flex items-end gap-0.5 h-16">
                {Array.from({ length: 24 }, (_, h) => {
                  const found = visitorStats.hourlyData.find(d => Number(d.hour) === h);
                  const count = found ? Number(found.count) : 0;
                  const height = maxHourly > 0 ? (count / maxHourly) * 100 : 0;
                  return (
                    <div key={h} className="flex-1 flex flex-col items-center justify-end" title={`${h}:00 — ${count} ziyaretçi`}>
                      <div
                        className="w-full bg-blue-500 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity"
                        style={{ height: `${Math.max(height, count > 0 ? 8 : 0)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>00:00</span>
              <span>12:00</span>
              <span>23:00</span>
            </div>
          </div>
        </div>
      )}

      {/* Son Mesajlar */}
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
                    {msg.status === 'unread' && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
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
