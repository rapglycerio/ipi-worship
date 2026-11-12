'use client';

import { useState } from 'react';
import type { ChordBlock, ViewMode, FontSizePreset, StageDirectionItem } from '@/types';
import Metronome from '@/components/Metronome';
import {
  Check,
  SlidersHorizontal,
  Timer,
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

function transposeLine(line: string, semitones: number): string {
  if (semitones === 0) return line;
  return line.replace(/\S+/g, (token) => transposeChord(token, semitones));
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

export default function ChordBlockView({ block, viewMode, fontSize, transposeSemitones }: ChordBlockViewProps) {
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

      {/* overflow-x: auto permite scroll horizontal das cifras longas sem
          afetar a página toda — essencial para leitura no celular */}
      <div className="overflow-x-auto pb-0.5">
        <div className="space-y-0.5">
          {block.lines.map((line, i) => (
            <div key={i}>
              {line.blank ? (
                <div className="h-3" aria-hidden="true" />
              ) : (
                <>
                  {viewMode === 'chords_and_lyrics' && line.chords.trim() && (
                    <div className={`chord-line ${fontSizeMap[fontSize]}`} style={{ letterSpacing: 'normal', fontWeight: '500' }}>
                      {transposeLine(line.chords, transposeSemitones)}
                    </div>
                  )}
                  {line.lyrics.trim() && (
                    <div className={`lyric-line ${fontSizeMap[fontSize]}`} style={{ letterSpacing: 'normal', fontWeight: '500' }}>
                      {line.lyrics}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
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
  onViewModeChange: (mode: ViewMode) => void;
  onFontSizeChange: (size: FontSizePreset) => void;
  onTransposeChange: (semitones: number) => void;
  onCapoChange: (capo: number) => void;
  onChordColorChange: (color: string | null) => void;
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
  onViewModeChange,
  onFontSizeChange,
  onTransposeChange,
  onCapoChange,
  onChordColorChange,
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
