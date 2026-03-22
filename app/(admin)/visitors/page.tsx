'use client';
import { useEffect, useState } from 'react';

interface Visitor {
  id: string;
  site_name: string;
  site_domain: string;
  session_id: string;
  ip_address: string | null;
  country_code: string | null;
  current_page: string | null;
  visitor_name: string | null;
  last_seen: string;
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
  HU: 'Macaristan', CZ: 'Çekya', SK: 'Slovakya', HR: 'Hırvatistan',
};

function countryFlag(code: string | null) {
  if (!code) return '🌍';
  return code.toUpperCase().split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr.replace(' ', 'T') + 'Z').getTime()) / 1000);
  if (diff < 10) return 'az önce';
  if (diff < 60) return `${diff}s önce`;
  if (diff < 3600) return `${Math.floor(diff / 60)}dk önce`;
  return `${Math.floor(diff / 3600)}sa önce`;
}

function shortPage(url: string | null) {
  if (!url) return '—';
  try {
    const u = new URL(url);
    return u.pathname + (u.search || '');
  } catch {
    return url;
  }
}

function maskIp(ip: string | null) {
  if (!ip) return '—';
  // Son oktet maskele
  const parts = ip.split('.');
  if (parts.length === 4) return parts.slice(0, 3).join('.') + '.***';
  return ip;
}

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  function load() {
    fetch('/api/visitors')
      .then(r => r.json())
      .then(data => {
        setVisitors(data.visitors || []);
        setLastUpdate(new Date());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="p-6">
      {/* Başlık */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Anlık Ziyaretçiler</h1>
          <p className="text-slate-500 text-sm mt-1">Son 3 dakikada aktif olan ziyaretçiler · 10 saniyede bir güncellenir</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-green-100 text-green-700 text-sm font-semibold px-3 py-1.5 rounded-full flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full inline-block animate-pulse"></span>
            {visitors.length} aktif
          </span>
          <span className="text-slate-400 text-xs">
            {lastUpdate.toLocaleTimeString('tr-TR')}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">Yükleniyor...</div>
      ) : visitors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <div className="text-5xl mb-4">👁️</div>
          <p className="text-slate-500 font-medium">Şu an aktif ziyaretçi yok</p>
          <p className="text-slate-400 text-sm mt-1">Bir site ziyaret edildiğinde buraya yansıyacak</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Ülke</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">IP Adresi</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Sayfa</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Ziyaretçi</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Site</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Son Görülme</th>
              </tr>
            </thead>
            <tbody>
              {visitors.map((v, i) => (
                <tr key={v.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{countryFlag(v.country_code)}</span>
                      <span className="text-slate-700">
                        {v.country_code ? (COUNTRY_NAMES[v.country_code] || v.country_code) : 'Bilinmiyor'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-500 font-mono text-xs">
                    {maskIp(v.ip_address)}
                  </td>
                  <td className="px-5 py-3 max-w-xs">
                    <span className="text-slate-700 truncate block" title={v.current_page || ''}>
                      {shortPage(v.current_page)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {v.visitor_name ? (
                      <span className="text-slate-700 font-medium">{v.visitor_name}</span>
                    ) : (
                      <span className="text-slate-400 text-xs">Anonim</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-medium">
                      {v.site_name}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-xs whitespace-nowrap">
                    {timeAgo(v.last_seen)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
