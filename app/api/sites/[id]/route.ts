import { NextRequest, NextResponse } from 'next/server';
import { deleteSite, getSiteById } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = getSiteById(id);
  if (!site) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(site);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteSite(id);
  return NextResponse.json({ success: true });
}
