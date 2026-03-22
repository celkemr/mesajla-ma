import { createClient, Client, InValue } from '@libsql/client';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from './auth';

let _client: Client | null = null;
let _initialized = false;

function getClient(): Client {
  if (!_client) {
    _client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _client;
}

async function ensureInit(): Promise<void> {
  if (_initialized) return;
  _initialized = true;
  const c = getClient();

  await c.executeMultiple(`
    CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      domain TEXT NOT NULL,
      api_key TEXT NOT NULL UNIQUE,
      bot_name TEXT NOT NULL DEFAULT 'Asistan',
      system_prompt TEXT NOT NULL DEFAULT 'Sen yardımcı bir asistansın.',
      widget_position TEXT NOT NULL DEFAULT 'bottom-right',
      widget_color TEXT NOT NULL DEFAULT '#2563eb',
      widget_welcome_message TEXT NOT NULL DEFAULT 'Merhaba! Size nasıl yardımcı olabilirim?',
      widget_typing_indicator INTEGER NOT NULL DEFAULT 1,
      widget_online_indicator INTEGER NOT NULL DEFAULT 1,
      widget_language TEXT NOT NULL DEFAULT 'tr',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      sender_name TEXT,
      sender_email TEXT,
      subject TEXT,
      content TEXT NOT NULL,
      extra_fields TEXT,
      status TEXT NOT NULL DEFAULT 'unread',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS replies (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      visitor_name TEXT,
      visitor_email TEXT,
      visitor_phone TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      mode TEXT NOT NULL DEFAULT 'ai',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS visitors (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      ip_address TEXT,
      country_code TEXT,
      current_page TEXT,
      referrer TEXT,
      device_type TEXT,
      browser TEXT,
      user_agent TEXT,
      visitor_name TEXT,
      first_seen TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen TEXT NOT NULL DEFAULT (datetime('now')),
      page_history TEXT DEFAULT '[]',
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
    );
  `);

  // Mevcut tablolara widget kolonlarını ekle (migration)
  const migrations = [
    "ALTER TABLE conversations ADD COLUMN mode TEXT NOT NULL DEFAULT 'ai'",
    "ALTER TABLE conversations ADD COLUMN visitor_phone TEXT",
    "ALTER TABLE visitors ADD COLUMN referrer TEXT",
    "ALTER TABLE visitors ADD COLUMN device_type TEXT",
    "ALTER TABLE visitors ADD COLUMN browser TEXT",
    "ALTER TABLE visitors ADD COLUMN first_seen TEXT NOT NULL DEFAULT (datetime('now'))",
    "ALTER TABLE visitors ADD COLUMN page_history TEXT DEFAULT '[]'",
    "ALTER TABLE sites ADD COLUMN widget_position TEXT NOT NULL DEFAULT 'bottom-right'",
    "ALTER TABLE sites ADD COLUMN widget_color TEXT NOT NULL DEFAULT '#2563eb'",
    "ALTER TABLE sites ADD COLUMN widget_welcome_message TEXT NOT NULL DEFAULT 'Merhaba! Size nasıl yardımcı olabilirim?'",
    "ALTER TABLE sites ADD COLUMN widget_typing_indicator INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE sites ADD COLUMN widget_online_indicator INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE sites ADD COLUMN widget_language TEXT NOT NULL DEFAULT 'tr'",
  ];
  for (const sql of migrations) {
    try { await c.execute(sql); } catch { /* kolon zaten varsa yok say */ }
  }

  // Varsayılan admin yoksa oluştur
  const res = await c.execute('SELECT COUNT(*) as c FROM users');
  const count = Number(res.rows[0].c);
  if (count === 0) {
    const id = uuidv4();
    const hash = hashPassword('admin123');
    await c.execute({ sql: 'INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)', args: [id, 'admin', hash] });
  }
}

// Yardımcı: tek satır dön
type Args = InValue[];

async function one<T>(sql: string, args: Args = []): Promise<T | undefined> {
  await ensureInit();
  const res = await getClient().execute({ sql, args });
  return res.rows[0] as unknown as T | undefined;
}

// Yardımcı: tüm satırları dön
async function all<T>(sql: string, args: Args = []): Promise<T[]> {
  await ensureInit();
  const res = await getClient().execute({ sql, args });
  return res.rows as unknown as T[];
}

// Yardımcı: yaz (insert/update/delete)
async function run(sql: string, args: Args = []): Promise<void> {
  await ensureInit();
  await getClient().execute({ sql, args });
}

// --- Tipler ---
export interface Site {
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
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  site_id: string;
  session_id: string;
  visitor_name: string | null;
  visitor_email: string | null;
  visitor_phone: string | null;
  status: string;
  mode: string;
  created_at: string;
  updated_at: string;
}

// --- Sites ---
export async function getAllSites() {
  return all(`
    SELECT s.*, COUNT(m.id) as message_count,
    SUM(CASE WHEN m.status = 'unread' THEN 1 ELSE 0 END) as unread_count
    FROM sites s
    LEFT JOIN messages m ON m.site_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `);
}

export async function getSiteByApiKey(apiKey: string) {
  return one<Site>('SELECT * FROM sites WHERE api_key = ?', [apiKey]);
}

export async function getSiteById(id: string) {
  return one<Site>('SELECT * FROM sites WHERE id = ?', [id]);
}

export async function createSite(
  name: string,
  domain: string,
  botName = 'Asistan',
  systemPrompt = 'Sen yardımcı bir asistansın.',
  widgetPosition = 'bottom-right',
  widgetColor = '#2563eb',
  widgetWelcomeMessage = 'Merhaba! Size nasıl yardımcı olabilirim?',
  widgetTypingIndicator = 1,
  widgetOnlineIndicator = 1,
) {
  const id = uuidv4();
  const apiKey = `mk_${uuidv4().replace(/-/g, '')}`;
  await run(
    'INSERT INTO sites (id, name, domain, api_key, bot_name, system_prompt, widget_position, widget_color, widget_welcome_message, widget_typing_indicator, widget_online_indicator) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, name, domain, apiKey, botName, systemPrompt, widgetPosition, widgetColor, widgetWelcomeMessage, widgetTypingIndicator, widgetOnlineIndicator],
  );
  return one<Site>('SELECT * FROM sites WHERE id = ?', [id]);
}

export async function updateSite(id: string, data: {
  bot_name?: string;
  system_prompt?: string;
  widget_position?: string;
  widget_color?: string;
  widget_welcome_message?: string;
  widget_typing_indicator?: number;
  widget_online_indicator?: number;
  widget_language?: string;
}) {
  const entries = Object.entries(data).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return getSiteById(id);
  const fields = entries.map(([k]) => `${k} = ?`).join(', ');
  const values = entries.map(([, v]) => v);
  await run(`UPDATE sites SET ${fields} WHERE id = ?`, [...values, id]);
  return one<Site>('SELECT * FROM sites WHERE id = ?', [id]);
}

export async function deleteSite(id: string) {
  await run('DELETE FROM sites WHERE id = ?', [id]);
}

// --- Messages ---
export async function getAllMessages(filters: { siteId?: string; status?: string; search?: string } = {}) {
  let query = `
    SELECT m.*, s.name as site_name, s.domain as site_domain,
    (SELECT COUNT(*) FROM replies r WHERE r.message_id = m.id) as reply_count
    FROM messages m JOIN sites s ON s.id = m.site_id WHERE 1=1
  `;
  const params: InValue[] = [];
  if (filters.siteId) { query += ' AND m.site_id = ?'; params.push(filters.siteId); }
  if (filters.status) { query += ' AND m.status = ?'; params.push(filters.status); }
  if (filters.search) {
    query += ' AND (m.sender_name LIKE ? OR m.sender_email LIKE ? OR m.subject LIKE ? OR m.content LIKE ?)';
    params.push(...Array(4).fill(`%${filters.search}%`));
  }
  query += ' ORDER BY m.created_at DESC';
  return all(query, params);
}

export async function getMessageById(id: string) {
  const msg = await one<Record<string, unknown>>(`
    SELECT m.*, s.name as site_name, s.domain as site_domain
    FROM messages m JOIN sites s ON s.id = m.site_id WHERE m.id = ?
  `, [id]);
  if (!msg) return null;
  const replies = await all('SELECT * FROM replies WHERE message_id = ? ORDER BY created_at ASC', [id]);
  return { ...msg, replies };
}

export async function createMessage(siteId: string, data: {
  sender_name?: string;
  sender_email?: string;
  subject?: string;
  content: string;
  extra_fields?: Record<string, unknown>;
}) {
  const id = uuidv4();
  await run(
    'INSERT INTO messages (id, site_id, sender_name, sender_email, subject, content, extra_fields) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, siteId, data.sender_name ?? null, data.sender_email ?? null, data.subject ?? null, data.content, data.extra_fields ? JSON.stringify(data.extra_fields) : null]
  );
  return getMessageById(id);
}

export async function updateMessageStatus(id: string, status: string) {
  await run('UPDATE messages SET status = ? WHERE id = ?', [status, id]);
}

export async function deleteMessage(id: string) {
  await run('DELETE FROM messages WHERE id = ?', [id]);
}

// --- Replies ---
export async function createReply(messageId: string, content: string) {
  const id = uuidv4();
  await run('INSERT INTO replies (id, message_id, content) VALUES (?, ?, ?)', [id, messageId, content]);
  await updateMessageStatus(messageId, 'replied');
  return one('SELECT * FROM replies WHERE id = ?', [id]);
}

// --- Conversations ---
export async function getAllConversations(filters: { siteId?: string; status?: string } = {}) {
  let query = `
    SELECT c.*, s.name as site_name, s.domain as site_domain,
    COUNT(cm.id) as message_count,
    MAX(cm.created_at) as last_message_at
    FROM conversations c
    JOIN sites s ON s.id = c.site_id
    LEFT JOIN chat_messages cm ON cm.conversation_id = c.id
    WHERE 1=1
  `;
  const params: InValue[] = [];
  if (filters.siteId) { query += ' AND c.site_id = ?'; params.push(filters.siteId); }
  if (filters.status) { query += ' AND c.status = ?'; params.push(filters.status); }
  query += ' GROUP BY c.id ORDER BY c.updated_at DESC';
  return all(query, params);
}

export async function getConversationById(id: string) {
  const conv = await one<Record<string, unknown>>(`
    SELECT c.*, s.name as site_name, s.domain as site_domain, s.bot_name
    FROM conversations c JOIN sites s ON s.id = c.site_id WHERE c.id = ?
  `, [id]);
  if (!conv) return null;
  const messages = await all('SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC', [id]);
  return { ...conv, messages };
}

export async function getOrCreateConversation(siteId: string, sessionId: string): Promise<Conversation> {
  let conv = await one<Conversation>('SELECT * FROM conversations WHERE session_id = ? AND site_id = ?', [sessionId, siteId]);
  if (!conv) {
    const id = uuidv4();
    await run('INSERT INTO conversations (id, site_id, session_id) VALUES (?, ?, ?)', [id, siteId, sessionId]);
    conv = await one<Conversation>('SELECT * FROM conversations WHERE id = ?', [id]);
  }
  return conv!;
}

export async function updateConversationVisitor(id: string, data: { visitor_name?: string; visitor_email?: string; visitor_phone?: string }) {
  if (data.visitor_name) await run('UPDATE conversations SET visitor_name = ? WHERE id = ?', [data.visitor_name, id]);
  if (data.visitor_email) await run('UPDATE conversations SET visitor_email = ? WHERE id = ?', [data.visitor_email, id]);
  if (data.visitor_phone) await run('UPDATE conversations SET visitor_phone = ? WHERE id = ?', [data.visitor_phone, id]);
}

export async function addChatMessage(conversationId: string, role: 'user' | 'assistant', content: string) {
  const id = uuidv4();
  await run('INSERT INTO chat_messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)', [id, conversationId, role, content]);
  await run("UPDATE conversations SET updated_at = datetime('now'), status = 'active' WHERE id = ?", [conversationId]);
  return one('SELECT * FROM chat_messages WHERE id = ?', [id]);
}

export async function getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  return all<ChatMessage>('SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC', [conversationId]);
}

