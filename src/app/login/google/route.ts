import { signIn } from '@/auth'

/**
 * Start Google OAuth through a stable route rather than an inline Server Action.
 *
 * Server Action identifiers change between builds. A browser, proxy, or second
 * application replica serving HTML from another build can therefore submit an
 * obsolete identifier immediately after a deployment. A normal GET route has no
 * build-specific identifier and is safe to bookmark or revisit after a rebuild.
 */
export async function GET() {
  return signIn('google', { redirectTo: '/' })
}
