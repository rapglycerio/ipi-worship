import type { MasterSong, SongVersion, ChordBlock, LiturgicalTag, Playlist } from '@/types';

// ============================================
// MOCK DATA: Benchmark songs for testing
// ============================================

const firmeBlocks: ChordBlock[] = [
  {
    id: 'blk-ff-intro',
    type: 'intro',
    label: 'Introdução',
    lines: [
      { chords: 'G    D/F#   Em   C', lyrics: '' },
      { chords: 'G    D/F#   Em   C', lyrics: '' },
    ],
    directions: [{ type: 'solo_instrumento', label: 'Violão base' }],
    repeatCount: 1,
  },
  {
    id: 'blk-ff-v1',
    type: 'verse',
    label: 'Estrofe 1',
    lines: [
      { chords: 'G            D/F#', lyrics: 'Firme fundamento, minha rocha e fortaleza' },
      { chords: 'Em           C', lyrics: 'Meu refúgio e proteção' },
      { chords: 'G            D/F#', lyrics: 'Tu és minha esperança, minha força na fraqueza' },
      { chords: 'Em           C', lyrics: 'Minha consolação' },
    ],
    directions: [],
    repeatCount: 1,
  },
  {
    id: 'blk-ff-chorus',
    type: 'chorus',
    label: 'Refrão',
    lines: [
      { chords: 'C       G       D', lyrics: 'Eu te louvarei, te exaltarei' },
      { chords: 'Em      C', lyrics: 'Para sempre, ó Senhor' },
      { chords: 'C       G       D', lyrics: 'Tua fidelidade não tem fim' },
      { chords: 'Em      C       G', lyrics: 'Teu amor é o melhor' },
    ],
    directions: [
      { type: 'crescendo', label: 'Crescendo gradual' },
    ],
    repeatCount: 2,
  },
  {
    id: 'blk-ff-v2',
    type: 'verse',
    label: 'Estrofe 2',
    lines: [
      { chords: 'G            D/F#', lyrics: 'Quando as tempestades vierem me cercar' },
      { chords: 'Em           C', lyrics: 'E o medo me assombrar' },
      { chords: 'G            D/F#', lyrics: 'Eu sei que Tu estás comigo, não me vais abandonar' },
      { chords: 'Em           C', lyrics: 'Vou sempre confiar' },
    ],
    directions: [],
    repeatCount: 1,
  },
  {
    id: 'blk-ff-bridge',
    type: 'bridge',
    label: 'Ponte',
    lines: [
      { chords: 'Am      G/B    C', lyrics: 'Nada pode me separar' },
      { chords: 'D       Em     C', lyrics: 'Do Teu amor, do Teu amor' },
      { chords: 'Am      G/B    C', lyrics: 'A Tua graça me alcançou' },
      { chords: 'D              G', lyrics: 'E me resgatou' },
    ],
    directions: [
      { type: 'a_capella', label: 'A capella na 1ª vez' },
      { type: 'crescendo', label: 'Banda entra na 2ª vez' },
    ],
    repeatCount: 2,
  },
];

const santoBlocks: ChordBlock[] = [
  {
    id: 'blk-se-v1',
    type: 'verse',
    label: 'Estrofe 1',
    lines: [
      { chords: 'D       A', lyrics: 'Santo, santo, santo' },
      { chords: 'Bm      G', lyrics: 'Deus onipotente' },
      { chords: 'D       A', lyrics: 'Que de madrugada' },
      { chords: 'Bm      G', lyrics: 'A Ti louvamos' },
    ],
    directions: [],
    repeatCount: 1,
  },
  {
    id: 'blk-se-chorus',
    type: 'chorus',
    label: 'Refrão',
    lines: [
      { chords: 'G       D       A', lyrics: 'Santo, santo, santo' },
      { chords: 'Bm      G', lyrics: 'Misericordioso' },
      { chords: 'D       A       Bm', lyrics: 'Glória a Ti, nosso Deus' },
      { chords: 'G       A       D', lyrics: 'Poderoso' },
    ],
    directions: [
      { type: 'crescendo', label: 'Toda congregação' },
    ],
    repeatCount: 1,
  },
];

