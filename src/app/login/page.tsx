import { auth } from '@/auth'
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

  return (
    <div className="max-w-xl mx-auto mt-20 rounded-lg p-8" style={{ backgroundColor: '#111118', border: '1px solid #1f2937' }}>
      <h1
        className="text-3xl font-bold tracking-widest uppercase text-center mb-4 arcane-glow"
        style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}
      >
        Arcane Codex Access
      </h1>
      <p className="text-center mb-8" style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}>
        Sign in with your approved Google account.
      </p>

      {accessDenied && (
        <p className="text-center mb-6" style={{ color: '#f87171', fontFamily: 'Georgia, serif' }}>
          This email is not authorized for access.
        </p>
      )}

      <a
        href="/api/auth/signin/google?callbackUrl=%2F"
        className="block w-full px-4 py-3 rounded border font-semibold uppercase tracking-wider transition-all duration-200 hover:text-purple-200 text-center"
        style={{ borderColor: '#7c3aed', color: '#e2e8f0', fontFamily: 'Georgia, serif' }}
      >
        Log in with Google
      </a>
    </div>
  )
}
