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
              <Step icon={SquarePlus} title="Menu ⋮ → Instalar aplicativo">
                Abra o menu do Chrome no canto superior direito e toque em “Instalar aplicativo”
                (ou aceite o aviso que aparece na parte de baixo da tela).
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
            Cadastre músicas novas colando a cifra — o app entende os blocos (intro, verso,
            refrão) e monta a página automaticamente.
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