const gratidaoBlocks: ChordBlock[] = [
  {
    id: 'blk-gr-v1',
    type: 'verse',
    label: 'Estrofe 1',
    lines: [
      { chords: 'C       G/B    Am', lyrics: 'Sou grato a Ti, Senhor' },
      { chords: 'F       G      C', lyrics: 'Por Tua graça sobre mim' },
      { chords: 'C       G/B    Am', lyrics: 'Teu amor me alcançou' },
      { chords: 'F       G      C', lyrics: 'E me fez renascer' },
    ],
    directions: [],
    repeatCount: 1,
  },
  {
    id: 'blk-gr-chorus',
    type: 'chorus',
    label: 'Refrão',
    lines: [
      { chords: 'F       C       G', lyrics: 'Obrigado, meu Senhor' },
      { chords: 'Am      F', lyrics: 'Por tudo que tens feito' },
      { chords: 'C       G       Am', lyrics: 'A Ti toda honra e glória' },
      { chords: 'F       G       C', lyrics: 'Para sempre, amém' },
    ],
    directions: [],
    repeatCount: 2,
  },
];

// --- MASTER SONGS ---

export const mockSongs: MasterSong[] = [
  {
    id: 'ms-firme-fundamento',
    title: 'Firme Fundamento',
    originalComposer: 'Autor Desconhecido',
    nature: 'louvor',
    liturgicalTags: ['exaltacao', 'adoracao'],
    analysis: {
      id: 'an-ff',
      status: 'approved',
      justification: 'Louvor teologicamente sólido. Letra centralizada na soberania e fidelidade de Deus como refúgio. Não apresenta desvios doutrinários. Linguagem bíblica presente (Sl 18:2, Is 26:4). Recomendado para uso regular em cultos de adoração e exaltação.',
      analyzedBy: 'Pr. Silva',
      analyzedAt: '2025-03-15T10:00:00Z',
      scriptureReferences: ['Salmo 18:2', 'Isaías 26:4', '2 Samuel 22:3'],
    },
    versions: [
      {
        id: 'sv-ff-morada',
        masterSongId: 'ms-firme-fundamento',
        artists: ['Morada'],
        key: 'G',
        bpm: 72,
        blocks: firmeBlocks,
        youtubeUrl: 'https://www.youtube.com/watch?v=example1',
        isDefault: true,
        createdAt: '2025-03-01T10:00:00Z',
        updatedAt: '2025-03-15T10:00:00Z',
      },
      {
        id: 'sv-ff-aline',
        masterSongId: 'ms-firme-fundamento',
        artists: ['Aline Barros'],
        key: 'A',
        bpm: 76,
        blocks: firmeBlocks.map(b => ({ ...b, id: b.id + '-ab' })),
        youtubeUrl: 'https://www.youtube.com/watch?v=example2',
        isDefault: false,
        createdAt: '2025-03-05T10:00:00Z',
        updatedAt: '2025-03-15T10:00:00Z',
      },
    ],
    createdAt: '2025-03-01T10:00:00Z',
    updatedAt: '2025-03-15T10:00:00Z',
  },
  {
    id: 'ms-santo-eterno',
    title: 'Santo, Santo, Santo',
    originalComposer: 'Reginald Heber (1826)',
    nature: 'hino',
    liturgicalTags: ['exaltacao', 'introducao'],
    analysis: {
      id: 'an-se',
      status: 'approved',
      justification: 'Hino clássico trinitário. Letra extraída diretamente de Apocalipse 4:8 e Isaías 6:3. Doutrina impecável sobre a santidade e majestade de Deus. Um dos hinos mais completos teologicamente da hinódia protestante. Amplamente recomendado.',
      analyzedBy: 'Pr. Oliveira',
      analyzedAt: '2025-02-20T10:00:00Z',
      scriptureReferences: ['Apocalipse 4:8', 'Isaías 6:3'],
    },
    versions: [
      {
        id: 'sv-se-trad',
        masterSongId: 'ms-santo-eterno',
        artists: ['Hinário Evangélico'],
        key: 'D',
        bpm: 80,
        blocks: santoBlocks,
        isDefault: true,
        createdAt: '2025-02-01T10:00:00Z',
        updatedAt: '2025-02-20T10:00:00Z',
      },
    ],
    createdAt: '2025-02-01T10:00:00Z',
    updatedAt: '2025-02-20T10:00:00Z',
  },
  {
    id: 'ms-gratidao',
    title: 'Gratidão',
    originalComposer: 'Autor Desconhecido',
    nature: 'louvor',
    liturgicalTags: ['ofertorio', 'despedida'],
    analysis: {
      id: 'an-gr',
      status: 'pending',
      justification: '',
      analyzedBy: '',
      analyzedAt: '',
    },
    versions: [
      {
        id: 'sv-gr-default',
        masterSongId: 'ms-gratidao',
        artists: ['Diante do Trono'],
        key: 'C',
        bpm: 68,
        blocks: gratidaoBlocks,
        youtubeUrl: 'https://www.youtube.com/watch?v=example3',
        isDefault: true,
        createdAt: '2025-04-01T10:00:00Z',
        updatedAt: '2025-04-01T10:00:00Z',
      },
    ],
    createdAt: '2025-04-01T10:00:00Z',
    updatedAt: '2025-04-01T10:00:00Z',
  },
];

