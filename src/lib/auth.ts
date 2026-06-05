import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { getUserRole, upsertAppUser } from '@/lib/data-admin';

/**
 * Shared NextAuth configuration. Lives here (not inline in the route) so that
 * API route handlers can `getServerSession(authOptions)` to authorize requests.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (user.email) {
        // Registra/atualiza o usuário (via service_role; app_users é só-leitura p/ anon).
        await upsertAppUser({
          email: user.email,
          displayName: user.name ?? user.email.split('@')[0],
          photoUrl: user.image ?? undefined,
        }).catch(() => {
          // Não bloqueia o login se o Supabase estiver fora do ar
        });
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        if (user.email) {
          const role = await getUserRole(user.email).catch(() => null);
          token.role = role ?? 'visitor';
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        if (token.sub) (session.user as { id?: string }).id = token.sub as string;
        if (token.role) (session.user as { role?: string }).role = token.role as string;
        (session.user as { isAdmin?: boolean }).isAdmin = token.role === 'admin';
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
