import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  Smartphone,
  Share,
  SquarePlus,
  Search,
  Library,
  Music2,
  Type,
  Eye,
  Play,
  MonitorSmartphone,
  ListMusic,
  LogIn,
  Plus,
  GripVertical,
  Share2,
  Upload,
  ClipboardCheck,
  UserCog,
  BookOpen,
  Archive,
  CheckCircle2,
  Zap,
  Lightbulb,
  Lock,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Como usar o app',
  description:
    'Guia rápido do app de louvor da IPI do Imirim: instalar no celular, ler cifras, mudar o tom e acompanhar o repertório do culto.',
  openGraph: {
    title: '🎵 Como usar o app de louvor',
    description:
      'Instalar no celular, ler cifras, mudar o tom e acompanhar o repertório do culto — guia rápido para a equipe.',
    images: [{ url: '/icons/icon-512x512.png', width: 512, height: 512 }],
  },
};

/** Screenshot em moldura de celular, com lazy loading. */
function Shot({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={780}
      height={1560}
      className="w-full max-w-[280px] mx-auto rounded-2xl border border-border shadow-xl"
    />
  );
}

function Step({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <div className="w-9 h-9 rounded-xl bg-accent-subtle flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4.5 h-4.5 text-accent" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted mt-0.5">{children}</p>
      </div>
    </li>
  );
}

function Section({
  id,
  eyebrow,
  title,
  shot,
  shotAlt,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  shot?: string;
  shotAlt?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1">{eyebrow}</p>
      <h2 className="text-lg md:text-xl font-bold text-foreground mb-4">{title}</h2>
      {shot ? (
        <div className="grid md:grid-cols-[1fr_300px] gap-6 items-start">
          <div>{children}</div>
          <Shot src={shot} alt={shotAlt ?? title} />
        </div>
      ) : (
        children
      )}
    </section>
  );
}

