import { NextRequest, NextResponse } from 'next/server';
import { getMessageById, updateMessageStatus, deleteMessage } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const message = getMessageById(id);
  if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Auto-mark as read
  if ((message as unknown as { status: string }).status === 'unread') updateMessageStatus(id, 'read');

  return NextResponse.json(getMessageById(id));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status } = await req.json();
  if (!['unread', 'read', 'replied', 'archived'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }
  updateMessageStatus(id, status);
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteMessage(id);
  return NextResponse.json({ success: true });
}
