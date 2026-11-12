'use client';

import { useEffect } from 'react';
import { X, Info } from 'lucide-react';
import {
  parseChord,
  chordIntervals,
  chordNoteNames,
  guitarVoicing,
  voicingLabel,
  noteName,
  type GuitarVoicing,
  type ParsedChord,
} from '@/lib/chords';

const OPEN_STRINGS = [4, 9, 2, 7, 11, 4]; // E A D G B E (graves → agudas)

function GuitarDiagram({ voicing, rootPc, preferFlats }: { voicing: GuitarVoicing; rootPc: number; preferFlats: boolean }) {
  const { frets, barre } = voicing;
  const pressed = frets.filter((f) => f > 0);
  const maxF = pressed.length ? Math.max(...pressed) : 0;
  const minF = pressed.length ? Math.min(...pressed) : 0;
  const base = maxF <= 4 ? 1 : minF; // casa do topo do diagrama
  const ROWS = Math.max(4, maxF - base + 1);
  const left = 22;
  const top = 26;
  const gap = 20;
  const cellH = 26;
  const width = left * 2 + gap * 5;
  const gridBottom = top + cellH * ROWS;
  const height = gridBottom + 42; // espaço para a linha × ● ○ e os nomes das notas
  const notePc = (i: number) => (OPEN_STRINGS[i] + frets[i]) % 12;
  // Corda da fundamental mais grave (● do Cifra Club): onde o acorde "apoia".
  const bassString = frets.findIndex((f, i) => f >= 0 && notePc(i) === rootPc);
  const sx = (i: number) => left + i * gap;
  const fy = (f: number) => top + (f - base + 0.5) * cellH;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-40 h-auto" role="img" aria-label="Diagrama de violão">
      {/* Pestana / pestana superior (nut) */}
      {base === 1 ? (
        <rect x={sx(0) - 1} y={top - 4} width={gap * 5 + 2} height={4} rx={1} className="fill-foreground" />
      ) : (
        <text x={sx(5) + 10} y={top + cellH / 2 + 4} className="fill-muted" fontSize={11} fontWeight={700}>
          {base}ª
        </text>
      )}
      {/* Trastes */}
      {Array.from({ length: ROWS + 1 }, (_, r) => (
        <line key={r} x1={sx(0)} x2={sx(5)} y1={top + r * cellH} y2={top + r * cellH} className="stroke-border" strokeWidth={1.5} />
      ))}
      {/* Cordas */}
      {frets.map((_, i) => (
        <line key={i} x1={sx(i)} x2={sx(i)} y1={top} y2={top + ROWS * cellH} className="stroke-muted" strokeWidth={1 + (5 - i) * 0.25} />
      ))}
      {/* Corda solta (o × de abafada fica só na linha de baixo) */}
      {frets.map((f, i) =>
        f === 0 ? (
          <circle key={i} cx={sx(i)} cy={top - 13} r={4.5} fill="none" strokeWidth={1.5}
            className={(OPEN_STRINGS[i] % 12) === rootPc ? 'stroke-warning' : 'stroke-foreground'} />
        ) : null
      )}
      {/* Pestana */}
      {barre && barre.fret >= base && (
        <rect x={sx(barre.from) - 7} y={fy(barre.fret) - 7} width={sx(barre.to) - sx(barre.from) + 14} height={14} rx={7}
          className="fill-foreground" opacity={0.85} />
      )}
      {/* Dedos (na pestana, só a fundamental ganha marca, por cima da barra) */}
      {frets.map((f, i) => {
        if (f <= 0) return null;
        const isRoot = notePc(i) === rootPc;
        const onBarre = barre && f === barre.fret && i >= barre.from && i <= barre.to;
        if (onBarre) {
          return isRoot ? (
            <circle key={i} cx={sx(i)} cy={fy(f)} r={5} className="fill-warning stroke-card" strokeWidth={1.5} />
          ) : null;
        }
        return <circle key={i} cx={sx(i)} cy={fy(f)} r={7} className={isRoot ? 'fill-warning' : 'fill-accent'} />;
      })}
      {/* Linha de baixo: × não toca · ● fundamental mais grave · ○ demais cordas */}
      {frets.map((f, i) => {
        const y = gridBottom + 13;
        if (f < 0) {
          return <text key={`m${i}`} x={sx(i)} y={y + 4} textAnchor="middle" fontSize={12} fontWeight={700} className="fill-danger">×</text>;
        }
        return i === bassString ? (
          <circle key={`m${i}`} cx={sx(i)} cy={y} r={4.5} className="fill-warning" />
        ) : (
          <circle key={`m${i}`} cx={sx(i)} cy={y} r={4} fill="none" strokeWidth={1.3} className="stroke-muted" />
        );
      })}
      {/* Nota de cada corda */}
      {frets.map((f, i) =>
        f < 0 ? null : (
          <text key={`n${i}`} x={sx(i)} y={gridBottom + 34} textAnchor="middle" fontSize={9} fontWeight={600}
            className={notePc(i) === rootPc ? 'fill-warning' : 'fill-subtle'}>
            {noteName(notePc(i), preferFlats)}
          </text>
        )
      )}
    </svg>
  );
}

