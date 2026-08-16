'use client';
import { parseDbDate } from '@/lib/date';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useDialog } from '../components/useDialog';

interface Conversation {
  id: string;
  site_name: string;
  site_domain: string;
  visitor_name: string | null;
  visitor_email: string | null;
  visitor_phone: string | null;
  status: string;
  summary: string | null;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
}

export default function ConversationsPage() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const { confirm, dialog } = useDialog();

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
    if (!(await confirm('Bu konuşmayı silmek istediğinize emin misiniz?'))) return;
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      {dialog}
      {/* Header */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 md:px-8 py-4 sm:py-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-semibold text-slate-900">Konuşmalar</h1>
          <p className="text-sm text-slate-400 mt-0.5">AI chatbot konuşmaları</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-600"
        >
          <option value="">Tüm Durumlar</option>
          <option value="active">Aktif</option>
          <option value="closed">Kapalı</option>
        </select>
      </div>

      <div className="p-4 sm:p-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {convs.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.08)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#6366f1" className="w-7 h-7">
                  <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 0 0 6 21.75a6.721 6.721 0 0 0 3.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 0 1-.814 1.686.75.75 0 0 0 .44 1.223Z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-slate-600 font-medium text-sm">Henüz konuşma yok</p>
              <p className="text-slate-400 text-xs mt-1">Widget&apos;ı sitenize ekledikten sonra konuşmalar burada görünür.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr style={{ background: 'linear-gradient(90deg,#f8f9ff,#f3f4f8)' }}>
                  <th className="text-left px-4 sm:px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ziyaretçi</th>
                  <th className="text-left px-4 sm:px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Site</th>
                  <th className="text-left px-4 sm:px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Mesajlar</th>
                  <th className="text-left px-4 sm:px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Durum</th>
                  <th className="text-left px-4 sm:px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Tarih</th>
                  <th className="px-4 sm:px-6 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {convs.map((c) => (
                  <tr key={c.id} className="hover:bg-indigo-50/30 active:bg-indigo-50/50 transition-colors">
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <Link href={`/conversations/${c.id}`} className="group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                            {(c.visitor_name || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800 group-hover:text-indigo-600 transition-colors">{c.visitor_name || 'Anonim'}</div>
                            {c.visitor_phone && <div className="text-slate-400 text-xs">{c.visitor_phone}</div>}
                            {c.visitor_email && <div className="text-slate-400 text-xs">{c.visitor_email}</div>}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-medium">{c.site_name}</span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <div className="text-slate-700 font-medium">{c.message_count} mesaj</div>
                      {c.summary && (
                        <div className="text-xs text-slate-400 mt-0.5 max-w-[150px] sm:max-w-[200px] truncate" title={c.summary}>{c.summary}</div>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        c.status === 'active'
                          ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                          : 'text-slate-500 bg-slate-100 border border-slate-200'
                      }`}>
                        {c.status === 'active' ? '● Aktif' : '○ Kapalı'}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs text-slate-400 hidden md:table-cell">
                      {parseDbDate(c.created_at).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-right">
                      <div className="flex gap-1.5 justify-end">
                        <Link
                          href={`/conversations/${c.id}`}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                        >
                          Görüntüle
                        </Link>
                        {c.status === 'active' && (
                          <button
                            onClick={() => closeConv(c.id)}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors text-slate-500 border-slate-200 hover:bg-slate-50"
                          >
                            Kapat
                          </button>
                        )}
                        <button
                          onClick={() => deleteConv(c.id)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors text-red-500 border-red-200 hover:bg-red-50"
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
