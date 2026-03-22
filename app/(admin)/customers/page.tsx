'use client';
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
}

interface Site { id: string; name: string; }

const STATUS: Record<string, { label: string; color: string; dot: string }> = {
  new:        { label: 'Yeni',               color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500'   },
  contacted:  { label: 'İletişime Geçildi',  color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  qualified:  { label: 'Nitelikli',          color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  converted:  { label: 'Müşteri Oldu',       color: 'bg-green-100 text-green-700',  dot: 'bg-green-500'  },
  lost:       { label: 'Kaybedildi',         color: 'bg-slate-100 text-slate-500',  dot: 'bg-slate-400'  },
};

export default function CustomersPage() {
  const { confirm, dialog } = useDialog();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [search, setSearch] = useState('');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');

  function load() {
    const p = new URLSearchParams();
    if (statusFilter) p.set('status', statusFilter);
    if (siteFilter) p.set('site_id', siteFilter);
    fetch('/api/leads?' + p).then(r => r.json()).then(setLeads);
  }

  useEffect(() => { fetch('/api/sites').then(r => r.json()).then(setSites); }, []);
  useEffect(load, [statusFilter, siteFilter]);

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
    <div className="p-8">
      {dialog}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Müşteriler</h2>
        <p className="text-slate-500 mt-1">Widget üzerinden oluşan lead'ler</p>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {Object.entries(STATUS).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setStatusFilter(statusFilter === k ? '' : k)}
            className={`rounded-xl p-3 border text-left transition-all ${statusFilter === k ? 'border-blue-400 ring-2 ring-blue-200' : 'border-slate-100 hover:border-slate-200'} bg-white shadow-sm`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${v.dot}`} />
              <span className="text-xs text-slate-500">{v.label}</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{counts[k] || 0}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="İsim, e-posta veya telefon ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={siteFilter}
          onChange={e => setSiteFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tüm Siteler</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tüm Durumlar</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Leads table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-4xl mb-3">👤</p>
            <p>Henüz müşteri yok.</p>
            <p className="text-sm mt-2">Widget&apos;ınızdaki ön sohbet formunu dolduran ziyaretçiler burada görünür.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Müşteri</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Site</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Durum</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Notlar</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Tarih</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => {
                const st = STATUS[lead.status] || STATUS.new;
                const initials = (lead.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
                return (
                  <tr key={lead.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">{lead.name || 'Anonim'}</div>
                          {lead.email && <div className="text-slate-400 text-xs">✉️ {lead.email}</div>}
                          {lead.phone && <div className="text-slate-400 text-xs">📞 {lead.phone}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      <div>{lead.site_name}</div>
                      {lead.conversation_id && (
                        <Link href={`/conversations/${lead.conversation_id}`} className="text-xs text-blue-500 hover:underline">
                          Konuşmayı gör →
                        </Link>
                      )}
                    </td>
                    <td className="px-6 py-4">
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
                    <td className="px-6 py-4 max-w-xs">
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
                    <td className="px-6 py-4 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(lead.created_at).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => deleteLead(lead.id)}
                        className="text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
