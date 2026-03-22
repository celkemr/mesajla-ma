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

const STAT_CARDS = [
  {
    label: 'Toplam Mesaj',
    key: 'total' as keyof Stats,
    gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    bg: 'rgba(99,102,241,0.08)',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5">
        <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 0 0 6 21.75a6.721 6.721 0 0 0 3.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 0 1-.814 1.686.75.75 0 0 0 .44 1.223Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: 'Okunmamış',
    key: 'unread' as keyof Stats,
    gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)',
    bg: 'rgba(245,158,11,0.08)',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5">
        <path d="M5.85 3.5a.75.75 0 0 0-1.117-1 9.719 9.719 0 0 0-2.348 4.876.75.75 0 0 0 1.479.248A8.219 8.219 0 0 1 5.85 3.5ZM19.267 2.5a.75.75 0 1 0-1.118 1 8.22 8.22 0 0 1 1.987 4.124.75.75 0 0 0 1.48-.248A9.72 9.72 0 0 0 19.266 2.5Z" />
        <path fillRule="evenodd" d="M12 2.25A6.75 6.75 0 0 0 5.25 9v.75a8.217 8.217 0 0 1-2.119 5.52.75.75 0 0 0 .298 1.206c1.544.57 3.16.99 4.831 1.243a3.75 3.75 0 1 0 7.48 0 24.583 24.583 0 0 0 4.83-1.244.75.75 0 0 0 .298-1.205 8.217 8.217 0 0 1-2.118-5.52V9A6.75 6.75 0 0 0 12 2.25ZM9.75 18c0-.034 0-.067.002-.1a25.05 25.05 0 0 0 4.496 0l.002.1a2.25 2.25 0 1 1-4.5 0Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: 'Yanıtlanan',
    key: 'replied' as keyof Stats,
    gradient: 'linear-gradient(135deg,#10b981,#059669)',
    bg: 'rgba(16,185,129,0.08)',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5">
        <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 0 1 1.04-.208Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: 'Aktif Site',
    key: 'sites' as keyof Stats,
    gradient: 'linear-gradient(135deg,#3b82f6,#6366f1)',
    bg: 'rgba(59,130,246,0.08)',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5">
        <path d="M21.721 12.752a9.711 9.711 0 0 0-.945-5.003 12.754 12.754 0 0 1-4.339 2.708 18.991 18.991 0 0 1-.214 4.772 17.165 17.165 0 0 0 5.498-2.477ZM14.634 15.55a17.324 17.324 0 0 0 .332-4.647c-.952.227-1.945.347-2.966.347-1.021 0-2.014-.12-2.966-.347a17.515 17.515 0 0 0 .332 4.647 17.385 17.385 0 0 0 5.268 0ZM9.772 17.119a18.963 18.963 0 0 0 4.456 0A17.182 17.182 0 0 1 12 21.724a17.18 17.18 0 0 1-2.228-4.605ZM7.777 15.23a18.87 18.87 0 0 1-.214-4.774 12.753 12.753 0 0 1-4.34-2.708 9.711 9.711 0 0 0-.944 5.004 17.165 17.165 0 0 0 5.498 2.477ZM21.356 14.752a9.765 9.765 0 0 1-7.478 6.817 18.64 18.64 0 0 0 1.988-4.718 18.627 18.627 0 0 0 5.49-2.099ZM2.644 14.752c1.682.971 3.53 1.688 5.49 2.099a18.64 18.64 0 0 0 1.988 4.718 9.765 9.765 0 0 1-7.478-6.816ZM13.878 2.43a9.755 9.755 0 0 1 6.8 4.801 12.753 12.753 0 0 1-4.507 2.332 18.85 18.85 0 0 0-2.293-7.133ZM12 2.276a17.152 17.152 0 0 1 2.805 7.121c-.897.23-1.837.353-2.805.353-.968 0-1.908-.122-2.805-.353A17.151 17.151 0 0 1 12 2.276ZM10.122 2.43a18.851 18.851 0 0 0-2.293 7.133 12.754 12.754 0 0 1-4.507-2.332 9.755 9.755 0 0 1 6.8-4.801Z" />
      </svg>
    ),
  },
];

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
    fetch('/api/visitor-stats').then(r => r.json()).then(setVisitorStats).catch(() => {});
  }, []);

  const maxHourly = visitorStats ? Math.max(...visitorStats.hourlyData.map(h => h.count), 1) : 1;
  const today = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div>
      {/* Page header */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 md:px-8 py-4 sm:py-5 flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-slate-900">Gösterge Paneli</h1>
          <p className="text-sm text-slate-400 mt-0.5">Tüm sitelerinizin özeti</p>
        </div>
        <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2 sm:px-3 py-1.5 rounded-lg capitalize hidden sm:inline">{today}</span>
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {STAT_CARDS.map((card) => (
            <div key={card.label} className="relative overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl" style={{ background: card.gradient }}>
                  {card.icon}
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{stats ? stats[card.key] : '—'}</p>
              <p className="text-sm text-slate-400 mt-1">{card.label}</p>
              <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: card.gradient }} />
            </div>
          ))}
        </div>

        {/* Visitor stats */}
        {visitorStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-slate-600">Bugünkü Ziyaretçiler</p>
                <Link href="/visitors" className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">Canlı →</Link>
              </div>
              <p className="text-4xl font-bold text-slate-900">{visitorStats.todayCount}</p>
              <p className="text-xs text-slate-400 mt-1">tekil ziyaretçi</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
              <p className="text-sm font-medium text-slate-600 mb-3">En Çok Gelen Ülkeler</p>
              {visitorStats.topCountries.length === 0 ? (
                <p className="text-slate-400 text-sm">Henüz veri yok</p>
              ) : (
                <div className="space-y-2.5">
                  {visitorStats.topCountries.map((c, i) => {
                    const maxCount = visitorStats.topCountries[0]?.count || 1;
                    return (
                      <div key={c.country_code} className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 w-3">{i + 1}</span>
                        <span>{countryFlag(c.country_code)}</span>
                        <span className="text-sm text-slate-700 flex-1">{COUNTRY_NAMES[c.country_code] || c.country_code}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 rounded-full w-16 overflow-hidden" style={{ background: 'rgba(99,102,241,0.12)' }}>
                            <div className="h-full rounded-full" style={{ width: `${(c.count / maxCount) * 100}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />
                          </div>
                          <span className="text-xs text-slate-400 w-4 text-right">{c.count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
              <p className="text-sm font-medium text-slate-600 mb-3">Son 24 Saat Trafiği</p>
              {visitorStats.hourlyData.length === 0 ? (
                <p className="text-slate-400 text-sm">Henüz veri yok</p>
              ) : (
                <div className="flex items-end gap-0.5 h-16">
                  {Array.from({ length: 24 }, (_, h) => {
                    const found = visitorStats.hourlyData.find(d => Number(d.hour) === h);
                    const count = found ? Number(found.count) : 0;
                    const pct = maxHourly > 0 ? (count / maxHourly) * 100 : 0;
                    return (
                      <div key={h} className="flex-1 flex flex-col items-center justify-end" title={`${h}:00 — ${count} ziyaretçi`}>
                        <div
                          className="w-full rounded-t-sm transition-opacity hover:opacity-100 opacity-80"
                          style={{ height: `${Math.max(pct, count > 0 ? 8 : 0)}%`, background: 'linear-gradient(180deg,#6366f1,#8b5cf6)' }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
                <span>00:00</span><span>12:00</span><span>23:00</span>
              </div>
            </div>
          </div>
        )}

        {/* Son Mesajlar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800">Son Mesajlar</p>
            <Link href="/messages" className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">Tümünü gör →</Link>
          </div>
          {recent.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.08)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#6366f1" className="w-7 h-7"><path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67Z" /><path d="M22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908Z" /></svg>
              </div>
              <p className="text-slate-500 font-medium text-sm">Henüz mesaj yok</p>
              <p className="text-slate-400 text-xs mt-1">Önce bir site ekleyin ve API anahtarını kullanın.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recent.map((msg) => (
                <Link key={msg.id} href={`/messages/${msg.id}`} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 hover:bg-slate-50/70 active:bg-slate-100 transition-colors group">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                    {(msg.sender_name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{msg.sender_name || 'Anonim'}</span>
                      {msg.status === 'unread' && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />}
                    </div>
                    <p className="text-slate-500 text-xs truncate mt-0.5">{msg.subject || msg.content}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{msg.site_name}</span>
                    <p className="text-[10px] text-slate-400 mt-1">{new Date(msg.created_at).toLocaleDateString('tr-TR')}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
