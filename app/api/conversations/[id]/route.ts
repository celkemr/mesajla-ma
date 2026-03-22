import { NextRequest, NextResponse } from 'next/server';
import { getConversationById, updateConversationStatus, updateConversationMode, deleteConversation, addChatMessage } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conv = await getConversationById(id);
  if (!conv) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
  return NextResponse.json(conv);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  if (body.status) await updateConversationStatus(id, body.status);
  if (body.mode) await updateConversationMode(id, body.mode);
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: 'Mesaj boş olamaz' }, { status: 400 });
  const msg = await addChatMessage(id, 'assistant', content.trim());
  return NextResponse.json(msg);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteConversation(id);
  return NextResponse.json({ success: true });
}
