'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from '@/lib/actions'

export default function Login() {
  const [signup, setSignup] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const emailInput = useRef<HTMLInputElement>(null)
  const router = useRouter()

  return (
    <main className="portal-page min-h-screen [--role-accent:#2457d6]">
      <header className="portal-header">
        <div className="brand">
          <div className="brand-mark">N</div>
          <div>
            <strong>NyayaSetu</strong>
            <span>Justice intelligence network</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/?demo=true"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            Explore Role Dashboards
          </Link>
          <button
            type="button"
            className="primary-button shrink-0"
            disabled={busy}
            onClick={() => {
              setSignup(false)
              setError('')
              emailInput.current?.focus()
            }}
          >
            Sign In
          </button>
        </div>
      </header>

      <section className="portal-intro">
        <div className="eyebrow">INVESTIGATION COPILOT</div>
        <h1>
          One justice network.
          <br />
          <em>Role-based access.</em>
        </h1>
        <p>
          Select a role dashboard directly below to preview connected workflows, or use your
          registered credentials to log in.
        </p>
      </section>

      {/* Quick Role Switcher for SI, Advocate, SHO, Judge */}
      <section className="max-w-2xl mx-auto mb-8 px-4">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Direct Role Access (No Password Required)
            </span>
            <Link
              href="/?demo=true"
              className="text-xs font-medium text-blue-700 hover:text-blue-900 underline"
            >
              View all 8 roles &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/?role=io"
              className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-blue-200 hover:border-blue-500 hover:shadow-md transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
                👮‍♂️
              </div>
              <div>
                <strong className="block text-sm text-zinc-900 group-hover:text-blue-700">
                  SI / IO Dashboard
                </strong>
                <span className="text-xs text-zinc-600">
                  Sub-Inspector Arjun Singh · Case investigations, freeze notices & evidence
                </span>
              </div>
            </Link>

            <Link
              href="/?role=advocate"
              className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-amber-200 hover:border-amber-500 hover:shadow-md transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-700 text-white flex items-center justify-center font-bold text-lg shrink-0">
                ⚖️
              </div>
              <div>
                <strong className="block text-sm text-zinc-900 group-hover:text-amber-800">
                  Advocate Dashboard
                </strong>
                <span className="text-xs text-zinc-600">
                  Adv. Kabir Anand · Active court matters, bail filings & hearings
                </span>
              </div>
            </Link>

            <Link
              href="/?role=sho"
              className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-indigo-200 hover:border-indigo-500 hover:shadow-md transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-700 text-white flex items-center justify-center font-bold text-lg shrink-0">
                🏢
              </div>
              <div>
                <strong className="block text-sm text-zinc-900 group-hover:text-indigo-800">
                  SHO Dashboard
                </strong>
                <span className="text-xs text-zinc-600">
                  Inspector Meera Chauhan · Station command, officer workload & approvals
                </span>
              </div>
            </Link>

            <Link
              href="/?role=judge"
              className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-purple-200 hover:border-purple-500 hover:shadow-md transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-700 text-white flex items-center justify-center font-bold text-lg shrink-0">
                🏛️
              </div>
              <div>
                <strong className="block text-sm text-zinc-900 group-hover:text-purple-800">
                  Judicial Officer (Judge)
                </strong>
                <span className="text-xs text-zinc-600">
                  Hon. A. Verma · Daily cause list, case docket & court orders
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="panel mx-auto max-w-md">
        <div className="panel-heading">
          <h3>{signup ? 'Create a citizen account' : 'Sign in to NyayaSetu'}</h3>
        </div>
        <form
          className="workspace-form"
          onSubmit={async (event) => {
            event.preventDefault()
            setBusy(true)
            const data = new FormData(event.currentTarget)
            const result = await signIn(
              String(data.get('email')),
              String(data.get('password')),
              signup,
              String(data.get('name') || ''),
            )
            setBusy(false)
            if (result.error) setError(result.error)
            else router.refresh()
          }}
        >
          {signup && (
            <label>
              Full name
              <input required name="name" autoComplete="name" maxLength={100} />
            </label>
          )}
          <label>
            Email
            <input ref={emailInput} name="email" type="email" required autoComplete="username" />
          </label>
          <label>
            Password (min. 12 characters)
            <input
              name="password"
              type="password"
              required
              minLength={12}
              maxLength={128}
              placeholder="At least 12 characters"
              autoComplete={signup ? 'new-password' : 'current-password'}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <button type="submit" disabled={busy} className="primary-button">
            {busy ? 'Please wait…' : signup ? 'Create citizen account' : 'Sign In'}
          </button>
          <button
            type="button"
            className="back-link"
            disabled={busy}
            onClick={() => {
              setSignup(!signup)
              setError('')
            }}
          >
            {signup ? 'Already registered? Sign in' : 'Citizen? Create an account'}
          </button>
        </form>
      </section>
    </main>
  )
}
