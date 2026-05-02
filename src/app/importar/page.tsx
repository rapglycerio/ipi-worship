'use client';

import { useState, useCallback } from 'react';
import { parseCifra } from '@/lib/cifra-parser';
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
import type { ChordBlock, ChordLine, BlockType, SongNature, LiturgicalTag } from '@/types';
import {
  Upload,
  FileText,
  Save,
  ArrowLeft,
  CheckCircle2,
  Link as LinkIcon,
  Tag,
  GripVertical,
  Plus,
  Trash2,
  Copy,
} from 'lucide-react';
import Link from 'next/link';

// ── constants ────────────────────────────────────────────────

const BLOCK_TYPE_OPTIONS: { value: BlockType; label: string }[] = [
  { value: 'intro', label: 'Intro' },
  { value: 'verse', label: 'Estrofe' },
  { value: 'pre_chorus', label: 'Pré-Refrão' },
  { value: 'chorus', label: 'Refrão' },
  { value: 'bridge', label: 'Ponte' },
  { value: 'interlude', label: 'Interlúdio' },
  { value: 'outro', label: 'Final' },
  { value: 'tag', label: 'Tag' },
];

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

type ImportStep = 'input' | 'edit' | 'metadata' | 'saved';

const STEPS: ImportStep[] = ['input', 'edit', 'metadata', 'saved'];
const STEP_LABELS: Record<ImportStep, string> = {
  input: 'Cole o texto da cifra',
  edit: 'Edite e reordene os blocos',
  metadata: 'Preencha os metadados',
  saved: 'Cifra salva com sucesso!',
};

// ── helpers ──────────────────────────────────────────────────

