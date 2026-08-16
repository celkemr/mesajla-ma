'use client';
import { parseDbDate } from '@/lib/date';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useDialog } from '../components/useDialog';

interface Lead {
  id: string;
  site_id: string;
  conversation_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  site_name: string;
  message_count?: number;
}

interface Site { id: string; name: string; }

const STATUS: Record<string, { label: string; color: string; dot: string }> = {
  new:        { label: 'Yeni',               color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500'   },
  contacted:  { label: 'İletişime Geçildi',  color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  qualified:  { label: 'Nitelikli',          color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  converted:  { label: 'Müşteri Oldu',       color: 'bg-green-100 text-green-700',  dot: 'bg-green-500'  },
  lost:       { label: 'Kaybedildi',         color: 'bg-slate-100 text-slate-500',  dot: 'bg-slate-400'  },
};

// wa.me bağlantısı: ücretsiz, API gerektirmez. Numarayı uluslararası biçime
// indirger (yalnızca rakam), operatör mesajı kendi WhatsApp'ından gönderir.
function waLink(phone: string, name?: string | null): string {
  const numara = phone.replace(/\D/g, '');
  const selam = name ? `Merhaba ${name},` : 'Merhaba,';
  return `https://wa.me/${numara}?text=${encodeURIComponent(selam)}`;
}

export default function CustomersPage() {
  const { confirm, dialog } = useDialog();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [followUp, setFollowUp] = useState(false);
  const [search, setSearch] = useState('');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');

  function load() {
    const p = new URLSearchParams();
    if (statusFilter) p.set('status', statusFilter);
    if (siteFilter) p.set('site_id', siteFilter);
    if (followUp) p.set('follow_up', '1');
    fetch('/api/leads?' + p).then(r => r.json()).then(setLeads);
  }

  useEffect(() => { fetch('/api/sites').then(r => r.json()).then(setSites); }, []);
  useEffect(load, [statusFilter, siteFilter, followUp]);

  async function changeStatus(id: string, status: string) {
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function saveNotes(id: string) {
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: notesText }),
    });
    setEditingNotes(null);
    load();
  }

  async function deleteLead(id: string) {
    if (!(await confirm('Bu müşteriyi silmek istediğinize emin misiniz?'))) return;
    await fetch(`/api/leads/${id}`, { method: 'DELETE' });
    load();
  }

  const filtered = leads.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (l.name || '').toLowerCase().includes(q) ||
      (l.email || '').toLowerCase().includes(q) ||
      (l.phone || '').toLowerCase().includes(q);
  });

  const counts = Object.keys(STATUS).reduce((acc, k) => {
    acc[k] = leads.filter(l => l.status === k).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      {dialog}
      {/* Header */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 md:px-8 py-4 sm:py-5">
        <h1 className="text-[17px] font-semibold text-slate-900">Müşteriler</h1>
        <p className="text-sm text-slate-400 mt-0.5">Widget üzerinden oluşan lead&apos;ler</p>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {Object.entries(STATUS).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setStatusFilter(statusFilter === k ? '' : k)}
            className={`rounded-2xl p-4 border text-left transition-all ${statusFilter === k ? 'border-indigo-400 ring-2 ring-indigo-100 shadow-sm' : 'border-slate-200/80 hover:border-slate-300'} bg-white shadow-sm`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${v.dot}`} />
              <span className="text-xs text-slate-400 font-medium">{v.label}</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{counts[k] || 0}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="İsim, e-posta veya telefon ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <select
          value={siteFilter}
          onChange={e => setSiteFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-600"
        >
          <option value="">Tüm Siteler</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-600"
        >
          <option value="">Tüm Durumlar</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button
          onClick={() => setFollowUp(v => !v)}
          title="Formu doldurup hiç mesaj yazmadan çıkanlar"
          className={`rounded-lg px-3 py-2 text-sm border transition-colors whitespace-nowrap ${
            followUp
              ? 'bg-amber-500 border-amber-500 text-white'
              : 'bg-white border-amber-200 text-amber-700 hover:bg-amber-50'
          }`}
        >
          ⚡ Takip Gerekli
        </button>
      </div>

      {/* Leads table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.08)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#6366f1" className="w-7 h-7"><path d="M4.5 6.375a4.125 4.125 0 1 1 8.25 0 4.125 4.125 0 0 1-8.25 0ZM14.25 8.625a3.375 3.375 0 1 1 6.75 0 3.375 3.375 0 0 1-6.75 0ZM1.5 19.125a7.125 7.125 0 0 1 14.25 0v.003l-.001.119a.75.75 0 0 1-.363.63 13.067 13.067 0 0 1-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 0 1-.364-.63l-.001-.122ZM17.25 19.128l-.001.144a2.25 2.25 0 0 1-.233.96 10.088 10.088 0 0 0 5.06-1.01.75.75 0 0 0 .42-.643 4.875 4.875 0 0 0-6.957-4.611 8.586 8.586 0 0 1 1.71 5.157v.003Z" /></svg>
            </div>
            <p className="text-slate-600 font-medium text-sm">Henüz müşteri yok</p>
            <p className="text-slate-400 text-xs mt-1">Widget&apos;ınızdaki ön sohbet formunu dolduran ziyaretçiler burada görünür.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr style={{ background: 'linear-gradient(90deg,#f8f9ff,#f3f4f8)' }}>
                <th className="text-left px-4 sm:px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Müşteri</th>
                <th className="text-left px-4 sm:px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Site</th>
                <th className="text-left px-4 sm:px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Durum</th>
                <th className="text-left px-4 sm:px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Notlar</th>
                <th className="text-left px-4 sm:px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Tarih</th>
                <th className="px-4 sm:px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => {
                const st = STATUS[lead.status] || STATUS.new;
                const initials = (lead.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
                return (
                  <tr key={lead.id} className="border-b border-slate-50 last:border-0 hover:bg-indigo-50/30 active:bg-indigo-50/50 transition-colors">
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">{lead.name || 'Anonim'}</span>
                            {lead.message_count === 0 && lead.status === 'new' && (
                              <span
                                title="Formu doldurdu ama hiç mesaj yazmadı — geri dönülmeli"
                                className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 whitespace-nowrap"
                              >
                                ⚡ yazmadı
                              </span>
                            )}
                          </div>
                          {lead.email && (
                            <div className="text-slate-400 text-xs">
                              <a href={`mailto:${lead.email}`} className="hover:text-indigo-600 transition-colors">✉️ {lead.email}</a>
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-2 text-xs">
                              <a href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`} className="text-slate-400 hover:text-indigo-600 transition-colors">📞 {lead.phone}</a>
                              <a
                                href={waLink(lead.phone, lead.name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="WhatsApp'tan yaz"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 transition-colors font-medium"
                              >
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 016.99 2.898 9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.488"/></svg>
                                WhatsApp
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-slate-500 hidden sm:table-cell">
                      <div>{lead.site_name}</div>
                      {lead.conversation_id && (
                        <Link href={`/conversations/${lead.conversation_id}`} className="text-xs text-blue-500 hover:underline">
                          Konuşmayı gör →
                        </Link>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <select
                        value={lead.status}
                        onChange={e => changeStatus(lead.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300 ${st.color}`}
                      >
                        {Object.entries(STATUS).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 max-w-xs hidden md:table-cell">
                      {editingNotes === lead.id ? (
                        <div className="flex gap-1">
                          <textarea
                            value={notesText}
                            onChange={e => setNotesText(e.target.value)}
                            rows={2}
                            className="flex-1 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                            placeholder="Not ekle..."
                          />
                          <div className="flex flex-col gap-1">
                            <button onClick={() => saveNotes(lead.id)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">✓</button>
                            <button onClick={() => setEditingNotes(null)} className="text-xs border border-slate-200 text-slate-500 px-2 py-1 rounded hover:bg-slate-50">✕</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingNotes(lead.id); setNotesText(lead.notes || ''); }}
                          className="text-left text-xs text-slate-500 hover:text-blue-600 transition-colors w-full"
                        >
                          {lead.notes ? (
                            <span className="line-clamp-2">{lead.notes}</span>
                          ) : (
                            <span className="text-slate-300 italic">+ Not ekle</span>
                          )}
                        </button>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-slate-400 text-xs whitespace-nowrap hidden lg:table-cell">
                      {parseDbDate(lead.created_at).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-right">
                      <button
                        onClick={() => deleteLead(lead.id)}
                        className="text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 active:bg-red-100 transition-colors"
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
