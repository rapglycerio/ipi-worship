import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import PlaylistPageClient from './PlaylistPageClient';

type Props = { params: Promise<{ id: string }> };

const SERVICE_LABELS: Record<string, string> = {
  manha: 'Culto da Manhã',
  noite: 'Culto da Noite',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const { data } = await supabase
    .from('playlists')
    .select('name, service_type, service_date, worship_arrangements(id)')
    .eq('id', id)
    .single();

  if (!data) return { title: 'Playlist não encontrada' };

  const count = data.worship_arrangements?.length ?? 0;
  const parts: string[] = [];
  if (data.service_date) {
    // service_date é DATE puro; UTC evita voltar um dia no fuso de Brasília
    const formatted = new Date(data.service_date).toLocaleDateString('pt-BR', {
      timeZone: 'UTC',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    parts.push(SERVICE_LABELS[data.service_type] || 'Culto');
    parts.push(formatted);
  }
  parts.push(`${count} ${count === 1 ? 'música' : 'músicas'}`);
  const description = `Repertório: ${parts.join(' · ')}`;

  return {
    title: data.name,
    description,
    openGraph: {
      title: `🎵 ${data.name}`,
      description,
      // O merge de metadata é raso: sem repetir aqui, a imagem do layout se perde
      images: [{ url: '/icons/icon-512x512.png', width: 512, height: 512 }],
    },
  };
}

export default function PlaylistPage() {
  return <PlaylistPageClient />;
}
