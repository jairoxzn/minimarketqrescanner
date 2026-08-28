import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getRateLimitStatus, recordAttempt, resetRateLimit, formatRetryAfter } from "@/lib/rateLimit";

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutos

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días — "mantener sesión" (PRD 6.1)
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Correo electrónico", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Correo y contraseña son obligatorios");
        }

        const email = credentials.email.toLowerCase().trim();
        const rateLimitKey = `login:${email}`;

        // Protección contra fuerza bruta (PRD §29 "Rate limiting") — se
        // revisa ANTES de tocar la base de datos, por email normalizado.
        const preCheck = getRateLimitStatus(rateLimitKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
        if (preCheck.limited) {
          throw new Error(
            `Demasiados intentos fallidos. Intenta de nuevo en ${formatRetryAfter(preCheck.retryAfterMs)}.`
          );
        }

        const user = await prisma.user.findUnique({ where: { email } });

        const passwordValid = user && user.active && (await bcrypt.compare(credentials.password, user.passwordHash));

        if (!passwordValid) {
          const result = recordAttempt(rateLimitKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
          if (result.limited) {
            throw new Error(
              `Demasiados intentos fallidos. Intenta de nuevo en ${formatRetryAfter(result.retryAfterMs)}.`
            );
          }
          throw new Error("Credenciales inválidas");
        }

        resetRateLimit(rateLimitKey);

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          businessId: user.businessId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.businessId = user.businessId;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "VENDEDOR" | "CAJERO";
        session.user.businessId = token.businessId as string;
      }
      return session;
    },
  },
};
