'use client';
import { useEffect, useState } from 'react';
import { useDialog } from '../components/useDialog';

interface User {
  id: string;
  username: string;
  created_at: string;
}

export default function UsersPage() {
  const { confirm, showAlert, dialog } = useDialog();
  const [users, setUsers] = useState<User[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  function load() {
    fetch('/api/users').then((r) => r.json()).then(setUsers);
  }
  useEffect(load, []);

  async function addUser() {
    setError('');
    if (!username.trim() || !password.trim()) return;
    setAdding(true);
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    setAdding(false);
    if (!res.ok) {
      setError(data.error || 'Hata oluştu');
      return;
    }
    setUsername('');
    setPassword('');
    load();
  }

  async function deleteUser(id: string, name: string) {
    if (!(await confirm(`"${name}" kullanıcısını silmek istediğinize emin misiniz?`))) return;
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      await showAlert(`❌ ${data.error || 'Silinemedi'}`);
      return;
    }
    load();
  }

  return (
    <div>
      {dialog}
      {/* Header */}
      <div className="bg-white border-b border-slate-200/80 px-8 py-5">
        <h1 className="text-[17px] font-semibold text-slate-900">Kullanıcılar</h1>
        <p className="text-sm text-slate-400 mt-0.5">Panel erişimi olan kullanıcıları yönetin</p>
      </div>

      <div className="p-6 space-y-4">
      {/* Add User */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <p className="text-sm font-semibold text-slate-700 mb-4">Yeni Kullanıcı Ekle</p>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Kullanıcı adı"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm flex-1 min-w-36 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <input
            type="password"
            placeholder="Şifre (min 6 karakter)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addUser()}
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            onClick={addUser}
            disabled={adding || !username.trim() || !password.trim()}
            className="text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
          >
            {adding ? 'Ekleniyor...' : '+ Kullanıcı Ekle'}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>

      {/* Users List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {users.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">Kullanıcı bulunamadı.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'linear-gradient(90deg,#f8f9ff,#f3f4f8)' }}>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Kullanıcı Adı</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Oluşturulma Tarihi</th>
                <th className="px-6 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                        {user.username[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-800">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {new Date(user.created_at).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => deleteUser(user.id, user.username)}
                      className="text-xs font-medium border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      </div>
    </div>
  );
}
