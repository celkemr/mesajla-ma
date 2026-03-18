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
  `);

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
  return getDb().prepare('SELECT * FROM sites WHERE api_key = ?').get(apiKey);
}

export function getSiteById(id: string) {
  return getDb().prepare('SELECT * FROM sites WHERE id = ?').get(id);
}

export function createSite(name: string, domain: string) {
  const id = uuidv4();
  const apiKey = `mk_${uuidv4().replace(/-/g, '')}`;
  getDb().prepare('INSERT INTO sites (id, name, domain, api_key) VALUES (?, ?, ?, ?)').run(id, name, domain, apiKey);
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
  };
}
