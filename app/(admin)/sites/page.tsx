'use client';
import { useEffect, useState } from 'react';

interface Site {
  id: string;
  name: string;
  domain: string;
  api_key: string;
  bot_name: string;
  system_prompt: string;
  widget_position: string;
  widget_color: string;
  widget_welcome_message: string;
  widget_typing_indicator: number;
  widget_online_indicator: number;
  widget_language: string;
  created_at: string;
  message_count: number;
  unread_count: number;
}

const DEFAULT_COLOR = '#2563eb';
const DEFAULT_WELCOME = 'Merhaba! Size nasıl yardımcı olabilirim?';

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newBotName, setNewBotName] = useState('Asistan');
  const [newPrompt, setNewPrompt] = useState('Sen yardımcı bir asistansın.');
  const [adding, setAdding] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [panelUrl, setPanelUrl] = useState('https://panel.siteniz.com');

  // Edit state
  const [editBotName, setEditBotName] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [editPosition, setEditPosition] = useState('bottom-right');
  const [editColor, setEditColor] = useState(DEFAULT_COLOR);
  const [editWelcome, setEditWelcome] = useState(DEFAULT_WELCOME);
  const [editTyping, setEditTyping] = useState(true);
  const [editOnline, setEditOnline] = useState(true);
  const [editLanguage, setEditLanguage] = useState('tr');
  const [activeTab, setActiveTab] = useState<'bot' | 'widget'>('bot');

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
      body: JSON.stringify({
        bot_name: editBotName,
        system_prompt: editPrompt,
        widget_position: editPosition,
        widget_color: editColor,
        widget_welcome_message: editWelcome,
        widget_typing_indicator: editTyping ? 1 : 0,
        widget_online_indicator: editOnline ? 1 : 0,
        widget_language: editLanguage,
      }),
    });
    setEditingId(null);
    load();
  }

  function startEdit(site: Site) {
    setEditingId(site.id);
    setEditBotName(site.bot_name);
    setEditPrompt(site.system_prompt);
    setEditPosition(site.widget_position || 'bottom-right');
    setEditColor(site.widget_color || DEFAULT_COLOR);
    setEditWelcome(site.widget_welcome_message || DEFAULT_WELCOME);
    setEditTyping(site.widget_typing_indicator !== 0);
    setEditOnline(site.widget_online_indicator !== 0);
    setEditLanguage(site.widget_language || 'tr');
    setActiveTab('bot');
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  function embedCode(site: Site) {
    return `<!-- Sitenizin </body> kapanış etiketinden önce ekleyin -->
<script src="${panelUrl}/widget.js"></script>
<script>
  MesajPanel.init({
    apiKey: "${site.api_key}",
    botName: "${site.bot_name}",
    position: "${site.widget_position || 'bottom-right'}",
    buttonColor: "${site.widget_color || DEFAULT_COLOR}",
    welcomeMessage: "${(site.widget_welcome_message || DEFAULT_WELCOME).replace(/"/g, '\\"')}",
    typingIndicator: ${site.widget_typing_indicator !== 0},
    onlineIndicator: ${site.widget_online_indicator !== 0}
  });
</script>`;
  }

  const tabClass = (tab: 'bot' | 'widget') =>
    `px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
      activeTab === tab
        ? 'border-blue-600 text-blue-600 bg-white'
        : 'border-transparent text-slate-500 hover:text-slate-700'
    }`;

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
            placeholder="Sistem prompt — botun nasıl davranacağını yazın."
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
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{ background: (site.widget_color || DEFAULT_COLOR) + '22', color: site.widget_color || DEFAULT_COLOR }}
                    >
                      {site.widget_position === 'bottom-left' ? 'Sol alt' : 'Sağ alt'}
                    </span>
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
                <div className="mt-4 border border-blue-100 rounded-xl overflow-hidden">
                  {/* Tabs */}
                  <div className="flex gap-1 px-4 pt-3 bg-slate-50 border-b border-slate-100">
                    <button className={tabClass('bot')} onClick={() => setActiveTab('bot')}>Bot Ayarları</button>
                    <button className={tabClass('widget')} onClick={() => setActiveTab('widget')}>Widget Tasarımı</button>
                  </div>

                  <div className="p-4 bg-white space-y-4">
                    {activeTab === 'bot' && (
                      <>
                        <div>
                          <label className="text-xs font-medium text-slate-600 mb-1 block">Bot Adı</label>
                          <input
                            value={editBotName}
                            onChange={(e) => setEditBotName(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600 mb-1 block">Yanıt Dili</label>
                          <select
                            value={editLanguage}
                            onChange={(e) => setEditLanguage(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="tr">🇹🇷 Türkçe</option>
                            <option value="en">🇬🇧 English</option>
                            <option value="de">🇩🇪 Deutsch</option>
                            <option value="fr">🇫🇷 Français</option>
                            <option value="es">🇪🇸 Español</option>
                            <option value="ar">🇸🇦 العربية</option>
                            <option value="ru">🇷🇺 Русский</option>
                            <option value="nl">🇳🇱 Nederlands</option>
                            <option value="it">🇮🇹 Italiano</option>
                            <option value="pt">🇧🇷 Português</option>
                          </select>
                          <p className="text-xs text-slate-400 mt-1">Bot bu dilde yanıt verir. Sistem promptunu etkilemez.</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600 mb-1 block">Sistem Prompt</label>
                          <textarea
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            rows={4}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                        </div>
                      </>
                    )}

                    {activeTab === 'widget' && (
                      <>
                        {/* Position + Color row */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">Konum</label>
                            <select
                              value={editPosition}
                              onChange={(e) => setEditPosition(e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="bottom-right">Sağ alt (bottom-right)</option>
                              <option value="bottom-left">Sol alt (bottom-left)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">Renk</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={editColor}
                                onChange={(e) => setEditColor(e.target.value)}
                                className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                              />
                              <input
                                type="text"
                                value={editColor}
                                onChange={(e) => setEditColor(e.target.value)}
                                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="#2563eb"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Welcome message */}
                        <div>
                          <label className="text-xs font-medium text-slate-600 mb-1 block">Karşılama Mesajı</label>
                          <input
                            value={editWelcome}
                            onChange={(e) => setEditWelcome(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Merhaba! Size nasıl yardımcı olabilirim?"
                          />
                          <p className="text-xs text-slate-400 mt-1">Kullanıcı ilk kez sohbeti açtığında gösterilir.</p>
                        </div>

                        {/* Toggles */}
                        <div className="grid grid-cols-2 gap-4">
                          <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                            <div
                              onClick={() => setEditTyping(!editTyping)}
                              className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 flex items-center px-1 cursor-pointer ${editTyping ? 'bg-blue-600' : 'bg-slate-300'}`}
                            >
                              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${editTyping ? 'translate-x-4' : ''}`} />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-slate-700">Yazıyor efekti</div>
                              <div className="text-xs text-slate-400">Bot cevap hazırlarken üç nokta göster</div>
                            </div>
                          </label>
                          <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                            <div
                              onClick={() => setEditOnline(!editOnline)}
                              className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 flex items-center px-1 cursor-pointer ${editOnline ? 'bg-blue-600' : 'bg-slate-300'}`}
                            >
                              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${editOnline ? 'translate-x-4' : ''}`} />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-slate-700">Çevrimiçi göstergesi</div>
                              <div className="text-xs text-slate-400">Başlıkta yeşil aktif ışığı göster</div>
                            </div>
                          </label>
                        </div>

                        {/* Live preview */}
                        <div className="mt-2">
                          <p className="text-xs font-medium text-slate-500 mb-2">Önizleme</p>
                          <div className="inline-block rounded-xl overflow-hidden shadow-md border border-slate-200" style={{ width: 260 }}>
                            <div className="flex items-center gap-2 px-4 py-3" style={{ background: editColor }}>
                              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-base">🤖</div>
                              <div>
                                <div className="text-white text-sm font-semibold">{editBotName || 'Asistan'}</div>
                                {editOnline && (
                                  <div className="text-white/80 text-xs flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                                    Çevrimiçi
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="bg-slate-50 px-3 py-3 text-xs text-slate-500 min-h-[40px]">
                              <span className="inline-block bg-slate-200 rounded-xl rounded-bl-sm px-3 py-2 text-slate-700 max-w-[90%]">
                                {editWelcome || DEFAULT_WELCOME}
                              </span>
                            </div>
                            <div className="bg-white px-3 py-2 border-t border-slate-100 flex gap-2">
                              <div className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-400">Mesajınızı yazın...</div>
                              <div className="w-8 h-7 rounded-lg flex items-center justify-center" style={{ background: editColor }}>
                                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button onClick={() => saveEdit(site.id)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                        Kaydet
                      </button>
                      <button onClick={() => setEditingId(null)} className="border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors">
                        İptal
                      </button>
                    </div>
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
                <pre className="text-xs bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto leading-relaxed whitespace-pre-wrap">{embedCode(site)}</pre>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
