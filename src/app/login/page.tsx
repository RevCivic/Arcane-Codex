import { auth } from '@/auth'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const session = await auth()
  if (session?.user) {
    redirect('/')
  }

  const params = await searchParams
  const accessDenied = params.error === 'AccessDenied'
  const authError = params.error === 'UnknownAction'

  return (
    <div className="max-w-xl mx-auto mt-20 rounded-lg p-8" style={{ backgroundColor: '#111118', border: '1px solid #2a2a3e' }}>
      <h1
        className="text-3xl font-bold tracking-widest uppercase text-center mb-4 arcane-glow"
        style={{ color: '#8b5cf6' }}
      >
        Arcane Codex Access
      </h1>
      <p className="text-center mb-8" style={{ color: '#9ca3af' }}>
        Sign in with your approved Google account.
      </p>

      {accessDenied && (
        <p className="text-center mb-6" style={{ color: '#f87171' }}>
          This email is not authorized for access.
        </p>
      )}

      {authError && (
        <p className="text-center mb-6" style={{ color: '#f87171' }}>
          Authentication routing error occurred. Use the sign-in button below.
        </p>
      )}

      <form action="/login/google" method="get">
        <button
          type="submit"
          className="block w-full px-4 py-3 rounded border font-semibold uppercase tracking-wider transition-all duration-200 hover:text-purple-200 text-center"
          style={{ borderColor: '#7c3aed', color: '#e8eef7' }}
        >
          Log in with Google
        </button>
      </form>

      <p className="text-center mt-6 text-xs" style={{ color: '#a0a9b8' }}>
        Having trouble? Use{' '}
        <Link href="/api/auth/signin" className="underline hover:text-gray-300">
          Auth.js sign-in
        </Link>{' '}
        to inspect available providers.
      </p>
    </div>
  )
}
