'use client';

import { useState } from 'react';
import type { ChordBlock, ChordLine, BlockType, StageDirection, StageDirectionItem } from '@/types';
import {
  ChevronUp, ChevronDown, Plus, Trash2, Copy,
  Repeat, Mic, Volume2, VolumeX, Zap, Hand,
  ArrowUp, ArrowDown, X as XIcon,
} from 'lucide-react';

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

const DIRECTION_OPTIONS: { value: StageDirection; label: string; icon: typeof Mic }[] = [
  { value: 'crescendo',        label: 'Crescendo',         icon: ArrowUp },
  { value: 'decrescendo',      label: 'Decrescendo',       icon: ArrowDown },
  { value: 'a_capella',        label: 'A Cappella',        icon: Mic },
  { value: 'solo_vozes',       label: 'Solo Vozes',        icon: Mic },
  { value: 'solo_instrumento', label: 'Solo Instrumento',  icon: Volume2 },
  { value: 'palmas',           label: 'Palmas',            icon: Hand },
  { value: 'silencio',         label: 'Silêncio',          icon: VolumeX },
  { value: 'custom',           label: 'Personalizado',     icon: Zap },
];

const directionIcons: Record<StageDirection, typeof Mic> = {
  a_capella: Mic, crescendo: ArrowUp, decrescendo: ArrowDown,
  solo_vozes: Mic, solo_instrumento: Volume2,
  palmas: Hand, silencio: VolumeX, custom: Zap,
};

const blockTypeStyles: Record<BlockType, string> = {
  intro: 'block-intro', verse: 'block-verse', pre_chorus: 'block-verse',
  chorus: 'block-chorus', bridge: 'block-bridge',
  interlude: 'block-intro', outro: 'block-intro', tag: 'block-verse',
};

// ── DirectionsEditor ──────────────────────────────────────────

interface DirectionsEditorProps {
  directions: StageDirectionItem[];
  onChange: (d: StageDirectionItem[]) => void;
}

