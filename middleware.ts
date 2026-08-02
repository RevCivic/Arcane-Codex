import NextAuth from 'next-auth'
import authConfig from '@/auth.config'

export const { auth: middleware } = NextAuth(authConfig)

export const config = {
  // Exclude Next.js internals, static assets, and the uploads directory so that
  // locally-hosted character/place images are served directly without going
  // through the authentication middleware.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads/).*)'],
}
