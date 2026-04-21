/**
 * CifraClub Parser Engine
 * 
 * Converts raw chord sheet text (CifraClub format) into the modular
 * ChordBlock[] structure used by the IPI Worship app.
 * 
 * Handles:
 * - Block detection (Intro, Estrofe, Refrão, Ponte, etc.)
 * - Chord/lyric line separation
 * - Repeat markers
 * - Stage directions
 */

import type { ChordBlock, ChordLine, BlockType, StageDirectionItem } from '@/types';

// === PATTERNS ===

// Matches a line that is purely chords (e.g. "Em  G  D  A")
const CHORD_LINE_REGEX = /^[\s]*([A-G][#b]?(?:m|M|maj|min|dim|aug|sus[24]?|add\d*|[2-9]|\/[A-G][#b]?)?\s*)+$/;

// Matches block headers like "[Intro]", "[Refrão]", "[Estrofe 1]", "Chorus:", etc.
const BLOCK_HEADER_REGEX = /^\s*\[?\s*(Intro(?:dução)?|Estrofe\s*\d*|Refrão|Refrã?o|Chorus|Verse\s*\d*|Pre[- ]?chorus|Pre[- ]?refrão|Bridge|Ponte|Inter(?:lúdio|lude)?|Outro|Final|Tag|Solo|Coda)\s*\]?\s*:?\s*$/i;

// Matches repeat markers like "(2x)", "x3", "3x"
const REPEAT_REGEX = /\(?(\d+)\s*[xX]\)?/;

// Matches stage direction annotations
const DIRECTION_PATTERNS: { regex: RegExp; type: StageDirectionItem['type'] }[] = [
  { regex: /a\s*capella/i, type: 'a_capella' },
  { regex: /crescendo/i, type: 'crescendo' },
  { regex: /decrescendo|diminuendo/i, type: 'decrescendo' },
  { regex: /só\s*voz|vozes?\s*só|a\s*capella/i, type: 'solo_vozes' },
  { regex: /solo|instrumental/i, type: 'solo_instrumento' },
  { regex: /palmas?/i, type: 'palmas' },
  { regex: /silêncio|pausa/i, type: 'silencio' },
];

// === HELPERS ===

function normalizeBlockType(raw: string): BlockType {
  const lower = raw.toLowerCase().replace(/\s*\d+$/, '').trim();
  
  const map: Record<string, BlockType> = {
    'intro': 'intro',
    'introdução': 'intro',
    'estrofe': 'verse',
    'verse': 'verse',
    'refrão': 'chorus',
    'refrao': 'chorus',
    'chorus': 'chorus',
    'pre-chorus': 'pre_chorus',
    'pre chorus': 'pre_chorus',
    'pre-refrão': 'pre_chorus',
    'pre refrão': 'pre_chorus',
    'pré-refrão': 'pre_chorus',
    'bridge': 'bridge',
    'ponte': 'bridge',
    'interlúdio': 'interlude',
    'interlude': 'interlude',
    'inter': 'interlude',
    'outro': 'outro',
    'final': 'outro',
    'solo': 'interlude',
    'coda': 'outro',
    'tag': 'tag',
  };

  return map[lower] || 'verse';
}

function isChordLine(line: string): boolean {
  if (!line.trim()) return false;
  
  // A chord line is one where most "words" are valid chord tokens
  const tokens = line.trim().split(/\s+/);
  if (tokens.length === 0) return false;
  
  const chordTokenRegex = /^[A-G][#b]?(m|M|maj|min|dim|aug|sus[24]?|add\d*|[2-9]|[0-9]+)?(\/[A-G][#b]?)?$/;
  const chordCount = tokens.filter(t => chordTokenRegex.test(t)).length;
  
  // If more than 60% of tokens are chords, treat as chord line
  return chordCount / tokens.length > 0.6;
}

function extractRepeat(headerLine: string): number {
  const match = headerLine.match(REPEAT_REGEX);
  return match ? parseInt(match[1], 10) : 1;
}

function extractDirections(headerLine: string): StageDirectionItem[] {
  const directions: StageDirectionItem[] = [];
  for (const pattern of DIRECTION_PATTERNS) {
    if (pattern.regex.test(headerLine)) {
      const match = headerLine.match(pattern.regex);
      directions.push({
        type: pattern.type,
        label: match?.[0] || pattern.type,
      });
    }
  }
  return directions;
}

function generateBlockId(type: BlockType, index: number): string {
  return `blk-${type}-${index}`;
}

// === MAIN PARSER ===

export interface ParseResult {
  blocks: ChordBlock[];
  detectedKey?: string;
  rawTitle?: string;
  rawArtist?: string;
}

/**
 * Parses raw chord sheet text into structured ChordBlock[]
 * 
 * @param rawText - The raw text from CifraClub or manual input
 * @returns ParseResult with blocks and optional metadata
 */
export function parseCifra(rawText: string): ParseResult {
  const lines = rawText.split('\n');
  const blocks: ChordBlock[] = [];
  
  let currentBlock: ChordBlock | null = null;
  let blockIndex = 0;
  let detectedKey: string | undefined;
  let rawTitle: string | undefined;
  let rawArtist: string | undefined;
  
  // Try to detect title/artist from first non-empty lines
  let metaLineCount = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    if (metaLineCount === 0 && !BLOCK_HEADER_REGEX.test(line) && !isChordLine(line)) {
      rawTitle = line.trim();
      metaLineCount++;
    } else if (metaLineCount === 1 && !BLOCK_HEADER_REGEX.test(line) && !isChordLine(line)) {
      rawArtist = line.trim();
      metaLineCount++;
      break;
    } else {
      break;
    }
  }

  // Try to detect key from "Tom: X" or first chord
  const keyMatch = rawText.match(/tom\s*:\s*([A-G][#b]?m?)/i);
  if (keyMatch) {
    detectedKey = keyMatch[1];
  }

  function finalizeBlock() {
    if (currentBlock && currentBlock.lines.length > 0) {
      blocks.push(currentBlock);
    }
    currentBlock = null;
  }

  function ensureBlock(type: BlockType = 'verse', label?: string) {
    if (!currentBlock) {
      blockIndex++;
      currentBlock = {
        id: generateBlockId(type, blockIndex),
        type,
        label: label || formatBlockLabel(type, blockIndex),
        lines: [],
        directions: [],
        repeatCount: 1,
      };
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines (potential block separator)
    if (!trimmed) {
      // If we have a current block with content, an empty line can separate blocks
      if (currentBlock && currentBlock.lines.length > 0) {
        // Peek ahead: if next non-empty line is a header, finalize
        const nextNonEmpty = lines.slice(i + 1).find(l => l.trim());
        if (!nextNonEmpty || BLOCK_HEADER_REGEX.test(nextNonEmpty)) {
          finalizeBlock();
        }
      }
      continue;
    }

    // Check for block header
    const headerMatch = trimmed.match(BLOCK_HEADER_REGEX);
    if (headerMatch) {
      finalizeBlock();
      
      const rawHeader = headerMatch[1];
      const type = normalizeBlockType(rawHeader);
      const repeatCount = extractRepeat(trimmed);
      const directions = extractDirections(trimmed);
      
      blockIndex++;
      currentBlock = {
        id: generateBlockId(type, blockIndex),
        type,
        label: rawHeader.trim(),
        lines: [],
        directions,
        repeatCount,
      };
      
      // Detect key from first chord if not set
      if (!detectedKey && type === 'intro') {
        const nextLine = lines[i + 1]?.trim();
        if (nextLine && isChordLine(nextLine)) {
          const firstChord = nextLine.trim().split(/\s+/)[0];
          if (firstChord) detectedKey = firstChord.replace(/\/.*$/, '');
        }
      }
      
      continue;
    }

    // Skip title/artist meta lines at the very beginning
    if (blocks.length === 0 && !currentBlock && metaLineCount > 0) {
      if (trimmed === rawTitle || trimmed === rawArtist) continue;
    }

    // Process chord and lyric lines
    if (isChordLine(trimmed)) {
      ensureBlock();
      
      // Look ahead for lyric line
      const nextLine = lines[i + 1];
      const hasLyric = nextLine && nextLine.trim() && !isChordLine(nextLine.trim()) && !BLOCK_HEADER_REGEX.test(nextLine.trim());
      
      const chordLine: ChordLine = {
        chords: trimmed,
        lyrics: hasLyric ? nextLine.trim() : '',
      };
      
      currentBlock!.lines.push(chordLine);
      
      if (hasLyric) {
        i++; // Skip the lyric line since we consumed it
      }
      
      // Detect key from first chord globally
      if (!detectedKey) {
        const firstChord = trimmed.split(/\s+/)[0];
        if (firstChord) detectedKey = firstChord.replace(/\/.*$/, '');
      }
    } else if (!BLOCK_HEADER_REGEX.test(trimmed)) {
      // It's a lyric-only line
      ensureBlock();
      
      currentBlock!.lines.push({
        chords: '',
        lyrics: trimmed,
      });
    }
  }

  // Finalize last block
  finalizeBlock();

  // Post-processing: if no blocks were detected by headers, try to auto-segment
  if (blocks.length === 1 && blocks[0].lines.length > 12) {
    return { blocks: autoSegmentBlocks(blocks[0].lines), detectedKey, rawTitle, rawArtist };
  }

  return { blocks, detectedKey, rawTitle, rawArtist };
}

/**
 * Auto-segments a long list of lines into verse/chorus blocks
 * when no explicit headers are present
 */
function autoSegmentBlocks(lines: ChordLine[]): ChordBlock[] {
  const blocks: ChordBlock[] = [];
  const chunkSize = 4; // 4 lines per block
  let blockIndex = 0;
  
  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize);
    blockIndex++;
    
    // Alternate between verse and chorus for simple heuristic
    const type: BlockType = blockIndex % 2 === 0 ? 'chorus' : 'verse';
    
    blocks.push({
      id: generateBlockId(type, blockIndex),
      type,
      label: type === 'chorus' ? 'Refrão' : `Estrofe ${Math.ceil(blockIndex / 2)}`,
      lines: chunk,
      directions: [],
      repeatCount: 1,
    });
  }
  
  return blocks;
}

function formatBlockLabel(type: BlockType, index: number): string {
  const labels: Record<BlockType, string> = {
    intro: 'Intro',
    verse: `Estrofe ${index}`,
    pre_chorus: 'Pré-Refrão',
    chorus: 'Refrão',
    bridge: 'Ponte',
    interlude: 'Interlúdio',
    outro: 'Final',
    tag: 'Tag',
  };
  return labels[type] || `Bloco ${index}`;
}

// === CIFRACLUB SCRAPER (text extraction) ===

/**
 * Extracts the raw chord sheet text from a CifraClub page HTML
 * This is a simplified extraction - in production, use a proper scraper
 */
export function extractFromCifraClubHtml(html: string): string {
  // CifraClub wraps chords in <pre> tags inside div.cifra_cnt
  const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (!preMatch) return '';
  
  let text = preMatch[1];
  
  // Remove HTML tags but preserve structure
  text = text.replace(/<b>([^<]*)<\/b>/g, '$1'); // chord tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  
  return text.trim();
}