export async function updateConversationStatus(id: string, status: string) {
  await run('UPDATE conversations SET status = ? WHERE id = ?', [status, id]);
}

export async function updateConversationMode(id: string, mode: string) {
  await run('UPDATE conversations SET mode = ? WHERE id = ?', [mode, id]);
}

export async function deleteConversation(id: string) {
  await run('DELETE FROM conversations WHERE id = ?', [id]);
}

// --- Users ---
export async function getAllUsers() {
  return all('SELECT id, username, created_at FROM users ORDER BY created_at ASC');
}

export async function getUserByUsername(username: string) {
  return one<{ id: string; username: string; password_hash: string }>('SELECT * FROM users WHERE username = ?', [username]);
}

export async function createUser(username: string, password: string) {
  const id = uuidv4();
  const hash = hashPassword(password);
  await run('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)', [id, username, hash]);
  return one('SELECT id, username, created_at FROM users WHERE id = ?', [id]);
}

export async function deleteUser(id: string) {
  await run('DELETE FROM users WHERE id = ?', [id]);
}

export async function getUserCount(): Promise<number> {
  const res = await one<{ c: number }>('SELECT COUNT(*) as c FROM users');
  return Number(res?.c ?? 0);
}

// --- Visitors ---
export async function upsertVisitor(data: {
  siteId: string;
  sessionId: string;
  ipAddress?: string;
  countryCode?: string;
  currentPage?: string;
  referrer?: string;
  deviceType?: string;
  browser?: string;
  userAgent?: string;
  visitorName?: string;
}) {
  const existing = await one<{ id: string; page_history: string | null; current_page: string | null }>(
    'SELECT id, page_history, current_page FROM visitors WHERE session_id = ? AND site_id = ?',
    [data.sessionId, data.siteId]
  );

  if (existing) {
    let history: { page: string; time: string }[] = [];
    try { history = JSON.parse(existing.page_history || '[]'); } catch {}
    if (data.currentPage && data.currentPage !== existing.current_page) {
      history.push({ page: data.currentPage, time: new Date().toISOString() });
      if (history.length > 15) history = history.slice(-15);
    }
    await run(
      "UPDATE visitors SET current_page = ?, last_seen = datetime('now'), visitor_name = COALESCE(?, visitor_name), ip_address = COALESCE(ip_address, ?), country_code = COALESCE(country_code, ?), device_type = COALESCE(device_type, ?), browser = COALESCE(browser, ?), page_history = ? WHERE id = ?",
      [data.currentPage ?? null, data.visitorName ?? null, data.ipAddress ?? null, data.countryCode ?? null, data.deviceType ?? null, data.browser ?? null, JSON.stringify(history), existing.id]
    );
  } else {
    const id = uuidv4();
    const history = data.currentPage ? JSON.stringify([{ page: data.currentPage, time: new Date().toISOString() }]) : '[]';
    await run(
      "INSERT INTO visitors (id, site_id, session_id, ip_address, country_code, current_page, referrer, device_type, browser, user_agent, visitor_name, first_seen, page_history) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)",
      [id, data.siteId, data.sessionId, data.ipAddress ?? null, data.countryCode ?? null, data.currentPage ?? null, data.referrer ?? null, data.deviceType ?? null, data.browser ?? null, data.userAgent ?? null, data.visitorName ?? null, history]
    );
  }
}

