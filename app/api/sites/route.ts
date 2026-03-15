import { NextRequest, NextResponse } from 'next/server';
import { getAllSites, createSite } from '@/lib/db';

export async function GET() {
  return NextResponse.json(getAllSites());
}

export async function POST(req: NextRequest) {
  const { name, domain } = await req.json();
  if (!name?.trim() || !domain?.trim()) {
    return NextResponse.json({ error: 'name and domain are required' }, { status: 400 });
  }
  const site = createSite(name.trim(), domain.trim());
  return NextResponse.json(site);
}
