'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Visitor {
  id: string;
  site_id: string;
  site_name: string;
  site_domain: string;
  session_id: string;
  ip_address: string | null;
  country_code: string | null;
  current_page: string | null;
  referrer: string | null;
  device_type: string | null;
  browser: string | null;
  visitor_name: string | null;
  first_seen: string;
  last_seen: string;
  page_history: string | null;
  conversation_id: string | null;
}

const COUNTRY_NAMES: Record<string, string> = {
  TR: 'Türkiye', US: 'ABD', GB: 'İngiltere', DE: 'Almanya', FR: 'Fransa',
  IT: 'İtalya', ES: 'İspanya', NL: 'Hollanda', BE: 'Belçika', CH: 'İsviçre',
  AT: 'Avusturya', PT: 'Portekiz', PL: 'Polonya', SE: 'İsveç', NO: 'Norveç',
  DK: 'Danimarka', FI: 'Finlandiya', RU: 'Rusya', UA: 'Ukrayna', GR: 'Yunanistan',
  AE: 'BAE', SA: 'S. Arabistan', KW: 'Kuveyt', QA: 'Katar', OM: 'Umman',
  BH: 'Bahreyn', EG: 'Mısır', MA: 'Fas', DZ: 'Cezayir', IQ: 'Irak',
  JO: 'Ürdün', LB: 'Lübnan', IR: 'İran', CN: 'Çin', JP: 'Japonya',
  KR: 'G. Kore', IN: 'Hindistan', SG: 'Singapur', MY: 'Malezya',
  BR: 'Brezilya', MX: 'Meksika', AR: 'Arjantin', AU: 'Avustralya',
  NZ: 'Yeni Zelanda', ZA: 'G. Afrika', CA: 'Kanada', RO: 'Romanya',
  HU: 'Macaristan', CZ: 'Çekya', HR: 'Hırvatistan',
};

function countryFlag(code: string | null) {
  if (!code) return '🌍';
  return code.toUpperCase().split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr.replace(' ', 'T') + 'Z').getTime()) / 1000);
  if (diff < 10) return 'az önce';
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}dk`;
  return `${Math.floor(diff / 3600)}sa`;
}

function sessionDuration(firstSeen: string) {
  const diff = Math.floor((Date.now() - new Date(firstSeen.replace(' ', 'T') + 'Z').getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}dk`;
  return `${Math.floor(diff / 3600)}sa ${Math.floor((diff % 3600) / 60)}dk`;
}

function shortUrl(url: string | null, domain = false) {
  if (!url) return '—';
  try {
    const u = new URL(url);
    return domain ? u.hostname : (u.pathname + (u.search || '')) || '/';
  } catch {
    return url.length > 40 ? url.slice(0, 40) + '…' : url;
  }
}

function maskIp(ip: string | null) {
  if (!ip) return '—';
  const parts = ip.split('.');
  if (parts.length === 4) return parts.slice(0, 3).join('.') + '.***';
  return ip;
}

function deviceIcon(type: string | null) {
  if (type === 'mobile') return '📱';
  if (type === 'tablet') return '📟';
  return '🖥️';
}

