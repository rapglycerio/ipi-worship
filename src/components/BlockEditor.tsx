'use client';

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
import type { ChordBlock, ChordLine, BlockType } from '@/types';
import { GripVertical, Plus, Trash2, Copy } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────

export function newBlockId(): string {
  return `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function newEmptyBlock(): ChordBlock {
  return {
    id: newBlockId(),
    type: 'verse',
    label: 'Estrofe',
    lines: [{ chords: '', lyrics: '' }],
    directions: [],
    repeatCount: 1,
  };
}

export const BLOCK_TYPE_OPTIONS: { value: BlockType; label: string }[] = [
  { value: 'intro', label: 'Intro' },
  { value: 'verse', label: 'Estrofe' },
  { value: 'pre_chorus', label: 'Pré-Refrão' },
  { value: 'chorus', label: 'Refrão' },
  { value: 'bridge', label: 'Ponte' },
  { value: 'interlude', label: 'Interlúdio' },
  { value: 'outro', label: 'Final' },
  { value: 'tag', label: 'Tag' },
];

// ── SortableBlockCard ─────────────────────────────────────────

interface BlockCardProps {
  block: ChordBlock;
  onChange: (b: ChordBlock) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function SortableBlockCard({ block, onChange, onDelete, onDuplicate }: BlockCardProps) {
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
      {/* Header */}
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
            <option key={o.value} value={o.value}>{o.label}</option>
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

// ── BlockEditor (full DnD list + add button) ──────────────────

interface BlockEditorProps {
  blocks: ChordBlock[];
  onChange: (blocks: ChordBlock[]) => void;
}

export default function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = blocks.findIndex((b) => b.id === active.id);
      const newIdx = blocks.findIndex((b) => b.id === over.id);
      onChange(arrayMove(blocks, oldIdx, newIdx));
    }
  }

  function updateBlock(id: string, updated: ChordBlock) {
    onChange(blocks.map((b) => (b.id === id ? updated : b)));
  }

  function deleteBlock(id: string) {
    onChange(blocks.filter((b) => b.id !== id));
  }

  function duplicateBlock(id: string) {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const copy = { ...blocks[idx], id: newBlockId() };
    const next = [...blocks];
    next.splice(idx + 1, 0, copy);
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
          {blocks.length} bloco{blocks.length !== 1 ? 's' : ''}
        </span>
        <span className="text-[10px] text-subtle">Arraste para reordenar</span>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {blocks.map((block) => (
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
        onClick={() => onChange([...blocks, newEmptyBlock()])}
        className="w-full py-2.5 rounded-xl border border-dashed border-accent/40 text-accent text-sm font-medium hover:bg-accent/5 transition-all cursor-pointer flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Adicionar Bloco
      </button>
    </div>
  );
}