export async function getActiveVisitors(siteId?: string) {
  let query = `
    SELECT v.*, s.name as site_name, s.domain as site_domain, c.id as conversation_id
    FROM visitors v
    JOIN sites s ON s.id = v.site_id
    LEFT JOIN conversations c ON c.session_id = v.session_id AND c.site_id = v.site_id
    WHERE v.last_seen > datetime('now', '-3 minutes')
  `;
  const params: InValue[] = [];
  if (siteId) { query += ' AND v.site_id = ?'; params.push(siteId); }
  query += ' ORDER BY v.last_seen DESC';
  return all(query, params);
}

export async function getVisitorStats() {
  await ensureInit();
  const c = getClient();
  const [todayCount, topCountries, hourlyData] = await Promise.all([
    c.execute("SELECT COUNT(*) as count FROM visitors WHERE first_seen > datetime('now', 'start of day')"),
    c.execute("SELECT country_code, COUNT(*) as count FROM visitors WHERE first_seen > datetime('now', '-7 days') AND country_code IS NOT NULL GROUP BY country_code ORDER BY count DESC LIMIT 5"),
    c.execute("SELECT CAST(strftime('%H', last_seen) AS INTEGER) as hour, COUNT(*) as count FROM visitors WHERE last_seen > datetime('now', '-24 hours') GROUP BY hour ORDER BY hour"),
  ]);
  return {
    todayCount: Number(todayCount.rows[0]?.count ?? 0),
    topCountries: topCountries.rows as unknown as { country_code: string; count: number }[],
    hourlyData: hourlyData.rows as unknown as { hour: number; count: number }[],
  };
}

