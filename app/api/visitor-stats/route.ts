import { NextResponse } from 'next/server';
import { getVisitorStats } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const stats = await getVisitorStats();
  return NextResponse.json(stats);
}
