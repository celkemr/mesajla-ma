import { NextRequest, NextResponse } from 'next/server';
import { deleteUser, getUserCount } from '@/lib/db';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // En az 1 kullanıcı kalsın
  if (getUserCount() <= 1) {
    return NextResponse.json({ error: 'Son kullanıcı silinemez' }, { status: 400 });
  }
  deleteUser(id);
  return NextResponse.json({ success: true });
}
