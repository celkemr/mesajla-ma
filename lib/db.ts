import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from './auth';

const DB_PATH = path.join(process.cwd(), 'data.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      domain TEXT NOT NULL,
      api_key TEXT NOT NULL UNIQUE,
      bot_name TEXT NOT NULL DEFAULT 'Asistan',
      system_prompt TEXT NOT NULL DEFAULT 'Sen yardımcı bir asistansın.',
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
      status TEXT NOT NULL DEFAULT 'active',
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
  `);

  // Mevcut sites tablosuna yeni kolonları ekle (varsa hata vermez)
  try { db.exec(`ALTER TABLE sites ADD COLUMN bot_name TEXT NOT NULL DEFAULT 'Asistan'`); } catch {}
  try { db.exec(`ALTER TABLE sites ADD COLUMN system_prompt TEXT NOT NULL DEFAULT 'Sen yardımcı bir asistansın.'`); } catch {}

  // Varsayılan admin kullanıcısı yoksa oluştur
  const count = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (count === 0) {
    const id = uuidv4();
    const hash = hashPassword('admin123');
    db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)').run(id, 'admin', hash);
  }
}

// --- Sites ---
export function getAllSites() {
  const db = getDb();
  return db.prepare(`
    SELECT s.*, COUNT(m.id) as message_count,
    SUM(CASE WHEN m.status = 'unread' THEN 1 ELSE 0 END) as unread_count
    FROM sites s
    LEFT JOIN messages m ON m.site_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `).all();
}

export function getSiteByApiKey(apiKey: string) {
  return getDb().prepare('SELECT * FROM sites WHERE api_key = ?').get(apiKey) as Site | undefined;
}

export function getSiteById(id: string) {
  return getDb().prepare('SELECT * FROM sites WHERE id = ?').get(id) as Site | undefined;
}

export interface Site {
  id: string;
  name: string;
  domain: string;
  api_key: string;
  bot_name: string;
  system_prompt: string;
  created_at: string;
}

export function createSite(name: string, domain: string, botName = 'Asistan', systemPrompt = 'Sen yardımcı bir asistansın.') {
  const id = uuidv4();
  const apiKey = `mk_${uuidv4().replace(/-/g, '')}`;
  getDb().prepare('INSERT INTO sites (id, name, domain, api_key, bot_name, system_prompt) VALUES (?, ?, ?, ?, ?, ?)').run(id, name, domain, apiKey, botName, systemPrompt);
  return getDb().prepare('SELECT * FROM sites WHERE id = ?').get(id);
}

export function updateSite(id: string, data: { bot_name?: string; system_prompt?: string }) {
  const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
  const values = Object.values(data);
  getDb().prepare(`UPDATE sites SET ${fields} WHERE id = ?`).run(...values, id);
  return getDb().prepare('SELECT * FROM sites WHERE id = ?').get(id);
}

export function deleteSite(id: string) {
  return getDb().prepare('DELETE FROM sites WHERE id = ?').run(id);
}

// --- Messages ---
export function getAllMessages(filters: { siteId?: string; status?: string; search?: string } = {}) {
  let query = `
    SELECT m.*, s.name as site_name, s.domain as site_domain,
    (SELECT COUNT(*) FROM replies r WHERE r.message_id = m.id) as reply_count
    FROM messages m
    JOIN sites s ON s.id = m.site_id
    WHERE 1=1
  `;
  const params: (string)[] = [];
  if (filters.siteId) { query += ' AND m.site_id = ?'; params.push(filters.siteId); }
  if (filters.status) { query += ' AND m.status = ?'; params.push(filters.status); }
  if (filters.search) { query += ' AND (m.sender_name LIKE ? OR m.sender_email LIKE ? OR m.subject LIKE ? OR m.content LIKE ?)'; params.push(...Array(4).fill(`%${filters.search}%`)); }
  query += ' ORDER BY m.created_at DESC';
  return getDb().prepare(query).all(...params);
}

export function getMessageById(id: string) {
  const msg = getDb().prepare(`
    SELECT m.*, s.name as site_name, s.domain as site_domain
    FROM messages m JOIN sites s ON s.id = m.site_id
    WHERE m.id = ?
  `).get(id);
  if (!msg) return null;
  const replies = getDb().prepare('SELECT * FROM replies WHERE message_id = ? ORDER BY created_at ASC').all(id);
  return { ...(msg as object), replies };
}

export function createMessage(siteId: string, data: {
  sender_name?: string;
  sender_email?: string;
  subject?: string;
  content: string;
  extra_fields?: Record<string, unknown>;
}) {
  const id = uuidv4();
  getDb().prepare(`
    INSERT INTO messages (id, site_id, sender_name, sender_email, subject, content, extra_fields)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, siteId, data.sender_name || null, data.sender_email || null, data.subject || null, data.content, data.extra_fields ? JSON.stringify(data.extra_fields) : null);
  return getMessageById(id);
}

export function updateMessageStatus(id: string, status: string) {
  return getDb().prepare('UPDATE messages SET status = ? WHERE id = ?').run(status, id);
}

export function deleteMessage(id: string) {
  return getDb().prepare('DELETE FROM messages WHERE id = ?').run(id);
}

