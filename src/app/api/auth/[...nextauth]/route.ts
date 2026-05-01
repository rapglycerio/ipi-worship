import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { getUserRole, upsertAppUser } from '@/lib/data';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (user.email) {
        // Registra ou atualiza o usuário na tabela app_users.
        // O role padrão é 'visitor'; promova manualmente via SQL no Supabase.
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
        // Busca o papel do usuário no primeiro login
        if (user.email) {
          const role = await getUserRole(user.email).catch(() => null);
          token.role = role ?? 'visitor';
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        if (token.sub) (session.user as any).id = token.sub;
        if (token.role) (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
