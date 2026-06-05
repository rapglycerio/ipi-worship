'use client';

import { useState, useRef, useEffect } from 'react';
import type { ChordBlock, ChordLine, BlockType, StageDirection, StageDirectionItem } from '@/types';
import {
  ChevronUp, ChevronDown, Plus, Trash2, Copy,
  Repeat, Mic, Volume2, VolumeX, Zap, Hand,
  ArrowUp, ArrowDown, X as XIcon, Scissors,
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

/** The canonical display name for a block type (e.g. 'chorus' → 'Refrão'). */
function labelForType(type: BlockType): string {
  return BLOCK_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? 'Bloco';
}

/** True when the block's label was personalized (differs from its type's name). */
function hasCustomLabel(block: ChordBlock): boolean {
  return block.label.trim().toLowerCase() !== labelForType(block.type).toLowerCase();
}

const DIRECTION_OPTIONS: { value: StageDirection; label: string; icon: typeof Mic }[] = [
  { value: 'crescendo',        label: 'Crescendo',         icon: ArrowUp },
  { value: 'decrescendo',      label: 'Decrescendo',       icon: ArrowDown },
  { value: 'a_capella',        label: 'A Cappella',        icon: Mic },
  { value: 'solo_vozes',       label: 'Solo Vozes',        icon: Mic },
  { value: 'solo_instrumento', label: 'Solo Instrumento',  icon: Volume2 },
  { value: 'palmas',           label: 'Palmas',            icon: Hand },
  { value: 'silencio',         label: 'Silencio',          icon: VolumeX },
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

// ── Chord token system ────────────────────────────────────────
// Stored as plain string ("Em   G  D"), edited as independent tokens.

interface ChordToken {
  id: string;
  text: string;
  pos: number; // column index in the output string
}

function parseChordsToTokens(chords: string): ChordToken[] {
  if (!chords.trim()) return [];
  const tokens: ChordToken[] = [];
  const regex = /\S+/g;
  let match;
  while ((match = regex.exec(chords)) !== null) {
    tokens.push({ id: `t${match.index}`, text: match[0], pos: match.index });
  }
  return tokens;
}

function tokensToString(tokens: ChordToken[]): string {
  if (tokens.length === 0) return '';
  const sorted = [...tokens].sort((a, b) => a.pos - b.pos);
  let result = '';
  for (const token of sorted) {
    const start = Math.max(result.length > 0 ? result.length + 1 : 0, token.pos);
    while (result.length < start) result += ' ';
    result += token.text;
  }
  return result;
}

// ── InlineChordEditor ─────────────────────────────────────────
// Chords rendered at their exact column positions (absolutely positioned)
// directly above the lyric input — edit in place, no separate preview.

interface InlineChordEditorProps {
  chords: string;
  onChange: (chords: string) => void;
}

function InlineChordEditor({ chords, onChange }: InlineChordEditorProps) {
  const [tokens, setTokens]          = useState<ChordToken[]>(() => parseChordsToTokens(chords));
  const [editingId, setEditingId]    = useState<string | null>(null);
  const [draggingId, setDraggingId]  = useState<string | null>(null);
  const [pendingFocus, setPending]   = useState<string | null>(null);
  const [charWidth, setCharWidth]    = useState(8.4);
  const isOwnChange = useRef(false);
  const dragState   = useRef<{ id: string; startX: number; startPos: number; hasMoved: boolean } | null>(null);
  const rulerRef    = useRef<HTMLSpanElement>(null);
  const chipRefs    = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Measure real monospace char width from a hidden ruler span
  useEffect(() => {
    if (!rulerRef.current) return;
    const w = rulerRef.current.getBoundingClientRect().width / 10;
    if (w > 0) setCharWidth(w);
  }, []);

  // Sync from parent (e.g., transpose from toolbar)
  useEffect(() => {
    if (isOwnChange.current) { isOwnChange.current = false; return; }
    setTokens(parseChordsToTokens(chords));
  }, [chords]);

  // Restore keyboard focus after remove / Tab nav
  useEffect(() => {
    if (!pendingFocus) return;
    chipRefs.current.get(pendingFocus)?.focus();
    setPending(null);
  }, [pendingFocus]);

  function emit(next: ChordToken[]) {
    setTokens(next);
    isOwnChange.current = true;
    onChange(tokensToString(next));
  }
  function updateText(id: string, text: string) {
    emit(tokens.map(t => t.id === id ? { ...t, text } : t));
  }
  function moveToken(id: string, delta: number) {
    emit(tokens.map(t => t.id === id ? { ...t, pos: Math.max(0, t.pos + delta) } : t));
  }
  function removeToken(id: string) {
    const sorted = [...tokens].sort((a, b) => a.pos - b.pos);
    const idx = sorted.findIndex(t => t.id === id);
    const next = sorted[idx + 1]?.id ?? sorted[idx - 1]?.id;
    emit(tokens.filter(t => t.id !== id));
    if (next) setPending(next);
  }
  function addChordAt(pos: number) {
    const t: ChordToken = { id: `t${Date.now()}`, text: 'Am', pos: Math.max(0, pos) };
    const next = [...tokens, t];
    setTokens(next); setEditingId(t.id);
    isOwnChange.current = true; onChange(tokensToString(next));
  }

  // ── Drag (Pointer API + setPointerCapture) ───────────────────
  function onPtrDown(e: React.PointerEvent<HTMLButtonElement>, t: ChordToken) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { id: t.id, startX: e.clientX, startPos: t.pos, hasMoved: false };
  }
  function onPtrMove(e: React.PointerEvent<HTMLButtonElement>, t: ChordToken) {
    const d = dragState.current;
    if (!d || d.id !== t.id) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 5) { d.hasMoved = true; setDraggingId(t.id); }
    if (!d.hasMoved) return;
    const newPos = Math.max(0, d.startPos + Math.round(dx / charWidth));
    setTokens(prev => prev.map(tk => tk.id === d.id ? { ...tk, pos: newPos } : tk));
  }
  function onPtrUp(e: React.PointerEvent<HTMLButtonElement>, t: ChordToken) {
    const d = dragState.current;
    if (!d || d.id !== t.id) return;
    const wasDrag = d.hasMoved;
    dragState.current = null; setDraggingId(null);
    if (!wasDrag) { setEditingId(t.id); return; }
    setTokens(prev => { isOwnChange.current = true; onChange(tokensToString(prev)); return prev; });
  }

  // ── Keyboard ─────────────────────────────────────────────────
  function onChipKey(e: React.KeyboardEvent<HTMLButtonElement>, t: ChordToken) {
    switch (e.key) {
      case 'ArrowLeft':  e.preventDefault(); e.stopPropagation(); moveToken(t.id, e.shiftKey ? -5 : -1); break;
      case 'ArrowRight': e.preventDefault(); e.stopPropagation(); moveToken(t.id, e.shiftKey ?  5 :  1); break;
      case 'Enter': case 'F2':           e.preventDefault(); e.stopPropagation(); setEditingId(t.id); break;
      case 'Delete': case 'Backspace':   e.preventDefault(); e.stopPropagation(); removeToken(t.id);  break;
    }
  }
  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>, t: ChordToken) {
    const sorted = [...tokens].sort((a, b) => a.pos - b.pos);
    const idx = sorted.findIndex(x => x.id === t.id);
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      setEditingId(null);
      if (!t.text.trim()) removeToken(t.id); else setPending(t.id);
    } else if (e.key === 'Tab') {
      e.preventDefault(); setEditingId(null);
      if (!t.text.trim()) removeToken(t.id);
      const nextId = e.shiftKey ? sorted[idx - 1]?.id : sorted[idx + 1]?.id;
      if (nextId) setPending(nextId);
    } else { e.stopPropagation(); }
  }

  // Click on empty chord area → add chord at that column
  function onAreaClick(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button,input')) return;
    const x = e.clientX - (e.currentTarget as HTMLElement).getBoundingClientRect().left;
    addChordAt(Math.round(x / charWidth));
  }

  return (
    <>
      {/* Off-screen ruler — measures exact monospace char width */}
      <span ref={rulerRef} className="chord-line"
        style={{ position: 'fixed', top: 0, left: -9999, opacity: 0, pointerEvents: 'none' }}
        aria-hidden>MMMMMMMMMM</span>

      {/* Chord area — chips at exact column positions; double-click to add */}
      <div
        onDoubleClick={onAreaClick}
        className="relative border-b border-dashed border-accent/20"
        style={{ minHeight: '1.6rem', cursor: 'crosshair' }}
        title="Duplo-clique para adicionar cifra"
      >
        {tokens.length === 0 && (
          <span className="chord-line text-accent/20 text-xs italic pointer-events-none select-none absolute top-0 left-0">
            duplo-clique para adicionar cifra...
          </span>
        )}
        {tokens.map(token => (
          <span key={token.id} className="absolute top-0 group/chip"
            style={{ left: `${token.pos * charWidth}px` }}>
            {editingId === token.id ? (
              <input autoFocus value={token.text}
                onChange={e => updateText(token.id, e.target.value)}
                onBlur={() => { setEditingId(null); if (!token.text.trim()) removeToken(token.id); }}
                onKeyDown={e => onInputKey(e, token)}
                className="chord-line bg-accent/15 border border-accent/50 rounded-sm focus:outline-none text-center px-0.5"
                style={{ width: `${Math.max((token.text.length || 1) + 1, 3)}ch`, minWidth: '2ch' }}
              />
            ) : (
              <span className="relative inline-flex items-start">
                <button
                  ref={el => { if (el) chipRefs.current.set(token.id, el); else chipRefs.current.delete(token.id); }}
                  onPointerDown={e => onPtrDown(e, token)}
                  onPointerMove={e => onPtrMove(e, token)}
                  onPointerUp={e => onPtrUp(e, token)}
                  onKeyDown={e => onChipKey(e, token)}
                  style={{ touchAction: 'none' }}
                  className={`chord-line select-none focus:outline-none focus:underline focus:decoration-dotted whitespace-nowrap
                    ${draggingId === token.id ? 'opacity-50 cursor-grabbing' : 'cursor-ew-resize'}`}
                  title={`col ${token.pos} · Arrastar · ←→ mover · Clique/Enter editar · Del remover`}
                >{token.text}</button>
                {/* × on chip hover */}
                <button tabIndex={-1}
                  onClick={e => { e.stopPropagation(); removeToken(token.id); }}
                  className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-danger text-white text-[8px] leading-none
                    items-center justify-center hidden group-hover/chip:flex cursor-pointer z-10"
                  title="Remover">×</button>
              </span>
            )}
          </span>
        ))}
      </div>
    </>
  );
}

