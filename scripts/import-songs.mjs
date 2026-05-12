/**
 * Bulk import script — inserts 29 worship songs into Supabase
 * Run with:  node --env-file=.env.local scripts/import-songs.mjs
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Strip chord extensions (9, 7M, 4, add9, …) keeping base note + optional m */
function normalizeKey(raw) {
  const m = raw.trim().match(/^([A-G][#b]?(?:m(?![a-z]))?)/);
  return m ? m[1] : raw.replace(/[^A-Gb#m]/g, '').slice(0, 3);
}

function mapNature(nat) {
  return nat === 'hino' ? 'hino' : 'louvor';
}

const TAG_MAP = {
  'exaltação': 'exaltacao', 'exaltacao': 'exaltacao',
  'adoração': 'adoracao', 'adoracao': 'adoracao',
  'rendição': 'consagracao', 'consagração': 'consagracao',
  'intercessão': 'intercessao', 'oração': 'intercessao',
  'ceia': 'ceia', 'perdão': 'perdao',
  'missões': 'apelo', 'evangelismo': 'apelo',
  'presença': 'adoracao', 'fé': 'adoracao',
  'confiança': 'adoracao', 'soberania': 'adoracao',
  'avivamento': 'exaltacao', 'espírito santo': 'adoracao',
  'volta de cristo': 'exaltacao', 'majestade': 'exaltacao',
  'júbilo': 'exaltacao', 'bondade': 'exaltacao',
  'celebração': 'exaltacao', 'salvação': 'adoracao',
  'fidelidade': 'adoracao', 'promessas': 'adoracao',
  'esperança': 'adoracao', 'sacrifício': 'ceia',
  'comunhão': 'ceia', 'sangue de jesus': 'ceia',
  'justificação': 'perdao', 'intimidade': 'adoracao',
  'amor de deus': 'adoracao', 'redenção': 'perdao',
  'descanso': 'adoracao', 'perseverança': 'adoracao',
  'foco': 'adoracao', 'cruz': 'adoracao',
  'nome de jesus': 'exaltacao', 'glória': 'adoracao',
};

function mapTags(tagsStr) {
  const tags = tagsStr.split(',').map(t => t.trim().toLowerCase());
  const mapped = [...new Set(tags.map(t => TAG_MAP[t]).filter(Boolean))];
  return mapped.length ? mapped : ['adoracao'];
}

function blockTypeFromLabel(label) {
  const l = label.toLowerCase().trim();
  if (/^(verso|estrofe|segunda\s+parte)/.test(l)) return 'verse';
  if (/^(refrão|refrao|chorus)/.test(l)) return 'chorus';
  if (/^(pré.?refrão|pre.?refrão|pre.?chorus)/.test(l)) return 'pre_chorus';
  if (/^ponte/.test(l)) return 'bridge';
  if (/^intro/.test(l)) return 'intro';
  if (/^(outro|final|tag)/.test(l)) return 'outro';
  return 'verse';
}

const CHORD_TOKEN_RE = /^[A-G][#b]?((?:m(?![a-z])|M|maj|min|dim|aug|sus[24]?|add\d*|\d+)?)(\/[A-G][#b]?)?(\([^)]*\))?$/;

function isChordLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const tokens = trimmed.split(/\s+/);
  const chordCount = tokens.filter(t => CHORD_TOKEN_RE.test(t)).length;
  return chordCount / tokens.length > 0.55;
}

function parseLines(text) {
  const rawLines = text.split('\n')
    .map(l => l.trimEnd())
    .filter(l => l.trim() && l.trim() !== '—');

  const lines = [];
  let i = 0;
  while (i < rawLines.length) {
    const line = rawLines[i];
    if (isChordLine(line)) {
      const next = rawLines[i + 1];
      const hasLyric = next && next.trim() && !isChordLine(next);
      lines.push({ chords: line.trim(), lyrics: hasLyric ? next.trim() : '' });
      if (hasLyric) i++;
    } else {
      lines.push({ chords: '', lyrics: line.trim() });
    }
    i++;
  }
  return lines;
}

function parseSongBlocks(songBody) {
  // Split on explicit --- separators first
  const sections = songBody.split(/^---\s*$/m);
  const blocks = [];
  let blkIdx = 0;

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    // Find header like [Verso 1]
    const headerMatch = trimmed.match(/^\[([^\]]+)\]/);
    if (!headerMatch) continue;

    const rawLabel = headerMatch[1].trim();
    const type = blockTypeFromLabel(rawLabel);
    const bodyAfterHeader = trimmed.slice(headerMatch[0].length).trim();

    // Remove em-dash lines
    const cleanBody = bodyAfterHeader.replace(/^—\s*$/gm, '').trim();
    const lines = parseLines(cleanBody);

    if (lines.length === 0) continue;

    blkIdx++;
    blocks.push({
      id: `blk-${type}-${blkIdx}`,
      type,
      label: rawLabel,
      lines,
      directions: [],
      repeatCount: 1,
    });
  }

  return blocks;
}

function parseSong(raw) {
  const lines = raw.split('\n');
  const meta = {};
  let bodyStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === '===') continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) { bodyStart = i; break; }

    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const val = line.slice(colonIdx + 1).trim();

    if (['título', 'titulo', 'title'].includes(key)) { meta.title = val; continue; }
    if (key === 'artistas') { meta.artists = val; continue; }
    if (key === 'tom') { meta.key = val; continue; }
    if (key === 'bpm') { meta.bpm = parseInt(val, 10) || undefined; continue; }
    if (key === 'natureza') { meta.nature = val; continue; }
    if (key === 'tags') { meta.tags = val; continue; }
    if (key === 'youtube') {
      // YouTube links are in markdown URL format [text](url)
      const urlMatch = lines.slice(i, i + 3).join('').match(/\(https:\/\/www\.youtube\.com\/[^)]+\)/);
      if (urlMatch) {
        meta.youtube = urlMatch[0].slice(1, -1);
      }
      bodyStart = i + 1;
      break;
    }
    bodyStart = i;
    break;
  }

  const body = lines.slice(bodyStart).join('\n');
  const blocks = parseSongBlocks(body);

  return { meta, blocks };
}