export default function VisitorsPage() {
  const router = useRouter();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterSite, setFilterSite] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [proactiveModal, setProactiveModal] = useState<Visitor | null>(null);
  const [proactiveMsg, setProactiveMsg] = useState('');
  const [sendingProactive, setSendingProactive] = useState(false);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const prevCountRef = useRef(0);
  const prevIdsRef = useRef<Set<string>>(new Set());

  function load() {
    fetch('/api/visitors')
      .then(r => r.json())
      .then(data => {
        const list: Visitor[] = data.visitors || [];

        // Browser bildirim - yeni ziyaretçi
        const newIds = new Set(list.map((v: Visitor) => v.id));
        if (prevCountRef.current > 0 && notifyEnabled) {
          list.forEach((v: Visitor) => {
            if (!prevIdsRef.current.has(v.id) && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('Yeni Ziyaretçi! 👁️', {
                body: `${v.site_name} → ${shortUrl(v.current_page)}`,
                icon: '/favicon.ico',
              });
            }
          });
        }
        prevIdsRef.current = newIds;
        prevCountRef.current = list.length;

        setVisitors(list);
        setLastUpdate(new Date());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifyEnabled]);

  async function toggleNotifications() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission();
      setNotifyEnabled(perm === 'granted');
    } else if (Notification.permission === 'granted') {
      setNotifyEnabled(v => !v);
    }
  }

  async function sendProactive() {
    if (!proactiveModal || !proactiveMsg.trim()) return;
    setSendingProactive(true);
    const res = await fetch('/api/proactive-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: proactiveModal.session_id, siteId: proactiveModal.site_id, message: proactiveMsg.trim() }),
    });
    const data = await res.json();
    setSendingProactive(false);
    setProactiveModal(null);
    setProactiveMsg('');
    if (data.conversationId) router.push(`/conversations/${data.conversationId}`);
  }

  // Filtrele
  const sites = Array.from(new Set(visitors.map(v => v.site_name)));
  const countries = Array.from(new Set(visitors.map(v => v.country_code).filter(Boolean)));
  const filtered = visitors.filter(v => {
    if (filterSite && v.site_name !== filterSite) return false;
    if (filterCountry && v.country_code !== filterCountry) return false;
    return true;
  });

  return (
    <div className="p-6">
      {/* Başlık */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Anlık Ziyaretçiler</h1>
          <p className="text-slate-500 text-sm mt-0.5">Son 3 dakikada aktif · 10sn güncelleme</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleNotifications}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${notifyEnabled ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
            title="Yeni ziyaretçi bildirimi"
          >
            🔔 {notifyEnabled ? 'Bildirim Açık' : 'Bildirim'}
          </button>
          <span className="bg-green-100 text-green-700 text-sm font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-500 rounded-full inline-block animate-pulse" />
            {filtered.length} aktif
          </span>
          <span className="text-slate-400 text-xs">{lastUpdate.toLocaleTimeString('tr-TR')}</span>
        </div>
      </div>

      {/* Filtreler */}
      <div className="flex gap-3 mb-5">
        <select
          value={filterSite}
          onChange={e => setFilterSite(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white outline-none focus:border-blue-400"
        >
          <option value="">Tüm siteler</option>
          {sites.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterCountry}
          onChange={e => setFilterCountry(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white outline-none focus:border-blue-400"
        >
          <option value="">Tüm ülkeler</option>
          {countries.map(c => <option key={c!} value={c!}>{countryFlag(c)} {COUNTRY_NAMES[c!] || c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">Yükleniyor...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <div className="text-5xl mb-4">👁️</div>
          <p className="text-slate-500 font-medium">Şu an aktif ziyaretçi yok</p>
          <p className="text-slate-400 text-sm mt-1">Widget yüklü bir site ziyaret edildiğinde buraya yansıyacak</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-medium text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Cihaz</th>
                <th className="text-left px-4 py-3">Ülke</th>
                <th className="text-left px-4 py-3">IP</th>
                <th className="text-left px-4 py-3">Sayfa</th>
                <th className="text-left px-4 py-3">Kaynak</th>
                <th className="text-left px-4 py-3">Ziyaretçi</th>
                <th className="text-left px-4 py-3">Süre</th>
                <th className="text-left px-4 py-3">Görüldü</th>
                <th className="text-left px-4 py-3">Eylem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => {
                const isExpanded = expandedId === v.id;
                let history: { page: string; time: string }[] = [];
                try { history = JSON.parse(v.page_history || '[]'); } catch {}

                return (
                  <>
                    <tr
                      key={v.id}
                      onClick={() => setExpandedId(isExpanded ? null : v.id)}
                      className="border-b border-slate-50 hover:bg-blue-50/40 transition-colors cursor-pointer"
                    >
                      {/* Cihaz + Tarayıcı */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span title={`${v.device_type || 'desktop'} · ${v.browser || ''}`}>
                          {deviceIcon(v.device_type)} <span className="text-slate-400 text-xs">{v.browser || ''}</span>
                        </span>
                      </td>
                      {/* Ülke */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-lg mr-1">{countryFlag(v.country_code)}</span>
                        <span className="text-slate-700 text-xs">{v.country_code ? (COUNTRY_NAMES[v.country_code] || v.country_code) : '—'}</span>
                      </td>
                      {/* IP */}
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{maskIp(v.ip_address)}</td>
                      {/* Sayfa */}
                      <td className="px-4 py-3 max-w-[180px]">
                        <span className="truncate block text-slate-700 text-xs" title={v.current_page || ''}>{shortUrl(v.current_page)}</span>
                        {history.length > 0 && (
                          <span className="text-blue-400 text-xs">{history.length} sayfa gezdi</span>
                        )}
                      </td>
                      {/* Kaynak */}
                      <td className="px-4 py-3 max-w-[130px]">
                        {v.referrer ? (
                          <span className="text-slate-500 text-xs truncate block" title={v.referrer}>
                            🔗 {shortUrl(v.referrer, true)}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">Direkt</span>
                        )}
                      </td>
                      {/* Ziyaretçi */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {v.visitor_name ? (
                            <span className="text-slate-700 font-medium text-xs">{v.visitor_name}</span>
                          ) : (
                            <span className="text-slate-400 text-xs">Anonim</span>
                          )}
                          {v.conversation_id && (
                            <Link
                              href={`/conversations/${v.conversation_id}`}
                              onClick={e => e.stopPropagation()}
                              className="text-blue-500 hover:text-blue-700"
                              title="Konuşmaya git"
                            >
                              💬
                            </Link>
                          )}
                        </div>
                        <span className="text-slate-400 text-xs">{v.site_name}</span>
                      </td>
                      {/* Süre */}
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        ⏱ {sessionDuration(v.first_seen || v.last_seen)}
                      </td>
                      {/* Son görülme */}
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {timeAgo(v.last_seen)}
                      </td>
                      {/* Eylem */}
                      <td className="px-4 py-3">
                        <button
                          onClick={e => { e.stopPropagation(); setProactiveModal(v); setProactiveMsg(''); }}
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                        >
                          ✉️ Mesaj Gönder
                        </button>
                      </td>
                    </tr>

                    {/* Sayfa geçmişi - genişletilmiş */}
                    {isExpanded && history.length > 0 && (
                      <tr key={v.id + '-history'} className="bg-blue-50/30 border-b border-slate-100">
                        <td colSpan={9} className="px-6 py-3">
                          <p className="text-xs font-semibold text-slate-500 mb-2">📍 Sayfa Geçmişi</p>
                          <div className="flex flex-wrap gap-2">
                            {history.map((h, i) => (
                              <div key={i} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
                                <span className="text-slate-400">{i + 1}.</span>
                                <span className="text-slate-700 font-medium">{shortUrl(h.page)}</span>
                                <span className="text-slate-400">{timeAgo(h.time)}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Proaktif mesaj modalı */}
      {proactiveModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setProactiveModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Ziyaretçiye Mesaj Gönder</h3>
            <p className="text-slate-500 text-sm mb-4">
              {proactiveModal.visitor_name ? `${proactiveModal.visitor_name} · ` : 'Anonim · '}
              {shortUrl(proactiveModal.current_page)}
            </p>
            <textarea
              autoFocus
              rows={4}
              value={proactiveMsg}
              onChange={e => setProactiveMsg(e.target.value)}
              placeholder="Merhaba! Size nasıl yardımcı olabilirim?"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendProactive(); }}
            />
            <p className="text-xs text-slate-400 mt-1 mb-4">Ctrl+Enter ile gönder · Mesaj chat widget&apos;ında açılacak</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setProactiveModal(null)} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors">
                İptal
              </button>
              <button
                onClick={sendProactive}
                disabled={!proactiveMsg.trim() || sendingProactive}
                className="px-5 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-40"
              >
                {sendingProactive ? 'Gönderiliyor…' : 'Gönder & Konuşmaya Git →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
