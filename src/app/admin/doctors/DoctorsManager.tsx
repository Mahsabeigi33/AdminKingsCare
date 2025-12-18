"use client"
import { useEffect, useMemo, useState } from "react"
import type { ChangeEvent, FormEvent } from "react"
import { useRouter } from "next/navigation"

type Doctor = {
  id: string
  fullName: string
  title?: string | null
  specialty?: string | null
  shortBio?: string | null
  bio?: string | null
  email?: string | null
  phone?: string | null
  yearsExperience?: number | null
  languages?: string[]
  photoUrl?: string | null
  gallery?: string[]
  active: boolean
  featured: boolean
  createdAt?: string
  updatedAt?: string
}

type Props = {
  initialDoctors: Doctor[]
}

type Toast = { tone: "success" | "error" | "info"; message: string }

type FormState = {
  fullName: string
  title: string
  specialty: string
  shortBio: string
  bio: string
  email: string
  phone: string
  yearsExperience: string
  languages: string
  photoUrl: string
  gallery: string[]
  active: boolean
  featured: boolean
}

const cardClass =
  "rounded-3xl border border-slate-200/70 dark:border-slate-800/60 bg-white/90 dark:bg-slate-950/80 p-6 shadow-2xl shadow-slate-200/60 dark:shadow-black/20"

const emptyForm: FormState = {
  fullName: "",
  title: "",
  specialty: "",
  shortBio: "",
  bio: "",
  email: "",
  phone: "",
  yearsExperience: "",
  languages: "",
  photoUrl: "",
  gallery: [],
  active: true,
  featured: false,
}

const parseLanguages = (value: string) => {
  const seen = new Set<string>()
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && !seen.has(item) && !!seen.add(item))
}

async function uploadFiles(files: File[]): Promise<string[]> {
  const uploaded: string[] = []
  for (const file of files) {
    const formData = new FormData()
    formData.append("file", file)
    const response = await fetch("/api/uploads", { method: "POST", body: formData })
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new Error(payload?.error ?? "Unable to upload file")
    }
    const payload = (await response.json()) as { url?: string }
    if (payload?.url) {
      uploaded.push(payload.url)
    }
  }
  return uploaded
}

