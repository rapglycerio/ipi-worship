'use client';

import { useState } from 'react';
import type { ChordBlock, ViewMode, FontSizePreset, StageDirectionItem } from '@/types';
import {
  Eye,
  EyeOff,
  Type,
  ArrowUp,
  ArrowDown,
  Printer,
  Repeat,
  Mic,
  Volume2,
  VolumeX,
  Zap,
  Hand,
} from 'lucide-react';

interface ChordBlockViewProps {
  block: ChordBlock;
  viewMode: ViewMode;
  fontSize: FontSizePreset;
  transposeSemitones: number;
}

// Simple chromatic scale for transposition
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_MAP: Record<string, string> = {
  'Db': 'C#', 'Eb': 'D#', 'Fb': 'E', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#', 'Cb': 'B',
};

function transposeChord(chord: string, semitones: number): string {
  if (semitones === 0) return chord;

  return chord.replace(/([A-G])(#|b)?/g, (match, note, accidental) => {
    let normalizedNote = note + (accidental || '');
    if (FLAT_MAP[normalizedNote]) {
      normalizedNote = FLAT_MAP[normalizedNote];
    }

    const index = NOTES.indexOf(normalizedNote);
    if (index === -1) return match;

    const newIndex = ((index + semitones) % 12 + 12) % 12;
    return NOTES[newIndex];
  });
}

function transposeLine(line: string, semitones: number): string {
  if (semitones === 0) return line;
  // Split by whitespace preserving spaces for alignment
  return line.replace(/\S+/g, (token) => transposeChord(token, semitones));
}

const fontSizeMap: Record<FontSizePreset, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
  '2xl': 'text-xl',
};

const chordFontSizeMap: Record<FontSizePreset, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
  '2xl': 'text-xl',
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
    <span
      className={`stage-pill ${isWarning ? 'stage-pill--warning' : isInfo ? 'stage-pill--info' : ''}`}
    >
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
}: ChordBlockViewProps) {
  const blockStyle = blockTypeStyles[block.type] || 'block-verse';
  const typeLabel = block.label || blockTypeLabels[block.type] || block.type;

  return (
    <div className={`${blockStyle} py-3 mb-3 animate-fade-in`}>
      {/* Block Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
            {typeLabel}
          </span>
          {block.repeatCount > 1 && (
            <span className="stage-pill">
              <Repeat className="w-3 h-3" />
              {block.repeatCount}x
            </span>
          )}
        </div>
        {block.directions.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {block.directions.map((dir, i) => (
              <DirectionPill key={i} direction={dir} />
            ))}
          </div>
        )}
      </div>

      {/* Chord Lines */}
      <div className="space-y-0.5">
        {block.lines.map((line, i) => (
          <div key={i}>
            {viewMode !== 'lyrics_only' && line.chords.trim() && (
              <div className={`chord-line ${chordFontSizeMap[fontSize]}`}>
                {transposeLine(line.chords, transposeSemitones)}
              </div>
            )}
            {viewMode !== 'chords_only' && line.lyrics.trim() && (
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

// ============================================
// CHORD TOOLBAR - Floating top bar for songs
// ============================================

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
const viewModeLabels: Record<ViewMode, string> = {
  chords_and_lyrics: 'Cifra + Letra',
  chords_only: 'Só Cifra',
  lyrics_only: 'Só Letra',
};

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
  const transposedKey = transposeChord(currentKey, transposeSemitones);
  const currentFontIndex = fontSizes.indexOf(fontSize);

  const viewModes: ViewMode[] = ['chords_and_lyrics', 'chords_only', 'lyrics_only'];
  const currentModeIndex = viewModes.indexOf(viewMode);

  return (
    <div className="glass-strong sticky top-0 md:top-0 z-40 px-4 py-2.5 rounded-b-xl">
      {/* Song Info */}
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-foreground truncate">{songTitle}</h2>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[11px] font-mono font-semibold text-accent">
              Tom: {transposedKey}
              {transposeSemitones !== 0 && (
                <span className="text-subtle ml-1">
                  ({transposeSemitones > 0 ? '+' : ''}{transposeSemitones})
                </span>
              )}
            </span>
            <span className="text-[11px] font-mono text-muted">{bpm} BPM</span>
          </div>
        </div>

        {/* Print */}
        <button
          onClick={() => window.print()}
          className="touch-target"
          aria-label="Imprimir cifra"
        >
          <Printer className="w-4 h-4 text-muted" />
        </button>
      </div>

      {/* Controls Row */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {/* Transpose */}
        <div className="flex items-center gap-0.5 bg-elevated rounded-lg px-1 shrink-0">
          <button
            onClick={() => onTransposeChange(transposeSemitones - 1)}
            className="touch-target text-xs font-bold text-muted"
            aria-label="Diminuir tom"
          >
            -
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

        {/* Font Size */}
        <div className="flex items-center gap-0.5 bg-elevated rounded-lg px-1 shrink-0">
          <button
            onClick={() => {
              if (currentFontIndex > 0) onFontSizeChange(fontSizes[currentFontIndex - 1]);
            }}
            className="touch-target text-xs font-bold text-muted"
            aria-label="Diminuir fonte"
          >
            <Type className="w-3 h-3" />
          </button>
          <span className="text-[10px] font-semibold text-foreground w-6 text-center">
            {fontSize.toUpperCase()}
          </span>
          <button
            onClick={() => {
              if (currentFontIndex < fontSizes.length - 1) onFontSizeChange(fontSizes[currentFontIndex + 1]);
            }}
            className="touch-target text-xs font-bold text-muted"
            aria-label="Aumentar fonte"
          >
            <Type className="w-4 h-4" />
          </button>
        </div>

        {/* View Mode Toggle */}
        <button
          onClick={() => {
            const nextIndex = (currentModeIndex + 1) % viewModes.length;
            onViewModeChange(viewModes[nextIndex]);
          }}
          className="flex items-center gap-1.5 bg-elevated rounded-lg px-3 h-9 text-[10px] font-semibold text-foreground shrink-0 cursor-pointer hover:bg-border transition-colors"
          aria-label="Alternar modo de visualização"
        >
          {viewMode === 'lyrics_only' ? (
            <EyeOff className="w-3.5 h-3.5 text-muted" />
          ) : (
            <Eye className="w-3.5 h-3.5 text-accent" />
          )}
          {viewModeLabels[viewMode]}
        </button>
      </div>
    </div>
  );
}
