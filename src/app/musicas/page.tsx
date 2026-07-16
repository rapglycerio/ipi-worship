'use client';

import { useState, useMemo } from 'react';
import { useSongs, usePlaylists } from '@/hooks/useData';
import { searchRank } from '@/lib/search';
import { liturgicalTagLabels } from '@/data/mock-songs';
import SongCard from '@/components/SongCard';
import type { LiturgicalTag, SongNature } from '@/types';
import {
  Search,
  Filter,
  X,
  Library,
  Tag,
  Music2,
  Loader2,
  TrendingUp,
  ListMusic,
  Users,
  CheckCircle2,
  Circle,
  Archive,
} from 'lucide-react';

const allTags: LiturgicalTag[] = [
  'introducao', 'exaltacao', 'adoracao', 'intercessao', 'perdao',
  'ceia', 'consagracao', 'despedida', 'ofertorio', 'apelo',
];

export default function MusicasPage() {
  const { songs, loading } = useSongs();
  const { playlists } = usePlaylists();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNature, setSelectedNature] = useState<SongNature | 'all'>('all');
  const [selectedTag, setSelectedTag] = useState<LiturgicalTag | null>(null);
  const [selectedAdjusted, setSelectedAdjusted] = useState<'all' | 'adjusted' | 'pending'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  const activeSongs = useMemo(() => songs.filter((s) => !s.isArchived), [songs]);
  const archivedSongs = useMemo(() => songs.filter((s) => s.isArchived), [songs]);
  const tabSongs = activeTab === 'archived' ? archivedSongs : activeSongs;

  const filteredSongs = useMemo(() => {
    const base = tabSongs.filter((song) => {
      if (selectedNature !== 'all' && song.nature !== selectedNature) return false;
      if (selectedTag && !song.liturgicalTags.includes(selectedTag)) return false;
      if (selectedAdjusted === 'adjusted' && !song.isAdjusted) return false;
      if (selectedAdjusted === 'pending' && song.isAdjusted) return false;
      return true;
    });

    if (!searchQuery.trim()) return base;

    // Com busca ativa, ordena por relevância: título > artista > letra
    return base
      .map((song) => {
        const rank = searchRank(
          {
            title: song.title,
            artists: song.versions.flatMap((v) => v.artists ?? []),
            lyrics: song.versions.flatMap((v) => v.blocks?.flatMap((b) => b.lines?.map((l) => l.lyrics)) ?? []),
          },
          searchQuery
        );
        return rank === null ? null : { song, rank };
      })
      .filter((x): x is { song: typeof songs[number]; rank: number } => x !== null)
      .sort((a, b) => a.rank - b.rank || a.song.title.localeCompare(b.song.title))
      .map((x) => x.song);
  }, [tabSongs, searchQuery, selectedNature, selectedTag, selectedAdjusted]);

  const approvedCount = songs.filter((s) => s.analysis?.status === 'approved').length;
  const pendingCount = songs.filter((s) => !s.analysis || s.analysis.status === 'pending').length;
  const artistCount = new Set(songs.flatMap((s) => s.versions.flatMap((v) => v.artists))).size;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

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
            <p className="text-xs text-muted">{songs.length} músicas no acervo</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeTab === 'active' ? 'bg-accent text-white' : 'bg-elevated text-muted hover:bg-border'
            }`}
          >
            <Library className="w-3.5 h-3.5" />
            Ativas
            <span className={activeTab === 'active' ? 'opacity-80' : 'text-subtle'}>({activeSongs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeTab === 'archived' ? 'bg-accent text-white' : 'bg-elevated text-muted hover:bg-border'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            Arquivadas
            <span className={activeTab === 'archived' ? 'opacity-80' : 'text-subtle'}>({archivedSongs.length})</span>
          </button>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Library className="w-3.5 h-3.5 text-subtle" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-subtle">Total</span>
              </div>
              <p className="text-xl font-bold text-foreground">{songs.length}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-accent" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-subtle">Aprovadas</span>
              </div>
              <p className="text-xl font-bold text-accent">{approvedCount}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <ListMusic className="w-3.5 h-3.5 text-subtle" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-subtle">Pendentes</span>
              </div>
              <p className="text-xl font-bold text-warning">{pendingCount}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Users className="w-3.5 h-3.5 text-subtle" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-subtle">Artistas</span>
              </div>
              <p className="text-xl font-bold text-foreground">{artistCount}</p>
            </div>
          </div>
        )}

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
          {(selectedNature !== 'all' || selectedTag || selectedAdjusted !== 'all') && (
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

            {/* Situação da Cifra */}
            <div className="mt-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-subtle mb-2">
                Situação da Cifra
              </p>
              <div className="flex items-center gap-2">
                {([
                  { value: 'all', label: 'Todas', icon: null },
                  { value: 'adjusted', label: 'Ajustadas', icon: CheckCircle2 },
                  { value: 'pending', label: 'Pendentes', icon: Circle },
                ] as const).map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedAdjusted(opt.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all
                        ${selectedAdjusted === opt.value ? 'bg-accent text-white' : 'bg-elevated text-muted hover:bg-border'}`}
                    >
                      {Icon && <Icon className="w-3 h-3" />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clear Filters */}
            {(selectedNature !== 'all' || selectedTag || selectedAdjusted !== 'all') && (
              <button
                onClick={() => { setSelectedNature('all'); setSelectedTag(null); setSelectedAdjusted('all'); }}
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
            <p className="text-sm text-muted">
              {activeTab === 'archived' ? 'Nenhuma música arquivada.' : 'Nenhuma música encontrada.'}
            </p>
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
