'use client';

import { use, useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { liturgicalTagLabels } from '@/data/mock-songs';
import ChordBlockView, { ChordToolbar } from '@/components/ChordBlockView';
import BlockEditor from '@/components/BlockEditor';
import { useWakeLock } from '@/hooks/useWakeLock';
import type { MasterSong, ViewMode, FontSizePreset, LiturgicalTag, SongNature, Playlist, ChordBlock } from '@/types';
import {
  ArrowLeft,
  ExternalLink,
  Tag,
  Users,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  ChevronDown,
  ChevronUp,
  BookOpen,
  PlayCircle,
  Music2,
  MonitorSmartphone,
  Loader2,
  Plus,
  Pencil,
  X,
  Check,
  ListMusic,
  Trash2,
  Clock,
  LayoutList,
  Lightbulb,
} from 'lucide-react';
import Link from 'next/link';

const LITURGICAL_OPTIONS: { value: LiturgicalTag; label: string }[] = [
  { value: 'introducao', label: 'Introdução' },
  { value: 'exaltacao', label: 'Exaltação' },
  { value: 'adoracao', label: 'Adoração' },
  { value: 'intercessao', label: 'Intercessão' },
  { value: 'perdao', label: 'Perdão' },
  { value: 'ceia', label: 'Ceia' },
  { value: 'consagracao', label: 'Consagração' },
  { value: 'despedida', label: 'Despedida' },
  { value: 'ofertorio', label: 'Ofertório' },
  { value: 'apelo', label: 'Apelo' },
];

const SERVICE_TYPES = [
  { value: 'manha', label: 'Manhã' },
  { value: 'noite', label: 'Noite' },
  { value: 'especial', label: 'Especial' },
  { value: 'estudo', label: 'Estudo' },
];

// ── Add to Playlist Modal ─────────────────────────────────────

interface AddToPlaylistModalProps {
  songId: string;
  versionId: string;
  onClose: () => void;
}

function AddToPlaylistModal({ songId, versionId, onClose }: AddToPlaylistModalProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newServiceType, setNewServiceType] = useState('manha');
  const [newServiceDate, setNewServiceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { fetchAllPlaylists } = await import('@/lib/data');
        setPlaylists(await fetchAllPlaylists());
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleAdd(playlistId: string) {
    setAddingId(playlistId);
    try {
      const { addSongToPlaylist, fetchAllPlaylists } = await import('@/lib/data');
      const pl = playlists.find((p) => p.id === playlistId);
      const sortOrder = pl ? pl.arrangements.length : 0;
      await addSongToPlaylist({ playlistId, masterSongId: songId, versionId, sortOrder });
      setAddedIds((prev) => new Set([...prev, playlistId]));
      // Refresh playlists to update arrangement counts
      setPlaylists(await fetchAllPlaylists());
    } catch {
      alert('Erro ao adicionar à playlist.');
    } finally {
      setAddingId(null);
    }
  }

  async function handleCreate() {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const { createPlaylist, addSongToPlaylist, fetchAllPlaylists } = await import('@/lib/data');
      const playlistId = await createPlaylist({
        name: newName.trim(),
        serviceType: newServiceType,
        serviceDate: newServiceDate,
      });
      if (playlistId) {
        await addSongToPlaylist({ playlistId, masterSongId: songId, versionId, sortOrder: 0 });
        setAddedIds((prev) => new Set([...prev, playlistId]));
        setPlaylists(await fetchAllPlaylists());
        setShowCreate(false);
        setNewName('');
      } else {
        alert('Erro ao criar playlist.');
      }
    } catch {
      alert('Erro ao criar playlist.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <ListMusic className="w-4 h-4 text-accent" />
            <span className="text-sm font-bold text-foreground">Adicionar à Playlist</span>
          </div>
          <button onClick={onClose} className="p-1 text-subtle hover:text-foreground cursor-pointer transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-accent animate-spin" />
            </div>
          ) : playlists.length === 0 ? (
            <p className="text-center text-sm text-subtle py-8">Nenhuma playlist encontrada.</p>
          ) : (
            <div className="divide-y divide-border">
              {playlists.map((pl) => (
                <div key={pl.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{pl.name}</p>
                    <p className="text-[10px] text-subtle">
                      {new Date(pl.serviceDate + 'T00:00:00').toLocaleDateString('pt-BR')} · {pl.arrangements.length} música{pl.arrangements.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAdd(pl.id)}
                    disabled={addingId === pl.id || addedIds.has(pl.id)}
                    className={`ml-3 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                      addedIds.has(pl.id)
                        ? 'bg-success/10 text-success'
                        : 'bg-accent/10 text-accent hover:bg-accent hover:text-white'
                    } disabled:opacity-50`}
                  >
                    {addingId === pl.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : addedIds.has(pl.id) ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-border">
          {!showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full py-2.5 rounded-xl border border-dashed border-accent/40 text-accent text-sm font-medium hover:bg-accent/5 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Criar nova playlist
            </button>
          ) : (
            <div className="space-y-2">
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome da playlist"
                className="w-full px-3 py-2 bg-elevated border border-border rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-accent/50"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newServiceType}
                  onChange={(e) => setNewServiceType(e.target.value)}
                  className="px-2 py-2 bg-elevated border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-accent/50 cursor-pointer"
                >
                  {SERVICE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={newServiceDate}
                  onChange={(e) => setNewServiceDate(e.target.value)}
                  className="px-2 py-2 bg-elevated border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-accent/50"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 rounded-lg bg-elevated text-muted text-xs font-medium hover:bg-border transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || creating}
                  className="flex-1 py-2 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Criar e Adicionar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Edit Song Modal ───────────────────────────────────────────

interface EditSongModalProps {
  song: MasterSong;
  onClose: () => void;
  onSaved: () => void;
}

function EditSongModal({ song, onClose, onSaved }: EditSongModalProps) {
  const defaultVersion = song.versions.find((v) => v.isDefault) || song.versions[0];

  const [title, setTitle] = useState(song.title);
  const [originalComposer, setOriginalComposer] = useState(song.originalComposer || '');
  const [nature, setNature] = useState<SongNature>(song.nature);
  const [selectedTags, setSelectedTags] = useState<LiturgicalTag[]>(song.liturgicalTags);
  const [artists, setArtists] = useState(defaultVersion?.artists.join(', ') || '');
  const [key, setKey] = useState<string>(defaultVersion?.key || '');
  const [bpm, setBpm] = useState(String(defaultVersion?.bpm || ''));
  const [youtubeUrl, setYoutubeUrl] = useState(defaultVersion?.youtubeUrl || '');
  const [saving, setSaving] = useState(false);

  const toggleTag = (tag: LiturgicalTag) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  async function handleSave() {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const { updateSongMetadata, updateVersionMetadata } = await import('@/lib/data');
      const [songOk] = await Promise.all([
        updateSongMetadata(song.id, {
          title: title.trim(),
          originalComposer: originalComposer.trim() || undefined,
          nature,
          liturgicalTags: selectedTags,
        }),
        defaultVersion
          ? updateVersionMetadata(defaultVersion.id, {
              key: key.trim() || undefined,
              bpm: parseInt(bpm) || undefined,
              youtubeUrl: youtubeUrl.trim() || undefined,
              artists: artists
                .split(',')
                .map((a) => a.trim())
                .filter(Boolean),
            })
          : Promise.resolve(true),
      ]);
      if (songOk) {
        onSaved();
      } else {
        alert('Erro ao salvar. Tente novamente.');
      }
    } catch {
      alert('Erro ao salvar. Verifique a conexão.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-accent" />
            <span className="text-sm font-bold text-foreground">Editar Música</span>
          </div>
          <button onClick={onClose} className="p-1 text-subtle hover:text-foreground cursor-pointer transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[70vh] px-4 py-4 space-y-3">
          {/* Song fields */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-subtle mb-1 block">Título *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 bg-elevated border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent/50"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-subtle mb-1 block">Compositor Original</label>
            <input
              type="text"
              value={originalComposer}
              onChange={(e) => setOriginalComposer(e.target.value)}
              placeholder="Ex: Hillsong"
              className="w-full px-3 py-2.5 bg-elevated border border-border rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-accent/50"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-subtle mb-1 block">Tipo</label>
            <select
              value={nature}
              onChange={(e) => setNature(e.target.value as SongNature)}
              className="w-full px-3 py-2.5 bg-elevated border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent/50 cursor-pointer"
            >
              <option value="louvor">Louvor</option>
              <option value="hino">Hino</option>
            </select>
          </div>

          {/* Version fields */}
          {defaultVersion && (
            <>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-subtle mb-1 block">
                  Artista(s) (separados por vírgula)
                </label>
                <input
                  type="text"
                  value={artists}
                  onChange={(e) => setArtists(e.target.value)}
                  placeholder="Aline Barros, Diante do Trono"
                  className="w-full px-3 py-2.5 bg-elevated border border-border rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-accent/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-subtle mb-1 block">Tom</label>
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="D"
                    className="w-full px-3 py-2.5 bg-elevated border border-border rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-accent/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-subtle mb-1 block">BPM</label>
                  <input
                    type="number"
                    value={bpm}
                    onChange={(e) => setBpm(e.target.value)}
                    placeholder="72"
                    className="w-full px-3 py-2.5 bg-elevated border border-border rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-accent/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-subtle mb-1 block">YouTube (opcional)</label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-3 py-2.5 bg-elevated border border-border rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-accent/50"
                />
              </div>
            </>
          )}

          {/* Liturgical tags */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-subtle mb-2 flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-accent" />
              Momentos Litúrgicos
            </label>
            <div className="flex flex-wrap gap-2">
              {LITURGICAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleTag(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    selectedTags.includes(opt.value)
                      ? 'bg-accent text-white'
                      : 'bg-elevated text-muted hover:bg-border'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-border flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-elevated text-foreground font-semibold text-sm hover:bg-border transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="flex-1 py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;

  const [song, setSong] = useState<MasterSong | null | undefined>(undefined);
  const [viewMode, setViewMode] = useState<ViewMode>('chords_and_lyrics');
  const [fontSize, setFontSize] = useState<FontSizePreset>('md');
  const [transposeSemitones, setTransposeSemitones] = useState(0);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggested, setSuggested] = useState(false);
  const [showEditSong, setShowEditSong] = useState(false);
  const [showEditBlocks, setShowEditBlocks] = useState(false);
  const [editBlocks, setEditBlocks] = useState<ChordBlock[]>([]);
  const [savingBlocks, setSavingBlocks] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lastPlayedDate, setLastPlayedDate] = useState<string | null>(null);
  const prefsLoaded = useRef(false);
  const { isActive: wakeLockActive, isSupported: wakeLockSupported, toggle: toggleWakeLock } = useWakeLock();

  const loadSong = useCallback(async () => {
    try {
      const { fetchSongById } = await import('@/lib/data');
      const dbSong = await fetchSongById(id);
      if (dbSong) {
        setSong(dbSong);
      } else {
        const { mockSongs } = await import('@/data/mock-songs');
        setSong(mockSongs.find((s) => s.id === id) || null);
      }
    } catch {
      const { mockSongs } = await import('@/data/mock-songs');
      setSong(mockSongs.find((s) => s.id === id) || null);
    }
  }, [id]);

  // Load saved display preferences once
  useEffect(() => {
    if (prefsLoaded.current) return;
    prefsLoaded.current = true;
    const savedSize = localStorage.getItem('worship_fontSize') as FontSizePreset | null;
    const savedMode = localStorage.getItem('worship_viewMode') as ViewMode | null;
    if (savedSize && ['sm', 'md', 'lg', 'xl', '2xl'].includes(savedSize)) setFontSize(savedSize);
    if (savedMode && ['chords_and_lyrics', 'lyrics_only'].includes(savedMode)) setViewMode(savedMode);
  }, []);

  // Load last played date from playlists
  useEffect(() => {
    async function loadLastPlayed() {
      try {
        const { fetchAllPlaylists } = await import('@/lib/data');
        const allPlaylists = await fetchAllPlaylists();
        const playlistsWithSong = allPlaylists
          .filter((pl) => pl.arrangements.some((a) => a.masterSongId === id))
          .sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));
        if (playlistsWithSong.length > 0) {
          setLastPlayedDate(playlistsWithSong[0].serviceDate);
        }
      } catch { /* ignore */ }
    }
    loadLastPlayed();
  }, [id]);

  useEffect(() => {
    loadSong();
  }, [loadSong]);

  if (song === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!song) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Music2 className="w-12 h-12 text-subtle mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Música não encontrada</h2>
          <Link href="/" className="text-sm text-accent hover:underline mt-2 block cursor-pointer">
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  const defaultVersion = song.versions.find((v) => v.isDefault) || song.versions[0];
  const activeVersion = selectedVersionId
    ? song.versions.find((v) => v.id === selectedVersionId) || defaultVersion
    : defaultVersion;

  if (!activeVersion) return null;

  const analysis = song.analysis;
  const approvalStatus = analysis?.status || 'pending';
  const isAdmin = userRole === 'admin';
  const isLoggedIn = !!session?.user;

  const handleFontSizeChange = (size: FontSizePreset) => {
    setFontSize(size);
    localStorage.setItem('worship_fontSize', size);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('worship_viewMode', mode);
  };

  const handleDeleteSong = async () => {
    setDeleting(true);
    try {
      const { deleteSong } = await import('@/lib/data');
      const ok = await deleteSong(song!.id);
      if (ok) {
        window.location.href = '/musicas';
      } else {
        alert('Erro ao excluir música.');
        setDeleting(false);
      }
    } catch {
      alert('Erro ao excluir música.');
      setDeleting(false);
    }
  };

  const handleSuggest = async () => {
    if (!user || suggesting) return;
    setSuggesting(true);
    try {
      const { addSuggestion } = await import('@/lib/data');
      await addSuggestion({
        masterSongId: song!.id,
        email: user.email!,
        name: user.name || user.email!,
      });
      setSuggested(true);
      setShowSuggest(false);
    } catch {
      alert('Erro ao sugerir. Tente novamente.');
    } finally {
      setSuggesting(false);
    }
  };

  const handleOpenEditBlocks = () => {
    setEditBlocks(activeVersion.blocks.map((b) => ({ ...b })));
    setShowEditBlocks(true);
  };

  const handleSaveBlocks = async () => {
    if (savingBlocks) return;
    setSavingBlocks(true);
    try {
      const { updateVersionBlocks } = await import('@/lib/data');
      const ok = await updateVersionBlocks(activeVersion.id, editBlocks);
      if (ok) {
        setShowEditBlocks(false);
        loadSong();
      } else {
        alert('Erro ao salvar blocos. Tente novamente.');
      }
    } catch {
      alert('Erro ao salvar blocos. Verifique a conexão.');
    } finally {
      setSavingBlocks(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Modals */}
      {showAddToPlaylist && (
        <AddToPlaylistModal
          songId={song.id}
          versionId={activeVersion.id}
          onClose={() => setShowAddToPlaylist(false)}
        />
      )}
      {showEditSong && (
        <EditSongModal
          song={song}
          onClose={() => setShowEditSong(false)}
          onSaved={() => {
            setShowEditSong(false);
            loadSong();
          }}
        />
      )}

      {/* Suggest modal */}
      {showSuggest && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowSuggest(false)}>
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <Lightbulb className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Sugerir Música</h2>
                <p className="text-xs text-muted">para a próxima playlist</p>
              </div>
            </div>
            <p className="text-sm text-muted mb-4">
              Sugerir <strong className="text-foreground">{song?.title}</strong> como sugestão para a próxima playlist?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSuggest(false)}
                className="flex-1 py-2.5 rounded-xl bg-elevated text-foreground font-semibold text-sm hover:bg-border cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSuggest}
                disabled={suggesting}
                className="flex-1 py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 disabled:opacity-40 cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                {suggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lightbulb className="w-4 h-4" /> Sugerir</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Blocks fullscreen */}
      {showEditBlocks && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
            <div className="flex items-center gap-2">
              <LayoutList className="w-4 h-4 text-accent" />
              <span className="text-sm font-bold text-foreground">Editar Blocos</span>
              <span className="text-xs text-subtle">— {song.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEditBlocks(false)}
                className="px-3 py-1.5 rounded-lg bg-elevated text-muted text-xs font-semibold hover:bg-border transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveBlocks}
                disabled={savingBlocks}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 disabled:opacity-40 transition-all cursor-pointer"
              >
                {savingBlocks ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Salvar
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <BlockEditor blocks={editBlocks} onChange={setEditBlocks} />
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)}>
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-danger" />
              </div>
              <h2 className="text-base font-bold text-foreground">Excluir Música</h2>
            </div>
            <p className="text-sm text-muted mb-5">
              Tem certeza que deseja excluir <strong>{song.title}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-elevated text-foreground font-semibold text-sm hover:bg-border transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteSong}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-danger text-white font-semibold text-sm hover:bg-danger/90 disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back Nav */}
      <div className="px-4 py-3 no-print">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-accent transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
      </div>

      {/* Song Meta Header */}
      <div className="px-5 md:px-8 mb-4 no-print">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${
              song.nature === 'hino' ? 'bg-info/10' : 'bg-accent-subtle'
            }`}
          >
            <Music2 className={`w-7 h-7 ${song.nature === 'hino' ? 'text-info' : 'text-accent'}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
                {song.title}
              </h1>
              {/* Action buttons */}
              <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                {isLoggedIn && (
                  <>
                    <button
                      onClick={() => setShowAddToPlaylist(true)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-semibold hover:bg-accent hover:text-white transition-all cursor-pointer"
                      title="Adicionar à playlist"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Playlist
                    </button>
                    <button
                      onClick={() => suggested ? undefined : setShowSuggest(true)}
                      disabled={suggested}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        suggested
                          ? 'bg-success/10 text-success cursor-default'
                          : 'bg-elevated text-muted hover:bg-border'
                      }`}
                      title="Sugerir para próxima playlist"
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      {suggested ? 'Sugerida!' : 'Sugerir'}
                    </button>
                  </>
                )}
                {isAdmin && (
                  <>
                    <button
                      onClick={() => setShowEditSong(true)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-elevated text-muted text-xs font-semibold hover:bg-border transition-all cursor-pointer"
                      title="Editar metadados"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={handleOpenEditBlocks}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-elevated text-muted text-xs font-semibold hover:bg-border transition-all cursor-pointer"
                      title="Editar blocos"
                    >
                      <LayoutList className="w-3.5 h-3.5" />
                      Blocos
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-danger/10 text-danger text-xs font-semibold hover:bg-danger/20 transition-all cursor-pointer"
                      title="Excluir música"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-muted">
                <Users className="w-3 h-3" />
                {activeVersion.artists.join(', ')}
              </span>
              {song.originalComposer && (
                <span className="text-[10px] text-subtle">Compositor: {song.originalComposer}</span>
              )}
            </div>

            {/* Tags */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  song.nature === 'hino' ? 'bg-info/10 text-info' : 'bg-accent-subtle text-accent'
                }`}
              >
                {song.nature === 'hino' ? 'Hino' : 'Louvor'}
              </span>
              {song.liturgicalTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-[10px] text-subtle bg-elevated px-2 py-0.5 rounded-md"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {liturgicalTagLabels[tag]}
                </span>
              ))}
              {lastPlayedDate && (
                <span className="inline-flex items-center gap-1 text-[10px] text-subtle bg-elevated px-2 py-0.5 rounded-md">
                  <Clock className="w-2.5 h-2.5" />
                  Tocada em {new Date(lastPlayedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Analysis Badge */}
        {analysis && (
          <button
            onClick={() => setShowAnalysis(!showAnalysis)}
            className={`mt-3 w-full flex items-center justify-between px-4 py-2.5 rounded-xl border cursor-pointer transition-all duration-200 ${
              approvalStatus === 'approved'
                ? 'border-success/20 bg-success/5 hover:bg-success/10'
                : approvalStatus === 'rejected'
                  ? 'border-danger/20 bg-danger/5 hover:bg-danger/10'
                  : 'border-warning/20 bg-warning/5 hover:bg-warning/10'
            }`}
          >
            <div className="flex items-center gap-2">
              {approvalStatus === 'approved' ? (
                <ShieldCheck className="w-4 h-4 text-success" />
              ) : approvalStatus === 'rejected' ? (
                <ShieldAlert className="w-4 h-4 text-danger" />
              ) : (
                <ShieldQuestion className="w-4 h-4 text-warning" />
              )}
              <span
                className={`text-xs font-semibold ${
                  approvalStatus === 'approved'
                    ? 'text-success'
                    : approvalStatus === 'rejected'
                      ? 'text-danger'
                      : 'text-warning'
                }`}
              >
                Análise Teológica:{' '}
                {approvalStatus === 'approved'
                  ? 'Aprovado'
                  : approvalStatus === 'rejected'
                    ? 'Rejeitado'
                    : 'Pendente'}
              </span>
            </div>
            {showAnalysis ? (
              <ChevronUp className="w-4 h-4 text-subtle" />
            ) : (
              <ChevronDown className="w-4 h-4 text-subtle" />
            )}
          </button>
        )}

        {/* Analysis Expanded */}
        {showAnalysis && analysis && analysis.justification && (
          <div className="mt-2 px-4 py-3 bg-elevated rounded-xl border border-border animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-accent" />
              <span className="text-xs font-bold text-foreground">Parecer Pastoral</span>
            </div>
            <p className="text-sm text-muted leading-relaxed">{analysis.justification}</p>
            {analysis.scriptureReferences && analysis.scriptureReferences.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-semibold text-subtle">Referências:</span>
                {analysis.scriptureReferences.map((ref) => (
                  <span
                    key={ref}
                    className="text-[10px] text-accent bg-accent-subtle px-2 py-0.5 rounded-md"
                  >
                    {ref}
                  </span>
                ))}
              </div>
            )}
            {analysis.analyzedBy && (
              <p className="text-[10px] text-subtle mt-2">
                Analisado por: {analysis.analyzedBy}
                {analysis.analyzedAt &&
                  ` em ${new Date(analysis.analyzedAt).toLocaleDateString('pt-BR')}`}
              </p>
            )}
          </div>
        )}

        {/* Version Selector */}
        {song.versions.length > 1 && (
          <div className="mt-3">
            <button
              onClick={() => setShowVersions(!showVersions)}
              className="flex items-center gap-2 text-xs text-accent font-medium cursor-pointer hover:underline"
            >
              {showVersions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {song.versions.length} versões disponíveis
            </button>
            {showVersions && (
              <div className="mt-2 space-y-1.5 animate-fade-in">
                {song.versions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setSelectedVersionId(v.id);
                      setTransposeSemitones(0);
                      setShowVersions(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-all duration-200 ${
                      v.id === activeVersion.id
                        ? 'bg-accent-subtle border border-accent/30 text-accent'
                        : 'bg-elevated hover:bg-border text-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{v.artists.join(', ')}</span>
                      {v.isDefault && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-accent bg-accent-subtle px-1.5 py-0.5 rounded">
                          padrão
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{v.key}</span>
                      <span className="text-xs text-subtle">{v.bpm} BPM</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* YouTube Link */}
        {activeVersion.youtubeUrl && (
          <a
            href={activeVersion.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-danger/10 text-danger text-xs font-medium hover:bg-danger/20 transition-colors cursor-pointer"
          >
            <PlayCircle className="w-4 h-4" />
            Assistir no YouTube
            <ExternalLink className="w-3 h-3" />
          </a>
        )}

        {/* Wake Lock Toggle */}
        {wakeLockSupported && (
          <button
            onClick={toggleWakeLock}
            className={`mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ml-2 ${
              wakeLockActive
                ? 'bg-accent/10 text-accent border border-accent/30'
                : 'bg-elevated text-muted hover:bg-border'
            }`}
          >
            <MonitorSmartphone className="w-4 h-4" />
            {wakeLockActive ? 'Tela Ligada ✓' : 'Manter Tela Ligada'}
          </button>
        )}
      </div>

      {/* Print-only header */}
      <div className="hidden print:block px-5 pb-3 border-b border-gray-300 mb-4">
        <h1 className="text-2xl font-bold">{song.title}</h1>
        {activeVersion.artists.length > 0 && (
          <p className="text-sm text-gray-600 mt-0.5">{activeVersion.artists.join(', ')}</p>
        )}
        <p className="text-sm font-mono mt-0.5">
          Tom: {activeVersion.key}
          {activeVersion.bpm ? `  ·  ${activeVersion.bpm} BPM` : ''}
        </p>
      </div>

      {/* Chord Display Area */}
      <ChordToolbar
        songTitle={song.title}
        currentKey={activeVersion.key}
        bpm={activeVersion.bpm}
        viewMode={viewMode}
        fontSize={fontSize}
        transposeSemitones={transposeSemitones}
        onViewModeChange={handleViewModeChange}
        onFontSizeChange={handleFontSizeChange}
        onTransposeChange={setTransposeSemitones}
      />

      {/* Blocks */}
      <div className="px-5 md:px-8 py-4">
        {activeVersion.blocks.map((block) => (
          <ChordBlockView
            key={block.id}
            block={block}
            viewMode={viewMode}
            fontSize={fontSize}
            transposeSemitones={transposeSemitones}
          />
        ))}
      </div>
    </div>
  );
}
