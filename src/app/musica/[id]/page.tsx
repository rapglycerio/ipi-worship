import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import SongPageClient from './SongPageClient';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const { data } = await supabase
    .from('master_songs')
    .select('title, original_composer, song_versions(key, is_default, version_artists(artist_name))')
    .eq('id', id)
    .single();

  if (!data) return { title: 'Música não encontrada' };

  const versions = (data.song_versions || []) as {
    key: string | null;
    is_default: boolean;
    version_artists: { artist_name: string }[];
  }[];
  const version = versions.find((v) => v.is_default) || versions[0];
  const artists = version?.version_artists?.map((a) => a.artist_name).join(', ');

  const parts = ['Cifra completa'];
  if (artists) parts.push(artists);
  else if (data.original_composer) parts.push(data.original_composer);
  if (version?.key) parts.push(`Tom: ${version.key}`);
  const description = parts.join(' · ');

  return {
    title: data.title,
    description,
    openGraph: {
      title: `🎵 ${data.title}`,
      description,
      // O merge de metadata é raso: sem repetir aqui, a imagem do layout se perde
      images: [{ url: '/icons/icon-512x512.png', width: 512, height: 512 }],
    },
  };
}

export default function SongPage({ params }: Props) {
  return <SongPageClient params={params} />;
}
