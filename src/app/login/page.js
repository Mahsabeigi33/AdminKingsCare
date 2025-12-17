"use client"
import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"

const INVALID_CREDENTIALS_MSG = "Invalid credentials"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const onSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    })
    setSubmitting(false)
    if (res?.error) return setError(INVALID_CREDENTIALS_MSG)
    router.push("/admin/dashboard")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-900">
      <div className="w-full max-w-4xl shadow-2xl rounded-3xl overflow-hidden bg-white lg:grid lg:grid-cols-[1.1fr_1fr]">
        <div className="hidden lg:flex flex-col gap-6 justify-between bg-gradient-to-br from-[#0E2A47] via-[#0E2A47]/80 to-[#D9C89E] p-10 text-white">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-purple-200">Welcome </p>
            <h1 className="mt-6 text-3xl font-semibold leading-tight">
              KingsCare Medical Clinic 
            </h1>
            <p className="mt-4 text-sm text-indigo-100">
              Manage services, patients, inventory and analytics in a single dashboard.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-indigo-100">
            <span className="h-px flex-1 bg-indigo-200/40" />
             Admin Panel
            <span className="h-px flex-1 bg-indigo-200/40" />
          </div>
        </div>
        <div className="p-8 sm:p-12">
          <div className="mb-10">
            <p className="text-sm font-medium text-indigo-600"> Admin</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900">Sign in to manage</h2>
            <p className="mt-2 text-sm text-slate-500">
              Enter your credentials to access the KingsCare Medical Clinic admin dashboard.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
                placeholder="jane@pharmacylyfe.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </label>
               
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
                placeholder="********"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {error && (
              <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[#0E2A47]/95 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-[#D9C89E] hover:text-[#0E2A47] focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            By signing in you accept  terms and conditions.
          </p>
        </div>
      </div>
    </div>
  )
}
