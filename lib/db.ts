import { createClient, Client, InValue } from '@libsql/client';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from './auth';

let _client: Client | null = null;
let _initialized = false;
let _ayhanMigrated = false;

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
  const c = getClient();
  if (!_ayhanMigrated) {
    _ayhanMigrated = true;
    await _assignNullSites(c);
  }
  if (_initialized) return;
  _initialized = true;

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
      user_id TEXT,
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

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      conversation_id TEXT,
      name TEXT,
      email TEXT,
      phone TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      id TEXT PRIMARY KEY,
      ip_address TEXT NOT NULL,
      username TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address, created_at);
    CREATE INDEX IF NOT EXISTS idx_visitors_site_first ON visitors(site_id, first_seen);
    CREATE INDEX IF NOT EXISTS idx_visitors_site_last ON visitors(site_id, last_seen);
    CREATE INDEX IF NOT EXISTS idx_visitors_last_seen ON visitors(last_seen);
    CREATE INDEX IF NOT EXISTS idx_visitors_session ON visitors(site_id, session_id);
  `);

  // Mevcut tablolara widget kolonlarını ekle (migration)
  const migrations = [
    "ALTER TABLE conversations ADD COLUMN mode TEXT NOT NULL DEFAULT 'ai'",
    "ALTER TABLE conversations ADD COLUMN visitor_phone TEXT",
    "ALTER TABLE visitors ADD COLUMN referrer TEXT",
    "ALTER TABLE visitors ADD COLUMN device_type TEXT",
    "ALTER TABLE visitors ADD COLUMN browser TEXT",
    "ALTER TABLE visitors ADD COLUMN user_agent TEXT",
    "ALTER TABLE visitors ADD COLUMN visitor_name TEXT",
    "ALTER TABLE visitors ADD COLUMN last_seen TEXT",
    "ALTER TABLE visitors ADD COLUMN first_seen TEXT",
    "ALTER TABLE visitors ADD COLUMN page_history TEXT DEFAULT '[]'",
    "ALTER TABLE sites ADD COLUMN widget_position TEXT NOT NULL DEFAULT 'bottom-right'",
    "ALTER TABLE sites ADD COLUMN widget_color TEXT NOT NULL DEFAULT '#2563eb'",
    "ALTER TABLE sites ADD COLUMN widget_welcome_message TEXT NOT NULL DEFAULT 'Merhaba! Size nasıl yardımcı olabilirim?'",
    "ALTER TABLE sites ADD COLUMN widget_typing_indicator INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE sites ADD COLUMN widget_online_indicator INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE sites ADD COLUMN widget_language TEXT NOT NULL DEFAULT 'tr'",
    "ALTER TABLE sites ADD COLUMN telegram_bot_token TEXT",
    "ALTER TABLE sites ADD COLUMN telegram_chat_id TEXT",
    "ALTER TABLE sites ADD COLUMN webhook_url TEXT",
    "ALTER TABLE sites ADD COLUMN hubspot_api_key TEXT",
    "ALTER TABLE sites ADD COLUMN pipedrive_api_key TEXT",
    "ALTER TABLE sites ADD COLUMN pipedrive_domain TEXT",
    "ALTER TABLE conversations ADD COLUMN summary TEXT",
    "ALTER TABLE chat_messages ADD COLUMN file_url TEXT",
    "ALTER TABLE sites ADD COLUMN user_id TEXT",
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

  // Süper admin celkemr yoksa oluştur
  const sa = await c.execute({ sql: 'SELECT id FROM users WHERE username = ?', args: ['celkemr'] });
  if (sa.rows.length === 0) {
    const id = uuidv4();
    const hash = hashPassword('celkemr2024!');
    await c.execute({ sql: 'INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)', args: [id, 'celkemr', hash] });
  }

  // Ayhan kullanıcısı yoksa oluştur (şifre: ayhan2024!)
  const ay = await c.execute({ sql: 'SELECT id FROM users WHERE username = ?', args: ['Ayhan'] });
  if (ay.rows.length === 0) {
    const id = uuidv4();
    const hash = hashPassword('ayhan2024!');
    await c.execute({ sql: 'INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)', args: [id, 'Ayhan', hash] });
  }
}

async function _assignNullSites(c: Client): Promise<void> {
  const ayhan = await c.execute({ sql: 'SELECT id FROM users WHERE username = ?', args: ['Ayhan'] });
  if (ayhan.rows.length > 0) {
    const ayhanId = ayhan.rows[0].id as string;
    await c.execute({ sql: 'UPDATE sites SET user_id = ? WHERE user_id IS NULL', args: [ayhanId] });
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
  telegram_bot_token: string | null;
  telegram_chat_id: string | null;
  webhook_url: string | null;
  hubspot_api_key: string | null;
  pipedrive_api_key: string | null;
  pipedrive_domain: string | null;
  user_id: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  file_url: string | null;
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
  summary: string | null;
  created_at: string;
  updated_at: string;
}

// --- Sites ---
export async function getAllSites(userId?: string) {
  if (userId) {
    return all(`
      SELECT s.*, COUNT(m.id) as message_count,
      SUM(CASE WHEN m.status = 'unread' THEN 1 ELSE 0 END) as unread_count
      FROM sites s
      LEFT JOIN messages m ON m.site_id = s.id
      WHERE s.user_id = ?
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `, [userId]);
  }
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
  userId?: string,
) {
  const id = uuidv4();
  const apiKey = `mk_${uuidv4().replace(/-/g, '')}`;
  await run(
    'INSERT INTO sites (id, name, domain, api_key, bot_name, system_prompt, widget_position, widget_color, widget_welcome_message, widget_typing_indicator, widget_online_indicator, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, name, domain, apiKey, botName, systemPrompt, widgetPosition, widgetColor, widgetWelcomeMessage, widgetTypingIndicator, widgetOnlineIndicator, userId ?? null],
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
  telegram_bot_token?: string | null;
  telegram_chat_id?: string | null;
  webhook_url?: string | null;
  hubspot_api_key?: string | null;
  pipedrive_api_key?: string | null;
  pipedrive_domain?: string | null;
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
export async function getAllMessages(
  filters: { siteId?: string; status?: string; search?: string; userId?: string; limit?: number; offset?: number } = {},
) {
  let query = `
    SELECT m.*, s.name as site_name, s.domain as site_domain,
    (SELECT COUNT(*) FROM replies r WHERE r.message_id = m.id) as reply_count
    FROM messages m JOIN sites s ON s.id = m.site_id WHERE 1=1
  `;
  const params: InValue[] = [];
  if (filters.userId) { query += ' AND s.user_id = ?'; params.push(filters.userId); }
  if (filters.siteId) { query += ' AND m.site_id = ?'; params.push(filters.siteId); }
  if (filters.status) { query += ' AND m.status = ?'; params.push(filters.status); }
  if (filters.search) {
    query += ' AND (m.sender_name LIKE ? OR m.sender_email LIKE ? OR m.subject LIKE ? OR m.content LIKE ?)';
    params.push(...Array(4).fill(`%${filters.search}%`));
  }
  query += ' ORDER BY m.created_at DESC';
  // Sayfalama: limit verilmezse eskisi gibi tamamı döner (mevcut çağrılar bozulmasın).
  if (filters.limit != null) {
    const limit = Math.max(1, Math.min(Math.floor(Number(filters.limit)), 200));
    const offset = Math.max(0, Math.floor(Number(filters.offset) || 0));
    query += ` LIMIT ${limit} OFFSET ${offset}`;
  }
  return all(query, params);
}

// Aynı filtrelerle toplam kayıt sayısı (sayfalama için)
export async function countAllMessages(
  filters: { siteId?: string; status?: string; search?: string; userId?: string } = {},
) {
  let query = 'SELECT COUNT(*) AS n FROM messages m JOIN sites s ON s.id = m.site_id WHERE 1=1';
  const params: InValue[] = [];
  if (filters.userId) { query += ' AND s.user_id = ?'; params.push(filters.userId); }
  if (filters.siteId) { query += ' AND m.site_id = ?'; params.push(filters.siteId); }
  if (filters.status) { query += ' AND m.status = ?'; params.push(filters.status); }
  if (filters.search) {
    query += ' AND (m.sender_name LIKE ? OR m.sender_email LIKE ? OR m.subject LIKE ? OR m.content LIKE ?)';
    params.push(...Array(4).fill(`%${filters.search}%`));
  }
  const r = await one<{ n: number }>(query, params);
  return Number(r?.n ?? 0);
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
export async function getAllConversations(filters: { siteId?: string; status?: string; userId?: string } = {}) {
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
  if (filters.userId) { query += ' AND s.user_id = ?'; params.push(filters.userId); }
  if (filters.siteId) { query += ' AND c.site_id = ?'; params.push(filters.siteId); }
  if (filters.status) { query += ' AND c.status = ?'; params.push(filters.status); }
  query += ' GROUP BY c.id HAVING COUNT(cm.id) > 0 OR c.visitor_name IS NOT NULL OR c.visitor_email IS NOT NULL OR c.visitor_phone IS NOT NULL ORDER BY c.updated_at DESC';
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

export async function addChatMessage(conversationId: string, role: 'user' | 'assistant', content: string, fileUrl?: string | null) {
  const id = uuidv4();
  if (fileUrl) {
    await run('INSERT INTO chat_messages (id, conversation_id, role, content, file_url) VALUES (?, ?, ?, ?, ?)', [id, conversationId, role, content, fileUrl]);
  } else {
    await run('INSERT INTO chat_messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)', [id, conversationId, role, content]);
  }
  await run("UPDATE conversations SET updated_at = datetime('now'), status = 'active' WHERE id = ?", [conversationId]);
  return one('SELECT * FROM chat_messages WHERE id = ?', [id]);
}

export async function getConversationMessageCount(conversationId: string): Promise<number> {
  const res = await one<{ c: number }>('SELECT COUNT(*) as c FROM chat_messages WHERE conversation_id = ?', [conversationId]);
  return Number(res?.c ?? 0);
}

export async function updateConversationSummary(id: string, summary: string) {
  await run('UPDATE conversations SET summary = ? WHERE id = ?', [summary, id]);
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

// --- Leads ---
export interface Lead {
  id: string;
  site_id: string;
  conversation_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  site_name?: string;
}

export async function getAllLeads(
  filters: { siteId?: string; status?: string; userId?: string; followUp?: boolean } = {},
) {
  // message_count: müşteri adayının kaç mesaj yazdığı. 0 ise formu doldurup
  // hiç yazmadan çıkmış demektir — bunlar geri dönülmesi gereken en sıcak grup.
  let query = `
    SELECT l.*, s.name as site_name,
      (SELECT COUNT(*) FROM chat_messages m
        WHERE m.conversation_id = l.conversation_id AND m.role = 'user') AS message_count
    FROM leads l
    JOIN sites s ON s.id = l.site_id
    WHERE 1=1
  `;
  const params: InValue[] = [];
  if (filters.userId) { query += ' AND s.user_id = ?'; params.push(filters.userId); }
  if (filters.siteId) { query += ' AND l.site_id = ?'; params.push(filters.siteId); }
  if (filters.status) { query += ' AND l.status = ?'; params.push(filters.status); }
  if (filters.followUp) {
    query += ` AND l.status = 'new' AND (SELECT COUNT(*) FROM chat_messages m
                 WHERE m.conversation_id = l.conversation_id AND m.role = 'user') = 0`;
  }
  query += ' ORDER BY l.created_at DESC';
  return all<Lead>(query, params);
}

export async function getLeadByConversation(conversationId: string) {
  return one<Lead>('SELECT * FROM leads WHERE conversation_id = ?', [conversationId]);
}

export async function createLead(data: { siteId: string; conversationId?: string; name?: string; email?: string; phone?: string }) {
  const id = uuidv4();
  await run(
    'INSERT INTO leads (id, site_id, conversation_id, name, email, phone) VALUES (?, ?, ?, ?, ?, ?)',
    [id, data.siteId, data.conversationId || null, data.name || null, data.email || null, data.phone || null],
  );
  return one<Lead>('SELECT * FROM leads WHERE id = ?', [id]);
}

export async function updateLead(id: string, data: { status?: string; notes?: string; name?: string; email?: string; phone?: string }) {
  const entries = Object.entries(data).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;
  const fields = entries.map(([k]) => `${k} = ?`).join(', ');
  const values = entries.map(([, v]) => v);
  await run(`UPDATE leads SET ${fields} WHERE id = ?`, [...values, id]);
}

export async function deleteLead(id: string) {
  await run('DELETE FROM leads WHERE id = ?', [id]);
}

export async function assignNullSitesToUser(username: string): Promise<number> {
  await ensureInit();
  const c = getClient();
  const userRow = await c.execute({ sql: 'SELECT id FROM users WHERE username = ?', args: [username] });
  if (userRow.rows.length === 0) return 0;
  const targetId = userRow.rows[0].id as string;
  const result = await c.execute({ sql: 'UPDATE sites SET user_id = ? WHERE user_id IS NULL', args: [targetId] });
  return result.rowsAffected;
}

// --- Users ---
export async function getAllUsers() {
  return all('SELECT id, username, created_at FROM users ORDER BY created_at ASC');
}

export async function getUserByUsername(username: string) {
  return one<{ id: string; username: string; password_hash: string }>('SELECT * FROM users WHERE username = ?', [username]);
}

export async function getUserById(id: string) {
  return one<{ id: string; username: string }>('SELECT id, username FROM users WHERE id = ?', [id]);
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

// --- Raporlar ---

// Dönüşüm hunisi: ziyaretçi -> widget açıldı -> form -> yazdı -> lead -> müşteri
export async function getFunnel(opts: { userId?: string; siteId?: string; days?: number } = {}) {
  await ensureInit();
  const c = getClient();
  const gun = Math.max(1, Math.min(Math.floor(Number(opts.days) || 30), 365));
  const pencere = `-${gun} days`;

  const kosul = (alias: string) => {
    const parcalar: string[] = [];
    if (opts.userId) parcalar.push(`s.user_id = '${opts.userId.replace(/'/g, "''")}'`);
    if (opts.siteId) parcalar.push(`${alias}.site_id = '${opts.siteId.replace(/'/g, "''")}'`);
    return parcalar.length ? ' AND ' + parcalar.join(' AND ') : '';
  };

  const [ziyaretci, acildi, form, yazdi, lead, musteri] = await Promise.all([
    c.execute(`SELECT COUNT(*) n FROM visitors v JOIN sites s ON s.id=v.site_id WHERE v.first_seen > datetime('now','${pencere}')${kosul('v')}`),
    c.execute(`SELECT COUNT(*) n FROM conversations o JOIN sites s ON s.id=o.site_id WHERE o.created_at > datetime('now','${pencere}')${kosul('o')}`),
    c.execute(`SELECT COUNT(*) n FROM conversations o JOIN sites s ON s.id=o.site_id WHERE o.created_at > datetime('now','${pencere}')${kosul('o')} AND (o.visitor_name IS NOT NULL OR o.visitor_email IS NOT NULL OR o.visitor_phone IS NOT NULL)`),
    c.execute(`SELECT COUNT(*) n FROM conversations o JOIN sites s ON s.id=o.site_id WHERE o.created_at > datetime('now','${pencere}')${kosul('o')} AND EXISTS (SELECT 1 FROM chat_messages m WHERE m.conversation_id=o.id AND m.role='user')`),
    c.execute(`SELECT COUNT(*) n FROM leads l JOIN sites s ON s.id=l.site_id WHERE l.created_at > datetime('now','${pencere}')${kosul('l')}`),
    c.execute(`SELECT COUNT(*) n FROM leads l JOIN sites s ON s.id=l.site_id WHERE l.created_at > datetime('now','${pencere}')${kosul('l')} AND l.status='converted'`),
  ]);

  const say = (r: { rows: Record<string, unknown>[] }) => Number(r.rows[0]?.n ?? 0);
  return {
    gun,
    ziyaretci: say(ziyaretci),
    widgetAcildi: say(acildi),
    formDolduruldu: say(form),
    mesajYazdi: say(yazdi),
    lead: say(lead),
    musteriOldu: say(musteri),
  };
}

