import { NextResponse } from 'next/server';
import { getActiveVisitors } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const visitors = await getActiveVisitors();
  return NextResponse.json({ visitors });
}
