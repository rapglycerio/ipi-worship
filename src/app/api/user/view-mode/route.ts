import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { setViewModePreference } from '@/lib/data-admin';

const VALID_MODES = ['chords_and_lyrics', 'lyrics_only'];

/** Salva a preferência de visualização (cifra+letra / só letra) do usuário logado. */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body || !VALID_MODES.includes(body.viewMode)) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
  const ok = await setViewModePreference(session.user.email, body.viewMode);
  return NextResponse.json({ ok });
}
