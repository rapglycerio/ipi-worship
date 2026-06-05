import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { setUserAdmin } from '@/lib/data-admin';

/** Admin-only: promote/demote a user. Enforced server-side, not just in the UI. */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body.userId !== 'string' || typeof body.admin !== 'boolean') {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
  const ok = await setUserAdmin(body.userId, body.admin);
  return NextResponse.json({ ok });
}
