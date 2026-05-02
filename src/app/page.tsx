'use client';

import { useSongs, usePlaylists } from '@/hooks/useData';
import SongCard from '@/components/SongCard';
import {
  CalendarDays,
  Music2,
  Loader2,
  ChevronRight,
  Clock,
  Lightbulb,
  Plus,
  X,
  ListPlus,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import type { Playlist, SongSuggestion } from '@/types';

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
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin';

  const [suggestions, setSuggestions] = useState<SongSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [addingSuggestion, setAddingSuggestion] = useState<SongSuggestion | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { fetchSuggestions } = await import('@/lib/data');
        setSuggestions(await fetchSuggestions());
      } catch { /* ignore */ }
      finally { setSuggestionsLoading(false); }
    }
    load();
  }, []);

  async function handleDismissSuggestion(id: string) {
    const { removeSuggestion } = await import('@/lib/data');
    await removeSuggestion(id);
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }

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

      {/* Suggestions panel — visible to all, admin can add to playlist */}
      {!suggestionsLoading && suggestions.length > 0 && (
        <section className="px-5 md:px-8 mb-8">
          <div className="bg-elevated border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
              <Lightbulb className="w-4 h-4 text-warning shrink-0" />
              <h2 className="text-sm font-bold text-foreground flex-1">
                Sugestões da Congregação
              </h2>
              <span className="text-[11px] font-mono text-muted bg-card px-2 py-0.5 rounded-full border border-border">
                {suggestions.length}
              </span>
            </div>
            <ul className="divide-y divide-border">
              {suggestions.map((s) => {
                const song = songs.find((sg) => sg.id === s.masterSongId);
                const defaultVersion = song?.versions[0];
                return (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      {song ? (
                        <Link
                          href={`/musica/${song.id}`}
                          className="text-sm font-semibold text-foreground hover:text-accent transition-colors cursor-pointer truncate block"
                        >
                          {song.title}
                        </Link>
                      ) : (
                        <span className="text-sm font-semibold text-foreground truncate block">
                          {s.songTitle ?? 'Música'}
                        </span>
                      )}
                      <p className="text-xs text-muted truncate">
                        Sugerido por <span className="font-medium text-foreground">{s.suggestedByName}</span>
                        {s.message && <span className="text-subtle"> · {s.message}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isAdmin && song && defaultVersion && (
                        <button
                          onClick={() => setAddingSuggestion(s)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors cursor-pointer"
                          title="Adicionar à playlist"
                        >
                          <ListPlus className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Adicionar</span>
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => handleDismissSuggestion(s.id)}
                          className="p-1.5 rounded-lg text-subtle hover:text-foreground hover:bg-border transition-colors cursor-pointer"
                          title="Dispensar sugestão"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

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

      {/* Add suggestion to playlist modal */}
      {addingSuggestion && (() => {
        const song = songs.find((sg) => sg.id === addingSuggestion.masterSongId);
        const defaultVersion = song?.versions[0];
        if (!song || !defaultVersion) return null;
        return (
          <SuggestionAddModal
            songId={song.id}
            versionId={defaultVersion.id}
            suggestionId={addingSuggestion.id}
            songTitle={song.title}
            playlists={playlists}
            onClose={() => setAddingSuggestion(null)}
            onAdded={(suggestionId) => {
              setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
              setAddingSuggestion(null);
            }}
          />
        );
      })()}
    </div>
  );
}

// ─── Suggestion → Add to playlist modal ────────────────────────────────────

interface SuggestionAddModalProps {
  songId: string;
  versionId: string;
  suggestionId: string;
  songTitle: string;
  playlists: Playlist[];
  onClose: () => void;
  onAdded: (suggestionId: string) => void;
}

function SuggestionAddModal({
  songId, versionId, suggestionId, songTitle, playlists, onClose, onAdded,
}: SuggestionAddModalProps) {
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  async function handleAdd(playlistId: string) {
    setAddingId(playlistId);
    try {
      const { addSongToPlaylist, removeSuggestion } = await import('@/lib/data');
      const pl = playlists.find((p) => p.id === playlistId);
      const sortOrder = pl ? pl.arrangements.length : 0;
      await addSongToPlaylist({ playlistId, masterSongId: songId, versionId, sortOrder });
      await removeSuggestion(suggestionId);
      setAddedIds((prev) => new Set([...prev, playlistId]));
      // Close after a short delay so the user sees the ✓
      setTimeout(() => onAdded(suggestionId), 600);
    } catch {
      alert('Erro ao adicionar à playlist.');
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <p className="text-sm font-bold text-foreground">Adicionar à playlist</p>
            <p className="text-xs text-muted truncate max-w-[220px]">{songTitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-subtle hover:text-foreground hover:bg-elevated transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Playlist list */}
        <div className="max-h-72 overflow-y-auto">
          {playlists.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">Nenhuma playlist encontrada.</p>
          ) : (
            <ul className="divide-y divide-border">
              {playlists.map((pl) => {
                const added = addedIds.has(pl.id);
                const loading = addingId === pl.id;
                return (
                  <li key={pl.id}>
                    <button
                      onClick={() => !added && handleAdd(pl.id)}
                      disabled={loading || added}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer
                        ${added ? 'text-success bg-success/5' : 'text-foreground hover:bg-elevated'}
                        disabled:cursor-not-allowed`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{pl.name}</p>
                        <p className="text-xs text-muted">{formatShortDate(pl.serviceDate)}</p>
                      </div>
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-accent shrink-0" />
                      ) : added ? (
                        <Check className="w-4 h-4 text-success shrink-0" />
                      ) : (
                        <Plus className="w-4 h-4 text-accent shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Playlist section ────────────────────────────────────────────────────────

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
