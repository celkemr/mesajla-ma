import { NextRequest, NextResponse } from 'next/server';
import { getUserWithHash, updateUserProfile, usernameTaken } from '@/lib/db';
import { getCurrentUser, verifyPassword, createToken, verifyToken, SUPER_ADMIN } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Oturumdaki gerçek kullanıcı kimliği. getCurrentUser süper admin için userId
// döndürmüyor (tüm veriyi görebilsin diye), o yüzden token'dan okuyoruz.
function oturumKullanicisi(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  if (!getCurrentUser(req)) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  const oturum = oturumKullanicisi(req);
  if (!oturum) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const user = await getUserWithHash(oturum.userId);
  if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });

  return NextResponse.json({ id: user.id, username: user.username, email: user.email });
}

export async function PATCH(req: NextRequest) {
  if (!getCurrentUser(req)) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  const oturum = oturumKullanicisi(req);
  if (!oturum) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const user = await getUserWithHash(oturum.userId);
  if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });

  const { username, email, currentPassword, newPassword } = await req.json();

  // Her değişiklik için mevcut şifre şart: çalınan bir oturumla hesap ele geçirilmesin.
  if (!currentPassword || !verifyPassword(currentPassword, user.password_hash)) {
    return NextResponse.json({ error: 'Mevcut şifreniz hatalı' }, { status: 403 });
  }

  const guncelleme: { username?: string; email?: string | null; password?: string } = {};

  if (username !== undefined) {
    const yeni = String(username).trim();
    if (yeni.length < 3) {
      return NextResponse.json({ error: 'Kullanıcı adı en az 3 karakter olmalı' }, { status: 400 });
    }
    if (yeni !== user.username) {
      if (user.username === SUPER_ADMIN) {
        return NextResponse.json({ error: 'Süper admin kullanıcı adı değiştirilemez' }, { status: 400 });
      }
      if (yeni.toLowerCase() === SUPER_ADMIN.toLowerCase()) {
        return NextResponse.json({ error: 'Bu kullanıcı adı ayrılmıştır' }, { status: 400 });
      }
      if (await usernameTaken(yeni, user.id)) {
        return NextResponse.json({ error: 'Bu kullanıcı adı zaten kullanılıyor' }, { status: 409 });
      }
      guncelleme.username = yeni;
    }
  }

  if (email !== undefined) {
    const yeni = String(email).trim();
    if (yeni && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(yeni)) {
      return NextResponse.json({ error: 'Geçerli bir e-posta adresi girin' }, { status: 400 });
    }
    guncelleme.email = yeni || null;
  }

  if (newPassword) {
    if (String(newPassword).length < 8) {
      return NextResponse.json({ error: 'Yeni şifre en az 8 karakter olmalı' }, { status: 400 });
    }
    guncelleme.password = String(newPassword);
  }

  if (Object.keys(guncelleme).length === 0) {
    return NextResponse.json({ error: 'Değişiklik yok' }, { status: 400 });
  }

  await updateUserProfile(user.id, guncelleme);

  const res = NextResponse.json({
    success: true,
    username: guncelleme.username ?? user.username,
    email: guncelleme.email !== undefined ? guncelleme.email : user.email,
  });

  // Kullanıcı adı token'ın içinde; değiştiyse çerezi yenile yoksa oturum düşer.
  if (guncelleme.username) {
    res.cookies.set('auth_token', createToken(user.id, guncelleme.username), {
      httpOnly: true,
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
      sameSite: 'lax',
    });
  }

  return res;
}
