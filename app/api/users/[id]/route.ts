import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { deleteUser, getUserById, getUserCount, updateUserProfile } from '@/lib/db';
import { verifyToken, SUPER_ADMIN } from '@/lib/auth';

function superAdminMi(req: NextRequest): boolean {
  const token = req.cookies.get('auth_token')?.value;
  const data = token ? verifyToken(token) : null;
  return data?.username === SUPER_ADMIN;
}

// Okunması kolay ama tahmin edilmesi zor şifre (karışan karakterler yok: O/0, l/1)
function sifreUret(uzunluk = 14): string {
  const harfler = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from(crypto.randomBytes(uzunluk))
    .map(b => harfler[b % harfler.length])
    .join('');
}

// Şifre değiştirme / sıfırlama — yalnızca süper admin
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!superAdminMi(req)) {
    return NextResponse.json({ error: 'Bu işlem için süper admin olmalısınız' }, { status: 403 });
  }

  const { id } = await params;
  const user = await getUserById(id);
  if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });

  // Süper admin kendi şifresini buradan değiştiremez: oturumu ele geçiren biri
  // mevcut şifreyi bilmeden hesabı kilitleyemesin. Kendi şifresi için "Hesabım".
  if (user.username === SUPER_ADMIN) {
    return NextResponse.json(
      { error: 'Kendi şifrenizi "Hesabım" sayfasından değiştirin' },
      { status: 400 },
    );
  }

  const { newPassword, action } = await req.json().catch(() => ({}));

  // Rastgele şifre üret ve bir kez göster
  if (action === 'reset') {
    const uretilen = sifreUret();
    await updateUserProfile(id, { password: uretilen });
    return NextResponse.json({ success: true, username: user.username, password: uretilen });
  }

  // Belirli bir şifre ata
  if (!newPassword || String(newPassword).length < 8) {
    return NextResponse.json({ error: 'Yeni şifre en az 8 karakter olmalı' }, { status: 400 });
  }
  await updateUserProfile(id, { password: String(newPassword) });
  return NextResponse.json({ success: true, username: user.username });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!superAdminMi(req)) {
    return NextResponse.json({ error: 'Bu işlem için süper admin olmalısınız' }, { status: 403 });
  }

  const { id } = await params;

  // Süper admin silinemez
  const user = await getUserById(id);
  if (user?.username === SUPER_ADMIN) {
    return NextResponse.json({ error: 'Süper admin silinemez' }, { status: 403 });
  }

  const count = await getUserCount();
  if (count <= 1) {
    return NextResponse.json({ error: 'Son kullanıcı silinemez' }, { status: 400 });
  }
  await deleteUser(id);
  return NextResponse.json({ success: true });
}
