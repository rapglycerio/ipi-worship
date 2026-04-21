'use client';

import { useState } from 'react';
import { mockSongs, mockPlaylist, getDefaultVersion, liturgicalTagLabels } from '@/data/mock-songs';
import SongCard from '@/components/SongCard';
import type { Playlist } from '@/types';
import {
  CalendarDays,
  ListMusic,
  Clock,
  Plus,
  ChevronRight,
  Music2,
  Users,
} from 'lucide-react';
import Link from 'next/link';

// For now, a single mock playlist. Will be dynamic from the database later.
const allPlaylists: Playlist[] = [mockPlaylist];

export default function PlaylistsPage() {
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  if (selectedPlaylist) {
    return <PlaylistDetail playlist={selectedPlaylist} onBack={() => setSelectedPlaylist(null)} />;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-5 md:px-8 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <ListMusic className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Playlists</h1>
              <p className="text-xs text-muted">{allPlaylists.length} playlist(s) salva(s)</p>
            </div>
          </div>
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold cursor-pointer hover:bg-accent/90 transition-colors"
            aria-label="Nova playlist"
          >
            <Plus className="w-4 h-4" />
            Nova Playlist
          </button>
        </div>
      </div>

      {/* Playlist List */}
      <div className="px-5 md:px-8 pb-12 space-y-3">
        {allPlaylists.map((pl) => {
          const songCount = pl.arrangements.length;
          const serviceLabel =
            pl.serviceType === 'manha' ? 'Manhã' :
            pl.serviceType === 'noite' ? 'Noite' :
            pl.serviceType === 'especial' ? 'Especial' : pl.serviceType;
          const formattedDate = new Date(pl.serviceDate + 'T12:00:00').toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });

          return (
            <button
              key={pl.id}
              onClick={() => setSelectedPlaylist(pl)}
              className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all duration-200 cursor-pointer group animate-slide-up"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-accent-subtle flex items-center justify-center shrink-0">
                    <CalendarDays className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground group-hover:text-accent transition-colors">
                      {pl.name}
                    </h3>
                    <p className="text-xs text-muted mt-0.5 capitalize">{formattedDate}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-accent bg-accent-subtle px-2 py-0.5 rounded-md">
                        Culto {serviceLabel}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-muted">
                        <Music2 className="w-3 h-3" />
                        {songCount} música{songCount !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-subtle">
                        <Users className="w-3 h-3" />
                        {pl.createdBy}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-subtle group-hover:text-accent transition-colors mt-1" />
              </div>

              {/* Song Pills Preview */}
              <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                {pl.arrangements.map((arr, i) => {
                  const song = mockSongs.find((s) => s.id === arr.masterSongId);
                  if (!song) return null;
                  return (
                    <span
                      key={arr.id}
                      className="text-[10px] font-medium text-muted bg-elevated px-2 py-1 rounded-md"
                    >
                      {i + 1}. {song.title}
                    </span>
                  );
                })}
              </div>
            </button>
          );
        })}

        {allPlaylists.length === 0 && (
          <div className="text-center py-16">
            <ListMusic className="w-12 h-12 text-subtle mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-1">Nenhuma playlist ainda</h2>
            <p className="text-sm text-muted">Crie sua primeira playlist para o culto de domingo.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Playlist Detail View ---

function PlaylistDetail({ playlist, onBack }: { playlist: Playlist; onBack: () => void }) {
  const songs = playlist.arrangements.map((arr) => {
    const song = mockSongs.find((s) => s.id === arr.masterSongId);
    return song ? { song, arrangement: arr } : null;
  }).filter(Boolean) as { song: (typeof mockSongs)[0]; arrangement: (typeof playlist.arrangements)[0] }[];

  const serviceLabel =
    playlist.serviceType === 'manha' ? 'da Manhã' :
    playlist.serviceType === 'noite' ? 'da Noite' :
    playlist.serviceType === 'especial' ? 'Especial' : playlist.serviceType;

  return (
    <div className="min-h-screen">
      {/* Back */}
      <div className="px-5 py-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-accent transition-colors cursor-pointer"
        >
          ← Voltar às playlists
        </button>
      </div>

      {/* Header */}
      <div className="px-5 md:px-8 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-accent-subtle flex items-center justify-center shrink-0">
            <CalendarDays className="w-7 h-7 text-accent" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
              {playlist.name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-muted capitalize">Culto {serviceLabel}</span>
              <span className="text-[10px] text-subtle">•</span>
              <span className="text-xs text-muted">Criado por {playlist.createdBy}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Songs Ordered */}
      <div className="px-5 md:px-8 pb-12">
        <p className="text-[10px] font-bold uppercase tracking-widest text-subtle mb-3">
          Ordem do Culto
        </p>
        <div className="space-y-2">
          {songs.map(({ song }, i) => (
            <div key={song.id} className="animate-slide-up" style={{ animationDelay: `${i * 70}ms` }}>
              <SongCard song={song} index={i} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
