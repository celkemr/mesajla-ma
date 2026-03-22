import { NextRequest, NextResponse } from 'next/server';
import { getAllLeads, createLead } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const siteId = searchParams.get('site_id') || undefined;
  const status = searchParams.get('status') || undefined;
  return NextResponse.json(await getAllLeads({ siteId, status }));
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const lead = await createLead({
    siteId: data.site_id,
    conversationId: data.conversation_id,
    name: data.name,
    email: data.email,
    phone: data.phone,
  });
  return NextResponse.json(lead);
}
