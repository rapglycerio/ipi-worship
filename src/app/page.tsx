'use client';

import { useSongs, usePlaylists } from '@/hooks/useData';
import SongCard from '@/components/SongCard';
import {
  CalendarDays,
  Music2,
  Loader2,
  ChevronRight,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import type { Playlist } from '@/types';

function getNextSevenDays(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function serviceLabel(type: string): string {
  const map: Record<string, string> = {
    manha: 'da Manhã', noite: 'da Noite', especial: 'Especial', estudo: 'de Estudo',
  };
  return map[type] ?? type;
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

export default function Home() {
  const { songs, loading: songsLoading } = useSongs();
  const { playlists, loading: playlistsLoading } = usePlaylists();

  const loading = songsLoading || playlistsLoading;

  // Filter to playlists within the next 7 days (today inclusive)
  const { start, end } = getNextSevenDays();
  const upcomingPlaylists = playlists
    .filter((pl) => {
      const d = new Date(pl.serviceDate + 'T12:00:00');
      return d >= start && d <= end;
    })
    .sort((a, b) => a.serviceDate.localeCompare(b.serviceDate));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted">Carregando repertório...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-info/5" />
        <div className="relative px-5 py-8 md:px-8 md:py-12">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse-glow" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent">
                Culto Dominical
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight leading-tight">
              Playlist da Semana
            </h1>
            <p className="text-sm text-muted mt-2 max-w-lg">
              Repertório preparado para os próximos cultos. Todas as cifras com controle de tom e arranjo.
            </p>
          </div>
        </div>
      </section>

      {/* Upcoming playlists */}
      <section className="px-5 md:px-8 pb-12">
        {upcomingPlaylists.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Clock className="w-10 h-10 text-subtle mb-3" />
            <p className="text-sm font-medium text-muted mb-1">Nenhuma playlist nos próximos 7 dias.</p>
            <Link href="/playlists" className="text-xs text-accent hover:underline mt-1 cursor-pointer">
              Ver todas as playlists →
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {upcomingPlaylists.map((playlist, pi) => (
              <PlaylistSection
                key={playlist.id}
                playlist={playlist}
                songs={songs}
                animOffset={pi * 3}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PlaylistSection({
  playlist,
  songs,
  animOffset,
}: {
  playlist: Playlist;
  songs: ReturnType<typeof useSongs>['songs'];
  animOffset: number;
}) {
  const playlistSongs = playlist.arrangements
    .map((arr) => songs.find((s) => s.id === arr.masterSongId)!)
    .filter(Boolean);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">{playlist.name}</h2>
            <p className="text-xs text-muted">
              {formatShortDate(playlist.serviceDate)} · Culto {serviceLabel(playlist.serviceType)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-subtle bg-elevated px-2.5 py-1 rounded-md">
            {playlistSongs.length} músicas
          </span>
          <Link
            href="/playlists"
            className="p-1.5 text-subtle hover:text-accent transition-colors"
            aria-label="Ver playlists"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {playlistSongs.length === 0 ? (
        <div className="flex items-center gap-2 py-4 text-sm text-subtle">
          <Music2 className="w-4 h-4" />
          Nenhuma música nesta playlist ainda.
        </div>
      ) : (
        <div className="space-y-2">
          {playlistSongs.map((song, i) => (
            <div key={song.id} className="animate-slide-up" style={{ animationDelay: `${(animOffset + i) * 60}ms` }}>
              <SongCard song={song} index={i} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
