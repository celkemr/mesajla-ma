import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByUsername,
  countRecentLoginFailures,
  recordLoginFailure,
  clearLoginFailures,
  cleanupLoginAttempts,
} from '@/lib/db';
import { verifyPassword, createToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  const failures = await countRecentLoginFailures(ip, WINDOW_MINUTES);
  if (failures >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: `Çok fazla hatalı deneme. ${WINDOW_MINUTES} dakika sonra tekrar deneyin.` },
      { status: 429 }
    );
  }

  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: 'Kullanıcı adı ve şifre gerekli' }, { status: 400 });
  }

  const user = await getUserByUsername(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    await recordLoginFailure(ip, String(username).slice(0, 100));
    const kalan = Math.max(0, MAX_ATTEMPTS - (failures + 1));
    return NextResponse.json(
      {
        error: kalan > 0
          ? `Kullanıcı adı veya şifre hatalı. ${kalan} deneme hakkınız kaldı.`
          : `Kullanıcı adı veya şifre hatalı. Hesap ${WINDOW_MINUTES} dakika kilitlendi.`,
      },
      { status: 401 }
    );
  }

  await clearLoginFailures(ip);
  cleanupLoginAttempts().catch(() => {});

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
