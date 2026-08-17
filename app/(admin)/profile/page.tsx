'use client';
import { useEffect, useState } from 'react';

interface Profil { id: string; username: string; email: string | null }

export default function ProfilePage() {
  const [profil, setProfil] = useState<Profil | null>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [mevcutSifre, setMevcutSifre] = useState('');
  const [yeniSifre, setYeniSifre] = useState('');
  const [yeniSifreTekrar, setYeniSifreTekrar] = useState('');
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [mesaj, setMesaj] = useState<{ tur: 'ok' | 'hata'; metin: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/profile')
      .then(r => r.json())
      .then(d => {
        if (d.error) return;
        setProfil(d);
        setUsername(d.username || '');
        setEmail(d.email || '');
      })
      .catch(() => {});
  }, []);

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    setMesaj(null);

    if (yeniSifre && yeniSifre !== yeniSifreTekrar) {
      setMesaj({ tur: 'hata', metin: 'Yeni şifreler birbiriyle uyuşmuyor.' });
      return;
    }
    if (!mevcutSifre) {
      setMesaj({ tur: 'hata', metin: 'Değişiklik için mevcut şifrenizi girmelisiniz.' });
      return;
    }

    setKaydediliyor(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email,
          currentPassword: mevcutSifre,
          newPassword: yeniSifre || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMesaj({ tur: 'hata', metin: d.error || 'Kaydedilemedi.' });
      } else {
        setProfil(p => (p ? { ...p, username: d.username, email: d.email } : p));
        setMevcutSifre('');
        setYeniSifre('');
        setYeniSifreTekrar('');
        setMesaj({ tur: 'ok', metin: 'Bilgileriniz güncellendi.' });
      }
    } catch {
      setMesaj({ tur: 'hata', metin: 'Bağlantı hatası.' });
    } finally {
      setKaydediliyor(false);
    }
  }

  const girdiSinif =
    'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400';

  return (
    <div>
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 md:px-8 py-4 sm:py-5">
        <h1 className="text-[17px] font-semibold text-slate-900">Hesabım</h1>
        <p className="text-sm text-slate-400 mt-0.5">Kullanıcı adı, e-posta ve şifrenizi buradan değiştirebilirsiniz</p>
      </div>

      <div className="p-4 sm:p-6">
        <form onSubmit={kaydet} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm max-w-lg">
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">KULLANICI ADI</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                className={girdiSinif}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">E-POSTA</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ornek@site.com"
                autoComplete="email"
                className={girdiSinif}
              />
              <p className="text-[11px] text-slate-400 mt-1">Boş bırakabilirsiniz.</p>
            </div>

            <hr className="border-slate-100" />

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">YENİ ŞİFRE</label>
              <input
                type="password"
                value={yeniSifre}
                onChange={e => setYeniSifre(e.target.value)}
                placeholder="Değiştirmek istemiyorsanız boş bırakın"
                autoComplete="new-password"
                className={girdiSinif}
              />
              <p className="text-[11px] text-slate-400 mt-1">En az 8 karakter.</p>
            </div>

            {yeniSifre && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">YENİ ŞİFRE (TEKRAR)</label>
                <input
                  type="password"
                  value={yeniSifreTekrar}
                  onChange={e => setYeniSifreTekrar(e.target.value)}
                  autoComplete="new-password"
                  className={girdiSinif}
                />
              </div>
            )}

            <hr className="border-slate-100" />

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">MEVCUT ŞİFRENİZ *</label>
              <input
                type="password"
                value={mevcutSifre}
                onChange={e => setMevcutSifre(e.target.value)}
                placeholder="Güvenlik için gerekli"
                autoComplete="current-password"
                className={girdiSinif}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Her değişiklikte mevcut şifreniz sorulur.
              </p>
            </div>

            {mesaj && (
              <div
                className={`text-sm rounded-lg px-3 py-2 border ${
                  mesaj.tur === 'ok'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-600'
                }`}
              >
                {mesaj.metin}
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              {profil ? `Oturum: ${profil.username}` : 'Yükleniyor…'}
            </span>
            <button
              type="submit"
              disabled={kaydediliyor}
              className="bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-600 active:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {kaydediliyor ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
