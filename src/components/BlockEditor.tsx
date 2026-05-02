'use client';

import type { ChordBlock, ChordLine, BlockType } from '@/types';
import { ChevronUp, ChevronDown, Plus, Trash2, Copy, Repeat } from 'lucide-react';

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
  { value: 'intro',      label: 'Intro' },
  { value: 'verse',      label: 'Estrofe' },
  { value: 'pre_chorus', label: 'Pré-Refrão' },
  { value: 'chorus',     label: 'Refrão' },
  { value: 'bridge',     label: 'Ponte' },
  { value: 'interlude',  label: 'Interlúdio' },
  { value: 'outro',      label: 'Final' },
  { value: 'tag',        label: 'Tag' },
];

const blockTypeStyles: Record<BlockType, string> = {
  intro:      'block-intro',
  verse:      'block-verse',
  pre_chorus: 'block-verse',
  chorus:     'block-chorus',
  bridge:     'block-bridge',
  interlude:  'block-intro',
  outro:      'block-intro',
  tag:        'block-verse',
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
    onChange({ ...block, lines: block.lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)) });
  }

  function deleteLine(idx: number) {
    if (block.lines.length <= 1) return;
    onChange({ ...block, lines: block.lines.filter((_, i) => i !== idx) });
  }

  const blockStyle = blockTypeStyles[block.type] ?? 'block-verse';

  return (
    <div className={`${blockStyle} py-3 mb-3 relative group`}>
      {/* Block header — same look as ChordBlockView */}
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {/* Editable label — styled as the accent header */}
          <input
            value={block.label}
            onChange={(e) => onChange({ ...block, label: e.target.value })}
            className="text-[11px] font-bold uppercase tracking-wider text-accent bg-transparent border-0 focus:outline-none focus:ring-0 p-0 min-w-0 w-auto"
            style={{ width: `${Math.max(block.label.length, 4)}ch` }}
          />

          {/* Type selector — subtle */}
          <select
            value={block.type}
            onChange={(e) => onChange({ ...block, type: e.target.value as BlockType })}
            className="text-[10px] text-subtle bg-transparent border-0 focus:outline-none cursor-pointer p-0 -ml-1"
          >
            {BLOCK_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Repeat count */}
          <div className="stage-pill flex items-center gap-1">
            <Repeat className="w-3 h-3" />
            <input
              type="number"
              min={1}
              max={10}
              value={block.repeatCount}
              onChange={(e) => onChange({ ...block, repeatCount: parseInt(e.target.value) || 1 })}
              className="w-5 bg-transparent border-0 focus:outline-none text-center p-0 text-[11px]"
            />
            <span className="text-[11px]">x</span>
          </div>
        </div>

        {/* Actions — visible on hover */}
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1 text-subtle hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Mover para cima"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1 text-subtle hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Mover para baixo"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDuplicate} className="p-1 text-subtle hover:text-accent transition-colors cursor-pointer" title="Duplicar">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1 text-subtle hover:text-danger transition-colors cursor-pointer" title="Excluir bloco">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Lines — chord + lyric inputs using the same CSS classes as ChordBlockView */}
      <div className="space-y-0.5">
        {block.lines.map((line, i) => (
          <div key={i} className="group/line relative pr-6">
            {/* Chords — same style as .chord-line */}
            <input
              value={line.chords}
              onChange={(e) => updateLine(i, 'chords', e.target.value)}
              placeholder="acordes..."
              className="chord-line w-full bg-transparent border-0 focus:outline-none placeholder:opacity-30 focus:placeholder:opacity-50"
            />
            {/* Lyrics — same style as .lyric-line */}
            <input
              value={line.lyrics}
              onChange={(e) => updateLine(i, 'lyrics', e.target.value)}
              placeholder="letra..."
              className="lyric-line w-full bg-transparent border-0 focus:outline-none placeholder:text-subtle placeholder:opacity-50 focus:placeholder:opacity-80"
            />
            {/* Delete line — only on hover */}
            <button
              onClick={() => deleteLine(i)}
              disabled={block.lines.length <= 1}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-0.5 text-subtle/0 group-hover/line:text-subtle/60 hover:!text-danger disabled:!opacity-0 transition-colors cursor-pointer"
              title="Remover linha"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Add line */}
      <button
        onClick={() => onChange({ ...block, lines: [...block.lines, { chords: '', lyrics: '' }] })}
        className="mt-2 flex items-center gap-1 text-[11px] text-accent/50 hover:text-accent transition-colors cursor-pointer"
      >
        <Plus className="w-3 h-3" />
        linha
      </button>
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
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-3">
        {blocks.length} bloco{blocks.length !== 1 ? 's' : ''} — passe o mouse para ver as ações
      </p>

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

      <button
        onClick={() => onChange([...blocks, newEmptyBlock()])}
        className="w-full py-2.5 rounded-xl border border-dashed border-accent/40 text-accent text-sm font-medium hover:bg-accent/5 transition-all cursor-pointer flex items-center justify-center gap-2 mt-1"
      >
        <Plus className="w-4 h-4" />
        Adicionar Bloco
      </button>
    </div>
  );
}
