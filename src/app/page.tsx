'use client';

import { mockSongs, mockPlaylist, liturgicalTagLabels } from '@/data/mock-songs';
import SongCard from '@/components/SongCard';
import {
  CalendarDays,
  ListMusic,
  TrendingUp,
  Music2,
  Library,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const playlistSongs = mockPlaylist.arrangements.map((arr) => {
    return mockSongs.find((s) => s.id === arr.masterSongId)!;
  }).filter(Boolean);

  const approvedCount = mockSongs.filter((s) => s.analysis?.status === 'approved').length;
  const totalCount = mockSongs.length;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
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
              Repertório preparado para o culto. Todas as cifras disponíveis com controle de tom, fonte e arranjo modular.
            </p>
          </div>
        </div>
      </section>

      {/* Playlist Header */}
      <section className="px-5 md:px-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">{mockPlaylist.name}</h2>
              <p className="text-xs text-muted capitalize">
                Culto {mockPlaylist.serviceType === 'manha' ? 'da Manhã' : mockPlaylist.serviceType === 'noite' ? 'da Noite' : mockPlaylist.serviceType}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-subtle bg-elevated px-2.5 py-1 rounded-md">
            {playlistSongs.length} músicas
          </span>
        </div>

        {/* Songs List */}
        <div className="space-y-2 mb-8">
          {playlistSongs.map((song, i) => (
            <div key={song.id} className="animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
              <SongCard song={song} index={i} />
            </div>
          ))}
        </div>
      </section>

      {/* Quick Stats */}
      <section className="px-5 md:px-8 mb-8">
        <h3 className="text-xs font-bold uppercase tracking-widest text-subtle mb-3">
          Visão Geral
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={Library}
            label="Total Músicas"
            value={totalCount.toString()}
          />
          <StatCard
            icon={TrendingUp}
            label="Aprovadas"
            value={`${approvedCount}/${totalCount}`}
            accent
          />
          <StatCard
            icon={ListMusic}
            label="Playlists"
            value="1"
          />
          <StatCard
            icon={Music2}
            label="Artistas"
            value={new Set(mockSongs.flatMap(s => s.versions.flatMap(v => v.artists))).size.toString()}
          />
        </div>
      </section>

      {/* All Songs Preview */}
      <section className="px-5 md:px-8 pb-12">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-subtle">
            Repertório Completo
          </h3>
          <Link
            href="/musicas"
            className="flex items-center gap-1 text-xs text-accent font-medium hover:underline cursor-pointer"
          >
            Ver tudo
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="space-y-2">
          {mockSongs.map((song, i) => (
            <div key={song.id} className="animate-slide-up" style={{ animationDelay: `${(playlistSongs.length + i) * 60}ms` }}>
              <SongCard song={song} compact />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// --- Stat Card Component ---
function StatCard({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: typeof Library;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-accent/20 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${accent ? 'text-accent' : 'text-subtle'}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-subtle">{label}</span>
      </div>
      <p className={`text-xl font-bold ${accent ? 'text-accent' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}