// Trafik kaynakları: hangi referrer ziyaretçi getiriyor ve kaçı lead'e dönüyor.
// Ziyaretçi ile konuşma session_id + site_id üzerinden eşleşiyor.
export async function getTrafficSources(opts: { userId?: string; siteId?: string; days?: number } = {}) {
  await ensureInit();
  const gun = Math.max(1, Math.min(Math.floor(Number(opts.days) || 30), 365));
  const params: InValue[] = [];
  let filtre = '';
  if (opts.userId) { filtre += ' AND s.user_id = ?'; params.push(opts.userId); }
  if (opts.siteId) { filtre += ' AND v.site_id = ?'; params.push(opts.siteId); }

  return all<{ kaynak: string; ziyaretci: number; lead: number }>(
    `SELECT
       COALESCE(NULLIF(v.referrer,''), '(doğrudan)') AS kaynak,
       COUNT(*) AS ziyaretci,
       SUM(CASE WHEN EXISTS (
         SELECT 1 FROM conversations o JOIN leads l ON l.conversation_id = o.id
         WHERE o.session_id = v.session_id AND o.site_id = v.site_id
       ) THEN 1 ELSE 0 END) AS lead
     FROM visitors v
     JOIN sites s ON s.id = v.site_id
     WHERE v.first_seen > datetime('now', '-${gun} days')${filtre}
     GROUP BY kaynak
     ORDER BY ziyaretci DESC
     LIMIT 15`,
    params,
  );
}

