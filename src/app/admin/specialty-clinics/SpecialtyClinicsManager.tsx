"use client"

import { useEffect, useMemo, useState } from "react"
import type { ChangeEvent, FormEvent } from "react"
import Snackbar from "@mui/material/Snackbar"
import Alert from "@mui/material/Alert"
import EditorJsEditor from "@/components/EditorJsEditor"

type SpecialtyClinic = {
  id: string
  title: string
  name: string
  description: string
  image: string
  createdAt?: string
  updatedAt?: string
}

type Props = {
  initialClinics: SpecialtyClinic[]
}

type FormState = {
  title: string
  name: string
  description: string
  image: string
}

type ToastState = {
  message: string
  severity: "success" | "error"
}

const cardClass =
  "rounded-3xl border border-slate-200/70 dark:border-slate-800/60 bg-white/90 dark:bg-slate-950/80 p-6 shadow-2xl shadow-slate-200/60 dark:shadow-black/20"
const stripHtml = (value: string) =>
  value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
const safeParse = (value: string) => {
  if (!value) return null
  const trimmed = value.trim()
  const tryParse = (input: string) => {
    try {
      return JSON.parse(input)
    } catch {
      return null
    }
  }
  const cleaned = trimmed.replace(/\\+$/, "")
  const parsed = tryParse(trimmed) ?? tryParse(cleaned)
  if (typeof parsed === "string") {
    const nested = tryParse(parsed) ?? tryParse(parsed.replace(/\\+$/, ""))
    return nested ?? parsed
  }
  return parsed
}
const plainTextFromEditor = (value: string) => {
  const parsed = safeParse(value)
  if (!parsed || !Array.isArray(parsed.blocks)) {
    return stripHtml(value)
  }
  const text = parsed.blocks
    .map((block: { data?: { text?: string; items?: string[] } }) => {
      if (block?.data?.text) return stripHtml(String(block.data.text))
      if (Array.isArray(block?.data?.items)) {
        return block.data.items.map((item) => stripHtml(String(item))).join(" ")
      }
      return ""
    })
    .join(" ")
  return stripHtml(text)
}

const emptyForm: FormState = {
  title: "",
  name: "",
  description: "",
  image: "",
}

async function uploadImage(file: File): Promise<string | null> {
  const formData = new FormData()
  formData.append("file", file)
  const response = await fetch("/api/uploads", { method: "POST", body: formData })
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.error ?? "Unable to upload image")
  }
  const payload = (await response.json()) as { url?: string }
  return payload?.url ?? null
}

