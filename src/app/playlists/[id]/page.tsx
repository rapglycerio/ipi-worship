'use client';

import { useState, useEffect } from 'react';
import { useSongs, usePlaylists } from '@/hooks/useData';
import SongCard from '@/components/SongCard';
import { CalendarDays, Loader2, Share2, Settings2, GripVertical, Trash2, Save, X, Check } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { updatePlaylist, updateArrangementOrders, removeArrangementFromPlaylist } from '@/lib/data';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableSongCard({ id, song, index, isEditing, onRemove }: { id: string, song: any, index: number, isEditing: boolean, onRemove: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-stretch gap-2 ${isDragging ? 'opacity-80' : ''}`}>
      {isEditing && (
        <div 
          className="flex-shrink-0 flex items-center justify-center px-1 cursor-grab active:cursor-grabbing text-muted hover:text-foreground touch-none"
          {...attributes} 
          {...listeners}
        >
          <GripVertical className="w-6 h-6" />
        </div>
      )}
      <div className={`flex-1 min-w-0 ${isEditing ? 'pointer-events-none opacity-90' : ''}`}>
        <SongCard song={song} index={index} />
      </div>
      {isEditing && (
        <button 
          onClick={() => onRemove(id)}
          className="flex-shrink-0 px-3 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
          title="Remover da playlist"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

export default function SinglePlaylistPage() {
  const params = useParams();
  const router = useRouter();
  const { songs, loading: songsLoading } = useSongs();
  const { playlists, loading: playlistsLoading, refetch } = usePlaylists();
  
  const loading = songsLoading || playlistsLoading;

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState<'manha' | 'noite' | 'especial'>('manha');
  const [copied, setCopied] = useState(false);
  
  const [optimisticArrangements, setOptimisticArrangements] = useState<any[]>([]);

  const playlistId = params.id as string;
  const playlist = playlists.find(p => p.id === playlistId);

  useEffect(() => {
    if (playlist && !isEditing) {
      setEditName(playlist.name);
      setEditDate(playlist.serviceDate);
      setEditType(playlist.serviceType as any);
      
      const arrWithSongs = playlist.arrangements.map((arr) => {
        const song = songs.find((s) => s.id === arr.masterSongId);
        return song ? { ...arr, song } : null;
      }).filter(Boolean);
      
      setOptimisticArrangements(arrWithSongs);
    }
  }, [playlist, songs, isEditing]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOptimisticArrangements((items) => {
        const oldIndex = items.findIndex((arr) => arr.id === active.id);
        const newIndex = items.findIndex((arr) => arr.id === over.id);
        const newArrangements = arrayMove(items, oldIndex, newIndex);
        
        // Background sync
        const arrOrder = newArrangements.map((a, i) => ({ id: a.id, sortOrder: i }));
        updateArrangementOrders(arrOrder).then(() => refetch());
        
        return newArrangements;
      });
    }
  };

  const handleSaveDetails = async () => {
    await updatePlaylist(playlistId, {
      name: editName,
      serviceDate: editDate,
      serviceType: editType,
    });
    setIsEditing(false);
    refetch();
  };
  
  const handleRemoveArrangement = async (arrId: string) => {
    if (window.confirm('Tem certeza que deseja remover esta música da playlist?')) {
      setOptimisticArrangements(prev => prev.filter(a => a.id !== arrId));
      await removeArrangementFromPlaylist(arrId);
      refetch();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <CalendarDays className="w-12 h-12 text-subtle mb-4" />
        <h2 className="text-xl font-bold mb-2">Playlist não encontrada</h2>
        <p className="text-muted mb-6">A playlist que você está procurando não existe ou foi removida.</p>
        <Link href="/playlists" className="px-4 py-2 bg-accent text-white rounded-xl font-semibold">
          Voltar para Playlists
        </Link>
      </div>
    );
  }

  const serviceLabel =
    playlist.serviceType === 'manha' ? 'da Manhã' :
    playlist.serviceType === 'noite' ? 'da Noite' :
    playlist.serviceType === 'especial' ? 'Especial' : playlist.serviceType;

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Playlist: ${playlist.name}`,
          text: `Confira a playlist ${playlist.name} no IPI Worship`,
          url: url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      // Fallback in case writeText or share throws an error
      await navigator.clipboard.writeText(url).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Back */}
      <div className="px-5 py-3">
        <button
          onClick={() => router.push('/playlists')}
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-accent transition-colors cursor-pointer"
        >
          ← Voltar às playlists
        </button>
      </div>

      {/* Header */}
      <div className="px-5 md:px-8 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-14 h-14 rounded-xl bg-accent-subtle flex items-center justify-center shrink-0">
              <CalendarDays className="w-7 h-7 text-accent" />
            </div>
            
            {isEditing ? (
              <div className="flex-1 max-w-sm space-y-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                  placeholder="Nome da Playlist"
                />
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                  />
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as any)}
                    className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                  >
                    <option value="manha">Manhã</option>
                    <option value="noite">Noite</option>
                    <option value="especial">Especial</option>
                  </select>
                </div>
              </div>
            ) : (
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
            )}
          </div>
          
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="w-10 h-10 rounded-xl bg-elevated hover:bg-border flex items-center justify-center transition-colors shrink-0 cursor-pointer text-muted hover:text-foreground"
                  aria-label="Cancelar edição"
                >
                  <X className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSaveDetails}
                  className="w-10 h-10 rounded-xl bg-accent text-white hover:bg-accent/90 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                  aria-label="Salvar alterações"
                >
                  <Save className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-10 h-10 rounded-xl bg-elevated hover:bg-border flex items-center justify-center transition-colors shrink-0 cursor-pointer text-muted hover:text-foreground"
                  aria-label="Editar playlist"
                >
                  <Settings2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleShare}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                    copied ? 'bg-success/10 text-success' : 'bg-elevated hover:bg-border text-muted hover:text-foreground'
                  }`}
                  aria-label="Compartilhar playlist"
                  title="Compartilhar link"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Songs Ordered */}
      <div className="px-5 md:px-8 pb-12">
        <p className="text-[10px] font-bold uppercase tracking-widest text-subtle mb-3 flex items-center justify-between">
          <span>Ordem do Culto</span>
          {isEditing && <span className="text-accent normal-case font-normal text-xs">Arraste para reordenar</span>}
        </p>
        
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={optimisticArrangements.map(a => a.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {optimisticArrangements.map((arr, i) => (
                <SortableSongCard 
                  key={arr.id} 
                  id={arr.id} 
                  song={arr.song} 
                  index={i} 
                  isEditing={isEditing}
                  onRemove={handleRemoveArrangement}
                />
              ))}
              {optimisticArrangements.length === 0 && (
                <div className="text-center p-8 border border-dashed border-border rounded-xl">
                  <p className="text-muted text-sm">Nenhuma música nesta playlist.</p>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
