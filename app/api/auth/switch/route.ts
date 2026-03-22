import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, createToken } from '@/lib/auth';
import { getUserById } from '@/lib/db';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const data = verifyToken(token);
  if (!data || data.username !== 'celkemr') {
    return NextResponse.json({ error: 'Sadece süper admin bu işlemi yapabilir' }, { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId gerekli' }, { status: 400 });

  const targetUser = await getUserById(userId);
  if (!targetUser) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });

  if (targetUser.username === 'celkemr') {
    return NextResponse.json({ error: 'Kendinize bağlanamazsınız' }, { status: 400 });
  }

  const newToken = createToken(targetUser.id, targetUser.username);
  const res = NextResponse.json({ success: true });

  // Orijinal token'ı sakla (geri dönmek için)
  res.cookies.set('original_auth_token', token, {
    httpOnly: true, path: '/', maxAge: 7 * 24 * 60 * 60, sameSite: 'lax',
  });
  res.cookies.set('auth_token', newToken, {
    httpOnly: true, path: '/', maxAge: 7 * 24 * 60 * 60, sameSite: 'lax',
  });

  return res;
}