export default function DoctorsManager({ initialDoctors }: Props) {
  const router = useRouter()
  const [doctors, setDoctors] = useState(initialDoctors)
  const [form, setForm] = useState<FormState>({ ...emptyForm })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const isEditing = Boolean(editingId)
  const editingDoctor = useMemo(
    () => (isEditing ? doctors.find((item) => item.id === editingId) ?? null : null),
    [doctors, editingId, isEditing],
  )

  const handleChange = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const resetForm = () => {
    setForm({ ...emptyForm })
    setEditingId(null)
  }

  const showToast = (tone: Toast["tone"], message: string) => setToast({ tone, message })

  const startEditing = (doctor: Doctor) => {
    setEditingId(doctor.id)
    setForm({
      fullName: doctor.fullName ?? "",
      title: doctor.title ?? "",
      specialty: doctor.specialty ?? "",
      shortBio: doctor.shortBio ?? "",
      bio: doctor.bio ?? "",
      email: doctor.email ?? "",
      phone: doctor.phone ?? "",
      yearsExperience:
        typeof doctor.yearsExperience === "number" ? String(doctor.yearsExperience) : "",
      languages: (doctor.languages ?? []).join(", "),
      photoUrl: doctor.photoUrl ?? "",
      gallery: doctor.gallery ?? [],
      active: doctor.active,
      featured: doctor.featured,
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleUploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const [url] = await uploadFiles([file])
      if (url) {
        setForm((prev) => ({ ...prev, photoUrl: url }))
        showToast("success", "Profile photo uploaded.")
      }
    } catch (error) {
      console.error(error)
      showToast("error", (error as Error).message ?? "Unable to upload photo.")
    } finally {
      setUploading(false)
      event.target.value = ""
    }
  }

  const handleUploadGallery = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : []
    if (!files.length) return
    setUploading(true)
    try {
      const urls = await uploadFiles(files)
      setForm((prev) => ({
        ...prev,
        gallery: [...prev.gallery, ...urls.filter((url) => !prev.gallery.includes(url))],
      }))
      showToast("success", `Uploaded ${urls.length} image${urls.length > 1 ? "s" : ""}.`)
    } catch (error) {
      console.error(error)
      showToast("error", (error as Error).message ?? "Unable to upload images.")
    } finally {
      setUploading(false)
      event.target.value = ""
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.fullName.trim()) {
      showToast("error", "Full name is required.")
      return
    }
    setSubmitting(true)
    const languages = parseLanguages(form.languages)
    const experienceValue = form.yearsExperience.trim()
    const years = experienceValue ? Number(experienceValue) : null
    const payload = {
      fullName: form.fullName.trim(),
      title: form.title.trim() || null,
      specialty: form.specialty.trim() || null,
      shortBio: form.shortBio.trim() || null,
      bio: form.bio.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      yearsExperience: Number.isFinite(years) ? years : null,
      languages,
      photoUrl: form.photoUrl.trim() || null,
      gallery: form.gallery,
      active: form.active,
      featured: form.featured,
    }

    try {
      const method = isEditing ? "PUT" : "POST"
      const endpoint = isEditing && editingId ? `/api/doctors/${editingId}` : "/api/doctors"
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        const message =
          data && typeof data.error === "string" ? data.error : "Unable to save doctor profile."
        showToast("error", message)
        return
      }

      const savedDoctor = data as Doctor
      setDoctors((prev) =>
        isEditing
          ? prev.map((item) => (item.id === savedDoctor.id ? savedDoctor : item))
          : [savedDoctor, ...prev],
      )
      showToast("success", isEditing ? "Doctor updated." : "Doctor added.")
      resetForm()
      router.refresh()
    } catch (error) {
      console.error(error)
      showToast("error", "Unable to save doctor profile.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (doctor: Doctor) => {
    if (!window.confirm(`Remove ${doctor.fullName}?`)) return
    setSubmitting(true)
    try {
      const response = await fetch(`/api/doctors/${doctor.id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete")
      setDoctors((prev) => prev.filter((item) => item.id !== doctor.id))
      if (editingId === doctor.id) resetForm()
      showToast("success", "Doctor removed.")
      router.refresh()
    } catch (error) {
      console.error(error)
      showToast("error", "Unable to delete doctor.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className={cardClass}>
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">
              {isEditing ? "Edit Doctor" : "Add Doctor"}
            </p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {isEditing ? `Updating ${editingDoctor?.fullName ?? ""}` : "Create profile"}
            </h2>
          </div>
          {toast ? (
            <span
              className={`text-xs ${
                toast.tone === "error"
                  ? "text-red-500"
                  : toast.tone === "success"
                    ? "text-green-500"
                    : "text-indigo-500"
              }`}
            >
              {toast.message}
            </span>
          ) : null}
        </header>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Full name *
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                  value={form.fullName}
                  onChange={(event) => handleChange("fullName", event.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Title / credentials
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                  value={form.title}
                  onChange={(event) => handleChange("title", event.target.value)}
                  placeholder="MD, CCFP"
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Specialty / focus
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                  value={form.specialty}
                  onChange={(event) => handleChange("specialty", event.target.value)}
                  placeholder="Family Medicine"
                  disabled={submitting}
                />
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Email
                  </label>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                    value={form.email}
                    onChange={(event) => handleChange("email", event.target.value)}
                    placeholder="doctor@kingscare.ca"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Phone
                  </label>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                    value={form.phone}
                    onChange={(event) => handleChange("phone", event.target.value)}
                    placeholder="+1 (555) 123-4567"
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Short bio (for cards)
                </label>
                <textarea
                  className="mt-1 h-24 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                  value={form.shortBio}
                  onChange={(event) => handleChange("shortBio", event.target.value)}
                  maxLength={240}
                  placeholder="Brief intro shown on cards."
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Years of experience
                </label>
                <input
                  type="number"
                  min={0}
                  max={80}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                  value={form.yearsExperience}
                  onChange={(event) => handleChange("yearsExperience", event.target.value)}
                  placeholder="10"
                  disabled={submitting}
                />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Detailed bio
              </label>
              <textarea
                className="mt-1 h-32 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                value={form.bio}
                onChange={(event) => handleChange("bio", event.target.value)}
                placeholder="Longer biography, education, approach, languages, and interests."
                disabled={submitting}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Languages (comma separated)
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                  value={form.languages}
                  onChange={(event) => handleChange("languages", event.target.value)}
                  placeholder="English, French, Farsi"
                  disabled={submitting}
                />
              </div>
              <div className="flex items-center gap-6 pt-7">
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(event) => handleChange("active", event.target.checked)}
                    disabled={submitting}
                  />
                  Active
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(event) => handleChange("featured", event.target.checked)}
                    disabled={submitting}
                  />
                  Featured
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Profile photo</p>
              {form.photoUrl ? (
                <div className="mt-3 space-y-2">
                  <img
                    src={form.photoUrl}
                    alt="Doctor photo"
                    className="h-40 w-full rounded-xl object-cover"
                  />
                  <button
                    type="button"
                    className="text-xs text-red-500 hover:underline"
                    onClick={() => handleChange("photoUrl", "")}
                    disabled={submitting}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500">Upload a square headshot.</p>
              )}
              <label className="mt-3 inline-flex cursor-pointer items-center justify-center rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadPhoto}
                  disabled={submitting || uploading}
                />
                {uploading ? "Uploading..." : "Upload"}
              </label>
            </div>

            <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Gallery images</p>
              {form.gallery.length ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {form.gallery.map((url) => (
                    <div key={url} className="group relative">
                      <img src={url} alt="Gallery" className="h-20 w-full rounded-lg object-cover" />
                      <button
                        type="button"
                        className="absolute right-1 top-1 hidden rounded bg-black/60 px-2 py-1 text-[11px] text-white group-hover:block"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            gallery: prev.gallery.filter((item) => item !== url),
                          }))
                        }
                        disabled={submitting}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  Add additional photos (clinic, certificates, etc.).
                </p>
              )}
              <label className="mt-3 inline-flex cursor-pointer items-center justify-center rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleUploadGallery}
                  disabled={submitting || uploading}
                />
                {uploading ? "Uploading..." : "Add images"}
              </label>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={submitting}
            >
              {isEditing ? "Update doctor" : "Add doctor"}
            </button>
            {isEditing ? (
              <button
                type="button"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/60"
                onClick={resetForm}
                disabled={submitting}
              >
                Cancel editing
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className={cardClass}>
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">Directory</p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Doctors</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {doctors.length} doctor{doctors.length === 1 ? "" : "s"} listed
          </p>
        </header>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {doctors.map((doctor) => (
            <article
              key={doctor.id}
              className="rounded-2xl border border-slate-200/70 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-900/60 p-4 shadow-sm"
            >
              <div className="flex gap-3">
                <div className="h-16 w-16 overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-800">
                  {doctor.photoUrl ? (
                    <img
                      src={doctor.photoUrl}
                      alt={doctor.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      {doctor.fullName}
                    </h3>
                    {doctor.featured ? (
                      <span className="rounded-full bg-indigo-100 px-2 py-1 text-[11px] font-semibold text-indigo-700">
                        Featured
                      </span>
                    ) : null}
                    {!doctor.active ? (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
                        Inactive
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {[doctor.title, doctor.specialty].filter(Boolean).join(" • ")}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {doctor.shortBio || "No short bio yet."}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                {doctor.email ? <span>{doctor.email}</span> : null}
                {doctor.phone ? <span>{doctor.phone}</span> : null}
                {typeof doctor.yearsExperience === "number" ? (
                  <span>{doctor.yearsExperience} yrs experience</span>
                ) : null}
                {(doctor.languages ?? []).length ? (
                  <span>Speaks: {(doctor.languages ?? []).join(", ")}</span>
                ) : null}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                  onClick={() => startEditing(doctor)}
                  disabled={submitting}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
                  onClick={() => handleDelete(doctor)}
                  disabled={submitting}
                >
                  Delete
                </button>
                <span className="ml-auto text-[11px] text-slate-400">
                  {doctor.createdAt ? new Date(doctor.createdAt).toLocaleDateString() : ""}
                </span>
              </div>
            </article>
          ))}
          {doctors.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
              No doctors added yet. Create a profile above.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
