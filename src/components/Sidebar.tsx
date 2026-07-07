'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import {
  Music,
  ListMusic,
  Users,
  Search,
  X,
  Moon,
  Sun,
  ClipboardCheck,
  Library,
  Upload,
  LogIn,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  UserCog,
  ChevronRight,
  Menu,
  HelpCircle,
} from 'lucide-react';

// Desktop nav items (full list)
const navItems = [
  { href: '/',          label: 'Playlist da Semana', icon: ListMusic },
  { href: '/musicas',   label: 'Todas as Músicas',    icon: Library },
  { href: '/artistas',  label: 'Artistas',            icon: Users },
  { href: '/playlists', label: 'Playlists',           icon: Music },
  { href: '/analises',  label: 'Análises de Louvor',  icon: ClipboardCheck },
  { href: '/importar',  label: 'Importar Cifra',      icon: Upload },
  { href: '/como-usar', label: 'Como Usar',           icon: HelpCircle },
];

// Mobile bottom tab items (most-used 4 + Mais)
const bottomTabItems = [
  { href: '/',         label: 'Semana',   icon: ListMusic },
  { href: '/musicas',  label: 'Músicas',  icon: Library },
  { href: '/playlists',label: 'Playlists',icon: Music },
  { href: '/busca',    label: 'Busca',    icon: Search },
];

// Items shown in the "Mais" bottom sheet
const maisItems = [
  { href: '/artistas',  label: 'Artistas',        icon: Users },
  { href: '/analises',  label: 'Análises',        icon: ClipboardCheck },
  { href: '/importar',  label: 'Importar Cifra',  icon: Upload },
  { href: '/como-usar', label: 'Como Usar',       icon: HelpCircle },
];