// ─── Song data ───────────────────────────────────────────────────────────────

const RAW_TEXT = `===

título: SANTO ESPÍRITO
artistas: Laura Souguellis
tom: E
bpm: 72
natureza: adoração
tags: espírito santo, presença
youtube:
[https://www.youtube.com/results?search_query=Santo+Espirito+Laura+Souguellis](https://www.youtube.com/results?search_query=Santo+Espirito+Laura+Souguellis)

[Verso 1]
E9
Não há nada igual
A5(7M)
Não há nada melhor
E9
A que se compara à esperança viva
A5(7M)
Tua presença
—
---
[Verso 2]
E9
Eu provei e vi
A5(7M)
O mais doce amor
Que liberta o meu ser
E9
E a vergonha desfaz
A5(7M)
Tua presença
—
---
[Refrão]
E9
Santo Espírito, és bem-vindo aqui
A5(7M)                  F#m7
Vem inundar, encher esse lugar
E9
É o desejo do meu coração
A5(7M)                    F#m7
Sermos inundados por Tua glória, Senhor
—
---
[Ponte]
E/G#
Vamos provar
A5(7M)           F#m7
Quão real é Tua presença
E/G#
Vamos provar
A5(7M)           F#m7
A Tua glória e bondade

===

título: MARANATA
artistas: Ministério Avivah
tom: Cm
bpm: 138
natureza: louvor
tags: volta de cristo, exaltação
youtube:
[https://www.youtube.com/results?search_query=Maranata+Avivah](https://www.youtube.com/results?search_query=Maranata+Avivah)

[Verso 1]
Cm                       Ab
Tu és a minha luz, a minha salvação
Eb                     Bb
E a Ti me renderei
Cm                       Ab
Se ao Teu lado estou, seguro em Tuas mãos
Eb                     Bb
Eu nada temerei
—
---
[Pré-Refrão]
Ab      Bb     Cm           Eb        Bb
Oh oh oh Tu és santo oh Senhor
Ab      Bb     Cm           Eb        Bb
Oh oh oh, Tu és digno de louvor
—
---
[Refrão]
Ab                 Eb                Cm
Só em Ti confiarei, eu nada temerei
Bb
Em frente eu irei, pois eu sei que vivo estás
Ab
Estás
Cm                               Eb
E um dia voltarás, do céu pra nos buscar
Bb
Pra sempre reinarás, aleluia
—
---
[Ponte]
Eb                 Ab            Bb
Vem Jesus, vem Jesus
Eb
Maranata, ora vem Senhor Jesus

===

título: VIM PARA ADORAR-TE
artistas: Adoração e Adoradores
tom: E
bpm: 72
natureza: adoração
tags: adoração, rendição
youtube:
[https://www.youtube.com/results?search_query=Vim+Para+Adorar-te](https://www.youtube.com/results?search_query=Vim+Para+Adorar-te)

[Verso 1]
E        B9        F#m         A9
Luz do mundo viestes à terra
E        B9        A9
Pra que eu pudesse Te ver
E        B9        F#m         A9
Tua beleza me leva a adorar-Te
E        B9        A9
Quero Contigo viver
—
---
[Refrão]
E
Vim para adorar-Te
B9
Vim para prostrar-me
C#m                      A9
Vim para dizer que és meu Deus
E
És totalmente amável
B9
Totalmente digno
C#m                      A9
Tão maravilhoso para mim
—
---
[Verso 2]
E        B9        F#m         A9
Eterno Rei exaltado nas alturas
E        B9        A9
Glorioso nos céu
E        B9        F#m         A9
Humilde vieste à terra que criaste
E        B9        A9
Por amor pobre se fez
—
---
[Ponte]
B    C#m     A9
Eu nunca saberei o preço
B    C#m     A9
Dos meus pecados lá na cruz

===

título: SOBRE AS ÁGUAS
artistas: Davi Sacer
tom: E
bpm: 68
natureza: adoração
tags: fé, confiança
youtube:
[https://www.youtube.com/results?search_query=Sobre+As+Aguas+Davi+Sacer](https://www.youtube.com/results?search_query=Sobre+As+Aguas+Davi+Sacer)

[Verso 1]
E4             E
Se o sol se pôr
E4             E
E a noite chegar
A9             B9
Tu és quem me guia
E4             E
Se a tempestade
E4             E
Me alcançar
A9             B9
Tu és meu abrigo
—
---
[Pré-Refrão]
A9             C#m7
Se o mar me submergir
B9             A9
A Tua mão
C#m7           B9       A9
Me traz a tona pra respirar
E
E me faz andar
Sobre as águas
—
---
[Refrão]
A9             C#M7      B9        A9
Tu és o Deus da minha salvação
C#m7           B9        A9
És o meu dono minha paixão
E/G#
Minha canção e o meu louvor
—
---
[Ponte]
F#m C#m7 B9 E
A....le.....lu....ia

===

título: PODEROSO DEUS
artistas: David Quinlan
tom: D
bpm: 70
natureza: adoração
tags: exaltação, majestade
youtube:
[https://www.youtube.com/results?search_query=Poderoso+Deus+David+Quinlan](https://www.youtube.com/results?search_query=Poderoso+Deus+David+Quinlan)

[Verso 1]
D                      Bm
Ao que está assentado no trono
A9                G   Em
E ao Cordeiro
D
Seja o louvor
---
[Refrão]
D                      Bm                       G
Seja a honra, seja a glória, seja o domínio
Em                    A9
Pelos séculos dos séculos
---
[Ponte]
D                      Bm
Poderoso Deus... poderoso Deus... poderoso
G        Em
Deus
A9
Minh'alma anseia por Ti!

===

título: PAI NOSSO
artistas: Pedras Vivas
tom: B
bpm: 70
natureza: adoração
tags: oração, rendição
youtube:
[https://www.youtube.com/results?search_query=Pai+Nosso+Pedras+Vivas](https://www.youtube.com/results?search_query=Pai+Nosso+Pedras+Vivas)

[Verso 1]
B9
Pai nosso, nos céus
E               F#
Santo é o Teu nome
B9
Teu reino buscamos
E               F#
Tua vontade seja feita
E            B/D#   C#m7   G#m7
Na terra como é, nos céus
F#
Deixe o céu descer
---
[Refrão]
E            B/D#   C#m7   G#m
Na terra como é, nos céus
F#               E
Deixe o céu descer
---
[Ponte 1]
G#m7             F#
Deixe o céu descer
E
Deixe o céu descer
G#m7             F#       E
Minh'alma anseia por Ti!
---
[Ponte 2]
G#m7
Teu é o reino, Teu o poder Tua
F#
É a glória pra sempre, amém

===

título: O QUE TUA GLÓRIA FEZ COMIGO
artistas: Voz de Muitas Águas
tom: Em
bpm: 65
natureza: adoração
tags: presença, glória
youtube:
[https://www.youtube.com/results?search_query=O+Que+Tua+Gloria+Fez+Comigo](https://www.youtube.com/results?search_query=O+Que+Tua+Gloria+Fez+Comigo)

[Verso 1]
Em                        C
Eu me rasgo por inteiro
G                         D
Faço tudo, mas vem novamente
A                    F#m
Eu mergulho na mirra ardente
Em
Mas peço que Tua presença aumente
---
[Pré-Refrão]
G                                 A
E se eu passar pelo fogo não temerei
F#m                                      Em
Na Tua fumaça de glória eu entrarei
G
Longe do Santo dos Santos não sei mais a viver
---
[Refrão]
G
Quem já pisou no Santo dos Santos
F#m
Em outro lugar não sabe viver
A
E onde estiver clama pela glória
D
A glória de Deus
---
[Ponte]
G A F#m G
Glória, glória, glória, glória
G A F#m G
Santo, santo, santo, santo

===

título: ATOS 2
artistas: Gabriela Rocha
tom: G
bpm: 140
natureza: louvor
tags: avivamento, espírito santo
youtube:
[https://www.youtube.com/results?search_query=Atos+2+Gabriela+Rocha](https://www.youtube.com/results?search_query=Atos+2+Gabriela+Rocha)

[Verso 1]
C9
Nós estamos aqui tão sedentos de Ti
Em7
Vem oh Deus, vem oh Deus
G                 Bm7
Enche este lugar
---
[Pré-Refrão]
C9
Meu desejo é sentir Teu poder, Teu poder
Em7
Então vem me incendiar
---
[Refrão]
G              C9             D11
Meu coração é o Teu altar
Em7
Quero ouvir o som do céu
C9             G     C9    D11
Tua glória contemplar
---
[Ponte]
C9
Te damos honra
Em7
Te damos glória
G          C9             D11
Teu é o poder pra sempre, amém

===

título: DEUS É DEUS
artistas: Delino Marçal
tom: C
bpm: 68
natureza: adoração
tags: confiança, soberania
youtube:
[https://www.youtube.com/results?search_query=Deus+E+Deus+Delino+Marcal](https://www.youtube.com/results?search_query=Deus+E+Deus+Delino+Marcal)

[Verso 1]
C9             G/B
Minha fé não está firmada
Am7             G/B
Nas coisas que podes fazer
C9              F          G4       G
Eu aprendi a Te adorar pelo que és
Dm7             F/C         G/B
Dele vêm o sim e o amém
C9             G/B         Am7
Somente Dele e mais ninguém
G     F     G4       F
A Deus seja o louvor
---
[Refrão]
C9                    G/B
Se Deus fizer, Ele é Deus
Am7                   G
Se não fizer, Ele é Deus
F                     C/E
Se a porta abrir, Ele é Deus
Dm7                   G
Mas se fechar, continua sendo Deus
C9                    G/B
Se a doença vier, Ele é Deus
Am7                   G
Se curado eu for, Ele é Deus
F                     C/E
Se tudo der certo, Ele é Deus
Dm7                   G
Mas se não der, continua sendo Deus
---
[Segunda Parte]
F                     C/E
Não o adoro pelo que Ele faz
Dm7                   Am7
Eu o adoro pelo que Ele é
F
Haja o que houver
G       F     G       C/E
Sempre será Deus

===

título: EM AMOR POR MIM
artistas: Vencedores Por Cristo
tom: D
bpm: 60
natureza: ceia
tags: sacrifício, comunhão
youtube:
[https://www.youtube.com/results?search_query=Em+Amor+Por+Mim+Vencedores+Por+Cristo](https://www.youtube.com/results?search_query=Em+Amor+Por+Mim+Vencedores+Por+Cristo)

[Verso 1]
D         D/C           D/F#        G
Este é o meu corpo partido por ti
D         Bm            E7          A7/4
Traz salvação e dá a paz
A7        F#m         Bm          Em
Toma e come e quando fizeres
A7/4      D       G/A
Faze-o em amor por Mim
---
[Verso 2]
D         D/C           D/F#        G
Este é meu sangue vertido por ti
D         Bm            E7          A7/4
Traz o perdão e liberdade
A7        F#m         Bm          Em
Toma e bebe e quando fizeres
A7/4      D       G/A
Faze-o em amor por Mim

===

título: NADA ALÉM DO SANGUE
artistas: Fernandinho
tom: A
bpm: 72
natureza: ceia
tags: sangue de jesus, justificação
youtube:
[https://www.youtube.com/results?search_query=Nada+Alem+Do+Sangue+Fernandinho](https://www.youtube.com/results?search_query=Nada+Alem+Do+Sangue+Fernandinho)

[Verso 1]
A                       F#m7(11)
Teu sangue leva-me além
A                       F#m7(11)
A todas as alturas onde ouço a Tua voz
E                       D9
Fala de Tua justiça pela minha vida
A                       D9/F#       E
Jesus, este é o Teu sangue
---
[Verso 2]
A                       F#m7(11)
Tua cruz mostra Tua graça
A                       F#m7(11)
Fala do amor do Pai que prepara para nós
E
Um caminho para Ele onde posso me
D9                      A           D9/F#       E
Achegar somente pelo sangue
---
[Refrão]
A                       F#m7(11)
Que nos lava dos pecados, que nos traz restauração
E                       D9          A           D9/F#       E
Nada além do sangue, nada além do sangue de Jesus
A                       F#m7(11)
O que nos faz brancos como a neve, aceitos como amigos de Deus
E                       D9          A           D9/F#       E
Nada além do sangue, nada além do sangue de Jesus
---
[Ponte 1]
A
Eu sou livre
F#m7(11)
Eu sou livre
E                       D9          A           D9/F#       E
Nada além do sangue, nada além do sangue de Jesus
---
[Ponte 2]
A       E       D       A
Alvo mais que a neve .... alvo mais que a neve
A7      D       Dm      A       E       A       E
Sim nesse sangue lavado, mais alvo que a neve serei

===

título: LUGAR SECRETO
artistas: Gabriela Rocha
tom: F
bpm: 64
natureza: adoração
tags: intimidade, rendição
youtube:
[https://www.youtube.com/results?search_query=Lugar+Secreto+Gabriela+Rocha](https://www.youtube.com/results?search_query=Lugar+Secreto+Gabriela+Rocha)

[Verso 1]
F7M(9)     Am          G4(6)
Tu és tudo o que eu mais quero
F7M(9)     Am          G4(6)
O meu fôlego, Tu és
F7M(9)     Am          G4(6)
Em Teus braços, é o meu lugar
F7M(9)     Am          G4(6)
Estou aqui, estou aqui
---
[Verso 2]
F7M(9)     Am          G4(6)
Pai, eu amo Sua presença
F7M(9)     Am          G4(6)
Teu sorriso é vida em mim
F7M(9)     Am          G4(6)
Eu seguro em Suas mãos
F7M(9)     Am          G4(6)
Confio em Ti, confio em Ti
---
[Refrão]
F7M(9)
Quero ir mais fundo
Dm7(9)
Leva-me mais perto
Am
Onde eu Te encontro
Em7
No lugar secreto
F7M(9)
Aos Teus pés, me rendo
Dm7(9)     Am          G4(6)
Pois a Tua glória quero ver
---
[Segunda Parte]
F7M(9)
Tudo o que eu mais quero é Te ver
Dm7(9)
Me envolva com Tua glória e poder
Am
Tua majestade é real
Em7
Tua voz ecoa em meu ser

===

título: MEU ALVO
artistas: Kleber Lucas
tom: Bb
bpm: 120
natureza: louvor
tags: perseverança, foco
youtube:
[https://www.youtube.com/results?search_query=Meu+Alvo+Kleber+Lucas](https://www.youtube.com/results?search_query=Meu+Alvo+Kleber+Lucas)

[Verso 1]
Bb                      Gm
Estou subindo pra um lugar mais alto
Bb
Eu já queimei as pontes com o passado
Gm
E os meus olhos
Eb             Ebm7           Bb
Vejo um futuro tudo novo se fez, tudo novo se faz
F              F4             F             Gm
E dessa estrada eu não me desvio nunca mais
F/A            Eb
Estou firme eu não me desvio nunca mais
---
[Refrão]
Bb
Vou avançar eu vou crescer
F/A
Ninguém vai me deter
Gm
Meu alvo é Cristo
Eb
Meu alvo é Cristo
---
[Verso 2]
Bb                      Gm
Estou subindo pra um lugar mais alto
Bb
Eu já desisti de andar sozinho
Gm
Cristo vive em mim
Eb             Ebm7           Bb
E os meus pés estão no caminho, estão no caminho
F              F4             F             Gm
E dessa estrada eu não me desvio nunca mais
F/A            Eb
Estou firme eu não me desvio nunca mais

===

título: SEGURANÇA BENDITA
artistas: Harpa Cristã
tom: D
bpm: 90
natureza: hino
tags: fé, salvação
youtube:
[https://www.youtube.com/results?search_query=Seguranca+Bendita+Harpa+Crista](https://www.youtube.com/results?search_query=Seguranca+Bendita+Harpa+Crista)

[Verso 1]
D                           G           D G
Que segurança! sou de Jesus!
Bm   Em             A
Por Ele agora vivo na luz!
D                           G           D G
De Deus herdeiro a mim me tornou
Em       A               D
Pelo Seu sangue, que me salvou.
---
[Refrão]
D                           G           D G
Canta, minha alma! canta ao Senhor
Bm  Em           A
As maravilhas do Seu amor!
D                           G           D G
Canta, minha alma! canta a Jesus!
Em  A             D
Por Ele vives hoje na luz.
---
[Verso 2]
D                           G           D G
Inteiramente me submeti.
Bm   Em             A
Plena alegria Nele eu senti!
D                           G           D G
Dos céus descendo, tenho na cruz
Em       A               D
Graça inefável por meu Jesus!
---
[Verso 3]
D                           G           D G
Sempre submisso quero viver;
Bm   Em             A
Sua vontade sempre fazer;
D                           G           D G
Rejubilando, a todos contar
Em       A               D
Que meu Jesus me veio salvar.

===

título: CANÇÃO DO APOCALIPSE
artistas: Diante do Trono
tom: D
bpm: 74
natureza: adoração
tags: exaltação, volta de cristo
youtube:
[https://www.youtube.com/results?search_query=Cancao+Do+Apocalipse+Diante+Do+Trono](https://www.youtube.com/results?search_query=Cancao+Do+Apocalipse+Diante+Do+Trono)

[Verso 1]
D9                             Am7
Digno é o Cordeiro, que foi morto
C9                     G
Santo, santo Ele é
D9                                 Am7
Um novo cântico, ao que se assenta
C9                     G
Sobre o trono do céu
---
[Refrão]
D9
Santo, santo, santo
Am7
Deus todo poderoso
C9                            G
Que era e é e há de vir
D9
Com a criação eu canto
Am7
Louvores ao Rei dos reis
C9
És tudo para mim
G                          D9 Am7 C9 G
E eu Te adorarei
---
[Verso 2]
D9                             Am7
Está vestido, do arco-íris
C9                             G
Sons de trovão, luzes, relâmpagos
D9                             Am7
Louvores, honra e glória
C9                             G
Força e poder pra sempre
D9 Am7 C9 G
Ao único Rei eternamente
---
[Ponte]
D9                             Am7
Maravilhado, extasiado
C9                             G
Eu fico ao ouvir Teu nome
D9                             Am7
Jesus, Teu nome é força, é fôlego de vida
C9                             G
Misteriosa água viva

===

título: RUDE CRUZ
artistas: Cantor Cristão
tom: G
bpm: 65
natureza: hino
tags: cruz, salvação
youtube:
[https://www.youtube.com/results?search_query=Rude+Cruz+Cantor+Cristao](https://www.youtube.com/results?search_query=Rude+Cruz+Cantor+Cristao)

[Verso 1]
G                                      C
Rude cruz se erigiu, dela o dia fugiu,
D7           D             G
Como emblema de afronta e de dor.
G                                         C
Mas eu amo essa cruz, porque, nela, Jesus
D            D7           G
Deu a vida por mim, pecador.
---
[Refrão]
D                              G
Sim, eu sempre amarei essa cruz!
C                          G
Seu triunfo meu gozo será,
G                              C
Pois um dia, em lugar de uma cruz,
G            D            G
A coroa Jesus me dará!
---
[Verso 2]
G                                      C
Desde a glória dos céus, o Cordeiro de Deus
D7           D             G
Ao calvário humilhante baixou.
G                                         C
Tem a cruz, para mim, atrativos sem fim,
D            D7           G
Porque nela Jesus me salvou.
---
[Verso 3]
G                                      C
Lá na cruz padeceu, desprezado morreu
D7           D             G
Meu Jesus, para dar-me o perdão;
G                                         C
Dela agora provém para mim todo o bem,
D            D7           G
Tenho nela real salvação.
---
[Verso 4]
G                                      C
Eu aqui, com Jesus, a vergonha da cruz
D7           D             G
Quero sempre levar e sofrer.
G                                         C
Quando Cristo voltar, para aqui me buscar,
D            D7           G
Sua glória eu irei receber.

===

título: QUÃO LINDO ESSE NOME É
artistas: Kemuel
tom: D
bpm: 68
natureza: adoração
tags: nome de jesus, majestade
youtube:
[https://www.youtube.com/results?search_query=Quao+Lindo+Esse+Nome+E+Kemuel](https://www.youtube.com/results?search_query=Quao+Lindo+Esse+Nome+E+Kemuel)

[Verso 1]
D
No início eras a Palavra
G             Bm         A9
Um com Deus, o Altíssimo
Bm7           A/C#        D
O mistério de Tua glória
G             Bm         A9
Cristo, em Ti se revelou
---
[Refrão]
D
Oh, quão lindo esse nome é
A
Oh, quão lindo esse nome é
Bm7             A             G9
O nome de Jesus, meu Rei
D/F#
Oh, quão lindo esse nome é
A
Maior que tudo Ele é
Bm7
Oh, quão lindo esse nome é
A               G9
O nome de Jesus
---
[Verso 2]
D
Deixou o céu para buscar-nos
G             Bm7        A
Veio pra nos resgatar
Bm7           A/C#        D
Amor maior que o meu pecado
G             Bm7        A
Nada vai nos separar
---
[Ponte]
G
A morte venceste
A
O véu Tu rompeste
Bm7                           A
A tumba vazia agora está
G
O céu Te adora
A
Proclama Tua glória
Bm7                           A
Pois ressuscitaste e vivo está
G
És invencível
A
Inigualável
Bm7                           A
Hoje e pra sempre reinarás
G
Teu é o reino
A
Tua é a glória
Bm7                           A
Acima de todo nome está

===

título: GLÓRIA, GLÓRIA, ALELUIA!
artistas: Cantor Cristão
tom: Bb
bpm: 100
natureza: hino
tags: júbilo, volta de cristo
youtube:
[https://www.youtube.com/results?search_query=Gloria+Gloria+Aleluia+Cantor+Cristao](https://www.youtube.com/results?search_query=Gloria+Gloria+Aleluia+Cantor+Cristao)

[Verso 1]
Bb
Quando à alma sequiosa chega a voz do Salvador,
Eb                                                   Bb
Eis que logo reconhece ser Jesus o Seu Senhor;
Bb
Mas, se o eu quer levantar-se, revelar algum valor,
Eb          F           Bb
Vencendo vem Jesus!
---
[Refrão]
Bb
Glória, glória, aleluia!
Eb                      Bb
Glória, glória, aleluia!
Bb
Glória, glória, aleluia!
Eb          F           Bb
Vencendo vem Jesus!
---
[Verso 2]
Bb
Neste mundo havemos, crentes, de ter sempre algum pesar,
Eb                                                   Bb
Mesmo lutas, dissabores que nos venham perturbar;
Bb
Mas, se o mal nos ameaça de a alegria nos roubar,
Eb          F           Bb
Vencendo vem Jesus!
---
[Verso 3]
Bb
Inimigos aleivosos, ou rebeldes ou ateus,
Eb                                                   Bb
Muitas vezes nos assaltam para nos tornarem seus;
Bb
Mas, se alguém procura ver-nos sem o gozo do bom Deus,
Eb          F           Bb
Vencendo vem Jesus!

===

título: CREIO
artistas: Diante do Trono
tom: F#m
bpm: 72
natureza: adoração
tags: fé, esperança
youtube:
[https://www.youtube.com/results?search_query=Creio+Diante+Do+Trono](https://www.youtube.com/results?search_query=Creio+Diante+Do+Trono)

[Verso 1]
F#m             A9                  D                 Bm
Na dor, na aflição, quando não vejo solução
F#m             A9                  D                 Bm
Digo a mim mesmo, minha alma espera em Deus
F#m             A9                  D                 Bm
Abro meus lábios e creio mesmo contra a esperança
---
[Pré-Refrão]
A                               Bm
Creio em um Deus pra quem tudo é possível
A                               Bm
Creio em um Deus que tudo pode mudar
D                               F#m                              E
Creio em um Deus que fez o céu, a terra e mar
D                               E
Todo-poderoso, mas é fiel pra se importar comigo
---
[Refrão]
A
Se importa comigo
A/C#            E
Se importa comigo
D               F#m             E
Creio, eu creio até o fim
D               F#m             E
Creio, aqui não é o fim
---
[Ponte]
Bm              D               F#m                              E
E se eu não ver minha vitória aqui, coroa de glória
Bm              D               F#m             A
Creio é o que aguarda ali
Bm              D               F#m             A
Creio aqui não é o fim
Bm              F#m             A
Eu creio até o fim.

===

título: DEUS DE PROMESSAS
artistas: Davi Sacer
tom: C
bpm: 70
natureza: adoração
tags: fidelidade, promessas
youtube:
[https://www.youtube.com/results?search_query=Deus+De+Promessas+Davi+Sacer](https://www.youtube.com/results?search_query=Deus+De+Promessas+Davi+Sacer)

[Verso 1]
Dm7             G/B               C/E               F
Sei que os Teus olhos sempre atentos permanecem em mim
Dm7             C/G               F
E os Teus ouvidos estão sensíveis para ouvir meu clamor
C/E             Dm7               G/B
Posso até chorar
C9              G/B               Am7
Mas alegria vem de manhã
---
[Pré-Refrão]
F               C/E               Dm                G
És Deus de perto e não de longe
F               C/E               Dm                Bb F/A G4
Nunca mudastes, Tu és fiel!
---
[Refrão]
G/F             C/E               Am
Deus de aliança, Deus de promessas
Dm7                               G4 G
Deus que não é homem pra mentir
G/F             C/E               Am
Tudo pode passar, tudo pode mudar
Dm7                               G4 G
Mas Tua palavra vai se cumprir
---
[Verso 2]
Am7             G                 F
Posso enfrentar o que for
G               Am7
Eu sei quem luta por mim
G               F                 G
Seus planos não podem ser frustrados
Am7             G                 F                 G                 Am7
Minha esperança está nas mãos do grande Eu Sou
G               Bb9               F/A               G4 G
Meus olhos vão ver o impossível acontecer

===

título: OUSADO AMOR
artistas: Isaías Saad
tom: D#m
bpm: 68
natureza: adoração
tags: amor de deus, redenção
youtube:
[https://www.youtube.com/results?search_query=Ousado+Amor+Isaias+Saad](https://www.youtube.com/results?search_query=Ousado+Amor+Isaias+Saad)

[Verso 1]
D#m             C#4               B9                F#
Antes de eu falar Tu cantavas sobre mim
D#m             C#4               B9
Tu tens sido tão tão bom pra mim
D#m             C#4               B9                F#
Antes de eu respirar sopraste Tua vida em mim
D#m             C#4               B9
Tu tens sido tão tão bom pra mim
---
[Refrão]
D#m             C#4               B9                F#
Oh, impressionante, infinito e ousado amor de Deus
D#m             C#4               B9                F#
Oh, que deixa as noventa e nove só pra me encontrar
D#m             C#4               B9                F#
Não posso comprá-lo, nem merecê-lo mesmo assim se entregou
D#m             C#4               B9                F#
Oh, impressionante, infinito e ousado amor de Deus
---
[Verso 2]
D#m             C#4               B9                F#
Inimigo eu fui mas Teu amor lutou por mim
D#m             C#4               B9
Tu tens sido tão tão bom pra mim
D#m             C#4               B9                F#
Não tinha valor mas tudo pagou por mim
D#m             C#4               B9
Tu tens sido tão tão bom pra mim
---
[Ponte]
D#m             C#4               B9                F#
Traz luz para as sombras, escala montanhas, pra me encontrar
D#m             C#4               B9                F#
Derruba muralhas, destrói as mentiras, pra me encontrar

===

título: AQUIETA MINH'ALMA
artistas: Ministério Zoe
tom: A
bpm: 60
natureza: adoração
tags: confiança, descanso
youtube:
[https://www.youtube.com/results?search_query=Aquieta+Minh+Alma+Ministerio+Zoe](https://www.youtube.com/results?search_query=Aquieta+Minh+Alma+Ministerio+Zoe)

[Refrão]
A9              E
Aquieta minh'alma
F#m11/C#        D9
Faz meu coração ouvir Tua voz
A9              E
Me chama pra perto
F#m11/C#        D9
Só assim eu não me sinto só
---
[Verso 1]
A9                                E
Porque, na verdade, eu descobri que
Tudo o que eu preciso está em Ti
F#m11/C#                          D9
Mas meu coração é teimoso demais pra admitir
A9                                E
Sei que depender é como viver perigosamente
F#m11/C#                          D9
Mas eu preciso acreditar e confiar no que você me diz
---
[Verso 2]
A9                                E
Eu sei que, mesmo sem entender Você está no controle então
F#m11/C#                          D9
Me esconda no Teu coração, me amarre a Ti pra eu não desistir
A9                                E
Eu não quero mais fugir
F#m11/C#                          D9
Eu vou confiar, eu vou descansar
A9                                F#m11/C# D9
Me lançar no Teu amor, no Teu amor, Senhor
---
[Pré-Refrão]
E                                 F#m11/C#          D9
E se eu cair, a Tua mão me levantará
E                                 F#m11/C#          D9
E se eu chorar, toda lágrima Você enxugará

===

título: EU ME RENDO
artistas: Renascer Praise
tom: B
bpm: 75
natureza: adoração
tags: rendição, consagração
youtube:
[https://www.youtube.com/results?search_query=Eu+Me+Rendo+Renascer+Praise](https://www.youtube.com/results?search_query=Eu+Me+Rendo+Renascer+Praise)

[Verso 1]
B               F#/B              E/B               E
A Ti eu vou clamar
Pois tudo vem de Ti
E tudo está em Ti
Por Ti vou caminhar
B               F#/B              E/B               E
Tu és a direção
O sol a me guiar
---
[Pré-Refrão]
B/D#            C#m7              F#/A#
Tudo pode passar
E               B/D#              B B/D#
O Teu amor jamais me deixará
Sempre há de existir
C#m7            B                 F#/A#
Novo amanhã preparado pra mim
---
[Refrão]
B               G#m               F#                E
Eu me rendo aos Teus pés
És tudo que eu preciso pra viver
B               G#m               F#                E
Eu me lanço aos Teus braços
Onde encontro, meu refugio
---
[Ponte]
B F#/A#         G#m7 E
Jesus, eis-me aqui

===

título: IDE
artistas: Arena Louvor
tom: B
bpm: 130
natureza: louvor
tags: missões, evangelismo
youtube:
[https://www.youtube.com/results?search_query=Ide+Arena+Louvor](https://www.youtube.com/results?search_query=Ide+Arena+Louvor)

[Verso 1]
B
Seja onde for
B
Vou ser testemunho do Deus vivo
G#m
Seja pra quem for
G#m
Vou falar do Seu amor
---
[Pré-Refrão]
E               C#m
Me chamou, eis me aqui
B
Eu estou ao Seu dispor
B
Eu serei a luz, eu serei o sal da terra
G#m
Pregarei a paz, anunciarei a salvação
E               C#m               B
Me chamou, estou pronto, disposto a Te servir
---
[Refrão]
B               G#m               F#
Coloca nos meus lábios uma palavra
E               G#m
De desafio pra essa geração
E               F#
Me dá intrepidez e ousadia
G#m
Pra dizer que a cruz trouxe libertação
---
[Ponte]
E               F#
Só os loucos vão, só quem ama o Rei
G#m
Só quem ouve o ide do Senhor

===

título: ENCONTREI O MEU LUGAR
artistas: Renascer Praise
tom: D
bpm: 70
natureza: adoração
tags: espírito santo, presença
youtube:
[https://www.youtube.com/results?search_query=Encontrei+O+Meu+Lugar+Renascer](https://www.youtube.com/results?search_query=Encontrei+O+Meu+Lugar+Renascer)

[Verso 1]
D9              D/F#              G9
Ouvi Tua voz
D/F#            G9                D9
Me chamando pra viver melhor
D9              D/F#              G9
Do que as guerras e morte roubaram de mim
---
[Pré-Refrão]
D9              D/F#              G9
Som que liberta
Luz de vida que me invade
D/F#            G9                A9/C#
Me trouxe asas
---
[Refrão]
D9              Em                A9/C#
Voar no som da Tua voz
F#m             G9
Espírito de Deus
---
[Verso 2]
D9              D/F#              G9
Encontrei o meu lugar
Tua presença
D9              D/F#              G9
Ser mais cheio do Espírito
É o milagre
---
[Ponte]
D               D/F#              G9
Vem me faz voar, faz voar Santo Espírito
D               D/F#              G9
No som da Tua voz viajar Santo Espírito

===

título: TU ÉS BOM
artistas: Fred Arrais
tom: E
bpm: 130
natureza: louvor
tags: bondade, celebração
youtube:
[https://www.youtube.com/results?search_query=Tu+Es+Bom+Fred+Arrais](https://www.youtube.com/results?search_query=Tu+Es+Bom+Fred+Arrais)

[Verso 1]
E
Senhor, Tu és bom
E/D#            E/D               E/C#
Tua misericórdia é pra sempre
E
Senhor, Tu és bom
E/D#            E/D               E/C#
Tua misericórdia é pra sempre
---
[Pré-Refrão]
A               B9
Todos os povos Te exaltarão
C9              D9
De geração em geração
---
[Refrão]
E               E/D#              E/D               E/C#
Te adorarei, aleluia! Aleluia!
E               E/D#              C9                D9
Te adorarei, por tudo que és
---
[Ponte]
E    G    A9
Deus é bom o tempo todo
E    D9   C#9
O tempo todo, Deus é bom

===

título: DEUS É FIEL
artistas: Nani Azevedo
tom: A
bpm: 65
natureza: adoração
tags: fidelidade, promessas
youtube:
[https://www.youtube.com/results?search_query=Deus+E+Fiel+Nani+Azevedo](https://www.youtube.com/results?search_query=Deus+E+Fiel+Nani+Azevedo)

[Verso 1]
A               E                 F#m
Sim Deus é fiel para cumprir
D               A
Toda palavra dita a mim
E               F#m
Deus é fiel Deus é fiel
A               E                 F#m
Sim Deus é fiel para cumprir
D               A
Toda promessa feita a mim
E               A
Deus é fiel Deus é fiel
---
[Pré-Refrão]
E                                 A
Eu não morrerei enquanto o Senhor não cumprir em mim
E                                 A
Todos os sonhos que Ele mesmo sonhou pra mim
---
[Refrão]
D
Eu quero viver em santidade e adoração
A               E                 A
Pois é só Dele somente Dele o meu coração

===

título: A ELE A GLÓRIA
artistas: Diante do Trono
tom: Em
bpm: 70
natureza: adoração
tags: majestade, exaltação
youtube:
[https://www.youtube.com/results?search_query=A+Ele+A+Gloria+Diante+Do+Trono](https://www.youtube.com/results?search_query=A+Ele+A+Gloria+Diante+Do+Trono)

[Verso 1]
Em              C
Porque Dele e por Ele
D/F#            Em
Para Ele são todas as coisas
---
[Refrão]
C   G/B D/F#    G   D/F# Em
A Ele a glória
C               D/F#
A Ele a glória, pra sempre amém
---
[Verso 2]
Em              C                 D/F#              Em
Quão profundas riquezas, o saber e o conhecer de Deus
C               D/F#                                Em
Quão insondáveis, Seus juízos e Seus caminhos

===

título: ME DERRAMAR
artistas: Vineyard
tom: G
bpm: 68
natureza: adoração
tags: rendição, consagração
youtube:
[https://www.youtube.com/results?search_query=Me+Derramar+Vineyard](https://www.youtube.com/results?search_query=Me+Derramar+Vineyard)

[Verso 1]
G               D/F#
Eis-me aqui outra vez
Em              C
Diante de Ti abro meu coração
G               D/F#
Meu clamor Tu escutas
Em              C
E fazes cair as barreiras em mim
---
[Verso 2]
G               D/F#
És fiel, Senhor, e dizes
Em              C
Palavras de amor e esperança sem fim
G               D/F#
Ao sentir Teu toque
Em              C
Por Tua bondade libertas meu ser
---
[Pré-Refrão]
Am  G/B C       D
No calor deste lugar eu venho
---
[Refrão]
G               D
Me derramar, dizer que Te amo
Em              C
Me derramar, dizer Te preciso
G               D
Me derramar, dizer que sou grato
Em              C
Me derramar, dizer que és formoso`;

