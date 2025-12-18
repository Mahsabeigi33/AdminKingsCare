"use client"
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

type User = {
  id: string
  email: string
  name: string | null
  role: 'ADMIN' | 'STAFF'
  createdAt?: Date | string
}

type Props = {
  initialUsers: User[]
}

type FormState = {
  email: string
  name: string
  role: User['role']
  password: string
}

const cardClass = 'rounded-3xl border border-slate-200/70 dark:border-slate-800/60 bg-white/90 dark:bg-slate-950/80 p-6 shadow-2xl shadow-slate-200/60 dark:shadow-black/20'

export default function UsersManager({ initialUsers }: Props) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({ email: '', name: '', role: 'STAFF', password: '' })

  const adminCount = useMemo(() => users.filter((user) => user.role === 'ADMIN').length, [users])

  const handleChange = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.email.trim() || !form.password) {
      setMessage('Email and password are required.')
      return
    }
    setSubmitting(true)
    setMessage(null)
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          name: form.name.trim() || undefined,
          role: form.role,
          password: form.password,
        }),
      })
      if (!response.ok) throw new Error('Failed to create user')
      const created: User = await response.json()
      setUsers((prev) => [created, ...prev])
      setForm({ email: '', name: '', role: 'STAFF', password: '' })
      setMessage('User created. Share credentials securely.')
      router.refresh()
    } catch (error) {
      console.error(error)
      setMessage('Unable to create user.')
    } finally {
      setSubmitting(false)
    }
  }

  const updateRole = async (id: string, role: User['role']) => {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (!response.ok) throw new Error('Failed to update role')
      const updated: User = await response.json()
      setUsers((prev) => prev.map((user) => (user.id === id ? updated : user)))
      router.refresh()
    } catch (error) {
      console.error(error)
      setMessage('Unable to update role.')
    } finally {
      setSubmitting(false)
    }
  }

  const resetPassword = async (id: string, email: string) => {
    const nextPassword = window.prompt(`Set a new password for ${email}`)
    if (!nextPassword) return
    if (nextPassword.length < 6) {
      setMessage('Password must be at least 6 characters.')
      return
    }
    setSubmitting(true)
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: nextPassword }),
      })
      if (!response.ok) throw new Error('Failed to update password')
      setMessage('Password updated.')
    } catch (error) {
      console.error(error)
      setMessage('Unable to reset password.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (user: User) => {
    if (user.role === 'ADMIN' && adminCount <= 1) {
      setMessage('At least one admin must remain.')
      return
    }
    if (!window.confirm(`Remove ${user.email}?`)) return
    setSubmitting(true)
    try {
      const response = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete user')
      setUsers((prev) => prev.filter((item) => item.id !== user.id))
      router.refresh()
    } catch (error) {
      console.error(error)
      setMessage('Unable to delete user.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className={cardClass}>
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">Invite User</p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Create credentials</h2>
          </div>
          {message && <span className="text-xs text-indigo-500 dark:text-indigo-300">{message}</span>}
        </header>
        <form onSubmit={handleCreate} className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Email</label>
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              value={form.email}
              onChange={(event) => handleChange('email', event.target.value)}
              placeholder="user@kingscare.ca"
              required
              disabled={submitting}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Name</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              value={form.name}
              onChange={(event) => handleChange('name', event.target.value)}
              placeholder="Full name"
              disabled={submitting}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Role</label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              value={form.role}
              onChange={(event) => handleChange('role', event.target.value as User['role'])}
              disabled={submitting}
            >
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Temporary password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              value={form.password}
              onChange={(event) => handleChange('password', event.target.value)}
              placeholder="At least 6 characters"
              required
              disabled={submitting}
            />
          </div>
          <div className="lg:col-span-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Saving...' : 'Create User'}
            </button>
          </div>
        </form>
      </section>

      <section className={cardClass}>
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">Roster</p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Current access</h2>
          </div>
          <span className="text-xs text-slate-500">{users.length} users</span>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-slate-600 dark:text-slate-300">
            <thead className="text-xs uppercase tracking-[0.3em] text-slate-500">
              <tr className="border-b border-slate-200/70 dark:border-slate-800/60">
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-center">Role</th>
                <th className="px-3 py-2 text-center">Joined</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-200/60 dark:border-slate-800/40 last:border-b-0">
                  <td className="px-3 py-3 text-slate-900 dark:text-slate-100">{user.name ?? "--"}</td>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{user.email}</td>
                  <td className="px-3 py-3 text-center">
                    <select
                      className="rounded-full border border-indigo-400/40 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100 focus:border-indigo-400 focus:outline-none"
                      value={user.role}
                      onChange={(event) => updateRole(user.id, event.target.value as User['role'])}
                      disabled={submitting}
                    >
                      <option value="STAFF">Staff</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td className="px-3 py-3 text-center text-slate-500 dark:text-slate-400">
                    {user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "--"}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex justify-end gap-2 text-xs">
                      <button
                        type="button"
                        className="rounded-full border border-slate-300 dark:border-slate-700 px-3 py-1 text-slate-700 dark:text-slate-200 transition hover:border-indigo-500 hover:text-white"
                        onClick={() => resetPassword(user.id, user.email)}
                        disabled={submitting}
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-rose-500/60 px-3 py-1 text-rose-300 transition hover:bg-rose-500/10"
                        onClick={() => handleDelete(user)}
                        disabled={submitting}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}



