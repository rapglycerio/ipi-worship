import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteSong } from '@/lib/data-admin';

/** Admin-only: delete a master song (cascades to versions/blocks). */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
  const ok = await deleteSong(body.id);
  return NextResponse.json({ ok });
}
