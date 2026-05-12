'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  UserCog,
  Shield,
  ShieldOff,
  Loader2,
  Clock,
  Mail,
} from 'lucide-react';
import type { AppUserRecord } from '@/lib/data';

function timeAgo(dateStr: string): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}m atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d atrás`;
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

interface UserRowProps {
  user: AppUserRecord;
  currentUserId?: string;
  onToggleAdmin: (userId: string, makeAdmin: boolean) => Promise<void>;
}

function UserRow({ user, currentUserId, onToggleAdmin }: UserRowProps) {
  const [loading, setLoading] = useState(false);
  const isSelf = user.id === currentUserId;

  async function handleToggle() {
    if (isSelf || loading) return;
    setLoading(true);
    await onToggleAdmin(user.id, !user.isAdmin);
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-elevated transition-colors rounded-xl">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-elevated border border-border shrink-0 overflow-hidden flex items-center justify-center">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt={user.name || user.email} className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-bold text-muted">
            {(user.name || user.email).charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground truncate">
            {user.name || 'Sem nome'}
          </p>
          {user.isAdmin && (
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-1.5 py-0.5 rounded">
              Admin
            </span>
          )}
          {isSelf && (
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-subtle bg-elevated px-1.5 py-0.5 rounded border border-border">
              Você
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1 text-[10px] text-muted truncate">
            <Mail className="w-2.5 h-2.5 shrink-0" />
            {user.email}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-subtle shrink-0">
            <Clock className="w-2.5 h-2.5" />
            {timeAgo(user.lastSeen)}
          </span>
        </div>
      </div>

      {/* Toggle admin */}
      {!isSelf && (
        <button
          onClick={handleToggle}
          disabled={loading}
          title={user.isAdmin ? 'Remover admin' : 'Tornar admin'}
          className={`shrink-0 h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50
            ${user.isAdmin
              ? 'bg-danger/10 text-danger hover:bg-danger/20'
              : 'bg-accent/10 text-accent hover:bg-accent/20'
            }`}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : user.isAdmin ? (
            <><ShieldOff className="w-3.5 h-3.5" /><span className="hidden sm:inline">Remover</span></>
          ) : (
            <><Shield className="w-3.5 h-3.5" /><span className="hidden sm:inline">Admin</span></>
          )}
        </button>
      )}
    </div>
  );
}

export default function UsuariosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<AppUserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = (session?.user as any)?.isAdmin === true;
  const currentUserId = (session?.user as any)?.id;

  useEffect(() => {
    if (status === 'loading') return;
    if (!isAdmin) {
      router.replace('/');
      return;
    }
    loadUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isAdmin]);

  async function loadUsers() {
    setLoading(true);
    try {
      const { fetchAllUsers } = await import('@/lib/data');
      setUsers(await fetchAllUsers());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleAdmin(userId: string, makeAdmin: boolean) {
    const { setUserAdmin } = await import('@/lib/data');
    const ok = await setUserAdmin(userId, makeAdmin);
    if (ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isAdmin: makeAdmin, role: makeAdmin ? 'admin' : 'member' } : u))
      );
    }
  }

  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const admins = users.filter((u) => u.isAdmin);
  const members = users.filter((u) => !u.isAdmin);

  return (
    <div className="px-4 md:px-8 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
          <UserCog className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Usuários</h1>
          <p className="text-xs text-muted">{users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-accent animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Admins */}
          {admins.length > 0 && (
            <section>
              <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2 px-1">
                Administradores · {admins.length}
              </p>
              <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
                {admins.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    currentUserId={currentUserId}
                    onToggleAdmin={handleToggleAdmin}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Members */}
          {members.length > 0 && (
            <section>
              <p className="text-[10px] font-bold uppercase tracking-widest text-subtle mb-2 px-1">
                Membros · {members.length}
              </p>
              <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
                {members.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    currentUserId={currentUserId}
                    onToggleAdmin={handleToggleAdmin}
                  />
                ))}
              </div>
            </section>
          )}

          {users.length === 0 && (
            <p className="text-center text-sm text-subtle py-16">Nenhum usuário encontrado.</p>
          )}
        </div>
      )}
    </div>
  );
}
