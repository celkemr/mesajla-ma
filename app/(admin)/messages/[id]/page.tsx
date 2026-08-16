'use client';
import { parseDbDate } from '@/lib/date';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDialog } from '../../components/useDialog';

interface Reply {
  id: string;
  content: string;
  created_at: string;
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
  extra_fields: string | null;
  created_at: string;
  replies: Reply[];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  unread: { label: 'Okunmamış', color: 'bg-blue-100 text-blue-700' },
  read: { label: 'Okundu', color: 'bg-slate-100 text-slate-600' },
  replied: { label: 'Yanıtlandı', color: 'bg-green-100 text-green-700' },
  archived: { label: 'Arşivlendi', color: 'bg-amber-100 text-amber-700' },
};

export default function MessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { confirm, dialog } = useDialog();
  const [message, setMessage] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/messages/${id}`)
      .then((r) => r.json())
      .then(setMessage);
  }, [id]);

  async function sendReply() {
    if (!replyText.trim()) return;
    setSending(true);
    await fetch(`/api/messages/${id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: replyText }),
    });
    setReplyText('');
    const updated = await fetch(`/api/messages/${id}`).then((r) => r.json());
    setMessage(updated);
    setSending(false);
  }

  async function changeStatus(status: string) {
    await fetch(`/api/messages/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setMessage((m) => m ? { ...m, status } : m);
  }

  async function deleteMessage() {
    if (!(await confirm('Bu mesajı silmek istediğinize emin misiniz?'))) return;
    await fetch(`/api/messages/${id}`, { method: 'DELETE' });
    router.push('/messages');
  }

  if (!message) return <div className="p-8 text-slate-400">Yükleniyor...</div>;

  const s = STATUS_LABELS[message.status] || STATUS_LABELS.read;
  let extraFields: Record<string, unknown> | null = null;
  try { if (message.extra_fields) extraFields = JSON.parse(message.extra_fields); } catch {}

  return (
    <div className="p-8 max-w-3xl">
      {dialog}
      {/* Back */}
      <Link href="/messages" className="text-slate-500 text-sm hover:text-slate-700 flex items-center gap-1 mb-6">
        ← Mesajlara dön
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white shrink-0">
              {(message.sender_name || '?')[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{message.subject || 'Konu yok'}</h2>
              <p className="text-slate-500 text-sm mt-1">
                <strong>{message.sender_name || 'Anonim'}</strong>
                {message.sender_email && <> &lt;{message.sender_email}&gt;</>}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{message.site_name}</span>
                <span className="text-xs text-slate-400">{parseDbDate(message.created_at).toLocaleString('tr-TR')}</span>
              </div>
            </div>
          </div>
          {/* Actions */}
          <div className="flex gap-2 shrink-0 flex-wrap justify-end">
            <select
              value={message.status}
              onChange={(e) => changeStatus(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="unread">Okunmamış</option>
              <option value="read">Okundu</option>
              <option value="replied">Yanıtlandı</option>
              <option value="archived">Arşivlendi</option>
            </select>
            <button onClick={deleteMessage} className="text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
              Sil
            </button>
          </div>
        </div>

        {/* Message content */}
        <div className="mt-6 p-4 bg-slate-50 rounded-lg text-slate-700 text-sm leading-relaxed whitespace-pre-wrap border border-slate-100">
          {message.content}
        </div>

        {/* Extra fields */}
        {extraFields && Object.keys(extraFields).length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Form Alanları</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(extraFields).map(([k, v]) => (
                <div key={k} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">{k}</p>
                  <p className="text-sm text-slate-700 mt-0.5">{String(v)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Replies */}
      {message.replies.length > 0 && (
        <div className="mb-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Yanıtlar ({message.replies.length})</p>
          {message.replies.map((reply) => (
            <div key={reply.id} className="bg-blue-50 border border-blue-100 rounded-xl p-4 ml-8">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white font-bold">S</div>
                <span className="text-xs text-slate-500">Siz · {parseDbDate(reply.created_at).toLocaleString('tr-TR')}</span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{reply.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reply box */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <p className="text-sm font-semibold text-slate-700 mb-3">Not / Yanıt Ekle</p>
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Yanıtınızı veya notunuzu buraya yazın..."
          rows={4}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="flex justify-end mt-3">
          <button
            onClick={sendReply}
            disabled={sending || !replyText.trim()}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? 'Kaydediliyor...' : 'Yanıtı Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}