// ── DirectionsEditor ──────────────────────────────────────────

interface DirectionsEditorProps {
  directions: StageDirectionItem[];
  onChange: (d: StageDirectionItem[]) => void;
}

function DirectionsEditor({ directions, onChange }: DirectionsEditorProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [customLabel, setCustomLabel] = useState('');

  function addDirection(type: StageDirection) {
    if (type === 'custom') return;
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
    <div className="mt-3 pt-2.5 border-t border-border/50">
      {/* Section header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-subtle flex items-center gap-1.5">
          <Zap className="w-3 h-3" />
          Dinâmica do bloco
        </span>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-colors cursor-pointer
            ${showPicker
              ? 'bg-accent text-white'
              : 'bg-accent/10 text-accent hover:bg-accent/20'}`}
          title="Adicionar crescendo, solo, palmas, silêncio..."
        >
          <Plus className="w-3 h-3" />
          {directions.length === 0 ? 'crescendo, solo...' : 'adicionar'}
        </button>
      </div>

      {/* Active direction pills */}
      {directions.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
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
        </div>
      )}

      {showPicker && (
        <div className="p-3 bg-elevated rounded-xl border border-border space-y-2.5">
          <p className="text-[10px] text-subtle font-medium">Escolha uma direção de palco:</p>
          <div className="flex flex-wrap gap-1.5">
            {DIRECTION_OPTIONS.filter((o) => o.value !== 'custom').map((opt) => {
              const Icon = opt.icon;
              return (
                <button key={opt.value} onClick={() => addDirection(opt.value)}
                  className="stage-pill cursor-pointer hover:bg-accent hover:text-white transition-colors">
                  <Icon className="w-3 h-3" />
                  {opt.label}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 items-center pt-1 border-t border-border/40">
            <input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="Personalizado (ex: só vozes femininas)..."
              className="flex-1 px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-accent/50"
              onKeyDown={(e) => { if (e.key === 'Enter') addCustom(); if (e.key === 'Escape') setShowPicker(false); }}
            />
            <button onClick={addCustom} className="px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-semibold hover:bg-accent/90 cursor-pointer shrink-0">
              + Adicionar
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
  onSplitAt: (afterLineIdx: number) => void;
}

function BlockCard({
  block, isFirst, isLast,
  onChange, onDelete, onDuplicate, onMoveUp, onMoveDown, onSplitAt,
}: BlockCardProps) {
  const [pendingFocus, setPendingFocus] = useState<number | null>(null);
  const [customMode, setCustomMode] = useState(() => hasCustomLabel(block));
  const lyricsRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  // Picking a type from the unified dropdown: a preset sets both the type and
  // its canonical name; "Personalizar…" keeps the type but frees the label.
  function handleTypeSelect(value: string) {
    if (value === '__custom__') {
      setCustomMode(true);
      return;
    }
    setCustomMode(false);
    const type = value as BlockType;
    onChange({ ...block, type, label: labelForType(type) });
  }

  useEffect(() => {
    if (pendingFocus === null) return;
    lyricsRefs.current.get(pendingFocus)?.focus();
    setPendingFocus(null);
  }, [pendingFocus, block.lines.length]);

  function updateLine(idx: number, field: keyof ChordLine, value: string) {
    onChange({ ...block, lines: block.lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)) });
  }

  function insertLineAfter(idx: number) {
    const next = [...block.lines];
    next.splice(idx + 1, 0, { chords: '', lyrics: '' });
    onChange({ ...block, lines: next });
    setPendingFocus(idx + 1);
  }

  function deleteLine(idx: number) {
    if (block.lines.length <= 1) return;
    onChange({ ...block, lines: block.lines.filter((_, i) => i !== idx) });
  }

  // Split a single line into two at the cursor position (or midpoint if no cursor)
  function splitLineAt(idx: number) {
    const input = lyricsRefs.current.get(idx);
    const line = block.lines[idx];
    if (!line.lyrics.trim()) return;

    const rawCursor = input?.selectionStart ?? null;
    const mid = Math.ceil(line.lyrics.length / 2);
    const cursor = (rawCursor !== null && rawCursor > 0 && rawCursor < line.lyrics.length)
      ? rawCursor : mid;
    if (cursor <= 0 || cursor >= line.lyrics.length) return;

    const lyrics1 = line.lyrics.slice(0, cursor);
    const afterSplit = line.lyrics.slice(cursor);
    const lyrics2 = afterSplit.trimStart();
    const splitCol = cursor + (afterSplit.length - lyrics2.length);

    const tokens = parseChordsToTokens(line.chords);
    const tokens1 = tokens.filter(t => t.pos < splitCol);
    const tokens2 = tokens
      .filter(t => t.pos >= splitCol)
      .map(t => ({ ...t, id: `t${t.pos}`, pos: t.pos - splitCol }));

    const newLines = [...block.lines];
    newLines.splice(idx, 1,
      { chords: tokensToString(tokens1), lyrics: lyrics1 },
      { chords: tokensToString(tokens2), lyrics: lyrics2 }
    );
    onChange({ ...block, lines: newLines });
    setPendingFocus(idx + 1);
  }

  const blockStyle = blockTypeStyles[block.type] ?? 'block-verse';

  return (
    <div className={`${blockStyle} py-3 mb-3 group`}>
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {/* Unified type + name control: pick a type (sets the name), or
              choose "Personalizar…" to type a free label. */}
          <select
            value={customMode ? '__custom__' : block.type}
            onChange={(e) => handleTypeSelect(e.target.value)}
            className="text-[11px] font-bold uppercase tracking-wider text-accent bg-transparent border-0 focus:outline-none cursor-pointer p-0"
            title="Tipo do bloco"
          >
            {BLOCK_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
            <option value="__custom__">Personalizar…</option>
          </select>
          {customMode && (
            <input
              autoFocus
              value={block.label}
              onChange={(e) => onChange({ ...block, label: e.target.value })}
              placeholder="Nome do bloco"
              className="text-[11px] font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/30 rounded px-1.5 py-0.5 focus:outline-none focus:border-accent/60 min-w-[6ch]"
              style={{ width: `${Math.max(block.label.length, 6) + 1}ch` }}
              title="Nome personalizado do bloco"
            />
          )}
          <span className="inline-flex items-center gap-0.5 bg-accent/10 rounded-full px-1.5 py-0.5">
            <Repeat className="w-3 h-3 text-accent" />
            <button
              onClick={() => onChange({ ...block, repeatCount: Math.max(1, block.repeatCount - 1) })}
              disabled={block.repeatCount <= 1}
              className="w-4 h-4 flex items-center justify-center text-accent/60 hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer rounded text-sm leading-none font-bold"
              title="Menos repetições"
            >−</button>
            <span className="text-[11px] font-semibold text-accent tabular-nums w-4 text-center select-none">
              {block.repeatCount}x
            </span>
            <button
              onClick={() => onChange({ ...block, repeatCount: Math.min(10, block.repeatCount + 1) })}
              disabled={block.repeatCount >= 10}
              className="w-4 h-4 flex items-center justify-center text-accent/60 hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer rounded text-sm leading-none font-bold"
              title="Mais repetições"
            >+</button>
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={onMoveUp}    disabled={isFirst} className="p-1.5 text-subtle hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer rounded transition-colors" title="Subir bloco">
            <ChevronUp   className="w-3.5 h-3.5" />
          </button>
          <button onClick={onMoveDown}  disabled={isLast}  className="p-1.5 text-subtle hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer rounded transition-colors" title="Descer bloco">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDuplicate} className="p-1.5 text-subtle hover:text-accent cursor-pointer rounded transition-colors" title="Duplicar bloco">
            <Copy        className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete}    className="p-1.5 text-subtle hover:text-danger cursor-pointer rounded transition-colors" title="Excluir bloco">
            <Trash2      className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Lines ── */}
      <div className="space-y-0">
        {block.lines.map((line, i) => (
          <div key={i}>
            <div className="group/line relative pr-12">
              {/* Inline chord editor — chips sit at exact positions above the lyric */}
              <InlineChordEditor
                chords={line.chords}
                onChange={(chords) => updateLine(i, 'chords', chords)}
              />
              {/* Lyric input — sits directly below, natural alignment reference */}
              <input
                ref={(el) => { if (el) lyricsRefs.current.set(i, el); else lyricsRefs.current.delete(i); }}
                value={line.lyrics}
                onChange={(e) => updateLine(i, 'lyrics', e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); insertLineAfter(i); } }}
                placeholder="letra..."
                className="lyric-line w-full bg-transparent border-0 border-b border-dashed border-border/30 focus:border-border/60 focus:outline-none placeholder:text-subtle placeholder:opacity-50 pb-0.5 mt-0.5"
              />
              {/* Line actions — visible on hover */}
              <div className="absolute right-0 top-1 flex items-center gap-0.5 opacity-0 group-hover/line:opacity-100 transition-opacity">
                <button
                  onClick={() => splitLineAt(i)}
                  disabled={!line.lyrics.trim()}
                  className="p-0.5 text-subtle hover:text-accent disabled:opacity-0 transition-colors cursor-pointer"
                  title="Dividir linha aqui (coloque o cursor na letra antes)"
                >
                  <Scissors className="w-3 h-3" />
                </button>
                <button
                  onClick={() => deleteLine(i)}
                  disabled={block.lines.length <= 1}
                  className="p-0.5 text-subtle hover:text-danger disabled:opacity-0 transition-colors cursor-pointer"
                  title="Remover linha"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Split button — appears on hover between lines */}
            {i < block.lines.length - 1 && (
              <div className="flex items-center gap-1.5 my-0.5 opacity-0 hover:opacity-100 transition-opacity">
                <div className="flex-1 h-px bg-border/40" />
                <button onClick={() => onSplitAt(i)}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-subtle hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                  title="Dividir bloco aqui">
                  <Scissors className="w-3 h-3" />
                  dividir
                </button>
                <div className="flex-1 h-px bg-border/40" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Add line ── */}
      <button
        onClick={() => insertLineAfter(block.lines.length - 1)}
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

  function splitBlock(id: string, afterLineIdx: number) {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const block = blocks[idx];
    const firstLines = block.lines.slice(0, afterLineIdx + 1);
    const secondLines = block.lines.slice(afterLineIdx + 1);
    if (secondLines.length === 0) return;
    const firstBlock: ChordBlock = { ...block, lines: firstLines };
    const secondBlock: ChordBlock = { ...block, id: newBlockId(), lines: secondLines, directions: [] };
    const next = [...blocks];
    next.splice(idx, 1, firstBlock, secondBlock);
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
          onSplitAt={(afterLineIdx) => splitBlock(block.id, afterLineIdx)}
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
