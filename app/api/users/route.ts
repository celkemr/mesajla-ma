import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, createUser, getUserByUsername } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

const SUPER_ADMIN = 'celkemr';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const data = token ? verifyToken(token) : null;
  const isSuperAdmin = data?.username === SUPER_ADMIN;

  const users = await getAllUsers() as { id: string; username: string; created_at: string }[];

  // Süper admini normal kullanıcılardan gizle
  const filtered = isSuperAdmin
    ? users
    : users.filter(u => u.username !== SUPER_ADMIN);

  return NextResponse.json(filtered);
}

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: 'Kullanıcı adı ve şifre gerekli' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Şifre en az 6 karakter olmalı' }, { status: 400 });
  }
  // celkemr adı rezerve
  if (username === SUPER_ADMIN) {
    return NextResponse.json({ error: 'Bu kullanıcı adı rezervedir' }, { status: 409 });
  }
  const existing = await getUserByUsername(username);
  if (existing) {
    return NextResponse.json({ error: 'Bu kullanıcı adı zaten kullanılıyor' }, { status: 409 });
  }
  const user = await createUser(username, password);
  return NextResponse.json(user, { status: 201 });
}
