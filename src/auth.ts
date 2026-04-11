import { PrismaAdapter } from '@auth/prisma-adapter'
import { AccessRole } from '@/generated/prisma'
import { prisma } from '@/lib/prisma'
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? null
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'google') return false

      const email = normalizeEmail(user.email)
      if (!email) return false

      const allowed = await prisma.allowedEmail.findUnique({ where: { email } })
      return !!allowed
    },
    async session({ session }) {
      const email = normalizeEmail(session.user?.email)
      if (!email || !session.user) return session

      const allowed = await prisma.allowedEmail.findUnique({ where: { email } })
      session.user.role = allowed?.role ?? AccessRole.USER
      return session
    },
    async authorized({ auth, request }) {
      const path = request.nextUrl.pathname
      if (path.startsWith('/api/auth') || path.startsWith('/login')) {
        return true
      }

      const email = normalizeEmail(auth?.user?.email)
      if (!email) return false

      const allowed = await prisma.allowedEmail.findUnique({ where: { email } })
      return !!allowed
    },
  },
})
