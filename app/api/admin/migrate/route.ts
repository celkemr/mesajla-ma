import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { assignNullSitesToUser } from '@/lib/db';

export async function POST(req: NextRequest) {
  const user = getCurrentUser(req);
  if (!user || user.username !== 'celkemr') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
  }

  const { targetUsername } = await req.json();
  if (!targetUsername) {
    return NextResponse.json({ error: 'targetUsername gerekli' }, { status: 400 });
  }

  const updatedRows = await assignNullSitesToUser(targetUsername);
  return NextResponse.json({ success: true, updatedRows });
}
