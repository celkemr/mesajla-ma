'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import GlobalNotifier from './GlobalNotifier';

const navItems = [
  { href: '/', label: 'Gösterge Paneli', icon: '📊' },
  { href: '/conversations', label: 'Konuşmalar', icon: '🤖', badge: true },
  { href: '/customers', label: 'Müşteriler', icon: '👥' },
  { href: '/visitors', label: 'Ziyaretçiler', icon: '👁️' },
  { href: '/sites', label: 'Siteler', icon: '🌐' },
  { href: '/users', label: 'Kullanıcılar', icon: '👤' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [newCount, setNewCount] = useState(0);

  const handleNewCount = useCallback((n: number) => setNewCount(n), []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="flex min-h-screen">
      <GlobalNotifier onNewCount={handleNewCount} />

      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold text-white">Mesaj Paneli</h1>
          <p className="text-slate-400 text-xs mt-1">Tüm siteler tek panel</p>
        </div>
        <nav className="flex-1 p-4">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const showBadge = item.badge && newCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => { if (item.badge) setNewCount(0); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 text-sm transition-colors ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {showBadge && (
                  <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center animate-pulse">
                    {newCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-700 space-y-3">
          <div>
            <p className="text-slate-500 text-xs">API Endpoint</p>
            <code className="text-slate-400 text-xs block mt-1 break-all">/api/receive</code>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            🚪 Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
