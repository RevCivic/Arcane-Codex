import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'

const authConfig: NextAuthConfig = {
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
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname
      if (path.startsWith('/api/auth') || path.startsWith('/login')) {
        return true
      }

      return !!auth?.user
    },
  },
}

export default authConfig
