import crypto from 'crypto';
import type { NextRequest } from 'next/server';

if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET env var is required');
const SECRET = process.env.SESSION_SECRET;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch {
    return false;
  }
}

export function createToken(userId: string, username: string): string {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ userId, username, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

// Süper admin kullanıcı adı
export const SUPER_ADMIN = 'celkemr';

// Request'ten mevcut kullanıcıyı al
// Süper admin ise userId=undefined döner (tüm verileri görebilir)
// Normal kullanıcı ise kendi userId'sini döner
export function getCurrentUser(req: NextRequest): { userId?: string; username: string } | null {
  const token = req.cookies.get('auth_token')?.value;
  if (!token) return null;
  const data = verifyToken(token);
  if (!data) return null;
  if (data.username === SUPER_ADMIN) return { username: data.username, userId: undefined };
  return { userId: data.userId, username: data.username };
}

export function verifyToken(token: string): { userId: string; username: string; exp: number } | null {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expectedSig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}
