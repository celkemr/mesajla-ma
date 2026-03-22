import { NextRequest, NextResponse } from 'next/server';
import { deleteUser, getUserById, getUserCount } from '@/lib/db';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Süper admin silinemez
  const user = await getUserById(id);
  if (user?.username === 'celkemr') {
    return NextResponse.json({ error: 'Süper admin silinemez' }, { status: 403 });
  }

  const count = await getUserCount();
  if (count <= 1) {
    return NextResponse.json({ error: 'Son kullanıcı silinemez' }, { status: 400 });
  }
  await deleteUser(id);
  return NextResponse.json({ success: true });
}
