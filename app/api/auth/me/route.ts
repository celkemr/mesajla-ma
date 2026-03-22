import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const originalToken = req.cookies.get('original_auth_token')?.value;

  if (!token) return NextResponse.json({ user: null });

  const data = verifyToken(token);
  if (!data) return NextResponse.json({ user: null });

  const isSuperAdmin = data.username === 'celkemr';
  const isConnected = !!originalToken && !isSuperAdmin;

  return NextResponse.json({
    user: {
      id: data.userId,
      username: data.username,
      isSuperAdmin,
      isConnected, // true = celkemr başka kullanıcıya bağlı
    },
  });
}
