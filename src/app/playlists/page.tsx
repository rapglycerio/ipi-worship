'use client';

import { useState } from 'react';
import { usePlaylists, useSongs } from '@/hooks/useData';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CalendarDays,
  ListMusic,
  Plus,
  ChevronRight,
  Music2,
  Users,
  GripVertical,
  Pencil,
  Trash2,
  X,
  Save,
  Loader2,
  PlusCircle,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import type { Playlist, WorshipArrangement, MasterSong } from '@/types';
import {
  createPlaylist,
  updatePlaylist,
  addSongToPlaylist,
  removeArrangementFromPlaylist,
  updateArrangementOrders,
} from '@/lib/data';

type ServiceType = 'manha' | 'noite' | 'especial' | 'estudo';

interface PlaylistFormData {
  name: string;
  serviceType: ServiceType;
  serviceDate: string;
}

// =============================================
// Main page
// =============================================

export default function PlaylistsPage() {
  const { playlists, loading, refetch } = usePlaylists();
  const { songs } = useSongs();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedPlaylist = selectedId ? playlists.find((p) => p.id === selectedId) : null;

  const openCreate = () => {
    setEditingPlaylist(null);
    setModalOpen(true);
  };

  const openEdit = (pl: Playlist, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPlaylist(pl);
    setModalOpen(true);
  };

  const handleSave = async (data: PlaylistFormData) => {
    setSaving(true);
    try {
      if (editingPlaylist) {
        await updatePlaylist(editingPlaylist.id, {
          name: data.name,
          serviceType: data.serviceType,
          serviceDate: data.serviceDate,
        });
      } else {
        await createPlaylist({
          name: data.name,
          serviceType: data.serviceType,
          serviceDate: data.serviceDate,
        });
      }
      await refetch();
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (selectedPlaylist) {
    return (
      <PlaylistDetail
        key={selectedPlaylist.id}
        playlist={selectedPlaylist}
        songs={songs}
        onBack={() => setSelectedId(null)}
        onEditPlaylist={(pl) => {
          setEditingPlaylist(pl);
          setModalOpen(true);
        }}
        onRefetch={refetch}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <div className="px-5 md:px-8 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <ListMusic className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Playlists</h1>
              <p className="text-xs text-muted">{playlists.length} playlist(s) salva(s)</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold cursor-pointer hover:bg-accent/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Playlist
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
      ) : (
        <div className="px-5 md:px-8 pb-12 space-y-3">
          {playlists.map((pl) => {
            const songCount = pl.arrangements.length;
            const serviceLabel = serviceTypeLabel(pl.serviceType);
            const formattedDate = formatDate(pl.serviceDate);

            return (
              <div
                key={pl.id}
                onClick={() => setSelectedId(pl.id)}
                className="bg-card border border-border rounded-xl p-4 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all duration-200 cursor-pointer group animate-slide-up"
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
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => openEdit(pl, e)}
                      className="p-1.5 rounded-lg text-subtle hover:text-accent hover:bg-accent/10 transition-all cursor-pointer"
                      aria-label="Editar playlist"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-subtle group-hover:text-accent transition-colors" />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                  {pl.arrangements.slice(0, 6).map((arr, i) => {
                    const song = songs.find((s) => s.id === arr.masterSongId);
                    return (
                      <span
                        key={arr.id}
                        className="text-[10px] font-medium text-muted bg-elevated px-2 py-1 rounded-md"
                      >
                        {i + 1}. {song?.title ?? '…'}
                      </span>
                    );
                  })}
                  {pl.arrangements.length > 6 && (
                    <span className="text-[10px] text-subtle">
                      +{pl.arrangements.length - 6} mais
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {playlists.length === 0 && (
            <div className="text-center py-16">
              <ListMusic className="w-12 h-12 text-subtle mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-1">Nenhuma playlist ainda</h2>
              <p className="text-sm text-muted mb-4">Crie a primeira playlist do culto.</p>
              <button
                onClick={openCreate}
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold cursor-pointer hover:bg-accent/90 transition-colors"
              >
                Criar Playlist
              </button>
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <PlaylistModal
          playlist={editingPlaylist}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
          saving={saving}
        />
      )}
    </div>
  );
}

// =============================================
// Detail view
// =============================================

function PlaylistDetail({
  playlist,
  songs,
  onBack,
  onEditPlaylist,
  onRefetch,
}: {
  playlist: Playlist;
  songs: MasterSong[];
  onBack: () => void;
  onEditPlaylist: (pl: Playlist) => void;
  onRefetch: () => Promise<void>;
}) {
  const [arrangements, setArrangements] = useState<WorshipArrangement[]>(playlist.arrangements);
  const [showAddSong, setShowAddSong] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = arrangements.findIndex((a) => a.id === active.id);
    const newIdx = arrangements.findIndex((a) => a.id === over.id);
    const reordered = arrayMove(arrangements, oldIdx, newIdx);

    setArrangements(reordered);
    await updateArrangementOrders(reordered.map((a, i) => ({ id: a.id, sortOrder: i })));
  };

  const handleRemove = async (arrId: string) => {
    setArrangements((prev) => prev.filter((a) => a.id !== arrId));
    await removeArrangementFromPlaylist(arrId);
    onRefetch();
  };

  const handleAddSong = async (song: MasterSong) => {
    const version = song.versions.find((v) => v.isDefault) ?? song.versions[0];
    if (!version) return;

    const newId = await addSongToPlaylist({
      playlistId: playlist.id,
      masterSongId: song.id,
      versionId: version.id,
      sortOrder: arrangements.length,
    });

    if (newId) {
      setArrangements((prev) => [
        ...prev,
        {
          id: newId,
          versionId: version.id,
          masterSongId: song.id,
          blockOrder: [],
          customDirections: undefined,
          transposedKey: undefined,
          createdAt: new Date().toISOString(),
        },
      ]);
    }
    setShowAddSong(false);
    onRefetch();
  };

  const serviceLabel = serviceTypeLabel(playlist.serviceType, 'da');

  return (
    <div className="min-h-screen">
      <div className="px-5 py-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-accent transition-colors cursor-pointer"
        >
          ← Voltar às playlists
        </button>
      </div>

      <div className="px-5 md:px-8 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-accent-subtle flex items-center justify-center shrink-0">
              <CalendarDays className="w-7 h-7 text-accent" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
                {playlist.name}
              </h1>
              <p className="text-xs text-muted mt-0.5 capitalize">{formatDate(playlist.serviceDate)}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-accent bg-accent-subtle px-2 py-0.5 rounded-md">
                  Culto {serviceLabel}
                </span>
                <span className="text-[11px] text-subtle">por {playlist.createdBy}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onEditPlaylist(playlist)}
            className="p-2 rounded-lg text-muted hover:text-accent hover:bg-accent/10 transition-all cursor-pointer"
            aria-label="Editar playlist"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-5 md:px-8 pb-12">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-subtle">
            Ordem do Culto ({arrangements.length} música{arrangements.length !== 1 ? 's' : ''})
          </p>
          <button
            onClick={() => setShowAddSong(true)}
            className="flex items-center gap-1.5 text-xs text-accent font-semibold hover:text-accent/80 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Adicionar
          </button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={arrangements.map((a) => a.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {arrangements.map((arr, i) => (
                <SortableItem
                  key={arr.id}
                  arrangement={arr}
                  song={songs.find((s) => s.id === arr.masterSongId)}
                  index={i}
                  onRemove={() => handleRemove(arr.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {arrangements.length === 0 && (
          <div className="text-center py-12">
            <Music2 className="w-10 h-10 text-subtle mx-auto mb-3" />
            <p className="text-sm text-muted">Nenhuma música na playlist.</p>
            <button
              onClick={() => setShowAddSong(true)}
              className="mt-3 text-xs text-accent hover:underline cursor-pointer"
            >
              Adicionar músicas
            </button>
          </div>
        )}
      </div>

      {showAddSong && (
        <AddSongModal
          songs={songs}
          existingIds={arrangements.map((a) => a.masterSongId)}
          onAdd={handleAddSong}
          onClose={() => setShowAddSong(false)}
        />
      )}
    </div>
  );
}

// =============================================
// Sortable item
// =============================================

function SortableItem({
  arrangement,
  song,
  index,
  onRemove,
}: {
  arrangement: WorshipArrangement;
  song: MasterSong | undefined;
  index: number;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: arrangement.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const version = song?.versions.find((v) => v.isDefault) ?? song?.versions[0];
  const displayKey = arrangement.transposedKey ?? version?.key ?? '—';
  const artists = version?.artists.join(', ') ?? '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 bg-card border border-border rounded-xl p-3 transition-shadow ${
        isDragging ? 'shadow-lg shadow-accent/10 border-accent/30 z-50' : ''
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-subtle hover:text-muted transition-colors touch-target"
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <span className="text-[11px] font-bold text-subtle w-4 shrink-0 text-center">{index + 1}</span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {song?.title ?? <span className="text-subtle italic">Música removida</span>}
        </p>
        {artists && <p className="text-[11px] text-muted truncate">{artists}</p>}
      </div>

      <span className="text-[10px] font-bold text-accent bg-accent-subtle px-2 py-1 rounded-md shrink-0">
        {displayKey}
      </span>

      {song && (
        <Link
          href={`/musica/${song.id}`}
          className="p-1.5 text-subtle hover:text-accent transition-colors"
          aria-label="Ver cifra"
          onClick={(e) => e.stopPropagation()}
        >
          <Music2 className="w-3.5 h-3.5" />
        </Link>
      )}

      <button
        onClick={onRemove}
        className="p-1.5 text-subtle hover:text-error transition-colors cursor-pointer"
        aria-label="Remover da playlist"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// =============================================
// Create / Edit modal
// =============================================

function PlaylistModal({
  playlist,
  onSave,
  onClose,
  saving,
}: {
  playlist: Playlist | null;
  onSave: (data: PlaylistFormData) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(playlist?.name ?? '');
  const [serviceType, setServiceType] = useState<ServiceType>(
    (playlist?.serviceType as ServiceType) ?? 'manha'
  );
  const [serviceDate, setServiceDate] = useState(playlist?.serviceDate ?? '');

  const isValid = name.trim() !== '' && serviceDate !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    await onSave({ name: name.trim(), serviceType, serviceDate });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl animate-slide-up"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">
            {playlist ? 'Editar Playlist' : 'Nova Playlist'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-subtle hover:text-foreground cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-subtle mb-1 block">
              Nome *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Culto Domingo 26/01"
              className="w-full px-3 py-2.5 bg-elevated border border-border rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-subtle mb-1 block">
              Tipo de Culto *
            </label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value as ServiceType)}
              className="w-full px-3 py-2.5 bg-elevated border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent/50 transition-all cursor-pointer"
            >
              <option value="manha">Manhã</option>
              <option value="noite">Noite</option>
              <option value="especial">Especial</option>
              <option value="estudo">Estudo Bíblico</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-subtle mb-1 block">
              Data *
            </label>
            <input
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-elevated border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent/50 transition-all cursor-pointer"
              required
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-elevated text-foreground text-sm font-semibold hover:bg-border transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!isValid || saving}
            className="flex-1 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Salvando…' : playlist ? 'Atualizar' : 'Criar'}
          </button>
        </div>
      </form>
    </div>
  );
}

// =============================================
// Add song modal
// =============================================

function AddSongModal({
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

  const available = songs.filter(
    (s) =>
      !existingIds.includes(s.id) &&
      (search.trim() === '' ||
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.versions.some((v) =>
          v.artists.some((a) => a.toLowerCase().includes(search.toLowerCase()))
        ))
  );

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

// =============================================
// Helpers
// =============================================

function serviceTypeLabel(type: string, prefix?: string): string {
  const labels: Record<string, string> = {
    manha: prefix ? 'da Manhã' : 'Manhã',
    noite: prefix ? 'da Noite' : 'Noite',
    especial: 'Especial',
    estudo: prefix ? 'de Estudo' : 'Estudo',
  };
  return labels[type] ?? type;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