const COLLAPSED_KEY = 'sidebar_collapsed';

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [showMais, setShowMais] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(COLLAPSED_KEY);
    if (saved === 'true') {
      setIsCollapsed(true);
      document.documentElement.dataset.sidebar = 'collapsed';
    }
  }, []);

  // Close drawer on route change
  useEffect(() => { setShowDrawer(false); }, [pathname]);

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem(COLLAPSED_KEY, String(next));
    document.documentElement.dataset.sidebar = next ? 'collapsed' : 'open';
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const user = session?.user;
  const isAdmin = (user as any)?.isAdmin === true;

  // Active detection: /musica/xxx counts as /musicas being active
  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    if (href === '/musicas') return pathname === '/musicas' || pathname.startsWith('/musica/');
    return pathname === href || pathname.startsWith(href + '/');
  }

  // Shared nav link renderer (used in both desktop sidebar and mobile drawer)
  function NavLink({ item, onClick }: { item: typeof navItems[0]; onClick?: () => void }) {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer min-h-[44px]
          ${active ? 'bg-accent-subtle text-accent' : 'text-foreground hover:bg-elevated'}`}
      >
        <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-accent' : 'text-muted'}`} />
        {item.label}
        {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />}
      </Link>
    );
  }

  return (
    <>
      {/* ── Mobile Top Bar ─────────────────────────────────────── */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center px-3 gap-3 bg-card border-b border-border no-print"
        style={{
          // Modo PWA standalone: empurra o conteúdo para baixo da barra de status do iOS
          paddingTop: 'env(safe-area-inset-top)',
          height: 'calc(3.5rem + env(safe-area-inset-top))',
        }}
      >
        <button
          onClick={() => setShowDrawer(true)}
          className="w-11 h-11 flex items-center justify-center rounded-xl text-muted hover:bg-elevated transition-colors cursor-pointer shrink-0"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shrink-0">
            <Music className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-foreground truncate">IPI do Imirim</span>
        </div>
        <Link
          href="/busca"
          className="w-11 h-11 flex items-center justify-center rounded-xl text-muted hover:bg-elevated transition-colors cursor-pointer shrink-0"
          aria-label="Buscar músicas"
        >
          <Search className="w-5 h-5" />
        </Link>
      </header>

      {/* ── Mobile Drawer ──────────────────────────────────────── */}
      {showDrawer && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/60 md:hidden"
            onClick={() => setShowDrawer(false)}
          />
          {/* Drawer panel */}
          <div className="fixed top-0 left-0 bottom-0 z-50 w-[280px] md:hidden bg-card flex flex-col shadow-2xl animate-slide-up"
            style={{ animation: 'slideIn 250ms ease-out forwards', paddingTop: 'env(safe-area-inset-top)' }}
          >
            {/* Drawer header */}
            <div className="flex items-center h-14 border-b border-border px-3 gap-2 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shrink-0">
                <Music className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">IPI do Imirim</p>
                <p className="text-[10px] text-muted">Louvor &amp; Liturgia</p>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                className="w-11 h-11 flex items-center justify-center rounded-xl text-muted hover:bg-elevated transition-colors cursor-pointer shrink-0"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search link */}
            <div className="px-3 py-3">
              <Link
                href="/busca"
                onClick={() => setShowDrawer(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-elevated text-muted text-sm cursor-pointer hover:bg-border transition-colors min-h-[44px]"
              >
                <Search className="w-4 h-4 shrink-0" />
                <span>Buscar músicas...</span>
              </Link>
            </div>

            {/* Nav items */}
            <div className="flex-1 overflow-y-auto px-2 py-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-subtle px-2 mb-1">Menu</p>
              <ul className="space-y-0.5">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} onClick={() => setShowDrawer(false)} />
                  </li>
                ))}
                {isAdmin && (
                  <li>
                    <NavLink
                      item={{ href: '/usuarios', label: 'Usuários', icon: UserCog }}
                      onClick={() => setShowDrawer(false)}
                    />
                  </li>
                )}
              </ul>
            </div>

            {/* Drawer footer */}
            <div className="border-t border-border py-2 px-2 space-y-1 shrink-0">
              {user && (
                <div className="px-3 py-2 rounded-xl bg-elevated mb-1 flex items-center gap-3">
                  {user.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.image} alt={user.name || ''} className="w-8 h-8 rounded-full shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
                    <p className="text-[10px] text-subtle truncate">{user.email}</p>
                  </div>
                  {isAdmin && (
                    <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-1.5 py-0.5 rounded shrink-0">
                      Admin
                    </span>
                  )}
                </div>
              )}
              <button
                onClick={toggleTheme}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm text-foreground hover:bg-elevated transition-colors cursor-pointer min-h-[44px]"
              >
                {isDark ? <Sun className="w-5 h-5 text-muted shrink-0" /> : <Moon className="w-5 h-5 text-muted shrink-0" />}
                {isDark ? 'Modo Claro' : 'Modo Escuro'}
              </button>
              {user ? (
                <button
                  onClick={() => { signOut(); setShowDrawer(false); }}
                  className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm text-muted hover:bg-elevated transition-colors cursor-pointer min-h-[44px]"
                >
                  <LogOut className="w-5 h-5 shrink-0" />
                  Sair da conta
                </button>
              ) : (
                <button
                  onClick={() => { signIn('google'); setShowDrawer(false); }}
                  className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm text-accent bg-accent/10 hover:bg-accent/20 transition-colors cursor-pointer font-medium min-h-[44px]"
                >
                  <LogIn className="w-5 h-5 shrink-0" />
                  Entrar com Google
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Desktop Sidebar ── */}
      <nav
        className={`
          fixed top-0 left-0 z-50 h-full
          bg-card border-r border-border
          hidden md:flex flex-col overflow-hidden
          transition-all duration-300 ease-out
          no-print
          ${isCollapsed ? 'w-14' : 'w-[280px]'}
        `}
      >
        {/* Brand / toggle row */}
        {isCollapsed ? (
          <div className="flex items-center justify-center h-16 border-b border-border shrink-0">
            <button
              onClick={toggleCollapsed}
              className="w-11 h-11 flex items-center justify-center rounded-lg text-muted hover:text-accent hover:bg-elevated transition-colors cursor-pointer"
              title="Expandir menu"
            >
              <ChevronsRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center h-16 border-b border-border shrink-0 px-3 gap-2">
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shadow-sm shrink-0">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-foreground tracking-tight leading-none truncate">IPI do Imirim</h1>
              <p className="text-[11px] text-muted mt-0.5">Louvor & Liturgia</p>
            </div>
            <button
              onClick={toggleCollapsed}
              className="w-11 h-11 flex items-center justify-center rounded-lg text-muted hover:text-accent hover:bg-elevated transition-colors cursor-pointer shrink-0"
              title="Minimizar menu"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search (expanded only) */}
        {!isCollapsed && (
          <div className="px-3 py-3">
            <Link
              href="/busca"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-elevated text-muted text-sm cursor-pointer hover:bg-border transition-colors min-h-[44px]"
            >
              <Search className="w-4 h-4 shrink-0" />
              <span>Buscar músicas...</span>
            </Link>
          </div>
        )}

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {!isCollapsed && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-subtle px-2 mb-1">Menu</p>
          )}
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    className={`
                      flex items-center gap-3 rounded-lg text-sm font-medium
                      transition-all duration-200 cursor-pointer min-h-[44px]
                      ${isCollapsed ? 'justify-center px-0' : 'px-3'}
                      ${active
                        ? 'bg-accent-subtle text-accent shadow-sm'
                        : 'text-muted hover:bg-elevated hover:text-foreground'
                      }
                    `}
                  >
                    <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-accent' : ''}`} />
                    {!isCollapsed && (
                      <>
                        {item.label}
                        {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent animate-pulse-glow" />}
                      </>
                    )}
                  </Link>
                </li>
              );
            })}

            {/* Admin-only: Usuários */}
            {isAdmin && (
              <li>
                <Link
                  href="/usuarios"
                  title={isCollapsed ? 'Usuários' : undefined}
                  className={`
                    flex items-center gap-3 rounded-lg text-sm font-medium
                    transition-all duration-200 cursor-pointer min-h-[44px]
                    ${isCollapsed ? 'justify-center px-0' : 'px-3'}
                    ${isActive('/usuarios')
                      ? 'bg-accent-subtle text-accent shadow-sm'
                      : 'text-muted hover:bg-elevated hover:text-foreground'
                    }
                  `}
                >
                  <UserCog className={`w-[18px] h-[18px] shrink-0 ${isActive('/usuarios') ? 'text-accent' : ''}`} />
                  {!isCollapsed && (
                    <>
                      Usuários
                      {isActive('/usuarios') && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent animate-pulse-glow" />}
                    </>
                  )}
                </Link>
              </li>
            )}
          </ul>
        </div>

        {/* Footer */}
        <div className="border-t border-border py-2 px-2 space-y-0.5 shrink-0">
          {!isCollapsed && user && (
            <div className="px-3 py-2 rounded-lg bg-elevated mb-1">
              <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
              <p className="text-[10px] text-subtle truncate">{user.email}</p>
              {isAdmin && (
                <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                  Admin
                </span>
              )}
            </div>
          )}

          {user ? (
            <button
              onClick={() => signOut()}
              title={isCollapsed ? 'Sair' : undefined}
              className={`flex items-center gap-3 w-full rounded-lg text-sm text-muted hover:bg-elevated hover:text-foreground transition-colors cursor-pointer min-h-[44px]
                ${isCollapsed ? 'justify-center px-0' : 'px-3'}`}
            >
              <LogOut className="w-[18px] h-[18px] shrink-0" />
              {!isCollapsed && <span>Sair</span>}
            </button>
          ) : (
            <button
              onClick={() => signIn('google')}
              title={isCollapsed ? 'Entrar com Google' : undefined}
              className={`flex items-center gap-3 w-full rounded-lg text-sm text-accent bg-accent/10 hover:bg-accent/20 transition-colors cursor-pointer font-medium min-h-[44px]
                ${isCollapsed ? 'justify-center px-0' : 'px-3'}`}
            >
              <LogIn className="w-[18px] h-[18px] shrink-0" />
              {!isCollapsed && <span>Entrar com Google</span>}
            </button>
          )}

          <button
            onClick={toggleTheme}
            title={isCollapsed ? (isDark ? 'Modo Claro' : 'Modo Escuro') : undefined}
            className={`flex items-center gap-3 w-full rounded-lg text-sm text-muted hover:bg-elevated transition-colors cursor-pointer min-h-[44px]
              ${isCollapsed ? 'justify-center px-0' : 'px-3'}`}
          >
            {isDark ? <Sun className="w-[18px] h-[18px] shrink-0" /> : <Moon className="w-[18px] h-[18px] shrink-0" />}
            {!isCollapsed && <span>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>}
          </button>
        </div>
      </nav>

      {/* ── Mobile bottom tab bar ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden no-print bg-card border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-stretch">
          {bottomTabItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors
                  ${active ? 'text-accent' : 'text-muted'}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
                {active && <div className="w-1 h-1 rounded-full bg-accent mt-0.5" />}
              </Link>
            );
          })}

          {/* Mais button */}
          <button
            onClick={() => setShowMais(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-muted transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">Mais</span>
          </button>
        </div>
      </nav>

      {/* ── "Mais" bottom sheet (mobile only) ── */}
      {showMais && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/60 md:hidden"
            onClick={() => setShowMais(false)}
          />
          {/* Sheet */}
          <div
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card rounded-t-2xl border-t border-border shadow-2xl"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-2">
              <span className="text-sm font-bold text-foreground">Menu</span>
              <button
                onClick={() => setShowMais(false)}
                className="w-11 h-11 flex items-center justify-center rounded-lg text-muted hover:bg-elevated cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nav items */}
            <div className="px-3 pb-2 space-y-0.5">
              {maisItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMais(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer min-h-[44px]
                      ${active ? 'bg-accent-subtle text-accent' : 'text-foreground hover:bg-elevated'}`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-accent' : 'text-muted'}`} />
                    {item.label}
                    <ChevronRight className="w-4 h-4 ml-auto text-subtle" />
                  </Link>
                );
              })}

              {/* Admin: Usuários */}
              {isAdmin && (
                <Link
                  href="/usuarios"
                  onClick={() => setShowMais(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer min-h-[44px]
                    ${isActive('/usuarios') ? 'bg-accent-subtle text-accent' : 'text-foreground hover:bg-elevated'}`}
                >
                  <UserCog className={`w-5 h-5 shrink-0 ${isActive('/usuarios') ? 'text-accent' : 'text-muted'}`} />
                  Usuários
                  <ChevronRight className="w-4 h-4 ml-auto text-subtle" />
                </Link>
              )}
            </div>

            <div className="border-t border-border mx-3 mb-2" />

            {/* User info + auth */}
            <div className="px-3 pb-2 space-y-0.5">
              {user && (
                <div className="px-3 py-2 rounded-xl bg-elevated mb-1 flex items-center gap-3">
                  {user.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.image} alt={user.name || ''} className="w-8 h-8 rounded-full shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
                    <p className="text-[10px] text-subtle truncate">{user.email}</p>
                  </div>
                  {isAdmin && (
                    <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-1.5 py-0.5 rounded shrink-0">
                      Admin
                    </span>
                  )}
                </div>
              )}

              <button
                onClick={toggleTheme}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm text-foreground hover:bg-elevated transition-colors cursor-pointer min-h-[44px]"
              >
                {isDark ? <Sun className="w-5 h-5 text-muted shrink-0" /> : <Moon className="w-5 h-5 text-muted shrink-0" />}
                {isDark ? 'Modo Claro' : 'Modo Escuro'}
              </button>

              {user ? (
                <button
                  onClick={() => { signOut(); setShowMais(false); }}
                  className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm text-muted hover:bg-elevated transition-colors cursor-pointer min-h-[44px]"
                >
                  <LogOut className="w-5 h-5 shrink-0" />
                  Sair da conta
                </button>
              ) : (
                <button
                  onClick={() => { signIn('google'); setShowMais(false); }}
                  className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm text-accent bg-accent/10 hover:bg-accent/20 transition-colors cursor-pointer font-medium min-h-[44px]"
                >
                  <LogIn className="w-5 h-5 shrink-0" />
                  Entrar com Google
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
