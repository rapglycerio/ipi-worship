'use client';

import { useState } from 'react';
import { Search, X, Plus, Loader2 } from 'lucide-react';
import { searchRank } from '@/lib/search';
import type { MasterSong } from '@/types';

/** Picker de músicas para adicionar a uma playlist, com busca ranqueada. */
export default function AddSongModal({
  songs,
  existingIds,
  onAdd,
  onClose,
}: {
  songs: MasterSong[];
  existingIds: string[];
  onAdd: (song: MasterSong) => Promise<void>;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState<string | null>(null);

  const available = songs
    .filter((s) => !existingIds.includes(s.id))
    .map((s) => {
      const rank = searchRank({ title: s.title, artists: s.versions.flatMap((v) => v.artists) }, search);
      return rank === null ? null : { song: s, rank };
    })
    .filter((x): x is { song: MasterSong; rank: number } => x !== null)
    .sort((a, b) => a.rank - b.rank || a.song.title.localeCompare(b.song.title))
    .map((x) => x.song);

  const handleAdd = async (song: MasterSong) => {
    setAdding(song.id);
    await onAdd(song);
    setAdding(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl animate-slide-up flex flex-col max-h-[70vh]">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Adicionar Música</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-subtle hover:text-foreground cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar música…"
              className="w-full pl-9 pr-3 py-2 bg-elevated border border-border rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-accent/50 transition-all"
              autoFocus
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
          {available.length === 0 ? (
            <p className="text-center text-sm text-muted py-8">Nenhuma música disponível.</p>
          ) : (
            available.map((song) => {
              const version = song.versions.find((v) => v.isDefault) ?? song.versions[0];
              return (
                <button
                  key={song.id}
                  onClick={() => handleAdd(song)}
                  disabled={adding === song.id}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-elevated hover:bg-border transition-all cursor-pointer disabled:opacity-50 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{song.title}</p>
                    {version && (
                      <p className="text-[11px] text-muted truncate">
                        {version.artists.join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    {version && (
                      <span className="text-[10px] font-bold text-accent bg-accent-subtle px-2 py-0.5 rounded-md">
                        {version.key}
                      </span>
                    )}
                    {adding === song.id ? (
                      <Loader2 className="w-4 h-4 text-accent animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 text-subtle" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
