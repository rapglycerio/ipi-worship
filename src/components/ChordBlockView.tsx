'use client';

import { useState } from 'react';
import type { ChordBlock, ViewMode, FontSizePreset, StageDirectionItem } from '@/types';
import Metronome from '@/components/Metronome';
import { parseChord, simplifyChord } from '@/lib/chords';
import {
  Check,
  SlidersHorizontal,
  Timer,
  Maximize2,
  Eye,
  EyeOff,
  Type,
  Printer,
  Repeat,
  Mic,
  Volume2,
  VolumeX,
  Zap,
  Hand,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface ChordBlockViewProps {
  block: ChordBlock;
  viewMode: ViewMode;
  fontSize: FontSizePreset;
  transposeSemitones: number;
  /** Mostra só fundamental + maior/menor (A7M(9) → A). */
  simplify?: boolean;
  /** Toque num acorde (ex.: abrir o diagrama). Recebe o acorde como exibido. */
  onChordClick?: (chord: string) => void;
}

/** Acorde exibido; tocável (abre o diagrama) quando é um acorde reconhecido. */
function ChordText({ chord, onChordClick }: { chord: string; onChordClick?: (chord: string) => void }) {
  if (!onChordClick || !parseChord(chord)) return <>{chord}</>;
  return (
    <button
      type="button"
      onClick={() => onChordClick(chord)}
      className="chord-token"
      aria-label={`Ver diagrama de ${chord}`}
    >
      {chord}
    </button>
  );
}

interface PlacedChord {
  col: number;
  text: string;
}

/** Acordes de uma linha com a coluna ORIGINAL de cada um (transpor não empurra os seguintes). */
function placeChords(chords: string, mapChord: (c: string) => string): PlacedChord[] {
  const out: PlacedChord[] = [];
  for (const m of chords.matchAll(/\S+/g)) out.push({ col: m.index ?? 0, text: mapChord(m[0]) });
  return out;
}

/**
 * Cifra + letra que quebra linha como texto comum, sem rolagem lateral.
 *
 * A letra é cortada em pedaços nas colunas dos acordes e no começo de cada
 * palavra; cada pedaço leva o acorde que fica sobre ele. Pedaços da mesma
 * palavra ficam grudados (não quebram no meio), e a quebra acontece entre
 * palavras — o acorde continua sempre em cima da sílaba certa.
 */
function ChordLyricLine({
  placed,
  lyrics,
  fontClass,
  onChordClick,
}: {
  placed: PlacedChord[];
  lyrics: string;
  fontClass: string;
  onChordClick?: (chord: string) => void;
}) {
  const lastChordEnd = placed.reduce((m, c) => Math.max(m, c.col + 1), 0);
  const text = lyrics.padEnd(lastChordEnd);
  const chordAt = new Map(placed.map((c) => [c.col, c.text]));

  // Cortes: começo, cada acorde e cada início de palavra.
  const cuts = new Set<number>([0, ...placed.map((c) => c.col)]);
  for (let i = 1; i < text.length; i++) if (text[i] !== ' ' && text[i - 1] === ' ') cuts.add(i);
  const sorted = [...cuts].filter((c) => c < text.length).sort((a, b) => a - b);

  // Agrupa em palavras: novo grupo quando o pedaço começa com letra depois de espaço.
  const words: { col: number; piece: string; chord?: string }[][] = [];
  sorted.forEach((col, i) => {
    const piece = text.slice(col, sorted[i + 1] ?? text.length);
    const unit = { col, piece, chord: chordAt.get(col) };
    const startsWord = col === 0 || (text[col] !== ' ' && text[col - 1] === ' ');
    if (startsWord || words.length === 0) words.push([unit]);
    else words[words.length - 1].push(unit);
  });

  return (
    <div className="flex flex-wrap items-end">
      {words.map((word, w) => (
        <span key={w} className="inline-flex whitespace-pre">
          {word.map((u) => (
            <span key={u.col} className="inline-flex flex-col">
              <span className={`chord-line ${fontClass}`} style={{ letterSpacing: 'normal', fontWeight: '500' }}>
                {u.chord ? (
                  // O acorde ocupa ao menos o seu tamanho + 1 espaço, para não colar no próximo.
                  <span style={{ display: 'inline-block', minWidth: `${u.chord.length + 1}ch` }}>
                    <ChordText chord={u.chord} onChordClick={onChordClick} />
                  </span>
                ) : (
                  ' '
                )}
              </span>
              <span className={`lyric-line whitespace-pre ${fontClass}`} style={{ letterSpacing: 'normal', fontWeight: '500' }}>
                {u.piece}
              </span>
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}

/** Linha só de acordes (intro, solo…): quebra entre acordes quando não cabe. */
function ChordOnlyLine({
  placed,
  fontClass,
  onChordClick,
}: {
  placed: PlacedChord[];
  fontClass: string;
  onChordClick?: (chord: string) => void;
}) {
  return (
    <div className={`chord-line ${fontClass}`} style={{ letterSpacing: 'normal', fontWeight: '500', whiteSpace: 'pre-wrap' }}>
      {placed.map((c, i) => {
        const prevEnd = i === 0 ? 0 : placed[i - 1].col + placed[i - 1].text.length;
        const gap = Math.max(i === 0 ? 0 : 1, c.col - prevEnd);
        return (
          <span key={i}>
            {' '.repeat(gap)}
            <ChordText chord={c.text} onChordClick={onChordClick} />
          </span>
        );
      })}
    </div>
  );
}

// Chromatic scales for transposition
const NOTES_SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTES_FLATS  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Normalize any flat/sharp to its sharp index
const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#', Eb: 'D#', Fb: 'E', Gb: 'F#', Ab: 'G#', Bb: 'A#', Cb: 'B',
};

function transposeChord(chord: string, semitones: number): string {
  if (semitones === 0) return chord;
  const scale = semitones > 0 ? NOTES_SHARPS : NOTES_FLATS;

  return chord.replace(/([A-G])(#|b)?/g, (match, note, acc) => {
    const raw = note + (acc || '');
    const sharp = FLAT_TO_SHARP[raw] ?? raw;
    const idx = NOTES_SHARPS.indexOf(sharp);
    if (idx === -1) return match;
    return scale[((idx + semitones) % 12 + 12) % 12];
  });
}

// Transpose just the root key for display in toolbar
export function transposeKey(key: string, semitones: number): string {
  return transposeChord(key, semitones);
}

const fontSizeMap: Record<FontSizePreset, string> = {
  sm: 'text-xs', md: 'text-sm', lg: 'text-base', xl: 'text-lg', '2xl': 'text-xl',
};

const blockTypeStyles: Record<string, string> = {
  intro: 'block-intro',
  verse: 'block-verse',
  pre_chorus: 'block-verse',
  chorus: 'block-chorus',
  bridge: 'block-bridge',
  interlude: 'block-intro',
  outro: 'block-intro',
  tag: 'block-verse',
};

const blockTypeLabels: Record<string, string> = {
  intro: 'Intro',
  verse: 'Estrofe',
  pre_chorus: 'Pré-Refrão',
  chorus: 'Refrão',
  bridge: 'Ponte',
  interlude: 'Interlúdio',
  outro: 'Final',
  tag: 'Tag',
};

const directionIcons: Record<string, typeof Mic> = {
  a_capella: Mic,
  crescendo: ArrowUp,
  decrescendo: ArrowDown,
  solo_vozes: Mic,
  solo_instrumento: Volume2,
  palmas: Hand,
  silencio: VolumeX,
  custom: Zap,
};

function DirectionPill({ direction }: { direction: StageDirectionItem }) {
  const Icon = directionIcons[direction.type] || Zap;
  const isWarning = ['silencio', 'decrescendo'].includes(direction.type);
  const isInfo = ['solo_instrumento', 'custom'].includes(direction.type);
  return (
    <span className={`stage-pill ${isWarning ? 'stage-pill--warning' : isInfo ? 'stage-pill--info' : ''}`}>
      <Icon className="w-3 h-3" />
      {direction.label}
    </span>
  );
}

export default function ChordBlockView({
  block,
  viewMode,
  fontSize,
  transposeSemitones,
  simplify = false,
  onChordClick,
}: ChordBlockViewProps) {
  const mapChord = (chord: string) => {
    const t = transposeChord(chord, transposeSemitones);
    return simplify ? simplifyChord(t) : t;
  };
  const fontClass = fontSizeMap[fontSize];
  const showChords = viewMode === 'chords_and_lyrics';
  const blockStyle = blockTypeStyles[block.type] || 'block-verse';
  const typeLabel = block.label || blockTypeLabels[block.type] || block.type;

  return (
    <div className={`${blockStyle} py-3 mb-3 animate-fade-in`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-accent">{typeLabel}</span>
        {block.directions.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {block.directions.map((dir, i) => <DirectionPill key={i} direction={dir} />)}
          </div>
        )}
      </div>

      {/* Linhas longas quebram entre palavras (com o acorde junto), sem rolagem lateral. */}
      <div className="space-y-0.5 min-w-0">
        {block.lines.map((line, i) => {
          if (line.blank) return <div key={i} className="h-3" aria-hidden="true" />;
          const hasChords = showChords && line.chords.trim() !== '';
          const hasLyrics = line.lyrics.trim() !== '';
          const placed = hasChords ? placeChords(line.chords, mapChord) : [];
          return (
            <div key={i}>
              {hasChords && hasLyrics ? (
                <ChordLyricLine placed={placed} lyrics={line.lyrics} fontClass={fontClass} onChordClick={onChordClick} />
              ) : hasChords ? (
                <ChordOnlyLine placed={placed} fontClass={fontClass} onChordClick={onChordClick} />
              ) : hasLyrics ? (
                <div className={`lyric-line ${fontClass}`} style={{ letterSpacing: 'normal', fontWeight: '500' }}>
                  {line.lyrics}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {block.repeatCount > 1 && (
        <div className="mt-3 pt-2 border-t border-dashed border-accent/30 flex items-center justify-start gap-1.5">
          <Repeat className="w-4 h-4 text-accent" />
          <span className="text-sm font-bold text-accent uppercase tracking-wide">
            Repetir {block.repeatCount}x
          </span>
        </div>
      )}
    </div>
  );
}

// ── ChordToolbar ─────────────────────────────────────────────

/** Cores de cifra escolhíveis (preferência do aparelho). `null` = cor padrão do app. */
export const CHORD_COLORS: { value: string | null; label: string; swatch: string }[] = [
  { value: null, label: 'Azul (padrão)', swatch: 'var(--accent)' },
  { value: '#f97316', label: 'Laranja', swatch: '#f97316' },
  { value: '#16a34a', label: 'Verde', swatch: '#16a34a' },
  { value: '#ef4444', label: 'Vermelho', swatch: '#ef4444' },
  { value: '#a855f7', label: 'Roxo', swatch: '#a855f7' },
  { value: '#ec4899', label: 'Rosa', swatch: '#ec4899' },
  { value: 'var(--foreground)', label: 'Igual à letra', swatch: 'var(--foreground)' },
];

export const MAX_CAPO = 7;

interface ChordToolbarProps {
  songTitle: string;
  currentKey: string;
  bpm: number;
  timeSignature?: string;
  viewMode: ViewMode;
  fontSize: FontSizePreset;
  transposeSemitones: number;
  capo: number;
  chordColor: string | null;
  simplify: boolean;
  onViewModeChange: (mode: ViewMode) => void;
  onFontSizeChange: (size: FontSizePreset) => void;
  onTransposeChange: (semitones: number) => void;
  onCapoChange: (capo: number) => void;
  onChordColorChange: (color: string | null) => void;
  onSimplifyChange: (simplify: boolean) => void;
  /** Abre o modo palco (tela cheia só com a cifra). */
  onStageMode?: () => void;
}

const fontSizes: FontSizePreset[] = ['sm', 'md', 'lg', 'xl', '2xl'];

export function ChordToolbar({
  songTitle,
  currentKey,
  bpm,
  timeSignature,
  viewMode,
  fontSize,
  transposeSemitones,
  capo,
  chordColor,
  simplify,
  onViewModeChange,
  onFontSizeChange,
  onTransposeChange,
  onCapoChange,
  onChordColorChange,
  onSimplifyChange,
  onStageMode,
}: ChordToolbarProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [showMetronome, setShowMetronome] = useState(false);
  const transposedKey = transposeKey(currentKey, transposeSemitones);
  // Com capotraste, o violonista lê as "formas" um tom abaixo do que soa.
  const shapeKey = transposeKey(currentKey, transposeSemitones - capo);
  const currentFontIndex = fontSizes.indexOf(fontSize);
  const isLyricsOnly = viewMode === 'lyrics_only';

  // Show delta with sign and note whether sharps or flats
  let deltaLabel = '';
  if (transposeSemitones > 0) deltaLabel = `+${transposeSemitones}`;
  else if (transposeSemitones < 0) deltaLabel = `${transposeSemitones}`;

  return (
    <div className="glass-strong sticky top-0 z-40 px-4 py-2.5 rounded-b-xl no-print">
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-foreground truncate">{songTitle}</h2>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {simplify && (
              <span className="text-[11px] font-semibold text-success">Simplificado</span>
            )}
            <span className="text-[11px] font-mono font-semibold text-accent">
              Tom: {transposedKey}
              {deltaLabel && <span className="text-subtle ml-1">({deltaLabel})</span>}
            </span>
            {capo > 0 && (
              <span className="text-[11px] font-mono font-semibold text-warning">
                Capo {capo}ª · formas em {shapeKey}
              </span>
            )}
            {bpm > 0 && <span className="text-[11px] font-mono text-muted">{bpm} BPM</span>}
            {timeSignature && <span className="text-[11px] font-mono text-muted">{timeSignature}</span>}
          </div>
        </div>
        <button
          onClick={() => setShowMetronome((v) => !v)}
          className={`h-8 w-8 flex items-center justify-center cursor-pointer rounded-lg transition-colors ${showMetronome ? 'bg-accent/15 text-accent' : 'hover:bg-elevated text-muted'}`}
          aria-label="Metrônomo"
          aria-expanded={showMetronome}
          title="Metrônomo"
        >
          <Timer className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowOptions((v) => !v)}
          className={`h-8 w-8 flex items-center justify-center cursor-pointer rounded-lg transition-colors ${showOptions ? 'bg-accent/15 text-accent' : 'hover:bg-elevated text-muted'}`}
          aria-label="Capotraste e cor da cifra"
          aria-expanded={showOptions}
          title="Capotraste e cor da cifra"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
        <button onClick={() => window.print()} className="h-8 w-8 flex items-center justify-center cursor-pointer hover:bg-elevated rounded-lg transition-colors" aria-label="Imprimir cifra">
          <Printer className="w-4 h-4 text-muted" />
        </button>
        {onStageMode && (
          <button
            onClick={onStageMode}
            className="h-8 w-8 flex items-center justify-center cursor-pointer hover:bg-elevated rounded-lg transition-colors text-muted"
            aria-label="Modo palco"
            title="Modo palco (tela cheia)"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Mantém montado enquanto aberto; fechar o painel desliga o som. */}
      {showMetronome && (
        <div className="mb-2 p-2.5 rounded-xl bg-elevated/80 border border-border animate-fade-in">
          <Metronome bpm={bpm} timeSignature={timeSignature} />
        </div>
      )}

      {showOptions && (
        <div className="mb-2 p-3 rounded-xl bg-elevated/80 border border-border space-y-3 animate-fade-in">
          {/* Capotraste */}
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Capotraste</span>
              <span className="text-[10px] text-subtle">
                {capo > 0 ? `soa em ${transposedKey}, toque as formas de ${shapeKey}` : 'sem capo'}
              </span>
            </div>
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {Array.from({ length: MAX_CAPO + 1 }, (_, n) => (
                <button
                  key={n}
                  onClick={() => onCapoChange(n)}
                  className={`h-9 min-w-9 px-2 rounded-lg text-xs font-bold cursor-pointer transition-colors shrink-0 ${
                    n === capo ? 'bg-accent text-white' : 'bg-card text-foreground hover:bg-border'
                  }`}
                  aria-pressed={n === capo}
                >
                  {n === 0 ? 'Sem' : `${n}ª`}
                </button>
              ))}
            </div>
          </div>

          {/* Acordes simplificados */}
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-muted">Acordes simplificados</span>
              <span className="block text-[10px] text-subtle">Para iniciantes: A7M(9) vira A, F#m7(11) vira F#m</span>
            </span>
            <input
              type="checkbox"
              checked={simplify}
              onChange={(e) => onSimplifyChange(e.target.checked)}
              className="w-5 h-5 accent-[var(--accent)] cursor-pointer shrink-0"
            />
          </label>

          {/* Cor da cifra */}
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">Cor da cifra</span>
            <div className="flex gap-2 flex-wrap">
              {CHORD_COLORS.map((c) => {
                const selected = c.value === chordColor;
                return (
                  <button
                    key={c.label}
                    onClick={() => onChordColorChange(c.value)}
                    className={`w-9 h-9 rounded-full cursor-pointer border-2 transition-transform flex items-center justify-center ${
                      selected ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ background: c.swatch }}
                    aria-label={c.label}
                    aria-pressed={selected}
                    title={c.label}
                  >
                    {selected && <Check className="w-4 h-4 text-white mix-blend-difference" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5">
        {/* Transpose — shows transposed key directly */}
        <div className="flex items-center bg-elevated rounded-lg shrink-0">
          <button
            onClick={() => onTransposeChange(transposeSemitones - 1)}
            className="h-9 w-8 flex items-center justify-center text-sm font-bold text-muted cursor-pointer hover:bg-border rounded-l-lg transition-colors"
            aria-label="Diminuir tom"
          >−</button>
          <span className="text-xs font-mono font-bold text-accent w-8 text-center select-none">
            {transposedKey}
          </span>
          <button
            onClick={() => onTransposeChange(transposeSemitones + 1)}
            className="h-9 w-8 flex items-center justify-center text-sm font-bold text-muted cursor-pointer hover:bg-border rounded-r-lg transition-colors"
            aria-label="Aumentar tom"
          >+</button>
        </div>

        {/* Reset transpose */}
        {transposeSemitones !== 0 && (
          <button
            onClick={() => onTransposeChange(0)}
            className="h-9 px-2.5 text-[10px] font-semibold bg-elevated rounded-lg text-muted hover:bg-border shrink-0 cursor-pointer transition-colors"
            title="Resetar transposição"
          >↺</button>
        )}

        {/* Font Size */}
        <div className="flex items-center bg-elevated rounded-lg shrink-0">
          <button
            onClick={() => { if (currentFontIndex > 0) onFontSizeChange(fontSizes[currentFontIndex - 1]); }}
            className="h-9 w-8 flex items-center justify-center text-muted cursor-pointer hover:bg-border rounded-l-lg transition-colors"
            aria-label="Diminuir fonte"
          ><Type className="w-3 h-3" /></button>
          <span className="text-[10px] font-semibold text-foreground w-6 text-center select-none">{fontSize.toUpperCase()}</span>
          <button
            onClick={() => { if (currentFontIndex < fontSizes.length - 1) onFontSizeChange(fontSizes[currentFontIndex + 1]); }}
            className="h-9 w-8 flex items-center justify-center text-muted cursor-pointer hover:bg-border rounded-r-lg transition-colors"
            aria-label="Aumentar fonte"
          ><Type className="w-4 h-4" /></button>
        </div>

        {/* View Mode — icon + label */}
        <button
          onClick={() => onViewModeChange(isLyricsOnly ? 'chords_and_lyrics' : 'lyrics_only')}
          className="flex items-center gap-1.5 bg-elevated rounded-lg px-3 h-9 text-[10px] font-semibold text-foreground shrink-0 cursor-pointer hover:bg-border transition-colors"
          aria-label={isLyricsOnly ? 'Mostrar cifra e letra' : 'Mostrar só letra'}
          title={isLyricsOnly ? 'Cifra + Letra' : 'Só Letra'}
        >
          {isLyricsOnly
            ? <EyeOff className="w-3.5 h-3.5 text-muted" />
            : <Eye    className="w-3.5 h-3.5 text-accent" />}
          <span>{isLyricsOnly ? 'Letra' : 'Cifra'}</span>
        </button>
      </div>
    </div>
  );
}
