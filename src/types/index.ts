// ============================================
// IPI IMIRIM WORSHIP - TYPE SYSTEM
// Master/Child versioning + Modular blocks
// ============================================

/** A pending song suggestion for the next playlist */
export interface SongSuggestion {
  id: string;
  masterSongId: string;
  suggestedByEmail: string;
  suggestedByName: string;
  message?: string;
  createdAt: string;
  // joined from master_songs
  songTitle?: string;
  songNature?: string;
}

/** Stage direction annotations for blocks */
export type StageDirection =
  | 'a_capella'
  | 'crescendo'
  | 'decrescendo'
  | 'solo_vozes'
  | 'solo_instrumento'
  | 'palmas'
  | 'silencio'
  | 'custom';

/** Block types for modular chord architecture */
export type BlockType =
  | 'intro'
  | 'verse'
  | 'pre_chorus'
  | 'chorus'
  | 'bridge'
  | 'interlude'
  | 'outro'
  | 'tag';

/** Liturgical moment tags */
export type LiturgicalTag =
  | 'introducao'
  | 'exaltacao'
  | 'adoracao'
  | 'intercessao'
  | 'perdao'
  | 'ceia'
  | 'consagracao'
  | 'despedida'
  | 'ofertorio'
  | 'apelo';

/** Song nature classification */
export type SongNature = 'louvor' | 'hino';

/** Theological approval status */
export type ApprovalStatus = 'approved' | 'rejected' | 'pending';

/** Musical key (chromatic notes + common worship extensions) */
export type MusicalKey =
  // — Major keys —
  | 'C' | 'C#' | 'Db' | 'D' | 'D#' | 'Eb'
  | 'E' | 'F' | 'F#' | 'Gb' | 'G' | 'G#'
  | 'Ab' | 'A' | 'A#' | 'Bb' | 'B'
  // — Minor keys —
  | 'Cm' | 'C#m' | 'Dm' | 'D#m' | 'Ebm'
  | 'Em' | 'Fm' | 'F#m' | 'Gm' | 'G#m'
  | 'Am' | 'A#m' | 'Bbm' | 'Bm'
  // — add9 / sus2 variants (very common in Brazilian worship) —
  | 'C9' | 'C#9' | 'Db9' | 'D9' | 'D#9' | 'Eb9'
  | 'E9' | 'F9' | 'F#9' | 'Gb9' | 'G9' | 'G#9'
  | 'Ab9' | 'A9' | 'A#9' | 'Bb9' | 'B9'
  // — Minor add9 —
  | 'Cm9' | 'Dm9' | 'Em9' | 'F#m9' | 'Gm9' | 'Am9' | 'Bm9'
  // — Major 7th (7M notation used in Brazilian charts) —
  | 'C7M' | 'D7M' | 'E7M' | 'F7M' | 'G7M' | 'A7M' | 'B7M'
  // — Minor major 7th —
  | 'Cm7M' | 'Dm7M' | 'Em7M' | 'F#m7M' | 'Gm7M' | 'Am7M' | 'Bm7M';

/** A single stage direction attached to a block */
export interface StageDirectionItem {
  type: StageDirection;
  label: string; // e.g. "Repetir 3x", "Só vozes femininas"
}

/** A single modular block of a chord sheet */
export interface ChordBlock {
  id: string;
  type: BlockType;
  label: string; // e.g. "Estrofe 1", "Refrão", "Ponte"
  /** Lines of chord+lyric pairs */
  lines: ChordLine[];
  /** Stage directions for this block */
  directions: StageDirectionItem[];
  /** Repeat count (default 1) */
  repeatCount: number;
}

/** A single line containing chord positions and lyrics */
export interface ChordLine {
  /** Raw chord string positioned above lyrics (e.g. "Em  G  D  A") */
  chords: string;
  /** Lyric text for this line */
  lyrics: string;
}

/** Theological analysis attached to a Master Song */
export interface TheologicalAnalysis {
  id: string;
  status: ApprovalStatus;
  /** Pastoral justification text */
  justification: string;
  /** Who performed the analysis */
  analyzedBy: string;
  analyzedAt: string; // ISO date
  /** Optional scripture references supporting the analysis */
  scriptureReferences?: string[];
}

/** A specific version/arrangement of a Master Song */
export interface SongVersion {
  id: string;
  masterSongId: string;
  /** Artists who perform this version */
  artists: string[];
  /** Musical key */
  key: MusicalKey;
  /** Beats per minute (integer) */
  bpm: number;
  /** Modular chord blocks */
  blocks: ChordBlock[];
  /** YouTube video link */
  youtubeUrl?: string;
  /** Whether this is the default version shown in search */
  isDefault: boolean;
  /** Source URL (e.g. CifraClub link) */
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/** Master Song entity - the theological/literary root */
export interface MasterSong {
  id: string;
  /** Canonical title */
  title: string;
  /** Original composer/lyricist */
  originalComposer?: string;
  /** Song nature: louvor or hino */
  nature: SongNature;
  /** Liturgical moment tags (multiple) */
  liturgicalTags: LiturgicalTag[];
  /** Theological analysis (if performed) */
  analysis?: TheologicalAnalysis;
  /** All versions/arrangements */
  versions: SongVersion[];
  /** Whether the chord sheet has been manually reviewed/adjusted */
  isAdjusted: boolean;
  /** Search-optimized: full lyrics concatenated for text search */
  searchableLyrics?: string;
  createdAt: string;
  updatedAt: string;
}

/** A saved arrangement for a specific worship service */
export interface WorshipArrangement {
  id: string;
  versionId: string;
  masterSongId: string;
  /** Custom ordering of block IDs for this arrangement */
  blockOrder: string[];
  /** Custom stage directions overlay */
  customDirections?: Record<string, StageDirectionItem[]>;
  /** Custom key override (transposition) */
  transposedKey?: MusicalKey;
  createdAt: string;
}

/** A playlist for a worship service */
export interface Playlist {
  id: string;
  name: string; // e.g. "Domingo Manhã - 20/04/2025"
  /** Service type */
  serviceType: 'manha' | 'noite' | 'especial' | 'estudo';
  /** Date of service */
  serviceDate: string; // ISO date
  /** Ordered list of arrangements */
  arrangements: WorshipArrangement[];
  /** Who created this playlist */
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** User roles for governance */
export type UserRole = 'visitor' | 'member' | 'admin';

/** App user */
export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  role: UserRole;
}

/** View mode for chord display */
export type ViewMode = 'chords_and_lyrics' | 'lyrics_only';

/** Font size presets for stage display */
export type FontSizePreset = 'sm' | 'md' | 'lg' | 'xl' | '2xl';