export async function getActiveVisitors(siteId?: string, userId?: string) {
  let query = `
    SELECT v.*, s.name as site_name, s.domain as site_domain, c.id as conversation_id
    FROM visitors v
    JOIN sites s ON s.id = v.site_id
    LEFT JOIN conversations c ON c.session_id = v.session_id AND c.site_id = v.site_id
    WHERE v.last_seen > datetime('now', '-3 minutes')
  `;
  const params: InValue[] = [];
  if (userId) { query += ' AND s.user_id = ?'; params.push(userId); }
  if (siteId) { query += ' AND v.site_id = ?'; params.push(siteId); }
  query += ' ORDER BY v.last_seen DESC';
  return all(query, params);
}

export async function getVisitorStats(userId?: string, siteId?: string, days: number = 7) {
  await ensureInit();
  const c = getClient();
  // SQL'e gömüldüğü için tam sayıya zorla (enjeksiyon önlemi)
  const safeDays = Math.max(1, Math.min(Math.floor(Number(days)) || 7, 365));
  const dayFilter = `-${safeDays} days`;

  if (siteId) {
    // Süper admin (userId undefined) tüm siteleri görebilir; diğer kullanıcılar
    // yalnızca kendi sitelerini — aksi halde başka kiracının verisi sızar.
    const ownerFilter = userId ? ' AND s.user_id = ?' : '';
    const args: InValue[] = userId ? [siteId, userId] : [siteId];
    const [todayCount, topCountries, hourlyData] = await Promise.all([
      c.execute({ sql: `SELECT COUNT(*) as count FROM visitors v JOIN sites s ON s.id = v.site_id WHERE v.site_id = ?${ownerFilter} AND v.first_seen > datetime('now', 'start of day')`, args }),
      c.execute({ sql: `SELECT v.country_code, COUNT(*) as count FROM visitors v JOIN sites s ON s.id = v.site_id WHERE v.site_id = ?${ownerFilter} AND v.first_seen > datetime('now', '${dayFilter}') AND v.country_code IS NOT NULL GROUP BY v.country_code ORDER BY count DESC LIMIT 5`, args }),
      c.execute({ sql: `SELECT CAST(strftime('%H', v.last_seen) AS INTEGER) as hour, COUNT(*) as count FROM visitors v JOIN sites s ON s.id = v.site_id WHERE v.site_id = ?${ownerFilter} AND v.last_seen > datetime('now', '-24 hours') GROUP BY hour ORDER BY hour`, args }),
    ]);
    return {
      todayCount: Number(todayCount.rows[0]?.count ?? 0),
      topCountries: topCountries.rows as unknown as { country_code: string; count: number }[],
      hourlyData: hourlyData.rows as unknown as { hour: number; count: number }[],
    };
  }

  if (userId) {
    const args: InValue[] = [userId];
    const [todayCount, topCountries, hourlyData] = await Promise.all([
      c.execute({ sql: "SELECT COUNT(*) as count FROM visitors v JOIN sites s ON s.id = v.site_id WHERE s.user_id = ? AND v.first_seen > datetime('now', 'start of day')", args }),
      c.execute({ sql: `SELECT v.country_code, COUNT(*) as count FROM visitors v JOIN sites s ON s.id = v.site_id WHERE s.user_id = ? AND v.first_seen > datetime('now', '${dayFilter}') AND v.country_code IS NOT NULL GROUP BY v.country_code ORDER BY count DESC LIMIT 5`, args }),
      c.execute({ sql: "SELECT CAST(strftime('%H', v.last_seen) AS INTEGER) as hour, COUNT(*) as count FROM visitors v JOIN sites s ON s.id = v.site_id WHERE s.user_id = ? AND v.last_seen > datetime('now', '-24 hours') GROUP BY hour ORDER BY hour", args }),
    ]);
    return {
      todayCount: Number(todayCount.rows[0]?.count ?? 0),
      topCountries: topCountries.rows as unknown as { country_code: string; count: number }[],
      hourlyData: hourlyData.rows as unknown as { hour: number; count: number }[],
    };
  }

  const [todayCount, topCountries, hourlyData] = await Promise.all([
    c.execute("SELECT COUNT(*) as count FROM visitors WHERE first_seen > datetime('now', 'start of day')"),
    c.execute({ sql: `SELECT country_code, COUNT(*) as count FROM visitors WHERE first_seen > datetime('now', '${dayFilter}') AND country_code IS NOT NULL GROUP BY country_code ORDER BY count DESC LIMIT 5`, args: [] }),
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

// --- Giriş denemesi sınırlama (brute-force) ---
// Sayaç veritabanında tutuluyor; Vercel istekleri farklı sunuculara dağıttığı için
// bellekte tutmak koruma sağlamıyordu.

export async function countRecentLoginFailures(ip: string, windowMinutes: number): Promise<number> {
  await ensureInit();
  const c = getClient();
  const res = await c.execute({
    sql: `SELECT COUNT(*) AS c FROM login_attempts WHERE ip_address = ? AND created_at > datetime('now', '-${Math.floor(windowMinutes)} minutes')`,
    args: [ip],
  });
  return Number(res.rows[0]?.c ?? 0);
}

export async function recordLoginFailure(ip: string, username?: string) {
  await ensureInit();
  await run('INSERT INTO login_attempts (id, ip_address, username) VALUES (?, ?, ?)', [
    uuidv4(),
    ip,
    username ?? null,
  ]);
}

export async function clearLoginFailures(ip: string) {
  await ensureInit();
  await run('DELETE FROM login_attempts WHERE ip_address = ?', [ip]);
}

export async function cleanupLoginAttempts() {
  await run("DELETE FROM login_attempts WHERE created_at < datetime('now', '-1 day')");
}

// DİKKAT: Buradaki pencere istatistiklerin kapsamını belirler. Eskiden 30 dakikaydı
// ve tablo 30 dakikadan fazlasını hiç tutmadığı için 7/30 günlük ülke ve trafik
// istatistikleri boş çıkıyordu. "Aktif ziyaretçi" görünümü bu silmeye bağlı değil;
// o sorgu zaten last_seen > -3 dakika ile filtreliyor.
export async function cleanupVisitors() {
  await run("DELETE FROM visitors WHERE last_seen < datetime('now', '-90 days')");
}

// --- Stats ---
export async function getStats(userId?: string) {
  await ensureInit();
  const c = getClient();
  if (userId) {
    const [total, unread, replied, sites, conversations, activeConversations] = await Promise.all([
      c.execute({ sql: 'SELECT COUNT(*) as c FROM messages m JOIN sites s ON s.id = m.site_id WHERE s.user_id = ?', args: [userId] }),
      c.execute({ sql: "SELECT COUNT(*) as c FROM messages m JOIN sites s ON s.id = m.site_id WHERE s.user_id = ? AND m.status = 'unread'", args: [userId] }),
      c.execute({ sql: "SELECT COUNT(*) as c FROM messages m JOIN sites s ON s.id = m.site_id WHERE s.user_id = ? AND m.status = 'replied'", args: [userId] }),
      c.execute({ sql: 'SELECT COUNT(*) as c FROM sites WHERE user_id = ?', args: [userId] }),
      c.execute({ sql: 'SELECT COUNT(*) as c FROM conversations cv JOIN sites s ON s.id = cv.site_id WHERE s.user_id = ?', args: [userId] }),
      c.execute({ sql: "SELECT COUNT(*) as c FROM conversations cv JOIN sites s ON s.id = cv.site_id WHERE s.user_id = ? AND cv.status = 'active'", args: [userId] }),
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
