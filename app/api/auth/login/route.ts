import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername } from '@/lib/db';
import { verifyPassword, createToken } from '@/lib/auth';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 dakika

const attempts = new Map<string, { count: number; resetAt: number }>();

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isBlocked(ip: string): boolean {
  const entry = attempts.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) { attempts.delete(ip); return false; }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(ip: string): void {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count++;
  }
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  if (isBlocked(ip)) {
    return NextResponse.json(
      { error: 'Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.' },
      { status: 429 }
    );
  }

  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: 'Kullanıcı adı ve şifre gerekli' }, { status: 400 });
  }

  const user = await getUserByUsername(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    recordFailure(ip);
    return NextResponse.json({ error: 'Kullanıcı adı veya şifre hatalı' }, { status: 401 });
  }

  attempts.delete(ip);

  const token = createToken(user.id, user.username);
  const res = NextResponse.json({ success: true });
  res.cookies.set('auth_token', token, {
    httpOnly: true,
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
    sameSite: 'lax',
  });
  return res;
}
