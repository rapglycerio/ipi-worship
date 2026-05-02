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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Playlist da Semana', icon: ListMusic },
  { href: '/musicas', label: 'Todas as Músicas', icon: Library },
  { href: '/artistas', label: 'Artistas', icon: Users },
  { href: '/playlists', label: 'Playlists', icon: Music },
  { href: '/analises', label: 'Análises de Louvor', icon: ClipboardCheck },
  { href: '/importar', label: 'Importar Cifra', icon: Upload },
];

const COLLAPSED_KEY = 'sidebar_collapsed';

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Load collapsed preference from localStorage
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
  const userRole = (user as { role?: string } | undefined)?.role;
  const isAdmin = userRole === 'admin';

  return (
    <>
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-strong flex items-center justify-between px-4 h-14 md:hidden no-print">
        <button
          onClick={() => setIsOpen(true)}
          className="touch-target"
          aria-label="Abrir menu"
        >
          <Menu className="w-6 h-6 text-foreground" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center">
            <Music className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-foreground tracking-tight">
            IPI Imirim
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Link href="/busca" className="touch-target" aria-label="Buscar">
            <Search className="w-5 h-5 text-muted" />
          </Link>
          <button
            onClick={toggleTheme}
            className="touch-target"
            aria-label="Alternar tema"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-muted" />
            ) : (
              <Moon className="w-5 h-5 text-muted" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`
          fixed top-0 left-0 z-50 h-full w-[280px]
          bg-card border-r border-border
          flex flex-col
          transition-transform duration-300 ease-out
          md:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isCollapsed ? 'md:-translate-x-full' : 'md:translate-x-0'}
          no-print
        `}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shadow-sm">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground tracking-tight leading-none">
                IPI do Imirim
              </h1>
              <p className="text-[11px] text-muted mt-0.5">Louvor & Liturgia</p>
            </div>
          </div>
          {/* Mobile close / Desktop collapse */}
          <button
            onClick={() => { setIsOpen(false); }}
            className="touch-target md:hidden"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
          <button
            onClick={toggleCollapsed}
            className="hidden md:flex touch-target"
            aria-label="Recolher sidebar"
          >
            <ChevronLeft className="w-5 h-5 text-muted hover:text-foreground transition-colors" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <Link
            href="/busca"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-elevated text-muted text-sm cursor-pointer hover:bg-border transition-colors duration-200"
            onClick={() => setIsOpen(false)}
          >
            <Search className="w-4 h-4" />
            <span>Buscar músicas...</span>
          </Link>
        </div>

        {/* Nav Items */}
        <div className="flex-1 overflow-y-auto px-3 py-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-subtle px-3 mb-2">
            Menu
          </p>
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                      transition-all duration-200 cursor-pointer
                      ${
                        isActive
                          ? 'bg-accent-subtle text-accent shadow-sm'
                          : 'text-muted hover:bg-elevated hover:text-foreground'
                      }
                    `}
                  >
                    <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-accent' : ''}`} />
                    {item.label}
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent animate-pulse-glow" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer: Auth + Theme */}
        <div className="px-4 py-3 border-t border-border space-y-1">
          {user ? (
            <div className="px-3 py-2.5 rounded-lg bg-elevated mb-1">
              <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
              <p className="text-[10px] text-subtle truncate">{user.email}</p>
              {isAdmin && (
                <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                  Admin
                </span>
              )}
            </div>
          ) : null}

          {user ? (
            <button
              onClick={() => signOut()}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted hover:bg-elevated hover:text-foreground transition-colors duration-200 cursor-pointer"
            >
              <LogOut className="w-[18px] h-[18px]" />
              <span>Sair</span>
            </button>
          ) : (
            <button
              onClick={() => signIn('google')}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-accent bg-accent/10 hover:bg-accent/20 transition-colors duration-200 cursor-pointer font-medium"
            >
              <LogIn className="w-[18px] h-[18px]" />
              <span>Entrar com Google</span>
            </button>
          )}

          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted hover:bg-elevated transition-colors duration-200 cursor-pointer"
          >
            {isDark ? (
              <>
                <Sun className="w-[18px] h-[18px]" />
                <span>Modo Claro</span>
              </>
            ) : (
              <>
                <Moon className="w-[18px] h-[18px]" />
                <span>Modo Escuro</span>
              </>
            )}
          </button>
        </div>
      </nav>

      {/* Desktop re-open tab (visible only when collapsed) */}
      {isCollapsed && (
        <button
          onClick={toggleCollapsed}
          className="hidden md:flex fixed top-4 left-0 z-40 items-center justify-center w-7 h-10 bg-card border border-l-0 border-border rounded-r-lg shadow-md text-muted hover:text-accent transition-colors cursor-pointer no-print"
          aria-label="Expandir sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </>
  );
}
