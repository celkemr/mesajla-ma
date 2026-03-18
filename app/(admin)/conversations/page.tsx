'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Conversation {
  id: string;
  site_name: string;
  site_domain: string;
  visitor_name: string | null;
  visitor_email: string | null;
  status: string;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
}

export default function ConversationsPage() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [statusFilter, setStatusFilter] = useState('');

  function load() {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    fetch('/api/conversations?' + params).then((r) => r.json()).then(setConvs);
  }
  useEffect(load, [statusFilter]);

  async function closeConv(id: string) {
    await fetch(`/api/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'closed' }),
    });
    load();
  }

  async function deleteConv(id: string) {
    if (!confirm('Bu konuşmayı silmek istediğinize emin misiniz?')) return;
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Konuşmalar</h2>
          <p className="text-slate-500 mt-1">AI chatbot konuşmaları</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tümü</option>
          <option value="active">Aktif</option>
          <option value="closed">Kapalı</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {convs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-4xl mb-3">💬</p>
            <p>Henüz konuşma yok.</p>
            <p className="text-sm mt-2">Widget'ı sitenize ekledikten sonra konuşmalar burada görünür.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Ziyaretçi</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Site</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Mesaj</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Durum</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Tarih</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {convs.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <Link href={`/conversations/${c.id}`} className="hover:text-blue-600">
                      <div className="font-medium text-slate-800">{c.visitor_name || 'Anonim'}</div>
                      {c.visitor_email && <div className="text-slate-400 text-xs">{c.visitor_email}</div>}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{c.site_name}</td>
                  <td className="px-6 py-4 text-slate-500">{c.message_count} mesaj</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {c.status === 'active' ? 'Aktif' : 'Kapalı'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">
                    {new Date(c.created_at).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <Link
                        href={`/conversations/${c.id}`}
                        className="text-xs border border-blue-200 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        Görüntüle
                      </Link>
                      {c.status === 'active' && (
                        <button
                          onClick={() => closeConv(c.id)}
                          className="text-xs border border-slate-200 text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          Kapat
                        </button>
                      )}
                      <button
                        onClick={() => deleteConv(c.id)}
                        className="text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
