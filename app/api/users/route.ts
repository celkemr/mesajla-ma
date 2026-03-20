import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, createUser, getUserByUsername } from '@/lib/db';

export async function GET() {
  return NextResponse.json(await getAllUsers());
}

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: 'Kullanıcı adı ve şifre gerekli' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Şifre en az 6 karakter olmalı' }, { status: 400 });
  }
  const existing = await getUserByUsername(username);
  if (existing) {
    return NextResponse.json({ error: 'Bu kullanıcı adı zaten kullanılıyor' }, { status: 409 });
  }
  const user = await createUser(username, password);
  return NextResponse.json(user, { status: 201 });
}
