"use client"

import { useEffect, useState } from "react"

type SiteSettings = {
  homeHeroAnnouncement: string | null
}

type Props = {
  initialSettings: SiteSettings
}

type Toast = { tone: "success" | "error"; message: string }

const cardClass =
  "rounded-3xl border border-slate-200/70 dark:border-slate-800/60 bg-white/90 dark:bg-slate-950/80 p-6 shadow-2xl shadow-slate-200/60 dark:shadow-black/20"

export default function SiteSettingsManager({ initialSettings }: Props) {
  const [announcement, setAnnouncement] = useState(initialSettings.homeHeroAnnouncement ?? "")
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        homeHeroAnnouncement: announcement.trim() === "" ? null : announcement.trim(),
      }
      const response = await fetch("/api/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error ?? "Unable to save settings.")
      }
      setToast({ tone: "success", message: "Announcement updated." })
    } catch (error) {
      console.error(error)
      setToast({ tone: "error", message: (error as Error).message ?? "Unable to save settings." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cardClass}>
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">Home Hero</p>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Announcement text</h2>
        </div>
        {toast ? (
          <span
            className={`text-xs ${
              toast.tone === "error" ? "text-red-500" : "text-green-500"
            }`}
          >
            {toast.message}
          </span>
        ) : null}
      </header>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <label className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Announcement (max 200 chars)
          </label>
          <textarea
            className="mt-2 h-24 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
            value={announcement}
            onChange={(event) => setAnnouncement(event.target.value)}
            maxLength={200}
            placeholder="Example: Walk-in clinic open Saturday 9-2."
            disabled={saving}
          />
          <p className="mt-2 text-xs text-slate-500">
            Leave blank to hide the announcement.
          </p>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Saving..." : "Save announcement"}
          </button>
        </div>
      </div>
    </div>
  )
}