function DirectionsEditor({ directions, onChange }: DirectionsEditorProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [customLabel, setCustomLabel] = useState('');

  function addDirection(type: StageDirection) {
    if (type === 'custom') return; // handled separately
    const opt = DIRECTION_OPTIONS.find((o) => o.value === type)!;
    onChange([...directions, { type, label: opt.label }]);
    setShowPicker(false);
  }

  function addCustom() {
    if (!customLabel.trim()) return;
    onChange([...directions, { type: 'custom', label: customLabel.trim() }]);
    setCustomLabel('');
    setShowPicker(false);
  }

  function removeDirection(idx: number) {
    onChange(directions.filter((_, i) => i !== idx));
  }

  return (
    <div className="mt-2 pt-2 border-t border-dashed border-border/60">
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Existing pills */}
        {directions.map((dir, i) => {
          const Icon = directionIcons[dir.type] || Zap;
          const isWarning = ['silencio', 'decrescendo'].includes(dir.type);
          const isInfo    = ['solo_instrumento', 'custom'].includes(dir.type);
          return (
            <span key={i} className={`stage-pill pr-1 ${isWarning ? 'stage-pill--warning' : isInfo ? 'stage-pill--info' : ''}`}>
              <Icon className="w-3 h-3" />
              {dir.label}
              <button onClick={() => removeDirection(i)} className="ml-1 hover:opacity-60 cursor-pointer" title="Remover">
                <XIcon className="w-2.5 h-2.5" />
              </button>
            </span>
          );
        })}

        {/* + button */}
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="stage-pill cursor-pointer hover:opacity-80 transition-opacity"
          title="Adicionar direção"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Quick-pick grid */}
      {showPicker && (
        <div className="mt-2 p-2 bg-elevated rounded-lg border border-border space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {DIRECTION_OPTIONS.filter((o) => o.value !== 'custom').map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => addDirection(opt.value)}
                  className="stage-pill cursor-pointer hover:bg-accent hover:text-white transition-colors"
                >
                  <Icon className="w-3 h-3" />
                  {opt.label}
                </button>
              );
            })}
          </div>
          {/* Custom */}
          <div className="flex gap-2 items-center">
            <input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="Personalizado..."
              className="flex-1 px-2 py-1 bg-card border border-border rounded-md text-xs text-foreground focus:outline-none focus:border-accent/50"
              onKeyDown={(e) => { if (e.key === 'Enter') addCustom(); if (e.key === 'Escape') setShowPicker(false); }}
            />
            <button onClick={addCustom} className="px-2 py-1 bg-accent text-white rounded-md text-xs font-semibold hover:bg-accent/90 cursor-pointer">
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
    <div className={`${blockStyle} py-3 mb-3 group`}>
      {/* ── Header — identical to ChordBlockView ── */}
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {/* Editable label — same accent style */}
          <input
            value={block.label}
            onChange={(e) => onChange({ ...block, label: e.target.value })}
            className="text-[11px] font-bold uppercase tracking-wider text-accent bg-transparent border-0 focus:outline-none p-0 min-w-[2ch]"
            style={{ width: `${Math.max(block.label.length, 3) + 1}ch` }}
            title="Editar rótulo"
          />
          {/* Type selector */}
          <select
            value={block.type}
            onChange={(e) => onChange({ ...block, type: e.target.value as BlockType })}
            className="text-[10px] text-subtle bg-transparent border-0 focus:outline-none cursor-pointer p-0"
            title="Tipo de bloco"
          >
            {BLOCK_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {/* Repeat pill */}
          <span className="stage-pill">
            <Repeat className="w-3 h-3" />
            <input
              type="number" min={1} max={10}
              value={block.repeatCount}
              onChange={(e) => onChange({ ...block, repeatCount: parseInt(e.target.value) || 1 })}
              className="w-5 bg-transparent border-0 focus:outline-none text-center p-0 text-[11px]"
              title="Repetições"
            />
            <span className="text-[11px]">x</span>
          </span>
        </div>

        {/* Actions — hover to reveal */}
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onMoveUp}     disabled={isFirst} className="p-1 text-subtle hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer" title="Subir">
            <ChevronUp   className="w-3.5 h-3.5" />
          </button>
          <button onClick={onMoveDown}   disabled={isLast}  className="p-1 text-subtle hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer" title="Descer">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDuplicate}  className="p-1 text-subtle hover:text-accent  cursor-pointer" title="Duplicar">
            <Copy        className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete}     className="p-1 text-subtle hover:text-danger  cursor-pointer" title="Excluir bloco">
            <Trash2      className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Lines — chord-line + lyric-line style ── */}
      <div className="space-y-1">
        {block.lines.map((line, i) => (
          <div key={i} className="group/line relative pr-6">
            <input
              value={line.chords}
              onChange={(e) => updateLine(i, 'chords', e.target.value)}
              placeholder="acordes..."
              className="chord-line w-full bg-transparent border-0 border-b border-dashed border-accent/20 focus:border-accent/50 focus:outline-none placeholder:opacity-30 pb-0.5"
            />
            <input
              value={line.lyrics}
              onChange={(e) => updateLine(i, 'lyrics', e.target.value)}
              placeholder="letra..."
              className="lyric-line w-full bg-transparent border-0 border-b border-dashed border-border/30 focus:border-border/60 focus:outline-none placeholder:text-subtle placeholder:opacity-50 pb-0.5 mt-0.5"
            />
            <button
              onClick={() => deleteLine(i)}
              disabled={block.lines.length <= 1}
              className="absolute right-0 top-2 p-0.5 text-transparent group-hover/line:text-subtle/50 hover:!text-danger disabled:!opacity-0 transition-colors cursor-pointer"
              title="Remover linha"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* ── Add line ── */}
      <button
        onClick={() => onChange({ ...block, lines: [...block.lines, { chords: '', lyrics: '' }] })}
        className="mt-2 flex items-center gap-1 text-[11px] text-accent/50 hover:text-accent transition-colors cursor-pointer"
      >
        <Plus className="w-3 h-3" />
        linha
      </button>

      {/* ── Stage directions ── */}
      <DirectionsEditor
        directions={block.directions}
        onChange={(d) => onChange({ ...block, directions: d })}
      />
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
        {blocks.length} bloco{blocks.length !== 1 ? 's' : ''}
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
