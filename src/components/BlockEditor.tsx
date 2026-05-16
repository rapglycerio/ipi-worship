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

// ── Chord token system ────────────────────────────────────────
// Chords are stored as a plain string ("Em   G  D") but edited as
// independent tokens so moving one chord never disturbs the others.

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
    // Guarantee no overlap: place at whichever is further right
    const start = Math.max(result.length > 0 ? result.length + 1 : 0, token.pos);
    while (result.length < start) result += ' ';
    result += token.text;
  }
  return result;
}

// ── ChordTokenEditor ──────────────────────────────────────────

interface ChordTokenEditorProps {
  chords: string;
  lyrics: string;
  onChange: (chords: string) => void;
}

function ChordTokenEditor({ chords, lyrics, onChange }: ChordTokenEditorProps) {
  const [tokens, setTokens] = useState<ChordToken[]>(() => parseChordsToTokens(chords));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const isOwnChange = useRef(false);
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    id: string; startX: number; startPos: number; hasMoved: boolean;
  } | null>(null);

  // Sync from parent when changed externally (e.g., transpose from toolbar)
  useEffect(() => {
    if (isOwnChange.current) { isOwnChange.current = false; return; }
    setTokens(parseChordsToTokens(chords));
  }, [chords]);

  // Restore focus after remove / edit-confirm / Tab navigation
  useEffect(() => {
    if (!pendingFocusId) return;
    if (pendingFocusId === '__add__') addBtnRef.current?.focus();
    else chipRefs.current.get(pendingFocusId)?.focus();
    setPendingFocusId(null);
  }, [pendingFocusId]);

  function emit(newTokens: ChordToken[]) {
    setTokens(newTokens);
    isOwnChange.current = true;
    onChange(tokensToString(newTokens));
  }

  function updateText(id: string, text: string) {
    emit(tokens.map(t => t.id === id ? { ...t, text } : t));
  }

  function move(id: string, delta: number) {
    emit(tokens.map(t => t.id === id ? { ...t, pos: Math.max(0, t.pos + delta) } : t));
  }

  function remove(id: string, focusAdjacent = false) {
    if (focusAdjacent) {
      const sorted = [...tokens].sort((a, b) => a.pos - b.pos);
      const idx = sorted.findIndex(t => t.id === id);
      const nextId = sorted[idx + 1]?.id ?? sorted[idx - 1]?.id ?? '__add__';
      setPendingFocusId(nextId);
    }
    emit(tokens.filter(t => t.id !== id));
  }

  function addChord() {
    const lastEnd = tokens.length > 0
      ? Math.max(...tokens.map(t => t.pos + t.text.length)) + 2
      : 0;
    const newToken: ChordToken = { id: `t${Date.now()}`, text: 'Am', pos: lastEnd };
    const next = [...tokens, newToken];
    setTokens(next);
    setEditingId(newToken.id);
    isOwnChange.current = true;
    onChange(tokensToString(next));
  }

  // ── Drag (Pointer API) ──────────────────────────────────────
  // Measures actual monospace character width from the live preview element.
  function getCharWidth(): number {
    if (!previewRef.current) return 8.4;
    const text = previewRef.current.textContent ?? '';
    if (!text.length) return 8.4;
    return previewRef.current.getBoundingClientRect().width / text.length;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>, token: ChordToken) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { id: token.id, startX: e.clientX, startPos: token.pos, hasMoved: false };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>, token: ChordToken) {
    const drag = dragState.current;
    if (!drag || drag.id !== token.id) return;
    const deltaX = e.clientX - drag.startX;
    if (Math.abs(deltaX) > 5) {
      drag.hasMoved = true;
      setDraggingId(token.id);
    }
    if (!drag.hasMoved) return;
    const charW = getCharWidth();
    const newPos = Math.max(0, drag.startPos + Math.round(deltaX / charW));
    // Update local state live (no parent emit yet — wait for pointerUp)
    setTokens(prev => prev.map(t => t.id === drag.id ? { ...t, pos: newPos } : t));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>, token: ChordToken) {
    const drag = dragState.current;
    if (!drag || drag.id !== token.id) return;
    const wasDrag = drag.hasMoved;
    dragState.current = null;
    setDraggingId(null);
    if (!wasDrag) {
      // Pure click → enter text-edit mode
      setEditingId(token.id);
      return;
    }
    // Drag finished → emit final position to parent
    setTokens(prev => {
      isOwnChange.current = true;
      onChange(tokensToString(prev));
      return prev;
    });
  }

  // ── Keyboard (chip button) ──────────────────────────────────
  function handleChipKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, token: ChordToken) {
    switch (e.key) {
      case 'ArrowLeft':  e.preventDefault(); e.stopPropagation(); move(token.id, e.shiftKey ? -5 : -1); break;
      case 'ArrowRight': e.preventDefault(); e.stopPropagation(); move(token.id, e.shiftKey ?  5 :  1); break;
      case 'Enter': case 'F2': e.preventDefault(); e.stopPropagation(); setEditingId(token.id); break;
      case 'Delete': case 'Backspace': e.preventDefault(); e.stopPropagation(); remove(token.id, true); break;
    }
  }

  // ── Keyboard (text input) ───────────────────────────────────
  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>, token: ChordToken) {
    const sorted = [...tokens].sort((a, b) => a.pos - b.pos);
    const idx = sorted.findIndex(t => t.id === token.id);
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      setEditingId(null);
      if (!token.text.trim()) remove(token.id); else setPendingFocusId(token.id);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      setEditingId(null);
      if (!token.text.trim()) remove(token.id);
      setPendingFocusId(e.shiftKey ? (sorted[idx - 1]?.id ?? '__add__') : (sorted[idx + 1]?.id ?? '__add__'));
    } else {
      e.stopPropagation();
    }
  }

  const sorted = [...tokens].sort((a, b) => a.pos - b.pos);
  const preview = tokensToString(tokens);

  return (
    <div className="border-b border-dashed border-accent/20 pb-1 mb-0.5">
      {/* ── Chips ── */}
      <div className="flex items-center gap-1 flex-wrap min-h-[26px] py-0.5">
        {sorted.length === 0 && (
          <span className="text-[11px] text-subtle/40 select-none italic">sem cifra</span>
        )}

        {sorted.map(token => (
          <span
            key={token.id}
            className={`inline-flex items-center border rounded text-accent overflow-hidden transition-colors
              ${draggingId === token.id ? 'bg-accent/25 border-accent/60 shadow-sm' : 'bg-accent/10 border-accent/25'}`}
          >
            {/* ◄ keyboard/mouse nudge */}
            <button tabIndex={-1} onClick={() => move(token.id, -1)}
              className="px-1 py-0.5 text-[10px] text-accent/50 hover:text-accent hover:bg-accent/20 transition-colors cursor-pointer select-none"
              title="Mover esquerda (ou ← no teclado)">◄</button>

            {/* Chord text — drag OR click-to-edit */}
            {editingId === token.id ? (
              <input autoFocus value={token.text}
                onChange={e => updateText(token.id, e.target.value)}
                onBlur={() => { setEditingId(null); if (!token.text.trim()) remove(token.id); }}
                onKeyDown={e => handleInputKeyDown(e, token)}
                className="chord-line bg-transparent border-0 focus:outline-none text-center px-0.5 py-0.5"
                style={{ width: `${Math.max((token.text.length || 1) + 1, 3)}ch` }}
              />
            ) : (
              <button
                ref={el => { if (el) chipRefs.current.set(token.id, el); else chipRefs.current.delete(token.id); }}
                onPointerDown={e => handlePointerDown(e, token)}
                onPointerMove={e => handlePointerMove(e, token)}
                onPointerUp={e => handlePointerUp(e, token)}
                onKeyDown={e => handleChipKeyDown(e, token)}
                style={{ touchAction: 'none' }}
                className="chord-line px-1 py-0.5 cursor-ew-resize min-w-[2ch] text-center select-none focus:outline-none focus:ring-1 focus:ring-accent rounded-sm"
                title={`col ${token.pos}  ·  Arrastar ou ←→ mover  ·  Clique/Enter para editar  ·  Del remover`}
              >
                {token.text}
              </button>
            )}

            {/* ► keyboard/mouse nudge */}
            <button tabIndex={-1} onClick={() => move(token.id, 1)}
              className="px-1 py-0.5 text-[10px] text-accent/50 hover:text-accent hover:bg-accent/20 transition-colors cursor-pointer select-none"
              title="Mover direita (ou → no teclado)">►</button>

            {/* × remove */}
            <button tabIndex={-1} onClick={() => remove(token.id, true)}
              className="pr-0.5 pl-0 py-0.5 text-accent/40 hover:text-danger transition-colors cursor-pointer"
              title="Remover">
              <XIcon className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}

        <button ref={addBtnRef} onClick={addChord}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] text-accent/50 hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent/60"
          title="Adicionar acorde">
          <Plus className="w-3 h-3" />
          acorde
        </button>
      </div>

      {/* ── Preview (tamanho real) — cifra + letra como na visualização ── */}
      {(preview || lyrics.trim()) && (
        <div className="overflow-x-auto mt-1 rounded bg-elevated/50 px-2 py-1">
          {preview && (
            <div ref={previewRef} className="chord-line text-accent/70 whitespace-pre leading-snug">
              {preview}
            </div>
          )}
          {lyrics.trim() && (
            <div className="lyric-line text-foreground/50 text-sm leading-snug">
              {lyrics}
            </div>
          )}
        </div>
      )}

      {/* ── Hint ── */}
      {sorted.length > 0 && (
        <p className="text-[9px] text-subtle/35 mt-0.5 select-none leading-none">
          Arrastar · Tab navegar · ←/→ mover · Shift+←/→ ×5 · Clique/Enter editar · Del remover
        </p>
      )}
    </div>
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
    <div className="mt-2 pt-2 border-t border-dashed border-border/60">
      <div className="flex items-center gap-1.5 flex-wrap">
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
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="stage-pill cursor-pointer hover:opacity-80 transition-opacity gap-1"
          title="Adicionar direção de palco"
        >
          <Plus className="w-3 h-3" />
          <span>direção</span>
        </button>
      </div>

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
          <div className="flex gap-2 items-center">
            <input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="Personalizado..."
              className="flex-1 px-2 py-1 bg-card border border-border rounded-md text-xs text-foreground focus:outline-none focus:border-accent/50"
              onKeyDown={(e) => { if (e.key === 'Enter') addCustom(); if (e.key === 'Escape') setShowPicker(false); }}
            />
            <button onClick={addCustom} className="px-2 py-1 bg-accent text-white rounded-md text-xs font-semibold hover:bg-accent/90 cursor-pointer">+</button>
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
  const lyricsRefs = useRef<Map<number, HTMLInputElement>>(new Map());

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

  const blockStyle = blockTypeStyles[block.type] ?? 'block-verse';

  return (
    <div className={`${blockStyle} py-3 mb-3 group`}>
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <input
            value={block.label}
            onChange={(e) => onChange({ ...block, label: e.target.value })}
            className="text-[11px] font-bold uppercase tracking-wider text-accent bg-transparent border-0 focus:outline-none p-0 min-w-[2ch]"
            style={{ width: `${Math.max(block.label.length, 3) + 1}ch` }}
            title="Editar rótulo"
          />
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
            <div className="group/line relative pr-6">
              {/* Chord chip editor */}
              <ChordTokenEditor
                chords={line.chords}
                lyrics={line.lyrics}
                onChange={(chords) => updateLine(i, 'chords', chords)}
              />
              {/* Lyric input */}
              <input
                ref={(el) => {
                  if (el) lyricsRefs.current.set(i, el);
                  else lyricsRefs.current.delete(i);
                }}
                value={line.lyrics}
                onChange={(e) => updateLine(i, 'lyrics', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); insertLineAfter(i); }
                }}
                placeholder="letra..."
                className="lyric-line w-full bg-transparent border-0 border-b border-dashed border-border/30 focus:border-border/60 focus:outline-none placeholder:text-subtle placeholder:opacity-50 pb-0.5 mt-0.5"
              />
              <button
                onClick={() => deleteLine(i)}
                disabled={block.lines.length <= 1}
                className="absolute right-0 top-1 p-0.5 text-transparent group-hover/line:text-subtle/50 hover:!text-danger disabled:!opacity-0 transition-colors cursor-pointer"
                title="Remover linha"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {/* Split button — appears on hover between lines */}
            {i < block.lines.length - 1 && (
              <div className="flex items-center gap-1.5 my-0.5 opacity-0 hover:opacity-100 transition-opacity">
                <div className="flex-1 h-px bg-border/40" />
                <button
                  onClick={() => onSplitAt(i)}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-subtle hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                  title="Dividir bloco aqui"
                >
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
