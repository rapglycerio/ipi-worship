'use client';

import type { ChordBlock, ChordLine, BlockType } from '@/types';
import { ChevronUp, ChevronDown, Plus, Trash2, Copy } from 'lucide-react';

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

const BLOCK_ACCENT: Record<BlockType, string> = {
  intro:      'border-l-info/60',
  verse:      'border-l-accent/40',
  pre_chorus: 'border-l-warning/50',
  chorus:     'border-l-accent',
  bridge:     'border-l-success/60',
  interlude:  'border-l-subtle/60',
  outro:      'border-l-muted/40',
  tag:        'border-l-warning/40',
};

// ── BlockCard ─────────────────────────────────────────────────

interface BlockCardProps {
  block: ChordBlock;
  isFirst: boolean;
  isLast: boolean;
  onChange: (b: ChordBlock) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function BlockCard({
  block, isFirst, isLast,
  onChange, onDelete, onDuplicate, onMoveUp, onMoveDown,
}: BlockCardProps) {

  function updateLine(idx: number, field: keyof ChordLine, value: string) {
    onChange({
      ...block,
      lines: block.lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)),
    });
  }

  function deleteLine(idx: number) {
    if (block.lines.length <= 1) return;
    onChange({ ...block, lines: block.lines.filter((_, i) => i !== idx) });
  }

  const accent = BLOCK_ACCENT[block.type] ?? 'border-l-border';

  return (
    <div className={`bg-card border border-border border-l-4 ${accent} rounded-xl overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-elevated border-b border-border flex-wrap">
        {/* Move up/down */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-0.5 text-subtle hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Mover para cima"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="p-0.5 text-subtle hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Mover para baixo"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

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
            className="w-9 px-1 py-1 bg-card border border-border rounded-md text-xs text-foreground focus:outline-none focus:border-accent/50 text-center"
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

      {/* Lines — styled like chord view */}
      <div className="p-3 space-y-3">
        {block.lines.map((line, i) => (
          <div key={i} className="group relative">
            {/* Chords row */}
            <input
              value={line.chords}
              onChange={(e) => updateLine(i, 'chords', e.target.value)}
              placeholder="Acordes: Em  G  D  A"
              className="w-full px-0 py-0.5 bg-transparent border-b border-dashed border-accent/30 focus:border-accent/70 text-xs text-accent font-mono placeholder:text-subtle/50 focus:outline-none transition-colors"
            />
            {/* Lyrics row */}
            <div className="flex items-end gap-2 mt-0.5">
              <input
                value={line.lyrics}
                onChange={(e) => updateLine(i, 'lyrics', e.target.value)}
                placeholder="Letra..."
                className="flex-1 px-0 py-0.5 bg-transparent border-b border-dashed border-border focus:border-foreground/30 text-sm text-foreground placeholder:text-subtle/50 focus:outline-none transition-colors"
              />
              <button
                onClick={() => deleteLine(i)}
                disabled={block.lines.length <= 1}
                className="shrink-0 mb-0.5 p-0.5 text-subtle/40 hover:text-danger disabled:opacity-0 transition-colors cursor-pointer"
                title="Excluir linha"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={() => onChange({ ...block, lines: [...block.lines, { chords: '', lyrics: '' }] })}
          className="flex items-center gap-1.5 text-[11px] text-accent/70 hover:text-accent font-medium cursor-pointer transition-colors mt-1"
        >
          <Plus className="w-3 h-3" />
          Adicionar linha
        </button>
      </div>
    </div>
  );
}

// ── BlockEditor ───────────────────────────────────────────────

interface BlockEditorProps {
  blocks: ChordBlock[];
  onChange: (blocks: ChordBlock[]) => void;
}

export default function BlockEditor({ blocks, onChange }: BlockEditorProps) {
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

  function moveBlock(id: string, direction: 'up' | 'down') {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const next = [...blocks];
    const target = direction === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
          {blocks.length} bloco{blocks.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {blocks.map((block, i) => (
          <BlockCard
            key={block.id}
            block={block}
            isFirst={i === 0}
            isLast={i === blocks.length - 1}
            onChange={(updated) => updateBlock(block.id, updated)}
            onDelete={() => deleteBlock(block.id)}
            onDuplicate={() => duplicateBlock(block.id)}
            onMoveUp={() => moveBlock(block.id, 'up')}
            onMoveDown={() => moveBlock(block.id, 'down')}
          />
        ))}
      </div>

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
