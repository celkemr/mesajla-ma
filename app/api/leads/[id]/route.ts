import { NextRequest, NextResponse } from 'next/server';
import { updateLead, deleteLead } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();
  const allowed = ['status', 'notes', 'name', 'email', 'phone'];
  const filtered = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
  await updateLead(id, filtered);
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteLead(id);
  return NextResponse.json({ success: true });
}
