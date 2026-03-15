import { NextRequest, NextResponse } from 'next/server';
import { createReply, getMessageById } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const message = getMessageById(id);
  if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: 'content is required' }, { status: 400 });

  const reply = createReply(id, content.trim());
  return NextResponse.json(reply);
}
