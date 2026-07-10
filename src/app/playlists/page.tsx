'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePlaylists, useSongs } from '@/hooks/useData';
import {
  CalendarDays,
  ListMusic,
  Plus,
  ChevronRight,
  Music2,
  Users,
  Pencil,
  X,
  Save,
  Loader2,
  History,
  Clock,
  Lightbulb,
  ListPlus,
  Pin,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import type { Playlist, SongSuggestion } from '@/types';
import { createPlaylist, updatePlaylist } from '@/lib/data';

type ServiceType = 'manha' | 'noite' | 'especial' | 'estudo';

interface PlaylistFormData {
  name: string;
  serviceType: ServiceType;
  serviceDate: string | null;
  isPrivate: boolean;
}

// Usado para desempatar playlists no mesmo dia: manhã sempre antes.
const SERVICE_TYPE_ORDER: Record<string, number> = { manha: 0, especial: 1, estudo: 2, noite: 3 };

// =============================================
// Main page
// =============================================

type Tab = 'upcoming' | 'past';

export default function PlaylistsPage() {
  const { playlists, loading, refetch } = usePlaylists();
  const { songs } = useSongs();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.isAdmin === true;
  const isLoggedIn = !!session?.user;

  const router = useRouter();

  const [tab, setTab] = useState<Tab>('upcoming');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [saving, setSaving] = useState(false);

  const [suggestions, setSuggestions] = useState<SongSuggestion[]>([]);
  const [addingSuggestion, setAddingSuggestion] = useState<SongSuggestion | null>(null);

  useEffect(() => {
    async function loadSuggestions() {
      try {
        const { fetchSuggestions } = await import('@/lib/data');
        setSuggestions(await fetchSuggestions());
      } catch { /* ignore */ }
    }
    loadSuggestions();
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Playlists sem data (repertórios fixos e particulares) ficam sempre no topo de "Próximas"
  const upcomingPlaylists = playlists
    .filter((pl) => !pl.serviceDate || new Date(pl.serviceDate + 'T12:00:00') >= today)
    .sort((a, b) => {
      if (!a.serviceDate) return b.serviceDate ? -1 : a.name.localeCompare(b.name);
      if (!b.serviceDate) return 1;
      const dateCmp = a.serviceDate.localeCompare(b.serviceDate);
      // No mesmo dia, manhã sempre antes de noite
      return dateCmp !== 0 ? dateCmp : (SERVICE_TYPE_ORDER[a.serviceType] ?? 99) - (SERVICE_TYPE_ORDER[b.serviceType] ?? 99);
    });

  const pastPlaylists = playlists
    .filter((pl) => pl.serviceDate && new Date(pl.serviceDate + 'T12:00:00') < today)
    .sort((a, b) => {
      const dateCmp = (b.serviceDate ?? '').localeCompare(a.serviceDate ?? '');
      return dateCmp !== 0 ? dateCmp : (SERVICE_TYPE_ORDER[a.serviceType] ?? 99) - (SERVICE_TYPE_ORDER[b.serviceType] ?? 99);
    });

  const visiblePlaylists = tab === 'upcoming' ? upcomingPlaylists : pastPlaylists;


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
      const ownerEmail = data.isPrivate ? (session?.user?.email ?? null) : null;
      if (editingPlaylist) {
        await updatePlaylist(editingPlaylist.id, {
          name: data.name,
          serviceType: data.serviceType,
          serviceDate: data.serviceDate,
          isPrivate: data.isPrivate,
          ownerEmail,
        });
      } else {
        await createPlaylist({
          name: data.name,
          serviceType: data.serviceType,
          serviceDate: data.serviceDate,
          isPrivate: data.isPrivate,
          ownerEmail,
        });
      }
      await refetch();
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };


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
          {isLoggedIn && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold cursor-pointer hover:bg-accent/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova Playlist
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-elevated rounded-xl p-1">
          <button
            onClick={() => setTab('upcoming')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              tab === 'upcoming' ? 'bg-card text-foreground shadow-sm' : 'text-muted hover:text-foreground'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Próximas
            {upcomingPlaylists.length > 0 && (
              <span className="bg-accent/15 text-accent text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {upcomingPlaylists.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('past')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              tab === 'past' ? 'bg-card text-foreground shadow-sm' : 'text-muted hover:text-foreground'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Anteriores
            {pastPlaylists.length > 0 && (
              <span className="bg-elevated text-subtle text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pastPlaylists.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Suggestions panel */}
      {suggestions.length > 0 && (
        <section className="px-5 md:px-8 mb-4">
          <div className="bg-elevated border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
              <Lightbulb className="w-4 h-4 text-warning shrink-0" />
              <h2 className="text-sm font-bold text-foreground flex-1">Sugestões da Congregação</h2>
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
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isAdmin && song && defaultVersion && (
                        <button
                          onClick={() => setAddingSuggestion(s)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors cursor-pointer"
                          title="Adicionar à playlist"
                        >
                          <ListPlus className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Adicionar</span>
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={async () => {
                            const { removeSuggestion } = await import('@/lib/data');
                            await removeSuggestion(s.id);
                            setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
                          }}
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

      {/* Add suggestion to playlist modal */}
      {addingSuggestion && (() => {
        const song = songs.find((sg) => sg.id === addingSuggestion.masterSongId);
        const defaultVersion = song?.versions[0];
        if (!song || !defaultVersion) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setAddingSuggestion(null)}>
            <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div>
                  <p className="text-sm font-bold text-foreground">Adicionar à playlist</p>
                  <p className="text-xs text-muted truncate max-w-[220px]">{song.title}</p>
                </div>
                <button onClick={() => setAddingSuggestion(null)} className="p-1.5 rounded-lg text-subtle hover:text-foreground hover:bg-elevated cursor-pointer transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-border">
                {upcomingPlaylists.length === 0 ? (
                  <p className="text-center text-sm text-subtle py-8">Nenhuma playlist futura ou fixa.</p>
                ) : upcomingPlaylists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={async () => {
                      const { addSongToPlaylist, removeSuggestion } = await import('@/lib/data');
                      await addSongToPlaylist({ playlistId: pl.id, masterSongId: song.id, versionId: defaultVersion.id, sortOrder: pl.arrangements.length });
                      await removeSuggestion(addingSuggestion.id);
                      setSuggestions((prev) => prev.filter((x) => x.id !== addingSuggestion.id));
                      setAddingSuggestion(null);
                      refetch();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-elevated transition-colors cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{pl.name}</p>
                      <p className="text-xs text-muted">{pl.serviceDate ? new Date(pl.serviceDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }) : 'Sem data'}</p>
                    </div>
                    <Plus className="w-4 h-4 text-accent shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
      ) : (
        <div className="px-5 md:px-8 pb-12 space-y-3">
          {visiblePlaylists.map((pl) => {
            const songCount = pl.arrangements.length;
            const serviceLabel = serviceTypeLabel(pl.serviceType);
            const formattedDate = formatDate(pl.serviceDate);

            return (
              <div
                key={pl.id}
                onClick={() => router.push(`/playlists/${pl.id}`)}
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
                        {pl.serviceDate ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-accent bg-accent-subtle px-2 py-0.5 rounded-md">
                            Culto {serviceLabel}
                          </span>
                        ) : pl.isPrivate ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted bg-elevated px-2 py-0.5 rounded-md">
                            <Lock className="w-2.5 h-2.5" />
                            Particular
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-warning bg-warning/10 px-2 py-0.5 rounded-md">
                            <Pin className="w-2.5 h-2.5" />
                            Fixa
                          </span>
                        )}
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
                    {isLoggedIn && (
                      <button
                        onClick={(e) => openEdit(pl, e)}
                        className="p-1.5 rounded-lg text-subtle hover:text-accent hover:bg-accent/10 transition-all cursor-pointer"
                        aria-label="Editar playlist"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
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

          {visiblePlaylists.length === 0 && (
            <div className="text-center py-16">
              <ListMusic className="w-12 h-12 text-subtle mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-1">
                {tab === 'upcoming' ? 'Nenhuma playlist programada' : 'Nenhuma playlist anterior'}
              </h2>
              <p className="text-sm text-muted mb-4">
                {tab === 'upcoming' ? 'Crie uma playlist para o próximo culto.' : 'As playlists passadas aparecerão aqui.'}
              </p>
              {tab === 'upcoming' && isLoggedIn && (
                <button
                  onClick={openCreate}
                  className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold cursor-pointer hover:bg-accent/90 transition-colors"
                >
                  Criar Playlist
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Floating action button on mobile — logged-in only */}
      {isLoggedIn && (
        <button
          onClick={openCreate}
          className="fixed bottom-20 right-4 md:hidden z-30 w-14 h-14 rounded-full bg-accent text-white shadow-lg shadow-accent/30 flex items-center justify-center cursor-pointer hover:bg-accent/90 transition-all active:scale-95"
          style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
          aria-label="Nova Playlist"
          title="Nova Playlist"
        >
          <Plus className="w-6 h-6" />
        </button>
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
  // Playlist fixa: sem data de culto (ex.: repertório de músicas novas)
  const [noDate, setNoDate] = useState(playlist ? playlist.serviceDate === null : false);
  // Playlist particular: só o dono vê — sempre fixa, sem data de culto
  const [isPrivate, setIsPrivate] = useState(playlist?.isPrivate ?? false);

  const isValid = isPrivate || noDate || serviceDate !== '';

  const autoName = isPrivate
    ? 'Playlist Particular'
    : noDate
      ? 'Repertório Fixo'
      : serviceDate
        ? autoPlaylistName(serviceDate, serviceType)
        : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    await onSave({
      name: name.trim() || autoName,
      serviceType,
      serviceDate: isPrivate || noDate ? null : serviceDate,
      isPrivate,
    });
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
              Nome (opcional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={autoName || 'Ex: Culto Domingo 26/01'}
              className="w-full px-3 py-2.5 bg-elevated border border-border rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
            />
            {!name.trim() && autoName && (
              <p className="text-[11px] text-subtle mt-1">Sem nome, vira &quot;{autoName}&quot;</p>
            )}
          </div>

          {!isPrivate && (
            <>
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
                  Data {noDate ? '' : '*'}
                </label>
                <input
                  type="date"
                  value={noDate ? '' : serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  disabled={noDate}
                  className="w-full px-3 py-2.5 bg-elevated border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent/50 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  required={!noDate}
                />
                <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={noDate}
                    onChange={(e) => setNoDate(e.target.checked)}
                    className="w-4 h-4 rounded border-border accent-[var(--accent)] cursor-pointer"
                  />
                  <span className="text-xs text-muted">
                    Playlist fixa (sem data de culto) — fica sempre no topo, ex.: músicas novas
                  </span>
                </label>
              </div>
            </>
          )}

          <label className="flex items-start gap-2 cursor-pointer select-none p-3 rounded-lg bg-elevated border border-border">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-border accent-[var(--accent)] cursor-pointer"
            />
            <span className="flex-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Lock className="w-3.5 h-3.5" />
                Particular (só eu vejo)
              </span>
              <span className="text-[11px] text-muted block mt-0.5">
                Fica fora das listas de todo mundo — útil pra ensaiar músicas específicas sozinho.
              </span>
            </span>
          </label>
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
// Helpers
// =============================================

/** "Domingo Manhã · 20/04/2025" — usado quando o nome é deixado em branco. */
function autoPlaylistName(serviceDate: string, serviceType: string): string {
  // T12:00:00 local evita a data voltar um dia por causa do fuso horário.
  const d = new Date(serviceDate + 'T12:00:00');
  const weekday = d.toLocaleDateString('pt-BR', { weekday: 'long' });
  const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const formatted = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const typeLabel = serviceTypeLabel(serviceType);
  return `${weekdayCap} ${typeLabel} · ${formatted}`;
}

function serviceTypeLabel(type: string, prefix?: string): string {
  const labels: Record<string, string> = {
    manha: prefix ? 'da Manhã' : 'Manhã',
    noite: prefix ? 'da Noite' : 'Noite',
    especial: 'Especial',
    estudo: prefix ? 'de Estudo' : 'Estudo',
  };
  return labels[type] ?? type;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Repertório fixo — sem data de culto';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