function newId(): string {
  return `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function newEmptyBlock(): ChordBlock {
  return {
    id: newId(),
    type: 'verse',
    label: 'Estrofe',
    lines: [{ chords: '', lyrics: '' }],
    directions: [],
    repeatCount: 1,
  };
}

function parseWithSeparators(rawText: string): {
  blocks: ChordBlock[];
  detectedKey?: string;
  rawTitle?: string;
  rawArtist?: string;
} {
  // Split on lines containing only "---"
  const segments = rawText.split(/^\s*-{3,}\s*$/m).filter((s) => s.trim());
  if (segments.length === 0) return { blocks: [] };

  const firstResult = parseCifra(segments[0]);
  const allBlocks: ChordBlock[] = [];

  for (const segment of segments) {
    const result = parseCifra(segment);
    for (const block of result.blocks) {
      allBlocks.push({ ...block, id: newId() });
    }
  }

  if (allBlocks.length === 0) allBlocks.push(newEmptyBlock());

  return {
    blocks: allBlocks,
    detectedKey: firstResult.detectedKey,
    rawTitle: firstResult.rawTitle,
    rawArtist: firstResult.rawArtist,
  };
}

// ── SortableBlockCard ─────────────────────────────────────────

interface BlockCardProps {
  block: ChordBlock;
  onChange: (b: ChordBlock) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function SortableBlockCard({ block, onChange, onDelete, onDuplicate }: BlockCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  function updateLine(idx: number, field: keyof ChordLine, value: string) {
    onChange({
      ...block,
      lines: block.lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)),
    });
  }

  function deleteLine(idx: number) {
    onChange({ ...block, lines: block.lines.filter((_, i) => i !== idx) });
  }

  return (
    <div ref={setNodeRef} style={style} className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Block header row */}
      <div className="flex items-center gap-2 px-3 py-2 bg-elevated border-b border-border flex-wrap">
        <button
          {...attributes}
          {...listeners}
          className="touch-none cursor-grab text-subtle hover:text-muted p-0.5 shrink-0"
          aria-label="Arrastar bloco"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <select
          value={block.type}
          onChange={(e) => onChange({ ...block, type: e.target.value as BlockType })}
          className="px-2 py-1 bg-card border border-border rounded-md text-xs text-foreground focus:outline-none focus:border-accent/50 cursor-pointer"
        >
          {BLOCK_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <input
          value={block.label}
          onChange={(e) => onChange({ ...block, label: e.target.value })}
          placeholder="Rótulo"
          className="flex-1 min-w-0 px-2 py-1 bg-card border border-border rounded-md text-xs text-foreground focus:outline-none focus:border-accent/50"
        />

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-subtle">×</span>
          <input
            type="number"
            min={1}
            max={10}
            value={block.repeatCount}
            onChange={(e) => onChange({ ...block, repeatCount: parseInt(e.target.value) || 1 })}
            className="w-10 px-1.5 py-1 bg-card border border-border rounded-md text-xs text-foreground focus:outline-none focus:border-accent/50 text-center"
          />
        </div>

        <button
          onClick={onDuplicate}
          className="p-1 text-subtle hover:text-accent transition-colors cursor-pointer shrink-0"
          title="Duplicar bloco"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-subtle hover:text-danger transition-colors cursor-pointer shrink-0"
          title="Excluir bloco"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Lines */}
      <div className="p-3 space-y-2">
        {block.lines.map((line, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div className="flex-1 space-y-1 min-w-0">
              <input
                value={line.chords}
                onChange={(e) => updateLine(i, 'chords', e.target.value)}
                placeholder="Acordes: Em  G  D  A"
                className="w-full px-2 py-1.5 bg-elevated border border-border rounded text-xs text-foreground font-mono placeholder:text-subtle focus:outline-none focus:border-accent/50"
              />
              <input
                value={line.lyrics}
                onChange={(e) => updateLine(i, 'lyrics', e.target.value)}
                placeholder="Letra..."
                className="w-full px-2 py-1.5 bg-elevated border border-border rounded text-xs text-foreground placeholder:text-subtle focus:outline-none focus:border-accent/50"
              />
            </div>
            <button
              onClick={() => deleteLine(i)}
              className="p-1 text-subtle hover:text-danger transition-colors cursor-pointer mt-1.5 shrink-0"
              title="Excluir linha"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}

        <button
          onClick={() => onChange({ ...block, lines: [...block.lines, { chords: '', lyrics: '' }] })}
          className="flex items-center gap-1.5 text-[11px] text-accent hover:text-accent/80 font-medium cursor-pointer transition-colors mt-1"
        >
          <Plus className="w-3 h-3" />
          Adicionar Linha
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function ImportarPage() {
  const [step, setStep] = useState<ImportStep>('input');
  const [rawText, setRawText] = useState('');
  const [cifraUrl, setCifraUrl] = useState('');
  const [editBlocks, setEditBlocks] = useState<ChordBlock[]>([]);

  // Metadata
  const [title, setTitle] = useState('');
  const [artists, setArtists] = useState('');
  const [nature, setNature] = useState<SongNature>('louvor');
  const [key, setKey] = useState('');
  const [bpm, setBpm] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [selectedTags, setSelectedTags] = useState<LiturgicalTag[]>([]);

  const [saving, setSaving] = useState(false);

  // DnD
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleParse = useCallback(() => {
    if (!rawText.trim()) return;
    const { blocks, detectedKey, rawTitle, rawArtist } = parseWithSeparators(rawText);
    setEditBlocks(blocks);
    if (rawTitle) setTitle(rawTitle);
    if (rawArtist) setArtists(rawArtist);
    if (detectedKey) setKey(detectedKey);
    setStep('edit');
  }, [rawText]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setEditBlocks((prev) => {
        const oldIdx = prev.findIndex((b) => b.id === active.id);
        const newIdx = prev.findIndex((b) => b.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  }

  function updateBlock(id: string, updated: ChordBlock) {
    setEditBlocks((prev) => prev.map((b) => (b.id === id ? updated : b)));
  }

  function deleteBlock(id: string) {
    setEditBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function duplicateBlock(id: string) {
    setEditBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx === -1) return prev;
      const copy = { ...prev[idx], id: newId() };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }

  const handleSave = async () => {
    if (!title.trim() || saving || editBlocks.length === 0) return;
    setSaving(true);
    try {
      const { insertSong } = await import('@/lib/data');

      const searchableLyrics = editBlocks
        .flatMap((b) => b.lines.map((l) => l.lyrics))
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      const songId = await insertSong({
        title: title.trim(),
        originalComposer: undefined,
        nature,
        liturgicalTags: selectedTags,
        analysis: {
          id: '',
          status: 'pending' as const,
          justification: '',
          analyzedBy: '',
          analyzedAt: '',
          scriptureReferences: [],
        },
        versions: [
          {
            id: '',
            masterSongId: '',
            artists: artists
              .split(',')
              .map((a) => a.trim())
              .filter(Boolean),
            key: (key || 'C') as import('@/types').MusicalKey,
            bpm: parseInt(bpm) || 0,
            blocks: editBlocks,
            youtubeUrl: youtubeUrl || undefined,
            sourceUrl: cifraUrl || undefined,
            isDefault: true,
            createdAt: '',
            updatedAt: '',
          },
        ],
        searchableLyrics,
      });

      if (songId) {
        setStep('saved');
      } else {
        alert('Erro ao salvar. Tente novamente.');
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Erro ao salvar. Verifique a conexão.');
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tag: LiturgicalTag) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const currentStepIdx = STEPS.indexOf(step);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-5 md:px-8 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/musicas" className="touch-target">
            <ArrowLeft className="w-5 h-5 text-muted" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Upload className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Importar Cifra</h1>
              <p className="text-xs text-muted">{STEP_LABELS[step]}</p>
            </div>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s
                    ? 'bg-accent text-white'
                    : currentStepIdx > i
                      ? 'bg-success/20 text-success'
                      : 'bg-elevated text-subtle'
                }`}
              >
                {currentStepIdx > i ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-8 h-0.5 ${currentStepIdx > i ? 'bg-success/40' : 'bg-border'}`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 md:px-8 pb-12">
        {/* ── Step 1: Input ── */}
        {step === 'input' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-card border border-border rounded-xl p-4">
              <label className="flex items-center gap-2 text-xs font-semibold text-foreground mb-2">
                <LinkIcon className="w-3.5 h-3.5 text-accent" />
                Link do CifraClub (opcional)
              </label>
              <input
                type="url"
                value={cifraUrl}
                onChange={(e) => setCifraUrl(e.target.value)}
                placeholder="https://www.cifraclub.com.br/artista/musica/"
                className="w-full px-3 py-2.5 bg-elevated border border-border rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
              />
              <p className="text-[10px] text-subtle mt-1">
                Use como referência. Cole o texto da cifra abaixo.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <label className="flex items-center gap-2 text-xs font-semibold text-foreground mb-2">
                <FileText className="w-3.5 h-3.5 text-accent" />
                Texto da Cifra
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Cole a cifra aqui. Use "---" em uma linha para forçar a separação entre blocos.\n\n[Intro]\nEm  G  D  A\n\n[Estrofe 1]\n  Em           G\nSobre firme fundamento\n\n---\n\n[Refrão]\n  C           G\nCristo é a rocha eterna...`}
                rows={16}
                className="w-full px-3 py-2.5 bg-elevated border border-border rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all font-mono resize-y"
              />
              <p className="text-[10px] text-subtle mt-1">
                Dica: use <code className="bg-elevated px-1 rounded">---</code> em uma linha para forçar separação de blocos.
              </p>
            </div>

            <button
              onClick={handleParse}
              disabled={!rawText.trim()}
              className="w-full py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              Editar Blocos →
            </button>
          </div>
        )}

        {/* ── Step 2: Block Editor ── */}
        {step === 'edit' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
                {editBlocks.length} bloco{editBlocks.length !== 1 ? 's' : ''}
              </span>
              <span className="text-[10px] text-subtle">Arraste para reordenar</span>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={editBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {editBlocks.map((block) => (
                    <SortableBlockCard
                      key={block.id}
                      block={block}
                      onChange={(updated) => updateBlock(block.id, updated)}
                      onDelete={() => deleteBlock(block.id)}
                      onDuplicate={() => duplicateBlock(block.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <button
              onClick={() => setEditBlocks((prev) => [...prev, newEmptyBlock()])}
              className="w-full py-2.5 rounded-xl border border-dashed border-accent/40 text-accent text-sm font-medium hover:bg-accent/5 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar Bloco
            </button>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep('input')}
                className="flex-1 py-3 rounded-xl bg-elevated text-foreground font-semibold text-sm hover:bg-border transition-all cursor-pointer"
              >
                ← Editar Texto
              </button>
              <button
                onClick={() => setStep('metadata')}
                disabled={editBlocks.length === 0}
                className="flex-1 py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Preencher Metadados →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Metadata ── */}
        {step === 'metadata' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-bold text-foreground">Informações da Música</h2>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-subtle mb-1 block">
                  Título *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 bg-elevated border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent/50 transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-subtle mb-1 block">
                  Artista(s) (separados por vírgula)
                </label>
                <input
                  type="text"
                  value={artists}
                  onChange={(e) => setArtists(e.target.value)}
                  placeholder="Aline Barros, Diante do Trono"
                  className="w-full px-3 py-2.5 bg-elevated border border-border rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-accent/50 transition-all"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-subtle mb-1 block">
                    Tipo
                  </label>
                  <select
                    value={nature}
                    onChange={(e) => setNature(e.target.value as SongNature)}
                    className="w-full px-3 py-2.5 bg-elevated border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent/50 transition-all cursor-pointer"
                  >
                    <option value="louvor">Louvor</option>
                    <option value="hino">Hino</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-subtle mb-1 block">
                    Tom
                  </label>
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="D"
                    className="w-full px-3 py-2.5 bg-elevated border border-border rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-accent/50 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-subtle mb-1 block">
                    BPM
                  </label>
                  <input
                    type="number"
                    value={bpm}
                    onChange={(e) => setBpm(e.target.value)}
                    placeholder="72"
                    className="w-full px-3 py-2.5 bg-elevated border border-border rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-accent/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-subtle mb-1 block">
                  YouTube (opcional)
                </label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-3 py-2.5 bg-elevated border border-border rounded-lg text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-accent/50 transition-all"
                />
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <h2 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4 text-accent" />
                Momentos Litúrgicos
              </h2>
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

            <div className="flex gap-3">
              <button
                onClick={() => setStep('edit')}
                className="flex-1 py-3 rounded-xl bg-elevated text-foreground font-semibold text-sm hover:bg-border transition-all cursor-pointer"
              >
                ← Voltar
              </button>
              <button
                onClick={handleSave}
                disabled={!title.trim() || saving}
                className="flex-1 py-3 rounded-xl bg-success text-white font-semibold text-sm hover:bg-success/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Música
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Saved ── */}
        {step === 'saved' && (
          <div className="text-center py-12 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Cifra Salva!</h2>
            <p className="text-sm text-muted mb-6">
              &quot;{title}&quot; foi adicionada ao repertório com sucesso.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setStep('input');
                  setRawText('');
                  setCifraUrl('');
                  setEditBlocks([]);
                  setTitle('');
                  setArtists('');
                  setKey('');
                  setBpm('');
                  setYoutubeUrl('');
                  setSelectedTags([]);
                }}
                className="px-5 py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition-all cursor-pointer"
              >
                Importar Outra
              </button>
              <Link
                href="/musicas"
                className="px-5 py-2.5 rounded-xl bg-elevated text-foreground font-semibold text-sm hover:bg-border transition-all"
              >
                Ver Repertório
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
