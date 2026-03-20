import { NextRequest, NextResponse } from 'next/server';
import { deleteUser, getUserCount } from '@/lib/db';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const count = await getUserCount();
  if (count <= 1) {
    return NextResponse.json({ error: 'Son kullanıcı silinemez' }, { status: 400 });
  }
  await deleteUser(id);
  return NextResponse.json({ success: true });
}
