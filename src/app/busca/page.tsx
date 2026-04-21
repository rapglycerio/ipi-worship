'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { mockSongs, liturgicalTagLabels, getDefaultVersion } from '@/data/mock-songs';
import SongCard from '@/components/SongCard';
import {
  Search,
  X,
  ArrowLeft,
  TrendingUp,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

export default function BuscaPage() {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return mockSongs.filter((song) => {
      const titleMatch = song.title.toLowerCase().includes(q);
      const artistMatch = song.versions.some((v) =>
        v.artists.some((a) => a.toLowerCase().includes(q))
      );
      const lyricsMatch = song.versions.some((v) =>
        v.blocks.some((b) =>
          b.lines.some((l) => l.lyrics.toLowerCase().includes(q))
        )
      );
      const composerMatch = song.originalComposer?.toLowerCase().includes(q) || false;
      return titleMatch || artistMatch || lyricsMatch || composerMatch;
    });
  }, [query]);

  const showSuggestions = !query.trim();

  return (
    <div className="min-h-screen">
      {/* Search Header */}
      <div className="px-5 md:px-8 pt-4 pb-2">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/"
            className="touch-target"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5 text-muted" />
          </Link>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nome, artista ou trecho da letra..."
              className="w-full pl-10 pr-10 py-3 bg-elevated border border-border rounded-xl text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 touch-target"
              >
                <X className="w-4 h-4 text-subtle" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="px-5 md:px-8 pb-12">
        {query.trim() && (
          <p className="text-[10px] font-bold uppercase tracking-widest text-subtle mb-3">
            {results.length} resultado{results.length !== 1 ? 's' : ''} para &quot;{query}&quot;
          </p>
        )}

        {query.trim() && results.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-10 h-10 text-subtle mx-auto mb-3" />
            <p className="text-sm text-muted">Nenhum resultado encontrado.</p>
            <p className="text-xs text-subtle mt-1">Tente outro termo ou trecho da letra.</p>
          </div>
        )}

        <div className="space-y-2">
          {results.map((song, i) => (
            <div key={song.id} className="animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
              <SongCard song={song} />
            </div>
          ))}
        </div>

        {/* Suggestions when empty */}
        {showSuggestions && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-accent" />
              <span className="text-xs font-semibold text-foreground">Sugestões rápidas</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {['Santo', 'Firme', 'Gratidão', 'Morada', 'Diante do Trono', 'exaltação'].map(
                (term) => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="px-3 py-1.5 rounded-lg bg-elevated text-xs text-muted hover:bg-border hover:text-foreground transition-colors cursor-pointer"
                  >
                    {term}
                  </button>
                )
              )}
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-subtle" />
                <span className="text-xs font-semibold text-foreground">Todo o Repertório</span>
              </div>
              <div className="space-y-2">
                {mockSongs.map((song, i) => (
                  <div key={song.id} className="animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                    <SongCard song={song} compact />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
