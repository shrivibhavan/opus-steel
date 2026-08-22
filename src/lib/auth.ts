import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { Role } from "@/types/enums";

// Ensure process.env.NEXTAUTH_URL defaults to the primary domain
if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = "https://app.opusengg.com";
}

const DEMO_USERS: Record<string, { id: string; name: string; email: string; role: Role }> = {
  "admin@opussteel.ae": { id: "seed-admin", name: "Admin User", email: "admin@opussteel.ae", role: "ADMIN" },
  "office@opussteel.ae": { id: "seed-office", name: "Fatima Al Mansoori", email: "office@opussteel.ae", role: "OFFICE" },
  "plant@opussteel.ae": { id: "seed-plant", name: "Suresh Kumar", email: "plant@opussteel.ae", role: "PRODUCTION" },
  "plantmanager@opussteel.ae": { id: "seed-pm", name: "Rakesh Nair", email: "plantmanager@opussteel.ae", role: "PLANT_MANAGER" },
  "store@opussteel.ae": { id: "seed-store", name: "Ali Hassan", email: "store@opussteel.ae", role: "STORE" },
  "qc@opussteel.ae": { id: "seed-qc", name: "Priya Menon", email: "qc@opussteel.ae", role: "QC" },
  "dispatch@opussteel.ae": { id: "seed-dispatch", name: "Omar Farouk", email: "dispatch@opussteel.ae", role: "DISPATCH" }
};

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const cleanEmail = credentials.email.toLowerCase().trim();

        // 1. Try database lookup first
        try {
          const user = await prisma.user.findUnique({
            where: { email: cleanEmail }
          });
          if (user && user.active) {
            const valid = await bcrypt.compare(credentials.password, user.passwordHash);
            if (valid) {
              return { id: user.id, name: user.name, email: user.email, role: user.role as Role };
            }
          }
        } catch (err) {
          console.warn("[Auth Notice] Database unavailable, attempting demo account login fallback...", err);
        }

        // 2. Instant demo presentation fallback
        if (DEMO_USERS[cleanEmail] && credentials.password === "demo1234") {
          return DEMO_USERS[cleanEmail];
        }

        return null;
      }
    })
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const parsed = new URL(url);
        if (parsed.hostname === "app.opusengg.com") return url;
      } catch {}
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET || "opus-steel-production-secret-key-2026"
};
