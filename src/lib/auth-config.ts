import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/server/db';

declare module 'next-auth' {
  interface User {
    nodeId: string;
    orgRole: string;
  }
  interface Session {
    user: {
      nodeId: string;
      orgRole: string;
    };
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    nodeId: string;
    orgRole: string;
  }
}

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      credentials: {
        nodeId: { label: 'Node ID', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const nodeId = credentials?.nodeId as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!nodeId || !password) return null;
        if (nodeId.length < 4 || nodeId.length > 30) return null;

        const rows = await sql`
          SELECT node_id, password_hash, org_role, status
          FROM users
          WHERE node_id = ${nodeId}
        `;

        if (rows.length === 0) return null;

        const user = rows[0];
        if (user.status !== 'ACTIVE') return null;

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) return null;

        return {
          id: user.node_id,
          nodeId: user.node_id,
          orgRole: user.org_role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.nodeId = user.nodeId;
        token.orgRole = user.orgRole;
      }
      return token;
    },
    session({ session, token }) {
      session.user.nodeId = token.nodeId;
      session.user.orgRole = token.orgRole;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
};
