import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deletePlaylist } from '@/lib/data-admin';

/** Logged-in users may delete a playlist; anonymous clients may not. */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
  const ok = await deletePlaylist(body.id);
  return NextResponse.json({ ok });
}
