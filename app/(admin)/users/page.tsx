'use client';
import { useEffect, useState } from 'react';

interface User {
  id: string;
  username: string;
  created_at: string;
}

export default function UsersPage() {
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
    if (!confirm(`"${name}" kullanıcısını silmek istediğinize emin misiniz?`)) return;
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Silinemedi');
      return;
    }
    load();
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Kullanıcılar</h2>
        <p className="text-slate-500 mt-1">Panel erişimi olan kullanıcıları yönetin</p>
      </div>

      {/* Add User */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
        <h3 className="font-semibold text-slate-800 mb-4">Yeni Kullanıcı Ekle</h3>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Kullanıcı adı"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Şifre (min 6 karakter)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addUser()}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addUser}
            disabled={adding || !username.trim() || !password.trim()}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {adding ? 'Ekleniyor...' : '+ Kullanıcı Ekle'}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>

      {/* Users List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {users.length === 0 ? (
          <div className="p-12 text-center text-slate-400">Kullanıcı bulunamadı.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Kullanıcı Adı</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Oluşturulma Tarihi</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-800">{user.username}</td>
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(user.created_at).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => deleteUser(user.id, user.username)}
                      className="text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
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
  );
}
