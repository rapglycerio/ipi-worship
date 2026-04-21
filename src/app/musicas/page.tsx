'use client';

import { useState, useMemo } from 'react';
import { mockSongs, liturgicalTagLabels, getDefaultVersion } from '@/data/mock-songs';
import SongCard from '@/components/SongCard';
import type { LiturgicalTag, SongNature } from '@/types';
import {
  Search,
  Filter,
  X,
  Library,
  Tag,
  Music2,
} from 'lucide-react';

const allTags: LiturgicalTag[] = [
  'introducao', 'exaltacao', 'adoracao', 'intercessao', 'perdao',
  'ceia', 'consagracao', 'despedida', 'ofertorio', 'apelo',
];

export default function MusicasPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNature, setSelectedNature] = useState<SongNature | 'all'>('all');
  const [selectedTag, setSelectedTag] = useState<LiturgicalTag | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filteredSongs = useMemo(() => {
    return mockSongs.filter((song) => {
      // Text search (title, artists, lyrics)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = song.title.toLowerCase().includes(q);
        const artistMatch = song.versions.some((v) =>
          v.artists.some((a) => a.toLowerCase().includes(q))
        );
        // Search within lyrics
        const lyricsMatch = song.versions.some((v) =>
          v.blocks.some((b) =>
            b.lines.some((l) => l.lyrics.toLowerCase().includes(q))
          )
        );
        if (!titleMatch && !artistMatch && !lyricsMatch) return false;
      }

      // Nature filter
      if (selectedNature !== 'all' && song.nature !== selectedNature) return false;

      // Tag filter
      if (selectedTag && !song.liturgicalTags.includes(selectedTag)) return false;

      return true;
    });
  }, [searchQuery, selectedNature, selectedTag]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-5 md:px-8 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Library className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Todas as Músicas</h1>
            <p className="text-xs text-muted">{mockSongs.length} músicas no acervo</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, artista ou trecho da letra..."
            className="w-full pl-10 pr-10 py-2.5 bg-elevated border border-border rounded-xl text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 touch-target"
              aria-label="Limpar busca"
            >
              <X className="w-4 h-4 text-subtle" />
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer
            transition-all duration-200
            ${showFilters ? 'bg-accent-subtle text-accent' : 'bg-elevated text-muted hover:bg-border'}
          `}
        >
          <Filter className="w-3.5 h-3.5" />
          Filtros
          {(selectedNature !== 'all' || selectedTag) && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          )}
        </button>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-3 p-4 bg-card border border-border rounded-xl animate-fade-in">
            {/* Nature */}
            <div className="mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-subtle mb-2">
                Tipo
              </p>
              <div className="flex items-center gap-2">
                {[
                  { value: 'all' as const, label: 'Todos' },
                  { value: 'louvor' as const, label: 'Louvor' },
                  { value: 'hino' as const, label: 'Hino' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedNature(opt.value)}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all
                      ${selectedNature === opt.value
                        ? 'bg-accent text-white'
                        : 'bg-elevated text-muted hover:bg-border'
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Liturgical Tags */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-subtle mb-2">
                Momento Litúrgico
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className={`
                      inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer transition-all
                      ${selectedTag === tag
                        ? 'bg-accent text-white'
                        : 'bg-elevated text-muted hover:bg-border'
                      }
                    `}
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {liturgicalTagLabels[tag]}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            {(selectedNature !== 'all' || selectedTag) && (
              <button
                onClick={() => { setSelectedNature('all'); setSelectedTag(null); }}
                className="mt-3 text-xs text-accent font-medium hover:underline cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="px-5 md:px-8 pb-12">
        {filteredSongs.length === 0 ? (
          <div className="text-center py-12">
            <Music2 className="w-10 h-10 text-subtle mx-auto mb-3" />
            <p className="text-sm text-muted">Nenhuma música encontrada.</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedNature('all'); setSelectedTag(null); }}
              className="text-xs text-accent hover:underline mt-2 cursor-pointer"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSongs.map((song, i) => (
              <div key={song.id} className="animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                <SongCard song={song} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