// ─── Parse all songs ─────────────────────────────────────────────────────────

function parseAllSongs(rawText) {
  // Split by === (with optional surrounding whitespace)
  const songChunks = rawText.split(/^===\s*$/m).map(s => s.trim()).filter(s => {
    // Must have a título line
    return s.includes('título:') || s.includes('titulo:');
  });

  return songChunks.map(chunk => parseSong(chunk));
}

// ─── Insert a single song ────────────────────────────────────────────────────

async function insertSong(songData) {
  const { meta, blocks } = songData;
  if (!meta.title) return null;

  const rawKey = meta.key || 'C';
  const normalizedKey = normalizeKey(rawKey);

  console.log(`\n→ Inserting: ${meta.title} (key: ${rawKey} → ${normalizedKey})`);
  console.log(`  Blocks: ${blocks.length}`);

  // 1. Insert master song
  const { data: masterData, error: masterError } = await supabase
    .from('master_songs')
    .insert({
      title: meta.title,
      original_composer: meta.artists || null,
      nature: mapNature(meta.nature || 'adoração'),
      searchable_lyrics: blocks
        .flatMap(b => b.lines.map(l => l.lyrics))
        .filter(Boolean)
        .join(' '),
    })
    .select('id')
    .single();

  if (masterError || !masterData) {
    console.error('  ✗ master song error:', masterError?.message);
    return null;
  }

  const songId = masterData.id;

  // 2. Insert liturgical tags
  const tags = mapTags(meta.tags || '');
  if (tags.length > 0) {
    const { error: tagError } = await supabase
      .from('song_liturgical_tags')
      .insert(tags.map(tag => ({ song_id: songId, tag_id: tag })));
    if (tagError) console.error('  ✗ tags error:', tagError.message);
  }

  // 3. Insert version
  const { data: versionData, error: versionError } = await supabase
    .from('song_versions')
    .insert({
      master_song_id: songId,
      key: normalizedKey,
      bpm: meta.bpm || null,
      youtube_url: meta.youtube || null,
      source_url: null,
      is_default: true,
    })
    .select('id')
    .single();

  if (versionError || !versionData) {
    console.error('  ✗ version error:', versionError?.message);
    return null;
  }

  const versionId = versionData.id;

  // 4. Insert artists
  const artists = (meta.artists || '').split('/').map(a => a.trim()).filter(Boolean);
  if (artists.length > 0) {
    await supabase.from('version_artists').insert(
      artists.map(name => ({ version_id: versionId, artist_name: name }))
    );
  }

  // 5. Insert blocks
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const { error: blockError } = await supabase.from('chord_blocks').insert({
      version_id: versionId,
      type: block.type,
      label: block.label,
      sort_order: i,
      repeat_count: block.repeatCount,
      directions: JSON.stringify(block.directions),
      lines: JSON.stringify(block.lines),
    });
    if (blockError) console.error(`  ✗ block ${i} error:`, blockError.message);
  }

  console.log(`  ✓ Inserted with id: ${songId}`);
  return songId;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🎵 IPI Worship — Bulk Song Import');
  console.log('===================================\n');

  const songs = parseAllSongs(RAW_TEXT);
  console.log(`Parsed ${songs.length} songs\n`);

  // Preview parsed data
  songs.forEach((s, i) => {
    const keyRaw = s.meta.key || '?';
    const keyNorm = normalizeKey(keyRaw);
    console.log(`${i + 1}. ${s.meta.title || '(sem título)'} | key: ${keyRaw}→${keyNorm} | blocks: ${s.blocks.length} | nature: ${s.meta.nature}`);
  });

  console.log('\n📤 Inserting into Supabase...');

  let success = 0;
  let fail = 0;

  for (const song of songs) {
    const id = await insertSong(song);
    if (id) success++;
    else fail++;
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('\n===================================');
  console.log(`✅ Done: ${success} inserted, ${fail} failed`);
}

main().catch(console.error);
