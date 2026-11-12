import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAppUserEmailById, setPasswordHash } from '@/lib/data-admin';
import { hashPassword, MIN_PASSWORD_LENGTH } from '@/lib/password';

/** Admin-only: define/redefine a senha de login por e-mail de um usuário. */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const userId = typeof body?.userId === 'string' ? body.userId : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!userId || password.length < MIN_PASSWORD_LENGTH || password.length > 200) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
  const email = await getAppUserEmailById(userId);
  if (!email) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const ok = await setPasswordHash(email, await hashPassword(password));
  return NextResponse.json({ ok });
}
