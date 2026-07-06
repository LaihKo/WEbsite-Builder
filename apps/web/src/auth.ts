import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    Google({ allowDangerousEmailAccountLinking: true }),
    Facebook({ allowDangerousEmailAccountLinking: true }),
  ],
  callbacks: {
    session({ session, user }) {
      return { ...session, user: { ...session.user, id: user.id } };
    },
  },
});