export default function ComoUsarPage() {
  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 space-y-12">
      {/* Hero */}
      <header>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-accent-subtle flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Como usar o app</h1>
            <p className="text-sm text-muted">
              Guia rápido para a equipe de louvor — do primeiro acesso à montagem do repertório.
            </p>
          </div>
        </div>
      </header>

      {/* 1. Instalar */}
      <Section id="instalar" eyebrow="Passo 1" title="Instale como aplicativo no celular">
        <p className="text-sm text-muted mb-5">
          O app funciona direto no navegador, mas instalado ele abre em tela cheia, ganha ícone na
          tela de início e carrega mais rápido.
        </p>
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-accent" /> iPhone (Safari)
            </p>
            <ol className="space-y-3">
              <Step icon={Share} title="Toque em Compartilhar">
                O botão com o quadrado e a seta para cima, na barra do Safari.
              </Step>
              <Step icon={SquarePlus} title="Adicionar à Tela de Início">
                Role a lista de opções até encontrar, toque e confirme em “Adicionar”.
              </Step>
            </ol>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-accent" /> Android (Chrome)
            </p>
            <ol className="space-y-3">
              <Step icon={SquarePlus} title="Toque em “Instalar app”">
                Um aviso aparece sozinho na parte de baixo da tela depois de alguns segundos. Se
                não aparecer, abra o menu ⋮ do Chrome e toque em “Instalar aplicativo”.
              </Step>
              <Step icon={Share2} title="Abriu pelo WhatsApp ou Instagram?">
                Esses apps mostram a página num navegador simplificado, sem a opção de instalar.
                Toque em “Abrir no navegador” no menu deles primeiro.
              </Step>
            </ol>
          </div>
        </div>
      </Section>

      {/* 2. Encontrar música */}
      <Section
        id="buscar"
        eyebrow="Passo 2"
        title="Encontre qualquer música"
        shot="/ajuda/musicas.png"
        shotAlt="Lista de todas as músicas do repertório"
      >
        <ol className="space-y-4">
          <Step icon={Library} title="Aba Músicas">
            Todo o repertório da igreja em ordem alfabética, com tom e artista de cada versão.
          </Step>
          <Step icon={Search} title="Aba Busca">
            Procure pelo título ou por um trecho da letra — útil quando você só lembra de um pedaço
            da música.
          </Step>
          <Step icon={Archive} title="Aba Arquivadas">
            Músicas que não tocamos há um bom tempo saem da lista principal — mas voltam sozinhas
            assim que alguém as adiciona numa playlist de novo.
          </Step>
        </ol>
      </Section>

      {/* 3. Ler a cifra */}
      <Section
        id="cifra"
        eyebrow="Passo 3"
        title="Leia a cifra do seu jeito"
        shot="/ajuda/cifra.png"
        shotAlt="Página da cifra com barra de ferramentas"
      >
        <p className="text-sm text-muted mb-4">
          A barra no topo da cifra acompanha você enquanto rola a página:
        </p>
        <ol className="space-y-4">
          <Step icon={Music2} title="Mudar o tom">
            Toque em − ou + ao lado do tom. Todos os acordes são transpostos na hora — cada músico
            pode tocar no tom que preferir.
          </Step>
          <Step icon={Type} title="Tamanho da letra">
            Os botões T aumentam ou diminuem a fonte, para ler de longe no ensaio.
          </Step>
          <Step icon={Eye} title="Só a letra">
            O botão “Cifra” alterna entre cifra completa e somente a letra — bom para quem canta.
          </Step>
          <Step icon={Play} title="Rolagem automática">
            O botão ▶ no canto inferior rola a página sozinho na velocidade que você escolher. As
            mãos ficam livres para tocar.
          </Step>
          <Step icon={MonitorSmartphone} title="Manter tela ligada">
            Ative para o celular não apagar no meio da música.
          </Step>
          <Step icon={CheckCircle2} title="Selo “Ajustada”">
            Indica que alguém já revisou a cifra linha por linha. Sem o selo, os acordes vieram
            direto da importação — vale conferir antes de tocar.
          </Step>
          <Step icon={Zap} title="Dinâmica e repetição do bloco">
            Indicações como crescendo, solo ou silêncio aparecem no topo de cada bloco; quantas
            vezes repetir (2x, 3x…) aparece embaixo, junto da letra.
          </Step>
          <Step icon={Lightbulb} title="Sugerir para o culto">
            Logado, toque em “Sugerir” na página da cifra para indicar a música a quem monta o
            repertório.
          </Step>
        </ol>
      </Section>

      {/* 4. Repertório do culto */}
      <Section
        id="repertorio"
        eyebrow="Passo 4"
        title="Acompanhe o repertório do culto"
        shot="/ajuda/playlist.png"
        shotAlt="Playlist com a ordem do culto"
      >
        <ol className="space-y-4">
          <Step icon={ListMusic} title="Playlist da Semana">
            A tela inicial mostra o repertório do próximo culto, na ordem em que será tocado.
          </Step>
          <Step icon={Play} title="Toque para abrir a cifra">
            Dentro da playlist, cada música abre já no contexto do culto — dá para passar de uma
            para a outra sem voltar à lista.
          </Step>
          <Step icon={Share2} title="Recebeu um link no WhatsApp?">
            É a mesma coisa: o link abre a playlist direto, sem precisar de conta.
          </Step>
        </ol>
      </Section>

      {/* 5. Montar repertório */}
      <Section
        id="montar"
        eyebrow="Para quem monta o repertório"
        title="Crie e compartilhe playlists"
        shot="/ajuda/playlists.png"
        shotAlt="Tela de playlists com aba de próximas e anteriores"
      >
        <ol className="space-y-4">
          <Step icon={LogIn} title="Entre com sua conta Google">
            Criar e editar playlists exige login — visitantes só visualizam.
          </Step>
          <Step icon={Plus} title="Nova Playlist">
            Defina nome, data e culto (manhã/noite). Depois adicione músicas pelo botão “Adicionar
            à Playlist” na página de cada cifra.
          </Step>
          <Step icon={GripVertical} title="Ordene arrastando">
            No modo edição, arraste as músicas para deixá-las na ordem da liturgia.
          </Step>
          <Step icon={Lock} title="Playlist Particular">
            Marque “Particular” ao criar — fica visível só pra você, ótimo pra ensaiar sozinho sem
            misturar com o repertório oficial.
          </Step>
          <Step icon={ListMusic} title="Repertório Fixo">
            Deixe sem data pra guardar uma lista sem culto marcado (ex.: músicas novas em
            preparação) — ela fica sempre no topo de “Próximas”.
          </Step>
          <Step icon={Share2} title="Compartilhe no grupo">
            O botão de compartilhar copia o link da playlist — cole no grupo da equipe e todo mundo
            abre o repertório no celular.
          </Step>
        </ol>
      </Section>

      {/* 6. Admin */}
      <Section id="admin" eyebrow="Para administradores" title="Gestão do repertório">
        <ol className="space-y-4">
          <Step icon={Upload} title="Importar Cifra">
            Cole o texto da cifra — o app detecta os blocos automaticamente e ainda deixa você
            conferir, juntar ou renomear cada um antes de editar letra e acordes.
          </Step>
          <Step icon={Archive} title="Arquivar músicas">
            Na página da cifra, o botão “Arquivar” tira a música da lista principal sem apagar o
            histórico — ela volta sozinha se for usada numa playlist.
          </Step>
          <Step icon={Lightbulb} title="Sugestões da Congregação">
            Na aba Playlists, aprove sugestões de membros direto pra playlist ou dispense as que
            não forem usar.
          </Step>
          <Step icon={ClipboardCheck} title="Análises de Louvor">
            Registre o parecer teológico de cada música (aprovada, pendente ou rejeitada) — o selo
            aparece na página da cifra e nas playlists.
          </Step>
          <Step icon={UserCog} title="Usuários">
            Gerencie quem é administrador da plataforma.
          </Step>
        </ol>
      </Section>

      {/* Footer CTA */}
      <footer className="bg-card border border-border rounded-2xl p-5 text-center">
        <p className="text-sm text-foreground font-semibold mb-1">Pronto para começar?</p>
        <p className="text-sm text-muted mb-4">
          Abra o repertório da semana e boa música. Ficou com dúvida, chame no grupo da equipe.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
        >
          <ListMusic className="w-4 h-4" />
          Ver a Playlist da Semana
        </Link>
      </footer>
    </div>
  );
}