// --- Replies ---
export function createReply(messageId: string, content: string) {
  const id = uuidv4();
  getDb().prepare('INSERT INTO replies (id, message_id, content) VALUES (?, ?, ?)').run(id, messageId, content);
  updateMessageStatus(messageId, 'replied');
  return getDb().prepare('SELECT * FROM replies WHERE id = ?').get(id);
}

// --- Conversations ---
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
  status: string;
  created_at: string;
  updated_at: string;
}

export function getAllConversations(filters: { siteId?: string; status?: string } = {}) {
  let query = `
    SELECT c.*, s.name as site_name, s.domain as site_domain,
    COUNT(cm.id) as message_count,
    MAX(cm.created_at) as last_message_at
    FROM conversations c
    JOIN sites s ON s.id = c.site_id
    LEFT JOIN chat_messages cm ON cm.conversation_id = c.id
    WHERE 1=1
  `;
  const params: string[] = [];
  if (filters.siteId) { query += ' AND c.site_id = ?'; params.push(filters.siteId); }
  if (filters.status) { query += ' AND c.status = ?'; params.push(filters.status); }
  query += ' GROUP BY c.id ORDER BY c.updated_at DESC';
  return getDb().prepare(query).all(...params);
}

export function getConversationById(id: string) {
  const conv = getDb().prepare(`
    SELECT c.*, s.name as site_name, s.domain as site_domain, s.bot_name
    FROM conversations c JOIN sites s ON s.id = c.site_id
    WHERE c.id = ?
  `).get(id);
  if (!conv) return null;
  const messages = getDb().prepare('SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC').all(id);
  return { ...(conv as object), messages };
}

export function getOrCreateConversation(siteId: string, sessionId: string) {
  let conv = getDb().prepare('SELECT * FROM conversations WHERE session_id = ? AND site_id = ?').get(sessionId, siteId) as Conversation | undefined;
  if (!conv) {
    const id = uuidv4();
    getDb().prepare('INSERT INTO conversations (id, site_id, session_id) VALUES (?, ?, ?)').run(id, siteId, sessionId);
    conv = getDb().prepare('SELECT * FROM conversations WHERE id = ?').get(id) as Conversation;
  }
  return conv;
}

export function updateConversationVisitor(id: string, data: { visitor_name?: string; visitor_email?: string }) {
  if (data.visitor_name) getDb().prepare('UPDATE conversations SET visitor_name = ? WHERE id = ?').run(data.visitor_name, id);
  if (data.visitor_email) getDb().prepare('UPDATE conversations SET visitor_email = ? WHERE id = ?').run(data.visitor_email, id);
}

export function addChatMessage(conversationId: string, role: 'user' | 'assistant', content: string) {
  const id = uuidv4();
  getDb().prepare('INSERT INTO chat_messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)').run(id, conversationId, role, content);
  getDb().prepare("UPDATE conversations SET updated_at = datetime('now'), status = 'active' WHERE id = ?").run(conversationId);
  return getDb().prepare('SELECT * FROM chat_messages WHERE id = ?').get(id);
}

export function getConversationMessages(conversationId: string) {
  return getDb().prepare('SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC').all(conversationId) as ChatMessage[];
}

export function updateConversationStatus(id: string, status: string) {
  return getDb().prepare('UPDATE conversations SET status = ? WHERE id = ?').run(status, id);
}

export function deleteConversation(id: string) {
  return getDb().prepare('DELETE FROM conversations WHERE id = ?').run(id);
}

export function getConversationStats() {
  const db = getDb();
  return {
    total: (db.prepare('SELECT COUNT(*) as c FROM conversations').get() as { c: number }).c,
    active: (db.prepare("SELECT COUNT(*) as c FROM conversations WHERE status = 'active'").get() as { c: number }).c,
    closed: (db.prepare("SELECT COUNT(*) as c FROM conversations WHERE status = 'closed'").get() as { c: number }).c,
  };
}

// --- Users ---
export function getAllUsers() {
  return getDb().prepare('SELECT id, username, created_at FROM users ORDER BY created_at ASC').all();
}

export function getUserByUsername(username: string) {
  return getDb().prepare('SELECT * FROM users WHERE username = ?').get(username) as { id: string; username: string; password_hash: string } | undefined;
}

export function createUser(username: string, password: string) {
  const id = uuidv4();
  const hash = hashPassword(password);
  getDb().prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)').run(id, username, hash);
  return getDb().prepare('SELECT id, username, created_at FROM users WHERE id = ?').get(id);
}

export function deleteUser(id: string) {
  return getDb().prepare('DELETE FROM users WHERE id = ?').run(id);
}

export function getUserCount() {
  return (getDb().prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
}

// --- Stats ---
export function getStats() {
  const db = getDb();
  return {
    total: (db.prepare('SELECT COUNT(*) as c FROM messages').get() as { c: number }).c,
    unread: (db.prepare("SELECT COUNT(*) as c FROM messages WHERE status = 'unread'").get() as { c: number }).c,
    replied: (db.prepare("SELECT COUNT(*) as c FROM messages WHERE status = 'replied'").get() as { c: number }).c,
    sites: (db.prepare('SELECT COUNT(*) as c FROM sites').get() as { c: number }).c,
    conversations: (db.prepare('SELECT COUNT(*) as c FROM conversations').get() as { c: number }).c,
    activeConversations: (db.prepare("SELECT COUNT(*) as c FROM conversations WHERE status = 'active'").get() as { c: number }).c,
  };
}
