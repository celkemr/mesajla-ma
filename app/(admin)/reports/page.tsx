'use client';
import { useEffect, useState } from 'react';

interface Funnel {
  gun: number;
  ziyaretci: number;
  widgetAcildi: number;
  formDolduruldu: number;
  mesajYazdi: number;
  lead: number;
  musteriOldu: number;
}

interface Source { kaynak: string; ziyaretci: number; lead: number }
interface Site { id: string; name: string }

const ADIMLAR: { key: keyof Funnel; label: string; renk: string }[] = [
  { key: 'ziyaretci',      label: 'Siteyi ziyaret etti',   renk: '#6366f1' },
  { key: 'widgetAcildi',   label: 'Widget açıldı',          renk: '#7c6cf1' },
  { key: 'formDolduruldu', label: 'Formu doldurdu',         renk: '#8b5cf6' },
  { key: 'mesajYazdi',     label: 'Mesaj yazdı',            renk: '#a855f7' },
  { key: 'lead',           label: 'Müşteri adayı oldu',     renk: '#c026d3' },
  { key: 'musteriOldu',    label: 'Müşteri oldu',           renk: '#10b981' },
];

// Referrer'ı okunur kaynak adına indirger: https://www.google.com/x -> google.com
function kaynakAdi(ham: string): string {
  if (!ham || ham === '(doğrudan)') return 'Doğrudan / bilinmiyor';
  try {
    return new URL(ham).hostname.replace(/^www\./, '');
  } catch {
    return ham.slice(0, 40);
  }
}

export default function ReportsPage() {
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [siteId, setSiteId] = useState('');
  const [days, setDays] = useState(30);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    fetch('/api/sites').then(r => r.json()).then(d => setSites(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  useEffect(() => {
    setYukleniyor(true);
    const p = new URLSearchParams({ days: String(days) });
    if (siteId) p.set('siteId', siteId);
    fetch(`/api/reports?${p}`)
      .then(r => r.json())
      .then(d => { setFunnel(d.funnel); setSources(d.sources || []); })
      .catch(() => {})
      .finally(() => setYukleniyor(false));
  }, [siteId, days]);

  const tepe = funnel?.ziyaretci || 0;
  const enCokZiyaretci = Math.max(...sources.map(s => Number(s.ziyaretci)), 1);

  return (
    <div>
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 md:px-8 py-4 sm:py-5">
        <h1 className="text-[17px] font-semibold text-slate-900">Raporlar</h1>
        <p className="text-sm text-slate-400 mt-0.5">Dönüşüm hunisi ve trafik kaynakları</p>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {/* Filtreler */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-wrap gap-3">
          <select
            value={siteId}
            onChange={e => setSiteId(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Tüm Siteler</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
            {[7, 30, 90].map(g => (
              <button
                key={g}
                onClick={() => setDays(g)}
                className={`px-3 py-2 transition-colors ${days === g ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {g}G
              </button>
            ))}
          </div>
        </div>

        {/* Huni */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <p className="text-sm font-semibold text-slate-800 mb-4">Dönüşüm Hunisi</p>
          {funnel && funnel.lead > funnel.ziyaretci && (
            <div className="mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Alt basamaklar üst basamaklardan büyük görünüyor. Ziyaretçi geçmişi
              16 Ağustos 2026&apos;da saklanmaya başladı; konuşma ve müşteri adayı kayıtları ise
              daha eskiye gidiyor. Huni birkaç gün sonra tutarlı hale gelecek.
            </div>
          )}
          {yukleniyor || !funnel ? (
            <p className="text-slate-400 text-sm">Yükleniyor…</p>
          ) : tepe === 0 ? (
            <p className="text-slate-400 text-sm">Bu aralıkta ziyaretçi verisi yok.</p>
          ) : (
            <div className="space-y-3">
              {ADIMLAR.map((adim, i) => {
                const deger = Number(funnel[adim.key]) || 0;
                const oran = tepe > 0 ? (deger / tepe) * 100 : 0;
                const oncekiDeger = i === 0 ? deger : Number(funnel[ADIMLAR[i - 1].key]) || 0;
                const adimOrani = oncekiDeger > 0 ? (deger / oncekiDeger) * 100 : 0;
                return (
                  <div key={adim.key}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-700">{adim.label}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{deger}</span>
                        {i > 0 && (
                          adimOrani > 100 ? (
                            <span
                              title="Bu adım bir öncekinden büyük görünüyor. Ziyaretçi geçmişi 16 Ağustos 2026'da başladığı için hunini üst basamakları eksik; oran hesaplanamıyor."
                              className="text-[11px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-400"
                            >
                              oran yok
                            </span>
                          ) : (
                            <span className={`text-[11px] px-1.5 py-0.5 rounded-md ${adimOrani < 20 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                              önceki adımın %{adimOrani.toFixed(0)}&apos;i
                            </span>
                          )
                        )}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(oran, deger > 0 ? 2 : 0))}%`, background: adim.renk }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Trafik kaynakları */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800">Trafik Kaynakları</p>
            <p className="text-xs text-slate-400 mt-0.5">Hangi kaynak ziyaretçi getiriyor ve kaçı müşteri adayına dönüyor</p>
          </div>
          {yukleniyor ? (
            <p className="p-5 text-slate-400 text-sm">Yükleniyor…</p>
          ) : sources.length === 0 ? (
            <p className="p-5 text-slate-400 text-sm">Bu aralıkta kaynak verisi yok.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr style={{ background: 'linear-gradient(90deg,#f8f9ff,#f3f4f8)' }}>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">KAYNAK</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500">ZİYARETÇİ</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500">ADAY</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500">DÖNÜŞÜM</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map(s => {
                    const z = Number(s.ziyaretci) || 0;
                    const l = Number(s.lead) || 0;
                    const oran = z > 0 ? (l / z) * 100 : 0;
                    return (
                      <tr key={s.kaynak} className="border-b border-slate-50 last:border-0 hover:bg-indigo-50/30">
                        <td className="px-5 py-3">
                          <div className="text-slate-800">{kaynakAdi(s.kaynak)}</div>
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1.5 max-w-[180px]">
                            <div className="h-full rounded-full" style={{ width: `${(z / enCokZiyaretci) * 100}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right text-slate-700">{z}</td>
                        <td className="px-5 py-3 text-right font-medium text-slate-900">{l}</td>
                        <td className="px-5 py-3 text-right">
                          <span className={`text-xs px-1.5 py-0.5 rounded-md ${oran > 0 ? 'bg-green-50 text-green-700' : 'text-slate-400'}`}>
                            %{oran.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-400 px-1">
          Ziyaretçi geçmişi 16 Ağustos 2026&apos;dan itibaren saklanıyor; öncesine ait veri bulunmuyor.
        </p>
      </div>
    </div>
  );
}
