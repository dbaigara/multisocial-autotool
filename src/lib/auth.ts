import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Укажите email и пароль");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: {
            memberships: {
              include: { workspace: true },
            },
          },
        });

        if (!user || !user.passwordHash) {
          throw new Error("Неверный email или пароль");
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          throw new Error("Неверный email или пароль");
        }

        // Default workspace is the first membership or null
        const defaultWorkspace = user.memberships[0]?.workspaceId || null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          workspaceId: defaultWorkspace,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.workspaceId = (user as any).workspaceId;
      }
      if (trigger === "update" && session?.workspaceId) {
        token.workspaceId = session.workspaceId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).workspaceId = token.workspaceId;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "multisocial-secret-development-key-default",
};
