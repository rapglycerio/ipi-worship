/**
 * Teoria de acordes para a leitura da cifra: interpreta a notação brasileira
 * (7M, 4, (9), °, ø, 5-, /baixo…), simplifica acordes para iniciantes e
 * calcula as notas (teclado) e uma forma de violão.
 */

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const NOTE_INDEX: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, 'E#': 5, F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11, 'B#': 0,
};

export interface ParsedChord {
  symbol: string;
  root: string;
  rootPc: number;
  /** Tudo entre a fundamental e o baixo: "m7(11)", "7M(9)", "4"… */
  quality: string;
  bass?: string;
  bassPc?: number;
}

/** Interpreta um token de cifra. Retorna null para o que não é acorde ("|", "(2x)"…). */
export function parseChord(symbol: string): ParsedChord | null {
  const m = /^([A-G])([#b]?)(.*)$/.exec(symbol.trim());
  if (!m) return null;
  const root = m[1] + m[2];
  let quality = m[3];
  let bass: string | undefined;
  // Baixo invertido: "/X" no fim, fora de parênteses ("7(4/9)" não é baixo).
  const slash = /^(.*)\/([A-G][#b]?)$/.exec(quality);
  if (slash && balanced(slash[1])) {
    quality = slash[1];
    bass = slash[2];
  }
  // Só aceita caracteres de cifra na qualidade — evita tratar palavras como acordes.
  if (!/^[a-zA-Z0-9#b+\-°øØ()/,.Δº]*$/.test(quality)) return null;
  // "o" é usado como diminuto (Bo, A#o) e "Ø" como meio-diminuto.
  if (/[a-ln-zA-LN-Z]/.test(quality.replace(/maj|min|dim|aug|sus|add|M|b|o|Ø/g, ''))) return null;
  return {
    symbol,
    root,
    rootPc: NOTE_INDEX[root],
    quality,
    bass,
    bassPc: bass ? NOTE_INDEX[bass] : undefined,
  };
}

function balanced(s: string): boolean {
  return (s.match(/\(/g)?.length ?? 0) === (s.match(/\)/g)?.length ?? 0);
}

interface ChordFlags {
  /** Power chord (A5): só fundamental e quinta. */
  power: boolean;
  minor: boolean;
  dim: boolean;
  halfDim: boolean;
  aug: boolean;
  sus4: boolean;
  sus2: boolean;
  maj7: boolean;
  seventh: boolean;
  six: boolean;
  flat5: boolean;
  nine: boolean;
  flat9: boolean;
  sharp9: boolean;
  eleven: boolean;
  sharp11: boolean;
  thirteen: boolean;
}

function flags(quality: string): ChordFlags {
  const q = quality.replace('º', '°');
  const dim = /°|dim|^o/.test(q);
  const minor = !dim && (/^m(?!aj)/.test(q) || /^min/.test(q));
  const maj7 = /7M|maj7|7\+|M7|Δ/.test(q);
  const flat5 = /5-|b5|\(-5\)/.test(q);
  const halfDim = /[øØ]/.test(q) || (minor && /7/.test(q) && flat5);
  const power = /^5(?![-+b])/.test(q) && !minor && !dim;
  // "4" e "2" isolados são sus (não confundir com 14, 11…); "4" em acorde menor também.
  const sus4 = /sus4|sus(?!2)/.test(q) || /(^|[^0-9])4/.test(q.replace(/^m/, ''));
  const sus2 = !sus4 && (/sus2/.test(q) || /^2|^\(2\)/.test(q));
  return {
    power,
    minor: minor || halfDim,
    dim: dim && !halfDim,
    halfDim,
    aug: /aug|5\+|#5|^\+$|\(\+5\)/.test(q),
    sus4: sus4 && !dim,
    sus2,
    maj7,
    seventh: !maj7 && /7/.test(q.replace(/7M|maj7|7\+|M7/g, '')),
    six: /(^|[^1])6/.test(q),
    flat5: flat5 || halfDim,
    nine: /(^|[^b#0-9])9(?![-+])/.test(q) || /add9|\(9\)/.test(q),
    flat9: /b9|9-/.test(q),
    sharp9: /#9|9\+/.test(q),
    eleven: /(^|[^#])11(?!\+)/.test(q),
    sharp11: /#11|11\+/.test(q),
    thirteen: /13/.test(q),
  };
}

/** Intervalos (semitons a partir da fundamental) das notas do acorde. */
export function chordIntervals(chord: ParsedChord): number[] {
  const f = flags(chord.quality);
  const out = new Set<number>([0]);
  // Terça (ou suspensão) — power chord não tem terça
  if (f.power) { /* sem terça */ }
  else if (f.sus4) out.add(5);
  else if (f.sus2) out.add(2);
  else out.add(f.minor || f.dim ? 3 : 4);
  // Quinta
  out.add(f.dim || f.flat5 ? 6 : f.aug ? 8 : 7);
  // Sexta / sétima
  if (f.six) out.add(9);
  if (f.dim) out.add(9); // ° na prática brasileira = diminuto com sétima diminuta
  if (f.maj7) out.add(11);
  else if ((f.seventh && !f.dim) || f.halfDim) out.add(10);
  // Extensões
  if (f.nine) out.add(14);
  if (f.flat9) out.add(13);
  if (f.sharp9) out.add(15);
  if (f.eleven && !f.sus4) out.add(17);
  if (f.sharp11) out.add(18);
  if (f.thirteen) out.add(21);
  return [...out].sort((a, b) => a - b);
}

/** Nome das notas do acorde (bemóis se a fundamental for bemol). */
export function chordNoteNames(chord: ParsedChord): string[] {
  const names = chord.root.includes('b') || chord.root === 'F' ? FLATS : SHARPS;
  return chordIntervals(chord).map((i) => names[(chord.rootPc + i) % 12]);
}

/**
 * Versão "iniciante": fundamental + maior/menor (ou ° ), sem extensões nem baixo.
 * A7M(9) → A · F#m7(11) → F#m · G/B → G · Bm7(5-) → Bm · C° → C°
 */
export function simplifyChord(symbol: string): string {
  const c = parseChord(symbol);
  if (!c) return symbol;
  const f = flags(c.quality);
  if (f.dim) return `${c.root}°`;
  if (f.power) return c.root;
  return f.minor ? `${c.root}m` : c.root;
}

/** Simplifica uma linha de cifra mantendo as colunas (o acorde menor é completado com espaços). */
export function simplifyLine(line: string): string {
  return line.replace(/\S+/g, (token) => {
    const s = simplifyChord(token);
    return s.length < token.length ? s.padEnd(token.length) : s;
  });
}

// ── Violão ─────────────────────────────────────────────────────

/** Casas da corda 6 (Mi grave) à corda 1 (Mi agudo); -1 = não tocar (abafada). */
export interface GuitarVoicing {
  frets: number[];
  /** Pestana: casa e cordas (índices 0..5) cobertas. */
  barre?: { fret: number; from: number; to: number };
  /** true quando a forma mostra uma versão reduzida (sem algumas extensões). */
  approximate: boolean;
  /** Qualidade efetivamente desenhada, ex.: "m7". */
  shapeQuality: string;
}

type ShapeQuality =
  | '' | 'm' | '7' | 'm7' | 'maj7' | 'sus4' | 'sus2' | '6' | 'm6' | '9' | 'dim' | 'm7b5' | 'aug' | '7sus4' | '5';

/** Corda abafada nas tabelas de forma (não pode ser -1: -1 é "uma casa abaixo da pestana"). */
const X = -99;

// Formas móveis relativas à casa da fundamental (pestana).
const E_SHAPES: Partial<Record<ShapeQuality, number[]>> = {
  '': [0, 2, 2, 1, 0, 0],
  m: [0, 2, 2, 0, 0, 0],
  '7': [0, 2, 0, 1, 0, 0],
  m7: [0, 2, 0, 0, 0, 0],
  maj7: [0, X, 1, 1, 0, X],
  sus4: [0, 2, 2, 2, 0, 0],
  '7sus4': [0, 2, 0, 2, 0, 0],
  '6': [0, X, -1, 1, 0, X],
  m6: [0, X, -1, 0, 0, X],
  dim: [0, X, -1, 0, -1, X],
  m7b5: [0, X, 0, 0, -1, X],
  aug: [0, X, 2, 1, 1, X],
  '5': [0, 2, 2, X, X, X],
};
const A_SHAPES: Partial<Record<ShapeQuality, number[]>> = {
  '': [X, 0, 2, 2, 2, 0],
  m: [X, 0, 2, 2, 1, 0],
  '7': [X, 0, 2, 0, 2, 0],
  m7: [X, 0, 2, 0, 1, 0],
  maj7: [X, 0, 2, 1, 2, 0],
  sus4: [X, 0, 2, 2, 3, 0],
  sus2: [X, 0, 2, 2, 0, 0],
  '7sus4': [X, 0, 2, 0, 3, 0],
  '6': [X, 0, 2, 2, 2, 2],
  m6: [X, 0, 2, -1, 1, X],
  '9': [X, 0, -1, 0, 0, 0],
  dim: [X, 0, 1, -1, 1, X],
  m7b5: [X, 0, 1, 0, 1, X],
  aug: [X, 0, 3, 2, 2, X],
  '5': [X, 0, 2, 2, X, X],
};

// Acordes abertos mais comuns (preferidos às pestanas).
const OPEN: Record<string, number[]> = {
  C: [X, 3, 2, 0, 1, 0], C7: [X, 3, 2, 3, 1, 0], Cmaj7: [X, 3, 2, 0, 0, 0], Csus2: [X, 3, 0, 0, 1, X],
  D: [X, X, 0, 2, 3, 2], Dm: [X, X, 0, 2, 3, 1], D7: [X, X, 0, 2, 1, 2], Dm7: [X, X, 0, 2, 1, 1],
  Dmaj7: [X, X, 0, 2, 2, 2], Dsus4: [X, X, 0, 2, 3, 3], Dsus2: [X, X, 0, 2, 3, 0], D6: [X, X, 0, 2, 0, 2],
  E: [0, 2, 2, 1, 0, 0], Em: [0, 2, 2, 0, 0, 0], E7: [0, 2, 0, 1, 0, 0], Em7: [0, 2, 0, 0, 0, 0],
  Esus4: [0, 2, 2, 2, 0, 0], Emaj7: [0, 2, 1, 1, 0, 0],
  F: [1, 3, 3, 2, 1, 1], Fmaj7: [X, X, 3, 2, 1, 0],
  G: [3, 2, 0, 0, 0, 3], G7: [3, 2, 0, 0, 0, 1], Gmaj7: [3, X, 0, 0, 0, 2], G6: [3, 2, 0, 0, 0, 0],
  A: [X, 0, 2, 2, 2, 0], Am: [X, 0, 2, 2, 1, 0], A7: [X, 0, 2, 0, 2, 0], Am7: [X, 0, 2, 0, 1, 0],
  Amaj7: [X, 0, 2, 1, 2, 0], Asus4: [X, 0, 2, 2, 3, 0], Asus2: [X, 0, 2, 2, 0, 0], A6: [X, 0, 2, 2, 2, 2],
  B7: [X, 2, 1, 2, 0, 2],
};
const OPEN_NAME: Record<number, string> = { 0: 'C', 2: 'D', 4: 'E', 5: 'F', 7: 'G', 9: 'A', 11: 'B' };

function shapeQualityFor(chord: ParsedChord): { q: ShapeQuality; approximate: boolean } {
  const f = flags(chord.quality);
  const ext = f.nine || f.flat9 || f.sharp9 || f.eleven || f.sharp11 || f.thirteen;
  let q: ShapeQuality;
  if (f.power) q = '5';
  else if (f.halfDim) q = 'm7b5';
  else if (f.dim) q = 'dim';
  else if (f.aug) q = 'aug';
  else if (f.sus4) q = f.seventh ? '7sus4' : 'sus4';
  else if (f.sus2) q = 'sus2';
  else if (f.minor) q = f.seventh ? 'm7' : f.six ? 'm6' : 'm';
  else if (f.maj7) q = 'maj7';
  else if (f.seventh) q = f.nine && !f.flat9 && !f.sharp9 ? '9' : '7';
  else if (f.six) q = '6';
  else q = '';
  const covered = q === '9' ? f.nine : false;
  const approximate =
    (ext && !covered) ||
    (f.minor && f.maj7) ||
    (f.sus4 && f.sus2) ||
    (f.flat5 && q !== 'dim' && q !== 'm7b5') ||
    (f.aug && q !== 'aug');
  return { q, approximate };
}

const SHAPE_LABEL: Record<ShapeQuality, string> = {
  '': '', m: 'm', '7': '7', m7: 'm7', maj7: '7M', sus4: '4', sus2: '2', '6': '6', m6: 'm6', '9': '7(9)',
  dim: '°', m7b5: 'm7(5-)', aug: '(#5)', '7sus4': '7(4)', '5': '5',
};
const OPEN_KEY: Record<ShapeQuality, string> = {
  '': '', m: 'm', '7': '7', m7: 'm7', maj7: 'maj7', sus4: 'sus4', sus2: 'sus2', '6': '6', m6: 'm6',
  '9': '9', dim: 'dim', m7b5: 'm7b5', aug: 'aug', '7sus4': '7sus4', '5': '5',
};

/** Uma forma de violão para o acorde (aberta quando existe; senão pestana na região mais baixa). */
export function guitarVoicing(chord: ParsedChord): GuitarVoicing | null {
  const { q, approximate } = shapeQualityFor(chord);
  const shapeQuality = SHAPE_LABEL[q];

  const openName = OPEN_NAME[chord.rootPc];
  const open = openName ? OPEN[openName + OPEN_KEY[q]] : undefined;
  if (open) {
    // F aberto já é pestana na 1ª casa.
    const barre = openName === 'F' && OPEN_KEY[q] === '' ? { fret: 1, from: 0, to: 5 } : undefined;
    return { frets: open.map((v) => (v === X ? -1 : v)), barre, approximate, shapeQuality };
  }

  const candidates: GuitarVoicing[] = [];
  const build = (shape: number[] | undefined, rootFret: number, rootString: number) => {
    if (!shape) return;
    let base = rootFret;
    const minOffset = Math.min(...shape.filter((v) => v !== X));
    if (base + minOffset < 0) base += 12;
    const frets = shape.map((v) => (v === X ? -1 : base + v));
    // Pestana quando várias cordas usam a casa da fundamental (na casa 0 são cordas soltas).
    const atBase = shape.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= rootString);
    const barre =
      base > 0 && atBase.length >= 2 ? { fret: base, from: atBase[0], to: atBase[atBase.length - 1] } : undefined;
    candidates.push({ frets, barre, approximate, shapeQuality });
  };
  build(E_SHAPES[q], (chord.rootPc - 4 + 12) % 12, 0);
  build(A_SHAPES[q], (chord.rootPc - 9 + 12) % 12, 1);
  if (candidates.length === 0) return null;
  const lowest = (v: GuitarVoicing) => Math.max(...v.frets);
  return candidates.sort((a, b) => lowest(a) - lowest(b))[0];
}

/** Rótulo curto do que o diagrama mostra (ex.: "Am7"), para avisar quando é aproximado. */
export function voicingLabel(chord: ParsedChord, v: GuitarVoicing): string {
  return chord.root + v.shapeQuality;
}

export function noteName(pc: number, preferFlats: boolean): string {
  return (preferFlats ? FLATS : SHARPS)[((pc % 12) + 12) % 12];
}
