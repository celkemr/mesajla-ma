import { NextRequest, NextResponse } from 'next/server';
import { getConversationById, updateConversationStatus, deleteConversation } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conv = getConversationById(id);
  if (!conv) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
  return NextResponse.json(conv);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status } = await req.json();
  updateConversationStatus(id, status);
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteConversation(id);
  return NextResponse.json({ success: true });
}
