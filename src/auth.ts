import { PrismaAdapter } from '@auth/prisma-adapter'
import authConfig from '@/auth.config'
import { AccessRole } from '@/generated/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { prisma } from '@/lib/prisma'
import NextAuth from 'next-auth'

function assertGoogleAuthConfigured() {
  if (!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET) {
    throw new Error('Google OAuth is not configured. Set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET.')
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider !== 'google') return false
      assertGoogleAuthConfigured()

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
  },
})