const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_OFFSET: Record<number, number> = { 1: 1, 3: 2, 6: 4, 8: 5, 10: 6 }; // após qual branca (1-based)
const OCTAVES = 3;

function PianoDiagram({ chord }: { chord: ParsedChord }) {
  // Voicing simples: baixo (ou fundamental) na 1ª oitava e o acorde logo acima.
  const bassPc = chord.bassPc ?? chord.rootPc;
  const rootStart = chord.bassPc !== undefined && chord.rootPc <= bassPc ? chord.rootPc + 12 : chord.rootPc;
  const max = OCTAVES * 12 - 1;
  const notes = new Set<number>();
  for (const i of chordIntervals(chord)) {
    let n = rootStart + i;
    while (n > max) n -= 12;
    notes.add(n);
  }
  const bassNote = chord.bassPc !== undefined ? bassPc : null;
  if (bassNote !== null) notes.add(bassNote);

  const W = 20;
  const H = 80;
  const whiteCount = OCTAVES * 7;
  const keyFill = (n: number, white: boolean) => {
    if (n === bassNote) return 'fill-warning';
    if (notes.has(n)) return n % 12 === chord.rootPc ? 'fill-warning' : 'fill-accent';
    return white ? 'fill-white' : 'fill-gray-900';
  };

  return (
    <svg viewBox={`0 0 ${whiteCount * W} ${H}`} className="w-full h-auto" role="img" aria-label="Diagrama de teclado">
      {Array.from({ length: OCTAVES }, (_, o) =>
        WHITE_PCS.map((pc, w) => {
          const n = o * 12 + pc;
          return (
            <rect key={`w${n}`} x={(o * 7 + w) * W} y={0} width={W} height={H} rx={2}
              className={`${keyFill(n, true)} stroke-gray-400`} strokeWidth={1} />
          );
        })
      )}
      {Array.from({ length: OCTAVES }, (_, o) =>
        Object.entries(BLACK_OFFSET).map(([pcStr, after]) => {
          const n = o * 12 + Number(pcStr);
          return (
            <rect key={`b${n}`} x={(o * 7 + after) * W - W * 0.32} y={0} width={W * 0.64} height={H * 0.6} rx={2}
              className={`${keyFill(n, false)} stroke-gray-900`} strokeWidth={1} />
          );
        })
      )}
    </svg>
  );
}

/** Folha inferior com violão + teclado para o acorde tocado na cifra. */
export default function ChordDiagram({ symbol, onClose }: { symbol: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const chord = parseChord(symbol);
  if (!chord) return null;
  const voicing = guitarVoicing(chord);
  const preferFlats = chord.root.includes('b');
  const names = chordNoteNames(chord);

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-3 no-print" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Acorde ${symbol}`}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-2xl font-bold font-mono text-foreground leading-none">{symbol}</h2>
            <p className="text-xs text-muted mt-1.5">
              Notas: <span className="font-mono font-semibold text-foreground">{names.join(' · ')}</span>
              {chord.bass && (
                <> · baixo <span className="font-mono font-semibold text-warning">{noteName(chord.bassPc!, preferFlats)}</span></>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 -m-1 text-subtle hover:text-foreground cursor-pointer" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          {voicing && (
            <div className="flex flex-col items-center shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-subtle mb-1">Violão</span>
              <GuitarDiagram voicing={voicing} rootPc={chord.rootPc} preferFlats={preferFlats} />
            </div>
          )}
          <div className="w-full min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-subtle mb-1 text-center sm:text-left">
              Teclado
            </span>
            <PianoDiagram chord={chord} />
          </div>
        </div>

        {(voicing?.approximate || chord.bass) && (
          <div className="mt-3 flex gap-2 text-[11px] text-muted bg-elevated rounded-lg px-3 py-2">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-accent" />
            <div className="space-y-0.5">
              {voicing?.approximate && (
                <p>
                  O violão mostra uma forma mais simples (<span className="font-mono">{voicingLabel(chord, voicing)}</span>);
                  o teclado mostra todas as notas.
                </p>
              )}
              {chord.bass && (
                <p>
                  No violão, toque <span className="font-mono">{noteName(chord.bassPc!, preferFlats)}</span> como nota mais grave.
                </p>
              )}
            </div>
          </div>
        )}

        <p className="mt-2 text-[10px] text-subtle flex items-center gap-x-1.5 gap-y-1 flex-wrap">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-warning" /> fundamental/baixo
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-accent ml-2" /> demais notas
          <span className="ml-2"><span className="text-warning font-bold">●</span> corda da fundamental mais grave</span>
          <span className="ml-2"><span className="text-danger font-bold">×</span> não tocar</span>
        </p>
      </div>
    </div>
  );
}
