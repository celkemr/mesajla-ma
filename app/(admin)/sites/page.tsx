'use client';
import { useEffect, useState } from 'react';

interface Site {
  id: string;
  name: string;
  domain: string;
  api_key: string;
  bot_name: string;
  system_prompt: string;
  created_at: string;
  message_count: number;
  unread_count: number;
}

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newBotName, setNewBotName] = useState('Asistan');
  const [newPrompt, setNewPrompt] = useState('Sen yardımcı bir asistansın.');
  const [adding, setAdding] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBotName, setEditBotName] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [panelUrl, setPanelUrl] = useState('https://panel.siteniz.com');

  useEffect(() => {
    setPanelUrl(window.location.origin);
  }, []);

  function load() {
    fetch('/api/sites').then((r) => r.json()).then(setSites);
  }
  useEffect(load, []);

  async function addSite() {
    if (!newName.trim() || !newDomain.trim()) return;
    setAdding(true);
    await fetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, domain: newDomain, botName: newBotName, systemPrompt: newPrompt }),
    });
    setNewName(''); setNewDomain(''); setNewBotName('Asistan'); setNewPrompt('Sen yardımcı bir asistansın.');
    setAdding(false);
    load();
  }

  async function deleteSite(id: string, name: string) {
    if (!confirm(`"${name}" sitesini ve tüm verilerini silmek istediğinize emin misiniz?`)) return;
    await fetch(`/api/sites/${id}`, { method: 'DELETE' });
    load();
  }

  async function saveEdit(id: string) {
    await fetch(`/api/sites/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bot_name: editBotName, system_prompt: editPrompt }),
    });
    setEditingId(null);
    load();
  }

  function startEdit(site: Site) {
    setEditingId(site.id);
    setEditBotName(site.bot_name);
    setEditPrompt(site.system_prompt);
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Siteler</h2>
        <p className="text-slate-500 mt-1">Her site için ayrı bir AI chatbot yapılandırın</p>
      </div>

      {/* Add Site */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
        <h3 className="font-semibold text-slate-800 mb-4">Yeni Site Ekle</h3>
        <div className="grid grid-cols-1 gap-3">
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Site adı (örn: Portfolyo)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Domain (örn: portfolyo.com)"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Bot adı (örn: Asistan)"
              value={newBotName}
              onChange={(e) => setNewBotName(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <textarea
            placeholder="Sistem prompt — botun nasıl davranacağını yazın. Örn: Sen bir e-ticaret sitesinin müşteri destek asistanısın. Nazik ve yardımsever ol."
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            rows={2}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <button
            onClick={addSite}
            disabled={adding || !newName.trim() || !newDomain.trim()}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors w-fit"
          >
            {adding ? 'Ekleniyor...' : '+ Site Ekle'}
          </button>
        </div>
      </div>

      {/* Sites List */}
      <div className="space-y-4">
        {sites.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-100 text-center text-slate-400">
            <p className="text-4xl mb-3">🌐</p>
            <p>Henüz site eklenmedi.</p>
          </div>
        ) : (
          sites.map((site) => (
            <div key={site.id} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-800 text-lg">{site.name}</h3>
                  <a href={`https://${site.domain}`} target="_blank" rel="noreferrer" className="text-blue-500 text-sm hover:underline">
                    {site.domain}
                  </a>
                  <div className="flex gap-3 mt-2 flex-wrap">
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">{site.message_count} mesaj</span>
                    {site.unread_count > 0 && (
                      <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">{site.unread_count} okunmamış</span>
                    )}
                    <span className="text-xs text-purple-700 bg-purple-100 px-2 py-1 rounded">🤖 {site.bot_name}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(site)}
                    className="text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors shrink-0"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => deleteSite(site.id, site.name)}
                    className="text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                  >
                    Sil
                  </button>
                </div>
              </div>

              {/* Edit panel */}
              {editingId === site.id && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Bot Adı</label>
                      <input
                        value={editBotName}
                        onChange={(e) => setEditBotName(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Sistem Prompt</label>
                    <textarea
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      rows={3}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(site.id)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                      Kaydet
                    </button>
                    <button onClick={() => setEditingId(null)} className="border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors">
                      İptal
                    </button>
                  </div>
                </div>
              )}

              {/* API Key */}
              <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">API Anahtarı</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm text-slate-700 flex-1 font-mono bg-white px-3 py-2 rounded border border-slate-200 overflow-x-auto">
                    {site.api_key}
                  </code>
                  <button
                    onClick={() => copyKey(site.api_key)}
                    className="text-xs bg-slate-700 text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                  >
                    {copiedKey === site.api_key ? '✓ Kopyalandı' : 'Kopyala'}
                  </button>
                </div>
              </div>

              {/* Widget code */}
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Chatbot Entegrasyon Kodu</p>
                <pre className="text-xs bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto leading-relaxed">{`<!-- Sitenizin </body> kapanış etiketinden önce ekleyin -->
<script src="${panelUrl}/widget.js"></script>
<script>
  MesajPanel.init({
    apiKey: "${site.api_key}",
    botName: "${site.bot_name}",
    position: "bottom-right",
    welcomeMessage: "Merhaba! Size nasıl yardımcı olabilirim?"
  });
</script>`}</pre>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
