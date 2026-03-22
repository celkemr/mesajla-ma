import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const originalToken = req.cookies.get('original_auth_token')?.value;
  if (!originalToken) {
    return NextResponse.json({ error: 'Orijinal oturum bulunamadı' }, { status: 400 });
  }

  const data = verifyToken(originalToken);
  if (!data || data.username !== 'celkemr') {
    return NextResponse.json({ error: 'Geçersiz orijinal oturum' }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set('auth_token', originalToken, {
    httpOnly: true, path: '/', maxAge: 7 * 24 * 60 * 60, sameSite: 'lax',
  });
  res.cookies.set('original_auth_token', '', {
    httpOnly: true, path: '/', maxAge: 0,
  });

  return res;
}