export default function SpecialtyClinicsManager({ initialClinics }: Props) {
  const [clinics, setClinics] = useState<SpecialtyClinic[]>(initialClinics)
  const [form, setForm] = useState<FormState>({ ...emptyForm })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formResetKey, setFormResetKey] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const isEditing = Boolean(editingId)
  const editingClinic = useMemo(
    () => (isEditing ? clinics.find((clinic) => clinic.id === editingId) ?? null : null),
    [clinics, editingId, isEditing],
  )

  const showToast = (severity: ToastState["severity"], message: string) =>
    setToast({ severity, message })

  const resetForm = () => {
    setForm({ ...emptyForm })
    setEditingId(null)
    setFormResetKey((prev) => prev + 1)
  }

  const startEditing = (clinic: SpecialtyClinic) => {
    setEditingId(clinic.id)
    setForm({
      title: clinic.title ?? "",
      name: clinic.name ?? "",
      description: clinic.description ?? "",
      image: clinic.image ?? "",
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file)
      if (url) {
        setForm((prev) => ({ ...prev, image: url }))
        showToast("success", "Image uploaded.")
      }
    } catch (error) {
      console.error(error)
      showToast("error", (error as Error).message ?? "Unable to upload image.")
    } finally {
      setUploading(false)
      event.target.value = ""
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedDescription = plainTextFromEditor(form.description)
    if (!form.title.trim() || !form.name.trim() || !trimmedDescription) {
      showToast("error", "Title, name, and description are required.")
      return
    }
    if (!form.image.trim()) {
      showToast("error", "Please upload an image.")
      return
    }
    setSubmitting(true)
    const payload = {
      title: form.title.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      image: form.image.trim(),
    }

    try {
      const endpoint = isEditing && editingId ? `/api/specialty-clinics/${editingId}` : "/api/specialty-clinics"
      const method = isEditing ? "PATCH" : "POST"
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = (await response.json()) as SpecialtyClinic | { error?: string }
      if (!response.ok) {
        throw new Error((data as { error?: string }).error ?? "Unable to save specialty clinic.")
      }
      if (isEditing) {
        setClinics((prev) => prev.map((item) => (item.id === editingId ? (data as SpecialtyClinic) : item)))
        showToast("success", "Specialty clinic updated.")
      } else {
        setClinics((prev) => [data as SpecialtyClinic, ...prev])
        showToast("success", "Specialty clinic created.")
      }
      resetForm()
    } catch (error) {
      console.error(error)
      showToast("error", (error as Error).message ?? "Unable to save specialty clinic.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (clinic: SpecialtyClinic) => {
    const confirmed = window.confirm(`Delete "${clinic.title}"?`)
    if (!confirmed) return
    try {
      const response = await fetch(`/api/specialty-clinics/${clinic.id}`, { method: "DELETE" })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? "Unable to delete specialty clinic.")
      }
      setClinics((prev) => prev.filter((item) => item.id !== clinic.id))
      showToast("success", "Specialty clinic deleted.")
      if (editingId === clinic.id) {
        resetForm()
      }
    } catch (error) {
      console.error(error)
      showToast("error", (error as Error).message ?? "Unable to delete specialty clinic.")
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <form onSubmit={handleSubmit} className={`${cardClass} space-y-5`}>
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">Specialty Clinic</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
            {isEditing ? "Edit clinic" : "Add clinic"}
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Manage specialty clinic cards shown on the public site.
          </p>
        </div>
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Title
            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              className="rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white placeholder:text-slate-400"
              placeholder="ENT Clinic"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Name
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white placeholder:text-slate-400"
              placeholder="Nasal and Sinus Care"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Description
            <EditorJsEditor
              key={`specialty-editor-${formResetKey}`}
              value={form.description}
              onChange={(value) => setForm((prev) => ({ ...prev, description: value }))}
              placeholder="Describe the specialty clinic offering."
              minHeightClass="min-h-[200px]"
            />
          </label>
        </div>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-slate-200">Image</span>
            <label className="cursor-pointer rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60">
              {uploading ? "Uploading..." : "Upload"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploading || submitting}
              />
            </label>
          </div>
          {form.image ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
              <img src={form.image} alt="Specialty clinic preview" className="h-56 w-full object-cover" />
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, image: "" }))}
                className="w-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                disabled={uploading || submitting}
              >
                Remove image
              </button>
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-500">Upload a hero image for the specialty card.</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded-full bg-indigo-600 px-6 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={submitting || uploading}
          >
            {submitting ? "Saving..." : isEditing ? "Update clinic" : "Create clinic"}
          </button>
          {isEditing ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full border border-slate-200 px-6 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:text-white"
              disabled={submitting || uploading}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="space-y-4">
        <div className={`${cardClass}`}>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Existing specialty clinics</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Click edit to update a card or delete it.
          </p>
        </div>
        {clinics.length === 0 ? (
          <div className={`${cardClass} text-sm text-slate-500 dark:text-slate-400`}>
            No specialty clinics yet. Add your first one on the left.
          </div>
        ) : (
          clinics.map((clinic) => (
            <div key={clinic.id} className={`${cardClass} space-y-4`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">{clinic.name}</p>
                  <h4 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{clinic.title}</h4>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEditing(clinic)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(clinic)}
                    className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-500 transition hover:border-rose-300 hover:text-rose-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {plainTextFromEditor(clinic.description)}
              </p>
              {clinic.image ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                  <img src={clinic.image} alt={clinic.title} className="h-48 w-full object-cover" />
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      {toast ? (
        <Snackbar open autoHideDuration={4000} onClose={() => setToast(null)}>
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>
            {toast.message}
          </Alert>
        </Snackbar>
      ) : null}
    </div>
  )
}
