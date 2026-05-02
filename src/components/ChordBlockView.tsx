'use client';

import type { ChordBlock, ViewMode, FontSizePreset, StageDirectionItem } from '@/types';
import {
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
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-accent">{typeLabel}</span>
          {block.repeatCount > 1 && (
            <span className="stage-pill">
              <Repeat className="w-3 h-3" />
              {block.repeatCount}x
            </span>
          )}
        </div>
        {block.directions.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {block.directions.map((dir, i) => <DirectionPill key={i} direction={dir} />)}
          </div>
        )}
      </div>

      <div className="space-y-0.5">
        {block.lines.map((line, i) => (
          <div key={i}>
            {viewMode === 'chords_and_lyrics' && line.chords.trim() && (
              <div className={`chord-line ${fontSizeMap[fontSize]}`}>
                {transposeLine(line.chords, transposeSemitones)}
              </div>
            )}
            {line.lyrics.trim() && (
              <div className={`lyric-line ${fontSizeMap[fontSize]}`}>
                {line.lyrics}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ChordToolbar ─────────────────────────────────────────────

interface ChordToolbarProps {
  songTitle: string;
  currentKey: string;
  bpm: number;
  viewMode: ViewMode;
  fontSize: FontSizePreset;
  transposeSemitones: number;
  onViewModeChange: (mode: ViewMode) => void;
  onFontSizeChange: (size: FontSizePreset) => void;
  onTransposeChange: (semitones: number) => void;
}

const fontSizes: FontSizePreset[] = ['sm', 'md', 'lg', 'xl', '2xl'];

export function ChordToolbar({
  songTitle,
  currentKey,
  bpm,
  viewMode,
  fontSize,
  transposeSemitones,
  onViewModeChange,
  onFontSizeChange,
  onTransposeChange,
}: ChordToolbarProps) {
  const transposedKey = transposeKey(currentKey, transposeSemitones);
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
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[11px] font-mono font-semibold text-accent">
              Tom: {transposedKey}
              {deltaLabel && <span className="text-subtle ml-1">({deltaLabel})</span>}
            </span>
            <span className="text-[11px] font-mono text-muted">{bpm} BPM</span>
          </div>
        </div>
        <button onClick={() => window.print()} className="touch-target" aria-label="Imprimir cifra">
          <Printer className="w-4 h-4 text-muted" />
        </button>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {/* Transpose */}
        <div className="flex items-center gap-0.5 bg-elevated rounded-lg px-1 shrink-0">
          <button
            onClick={() => onTransposeChange(transposeSemitones - 1)}
            className="touch-target text-xs font-bold text-muted"
            aria-label="Diminuir tom"
          >
            −
          </button>
          <span className="text-[10px] font-semibold text-foreground w-8 text-center">Tom</span>
          <button
            onClick={() => onTransposeChange(transposeSemitones + 1)}
            className="touch-target text-xs font-bold text-muted"
            aria-label="Aumentar tom"
          >
            +
          </button>
        </div>

        {/* Reset transpose */}
        {transposeSemitones !== 0 && (
          <button
            onClick={() => onTransposeChange(0)}
            className="px-2 h-9 text-[10px] font-semibold bg-elevated rounded-lg text-muted hover:bg-border shrink-0 cursor-pointer transition-colors"
          >
            Reset
          </button>
        )}

        {/* Font Size */}
        <div className="flex items-center gap-0.5 bg-elevated rounded-lg px-1 shrink-0">
          <button
            onClick={() => { if (currentFontIndex > 0) onFontSizeChange(fontSizes[currentFontIndex - 1]); }}
            className="touch-target text-muted"
            aria-label="Diminuir fonte"
          >
            <Type className="w-3 h-3" />
          </button>
          <span className="text-[10px] font-semibold text-foreground w-6 text-center">{fontSize.toUpperCase()}</span>
          <button
            onClick={() => { if (currentFontIndex < fontSizes.length - 1) onFontSizeChange(fontSizes[currentFontIndex + 1]); }}
            className="touch-target text-muted"
            aria-label="Aumentar fonte"
          >
            <Type className="w-4 h-4" />
          </button>
        </div>

        {/* View Mode Toggle — only 2 modes */}
        <button
          onClick={() => onViewModeChange(isLyricsOnly ? 'chords_and_lyrics' : 'lyrics_only')}
          className="flex items-center gap-1.5 bg-elevated rounded-lg px-3 h-9 text-[10px] font-semibold text-foreground shrink-0 cursor-pointer hover:bg-border transition-colors"
          aria-label="Alternar modo de visualização"
        >
          {isLyricsOnly ? (
            <EyeOff className="w-3.5 h-3.5 text-muted" />
          ) : (
            <Eye className="w-3.5 h-3.5 text-accent" />
          )}
          {isLyricsOnly ? 'Só Letra' : 'Cifra + Letra'}
        </button>
      </div>
    </div>
  );
}