// --- MOCK PLAYLIST ---

export const mockPlaylist: Playlist = {
  id: 'pl-domingo-manha',
  name: 'Domingo Manhã - 20/04/2025',
  serviceType: 'manha',
  serviceDate: '2025-04-20',
  arrangements: [
    {
      id: 'arr-1',
      versionId: 'sv-se-trad',
      masterSongId: 'ms-santo-eterno',
      blockOrder: ['blk-se-v1', 'blk-se-chorus', 'blk-se-v1', 'blk-se-chorus'],
      createdAt: '2025-04-18T10:00:00Z',
    },
    {
      id: 'arr-2',
      versionId: 'sv-ff-morada',
      masterSongId: 'ms-firme-fundamento',
      blockOrder: ['blk-ff-intro', 'blk-ff-v1', 'blk-ff-chorus', 'blk-ff-v2', 'blk-ff-chorus', 'blk-ff-bridge', 'blk-ff-chorus'],
      createdAt: '2025-04-18T10:00:00Z',
    },
    {
      id: 'arr-3',
      versionId: 'sv-gr-default',
      masterSongId: 'ms-gratidao',
      blockOrder: ['blk-gr-v1', 'blk-gr-chorus', 'blk-gr-chorus'],
      createdAt: '2025-04-18T10:00:00Z',
    },
  ],
  createdBy: 'Raphael',
  createdAt: '2025-04-18T10:00:00Z',
  updatedAt: '2025-04-19T10:00:00Z',
};

// --- HELPER: Get default version of a song ---
export function getDefaultVersion(song: MasterSong): SongVersion | undefined {
  return song.versions.find(v => v.isDefault) || song.versions[0];
}

// --- HELPER: Get liturgical tag display name ---
export const liturgicalTagLabels: Record<LiturgicalTag, string> = {
  introducao: 'Introdução',
  exaltacao: 'Exaltação',
  adoracao: 'Adoração',
  intercessao: 'Intercessão',
  perdao: 'Perdão',
  ceia: 'Ceia',
  consagracao: 'Consagração',
  despedida: 'Despedida',
  ofertorio: 'Ofertório',
  apelo: 'Apelo',
};
