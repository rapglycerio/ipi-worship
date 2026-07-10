import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPrivatePlaylistsForOwner } from '@/lib/data-admin';

/** Retorna as playlists particulares do usuário logado (vazio se anônimo). */
export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ playlists: [] });
  }
  const playlists = await getPrivatePlaylistsForOwner(email);
  return NextResponse.json({ playlists });
}