export async function createProactiveMessage(siteId: string, sessionId: string, message: string) {
  const conv = await getOrCreateConversation(siteId, sessionId);
  await updateConversationMode(conv.id, 'human');
  await addChatMessage(conv.id, 'assistant', message);
  return conv;
}

export async function cleanupVisitors() {
  await run("DELETE FROM visitors WHERE last_seen < datetime('now', '-30 minutes')");
}

// --- Stats ---
export async function getStats() {
  await ensureInit();
  const c = getClient();
  const [total, unread, replied, sites, conversations, activeConversations] = await Promise.all([
    c.execute('SELECT COUNT(*) as c FROM messages'),
    c.execute("SELECT COUNT(*) as c FROM messages WHERE status = 'unread'"),
    c.execute("SELECT COUNT(*) as c FROM messages WHERE status = 'replied'"),
    c.execute('SELECT COUNT(*) as c FROM sites'),
    c.execute('SELECT COUNT(*) as c FROM conversations'),
    c.execute("SELECT COUNT(*) as c FROM conversations WHERE status = 'active'"),
  ]);
  return {
    total: Number(total.rows[0].c),
    unread: Number(unread.rows[0].c),
    replied: Number(replied.rows[0].c),
    sites: Number(sites.rows[0].c),
    conversations: Number(conversations.rows[0].c),
    activeConversations: Number(activeConversations.rows[0].c),
  };
}
