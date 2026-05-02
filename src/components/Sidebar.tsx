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
  Menu,
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
} from 'lucide-react';

const navItems = [
  { href: '/',          label: 'Playlist da Semana',  icon: ListMusic },
  { href: '/musicas',   label: 'Todas as Músicas',     icon: Library },
  { href: '/artistas',  label: 'Artistas',             icon: Users },
  { href: '/playlists', label: 'Playlists',            icon: Music },
  { href: '/analises',  label: 'Análises de Louvor',   icon: ClipboardCheck },
  { href: '/importar',  label: 'Importar Cifra',       icon: Upload },
];

const COLLAPSED_KEY = 'sidebar_collapsed';

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);       // mobile drawer
  const [isCollapsed, setIsCollapsed] = useState(false); // desktop icon-only
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(COLLAPSED_KEY);
    if (saved === 'true') {
      setIsCollapsed(true);
      document.documentElement.dataset.sidebar = 'collapsed';
    }
  }, []);

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
  const isAdmin = (user as { role?: string } | undefined)?.role === 'admin';

  return (
    <>
      {/* ── Mobile top bar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-strong flex items-center justify-between px-4 h-14 md:hidden no-print">
        <button onClick={() => setIsOpen(true)} className="touch-target" aria-label="Abrir menu">
          <Menu className="w-6 h-6 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center">
            <Music className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-foreground tracking-tight">IPI Imirim</span>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/busca" className="touch-target" aria-label="Buscar">
            <Search className="w-5 h-5 text-muted" />
          </Link>
          <button onClick={toggleTheme} className="touch-target" aria-label="Alternar tema">
            {isDark ? <Sun className="w-5 h-5 text-muted" /> : <Moon className="w-5 h-5 text-muted" />}
          </button>
        </div>
      </header>

      {/* ── Mobile overlay ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => setIsOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <nav
        className={`
          fixed top-0 left-0 z-50 h-full
          bg-card border-r border-border
          flex flex-col overflow-hidden
          transition-all duration-300 ease-out
          no-print
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          ${isCollapsed ? 'md:w-14' : 'md:w-[280px]'}
          w-[280px]
        `}
      >
        {/* Brand row */}
        <div className="flex items-center h-16 border-b border-border shrink-0 px-3 gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shadow-sm shrink-0">
            <Music className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-foreground tracking-tight leading-none truncate">IPI do Imirim</h1>
              <p className="text-[11px] text-muted mt-0.5">Louvor & Liturgia</p>
            </div>
          )}
          {/* Mobile: close drawer */}
          <button onClick={() => setIsOpen(false)} className="touch-target md:hidden ml-auto" aria-label="Fechar menu">
            <X className="w-5 h-5 text-muted" />
          </button>
          {/* Desktop: toggle collapse */}
          <button
            onClick={toggleCollapsed}
            className="hidden md:flex touch-target ml-auto"
            aria-label={isCollapsed ? 'Expandir menu' : 'Minimizar menu'}
            title={isCollapsed ? 'Expandir menu' : 'Minimizar menu'}
          >
            {isCollapsed
              ? <ChevronsRight className="w-4 h-4 text-muted hover:text-foreground transition-colors" />
              : <ChevronsLeft  className="w-4 h-4 text-muted hover:text-foreground transition-colors" />
            }
          </button>
        </div>

        {/* Search — only when expanded */}
        {!isCollapsed && (
          <div className="px-4 py-3">
            <Link
              href="/busca"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-elevated text-muted text-sm cursor-pointer hover:bg-border transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Search className="w-4 h-4 shrink-0" />
              <span>Buscar músicas...</span>
            </Link>
          </div>
        )}

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {!isCollapsed && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-subtle px-2 mb-2">Menu</p>
          )}
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    title={isCollapsed ? item.label : undefined}
                    className={`
                      flex items-center gap-3 rounded-lg text-sm font-medium
                      transition-all duration-200 cursor-pointer
                      ${isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}
                      ${isActive
                        ? 'bg-accent-subtle text-accent shadow-sm'
                        : 'text-muted hover:bg-elevated hover:text-foreground'}
                    `}
                  >
                    <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-accent' : ''}`} />
                    {!isCollapsed && (
                      <>
                        {item.label}
                        {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent animate-pulse-glow" />}
                      </>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer: Auth + Theme */}
        <div className="border-t border-border py-2 px-2 space-y-1 shrink-0">
          {/* User info — only expanded */}
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

          {/* Login / Logout */}
          {user ? (
            <button
              onClick={() => signOut()}
              title={isCollapsed ? 'Sair' : undefined}
              className={`flex items-center gap-3 w-full rounded-lg text-sm text-muted hover:bg-elevated hover:text-foreground transition-colors cursor-pointer
                ${isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}`}
            >
              <LogOut className="w-[18px] h-[18px] shrink-0" />
              {!isCollapsed && <span>Sair</span>}
            </button>
          ) : (
            <button
              onClick={() => signIn('google')}
              title={isCollapsed ? 'Entrar com Google' : undefined}
              className={`flex items-center gap-3 w-full rounded-lg text-sm text-accent bg-accent/10 hover:bg-accent/20 transition-colors cursor-pointer font-medium
                ${isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}`}
            >
              <LogIn className="w-[18px] h-[18px] shrink-0" />
              {!isCollapsed && <span>Entrar com Google</span>}
            </button>
          )}

          {/* Theme */}
          <button
            onClick={toggleTheme}
            title={isCollapsed ? (isDark ? 'Modo Claro' : 'Modo Escuro') : undefined}
            className={`flex items-center gap-3 w-full rounded-lg text-sm text-muted hover:bg-elevated transition-colors cursor-pointer
              ${isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}`}
          >
            {isDark
              ? <Sun  className="w-[18px] h-[18px] shrink-0" />
              : <Moon className="w-[18px] h-[18px] shrink-0" />}
            {!isCollapsed && <span>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>}
          </button>
        </div>
      </nav>
    </>
  );
}
