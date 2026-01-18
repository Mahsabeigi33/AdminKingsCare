"use client"
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import type { ChangeEvent, DragEvent, FormEvent } from "react"
import { useRouter } from "next/navigation"
import Snackbar from "@mui/material/Snackbar"
import Alert from "@mui/material/Alert"
import EditorJsEditor from "@/components/EditorJsEditor"

type ServiceRelation = {
  id: string
  name: string
  active?: boolean
}

type Service = {
  id: string
  name: string
  description: string | null
  shortDescription?: string | null
  images: string[]
  priority?: number | null
  active: boolean
  parentId: string | null
  parent?: ServiceRelation | null
  subServices?: ServiceRelation[]
  createdAt?: string
}

type Props = {
  initialServices: Service[]
}

type FormState = {
  name: string
  description: string
  shortDescription: string
  parentId: string
  images: string[]
  priority: string
}

type ToastState = {
  message: string
  severity: "success" | "error"
}

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024 // 4MB (must match API limit)
const cardClass = "rounded-3xl border border-slate-200/70 dark:border-slate-800/60 bg-white/90 dark:bg-slate-950/80 p-6 shadow-2xl shadow-slate-200/60 dark:shadow-black/20"
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

const buildEmptyForm = (): FormState => ({
  name: "",
  description: "",
  shortDescription: "",
  parentId: "",
  images: [],
  priority: "",
})

const serviceToForm = (service: Service): FormState => ({
  name: service.name,
  description: service.description ?? "",
  shortDescription: service.shortDescription ?? "",
  parentId: service.parentId ?? "",
  images: service.images ?? [],
  priority: typeof service.priority === "number" ? String(service.priority) : "",
})

type ImageUploadFieldProps = {
  title: string
  images: string[]
  uploading: boolean
  disabled?: boolean
  onUpload: (files: File[]) => Promise<void>
  onRemoveImage: (url: string) => void
  onRemoveAll: () => void
}

const ImageUploadField = ({
  title,
  images,
  uploading,
  disabled = false,
  onUpload,
  onRemoveImage,
  onRemoveAll,
}: ImageUploadFieldProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)

  const processFiles = useCallback(async (list: FileList | File[]) => {
    if (disabled || uploading) return
    const files = Array.from(list).filter((file) => file.type.startsWith("image/"))
    if (!files.length) return
    await onUpload(files)
  }, [disabled, uploading, onUpload])

  const handleInputChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return
    await processFiles(event.target.files)
    event.target.value = ""
  }, [processFiles])

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (disabled) return
    setIsDragActive(true)
  }, [disabled])

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragActive(false)
  }, [])

  const handleDrop = useCallback(async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragActive(false)
    if (disabled) return
    await processFiles(event.dataTransfer.files)
  }, [disabled, processFiles])

  const triggerBrowse = useCallback(() => {
    if (disabled || uploading) return
    fileInputRef.current?.click()
  }, [disabled, uploading])

  return (
    <div className={`${cardClass} space-y-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">{title}</p>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Images</h3>
        </div>
        <button
          type="button"
          onClick={triggerBrowse}
          className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500 dark:text-indigo-300 transition hover:text-indigo-600 dark:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled || uploading}
        >
          Browse image
        </button>
      </div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-10 text-center transition ${disabled ? "opacity-60" : isDragActive ? "border-indigo-400 bg-indigo-500/10" : "border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/60"}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleInputChange}
          disabled={disabled || uploading}
        />
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-200">
          <span className="text-xl">&uarr;</span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">Drag & drop images here, or click to browse.</p>
        <p className="text-xs text-slate-500">PNG, JPG, GIF, SVG up to 4MB.</p>
        {uploading ? <p className="text-xs text-indigo-500 dark:text-indigo-300">Uploading...</p> : null}
      </div>
      {images.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              {images.length} image{images.length > 1 ? "s" : ""} selected
            </span>
            <button
              type="button"
              onClick={onRemoveAll}
              className="text-indigo-500 dark:text-indigo-300 hover:text-indigo-600 dark:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={disabled || uploading}
            >
              Remove all
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((url) => (
              <div key={url} className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60">
                <img src={url} alt="Service asset" className="h-36 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemoveImage(url)}
                  className="absolute right-2 top-2 rounded-full bg-slate-100 dark:bg-slate-900/80 px-2 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200 opacity-0 transition hover:bg-slate-800 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={disabled || uploading}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
export const revalidate = 9000; 
export default function ServicesManager({ initialServices }: Props) {
  const router = useRouter()
  const [services, setServices] = useState(initialServices)
  const [createForm, setCreateForm] = useState<FormState>(() => buildEmptyForm())
  const [createUploading, setCreateUploading] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [editForm, setEditForm] = useState<FormState>(() => buildEmptyForm())
  const [editUploading, setEditUploading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [rowBusyId, setRowBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const editSectionRef = useRef<HTMLElement | null>(null)

  const parentOptions = useMemo(() =>
    services
      .map((service) => ({ id: service.id, name: service.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  [services])

  const closeToast = () => setToast(null)

  useEffect(() => {
    if (!editingService) return
    const id = requestAnimationFrame(() => {
      editSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
    return () => cancelAnimationFrame(id)
  }, [editingService])

  const reloadServices = async () => {
    const response = await fetch("/api/services", { cache: "no-store" })
    if (!response.ok) throw new Error("Failed to load services")
    const refreshed: Service[] = await response.json()
    setServices(refreshed)
    router.refresh()
    return refreshed
  }

  const uploadFileBatch = async (files: File[]) => {
    const uploads: string[] = []
    for (const file of files) {
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error(`File too large: ${file.name}. Max 4MB.`)
      }
      const formData = new FormData()
      formData.append("file", file)
      const response = await fetch("/api/uploads", { method: "POST", body: formData })
      let payload: { url?: string; error?: string } | null = null
      try {
        payload = (await response.json()) as { url?: string; error?: string }
      } catch {
        payload = null
      }
      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error ?? "Failed to upload image")
      }
      uploads.push(payload.url)
    }
    return uploads
  }

  const handleCreateImagesUpload = async (files: File[]) => {
    setCreateUploading(true)
    try {
      const uploaded = await uploadFileBatch(files)
      setCreateForm((prev) => ({
        ...prev,
        images: [...prev.images, ...uploaded.filter((url) => !prev.images.includes(url))],
      }))
      setToast({ severity: "success", message: `Uploaded ${uploaded.length} image${uploaded.length > 1 ? "s" : ""}.` })
    } catch (error) {
      console.error(error)
      setToast({ severity: "error", message: (error as Error).message ?? "Unable to upload images." })
    } finally {
      setCreateUploading(false)
    }
  }

  const handleEditImagesUpload = async (files: File[]) => {
    setEditUploading(true)
    try {
      const uploaded = await uploadFileBatch(files)
      setEditForm((prev) => ({
        ...prev,
        images: [...prev.images, ...uploaded.filter((url) => !prev.images.includes(url))],
      }))
      setToast({ severity: "success", message: `Uploaded ${uploaded.length} image${uploaded.length > 1 ? "s" : ""}.` })
    } catch (error) {
      console.error(error)
      setToast({ severity: "error", message: (error as Error).message ?? "Unable to upload images." })
    } finally {
      setEditUploading(false)
    }
  }

  const handleCreateFieldChange = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setCreateForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleEditFieldChange = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setEditForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = createForm.name.trim()
    if (!trimmedName) {
      setToast({ severity: "error", message: "Name is required." })
      return
    }
    const trimmedDescription = plainTextFromEditor(createForm.description)
    if (!trimmedDescription) {
      setToast({ severity: "error", message: "Description is required." })
      return
    }
    if (!createForm.images.length) {
      setToast({ severity: "error", message: "Please upload at least one image." })
      return
    }
    setCreating(true)
    try {
      const trimmedShort = plainTextFromEditor(createForm.shortDescription)
      const priorityValue = createForm.priority.trim()
      const priority = priorityValue ? Number(priorityValue) : null
      const payload = {
        name: trimmedName,
        description: createForm.description,
        shortDescription: trimmedShort === "" ? null : createForm.shortDescription,
        parentId: createForm.parentId || null,
        images: createForm.images,
        priority: Number.isFinite(priority) ? priority : null,
      }
      const response = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        throw new Error("Failed to create service")
      }
      await reloadServices()
      setCreateForm(buildEmptyForm())
      setToast({ severity: "success", message: "Service created successfully." })
    } catch (error) {
      console.error(error)
      setToast({ severity: "error", message: "Unable to create service. Please try again." })
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = async (service: Service, syncEditForm = false) => {
    setRowBusyId(service.id)
    const nextActive = !service.active
    try {
      const response = await fetch(`/api/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextActive }),
      })
      if (!response.ok) throw new Error("Failed to update service")
      const refreshed = await reloadServices()
      const updated = refreshed.find((item) => item.id === service.id)
      const displayName = updated?.name ?? service.name
      if (updated && editingService?.id === service.id) {
        if (syncEditForm) {
          setEditingService(updated)
          setEditForm(serviceToForm(updated))
        } else {
          setEditingService((prev) => {
            if (!prev || prev.id !== service.id) return prev
            return {
              ...prev,
              active: updated.active,
              parent: updated.parent,
              parentId: updated.parentId,
              subServices: updated.subServices,
              images: updated.images,
            }
          })
        }
      }
      setToast({
        severity: "success",
        message: `${displayName} is now ${nextActive ? "active" : "paused"}.`,
      })
    } catch (error) {
      console.error(error)
      setToast({ severity: "error", message: "Unable to update status. Please retry." })
    } finally {
      setRowBusyId(null)
    }
  }

  const startEdit = (service: Service) => {
    setEditingService(service)
    setEditForm(serviceToForm(service))
  }

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingService) return

    const trimmedName = editForm.name.trim()
    if (!trimmedName) {
      setToast({ severity: "error", message: "Name is required." })
      return
    }
    const trimmedDescription = plainTextFromEditor(editForm.description)
    if (!trimmedDescription) {
      setToast({ severity: "error", message: "Description is required." })
      return
    }
    if (!editForm.images.length) {
      setToast({ severity: "error", message: "Please keep at least one image." })
      return
    }

    setSavingEdit(true)
    setRowBusyId(editingService.id)
    try {
      const trimmedShort = plainTextFromEditor(editForm.shortDescription)
      const priorityValue = editForm.priority.trim()
      const priority = priorityValue ? Number(priorityValue) : null
      const payload = {
        name: trimmedName,
        description: editForm.description,
        shortDescription: trimmedShort === "" ? null : editForm.shortDescription,
        parentId: editForm.parentId || null,
        images: editForm.images,
        priority: Number.isFinite(priority) ? priority : null,
      }
      const response = await fetch(`/api/services/${editingService.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error("Failed to update service")
      const refreshed = await reloadServices()
      const updated = refreshed.find((item) => item.id === editingService.id)
      if (updated) {
        setEditingService(updated)
        setEditForm(serviceToForm(updated))
      } else {
        setEditingService(null)
        setEditForm(buildEmptyForm())
      }
      const displayName = updated?.name ?? editingService.name
      setToast({ severity: "success", message: `${displayName} updated successfully.` })
    } catch (error) {
      console.error(error)
      setToast({ severity: "error", message: "Unable to update service. Please retry." })
    } finally {
      setSavingEdit(false)
      setRowBusyId(null)
    }
  }

  const handleDelete = async (service: Service) => {
    const confirmed = window.confirm(`Delete ${service.name}? This cannot be undone.`)
    if (!confirmed) return

    setRowBusyId(service.id)
    try {
      const response = await fetch(`/api/services/${service.id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete service")
      const refreshed = await reloadServices()
      setToast({ severity: "success", message: `${service.name} deleted.` })
      if (editingService?.id === service.id) {
        setEditingService(null)
        setEditForm(buildEmptyForm())
      }
      setServices(refreshed)
    } catch (error) {
      console.error(error)
      setToast({ severity: "error", message: "Unable to delete service. Please retry." })
    } finally {
      setRowBusyId(null)
    }
  }

  const isRowBusy = (serviceId: string) => rowBusyId === serviceId || (savingEdit && editingService?.id === serviceId)

  return (
    <div className="space-y-6">
      {toast ? (
        <Snackbar open autoHideDuration={4000} onClose={closeToast} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
          <Alert onClose={closeToast} severity={toast.severity} variant="filled" sx={{ width: "100%" }}>
            {toast.message}
          </Alert>
        </Snackbar>
      ) : null}

      <section className={cardClass}>
        <header className="mb-4">
          <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">Create Service</p>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Add a new offering</h2>
        </header>
        <form className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" onSubmit={handleCreate}>
          <div className="md:col-span-2 lg:col-span-2">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Name</label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              value={createForm.name}
              onChange={(event) => handleCreateFieldChange("name", event.target.value)}
              disabled={creating}
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Parent Service</label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              value={createForm.parentId}
              onChange={(event) => handleCreateFieldChange("parentId", event.target.value)}
              disabled={creating || !services.length}
            >
              <option value="">None</option>
              {parentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Short Description</label>
            <textarea
              maxLength={200}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              value={createForm.shortDescription}
              onChange={(event) => handleCreateFieldChange("shortDescription", event.target.value)}
              placeholder="Short summary for cards (max 200 chars)"
              disabled={creating}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Priority (lower shows first)</label>
            <input
              type="number"
              min={0}
              max={1000}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              value={createForm.priority}
              onChange={(event) => handleCreateFieldChange("priority", event.target.value)}
              placeholder="e.g. 1"
              disabled={creating}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Description</label>
            <EditorJsEditor
              value={createForm.description}
              onChange={(value) => handleCreateFieldChange("description", value)}
              placeholder="Full service description."
              minHeightClass="min-h-[220px]"
            />
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <ImageUploadField
              title="Product Image"
              images={createForm.images}
              uploading={createUploading}
              disabled={creating}
              onUpload={handleCreateImagesUpload}
              onRemoveImage={(url) =>
                setCreateForm((prev) => ({ ...prev, images: prev.images.filter((item) => item !== url) }))
              }
              onRemoveAll={() => setCreateForm((prev) => ({ ...prev, images: [] }))}
            />
          </div>
          <div className="lg:col-span-4">
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {creating ? "Saving..." : "Add Service"}
            </button>
          </div>
        </form>
      </section>

      {editingService ? (
        <section ref={editSectionRef} className={cardClass}>
          <header className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">Edit Service</p>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{editingService.name}</h2>
            </div>
            <button
              type="button"
              className="text-xs uppercase tracking-[0.3em] text-rose-300 transition hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                if (savingEdit) return
                setEditingService(null)
                setEditForm(buildEmptyForm())
              }}
              disabled={savingEdit}
            >
              Close
            </button>
          </header>
            <form className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" onSubmit={handleEditSubmit}>
              <div className="md:col-span-2 lg:col-span-2">
                <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Name</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                  value={editForm.name}
                onChange={(event) => handleEditFieldChange("name", event.target.value)}
                disabled={savingEdit}
                required
              />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Parent Service</label>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                  value={editForm.parentId}
                onChange={(event) => handleEditFieldChange("parentId", event.target.value)}
                disabled={savingEdit}
              >
                <option value="">None</option>
                {parentOptions
                  .filter((option) => option.id !== editingService.id)
                  .map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Short Description</label>
              <textarea
                maxLength={200}
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                value={editForm.shortDescription}
                onChange={(event) => handleEditFieldChange("shortDescription", event.target.value)}
                placeholder="Short summary for cards (max 200 chars)"
                disabled={savingEdit}
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Priority (lower shows first)</label>
              <input
                type="number"
                min={0}
                max={1000}
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                value={editForm.priority}
                onChange={(event) => handleEditFieldChange("priority", event.target.value)}
                placeholder="e.g. 1"
                disabled={savingEdit}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Description</label>
              <EditorJsEditor
                value={editForm.description}
                onChange={(value) => handleEditFieldChange("description", value)}
                placeholder="Full service description."
                minHeightClass="min-h-[220px]"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <ImageUploadField
                title="Product Image"
                images={editForm.images}
                uploading={editUploading}
                disabled={savingEdit}
                onUpload={handleEditImagesUpload}
                onRemoveImage={(url) =>
                  setEditForm((prev) => ({ ...prev, images: prev.images.filter((item) => item !== url) }))
                }
                onRemoveAll={() => setEditForm((prev) => ({ ...prev, images: [] }))}
              />
            </div>
            <div className="lg:col-span-4 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={savingEdit}
                className="flex-1 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {savingEdit ? "Updating..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => handleToggleActive(editingService, true)}
                disabled={savingEdit || isRowBusy(editingService.id)}
                className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-slate-700 dark:text-slate-200 transition hover:border-indigo-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {editingService.active ? "Pause" : "Activate"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className={cardClass}>
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">Service Library</p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Existing services</h2>
          </div>
          <span className="text-xs text-slate-500">{services.length} records</span>
        </header>
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-slate-600 dark:text-slate-300">
              <thead className="text-xs uppercase tracking-[0.3em] text-slate-500">
                <tr className="border-b border-slate-200/70 dark:border-slate-800/60">
                  <th className="px-3 py-2 text-left">Name & Details</th>
                  <th className="px-3 py-2 text-center">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
              {services.map((service) => (
                <tr key={service.id} className="border-b border-slate-200/60 dark:border-slate-800/40 last:border-b-0">
                  <td className="px-3 py-3 text-slate-900 dark:text-slate-100">
                    <div className="font-medium">{service.name}</div>
                    {service.shortDescription ? (
                      <p className="text-xs text-slate-500">{plainTextFromEditor(service.shortDescription)}</p>
                    ) : service.description ? (
                      <p className="text-xs text-slate-500">{plainTextFromEditor(service.description)}</p>
                    ) : null}
                    {service.images && service.images.length > 0 ? (
                      <div className="mt-2 relative h-16 w-24 overflow-hidden rounded bg-slate-100 dark:bg-slate-900/60">
                        <Image
                          src={service.images[0]}
                          alt={`${service.name} thumbnail`}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      </div>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                      {service.parent?.name ? (
                        <span className="rounded-full border border-slate-300 dark:border-slate-700 px-2 py-0.5">Parent: {service.parent.name}</span>
                      ) : null}
                      {typeof service.priority === "number" ? (
                        <span className="rounded-full border border-slate-300 dark:border-slate-700 px-2 py-0.5">
                          Priority: {service.priority}
                        </span>
                      ) : null}
                      {service.subServices && service.subServices.length ? (
                        <span className="rounded-full border border-slate-300 dark:border-slate-700 px-2 py-0.5">
                          Sub-services: {service.subServices.map((sub) => sub.name).join(", ")}
                        </span>
                      ) : null}
                      {service.images.length ? (
                        <span className="rounded-full border border-slate-300 dark:border-slate-700 px-2 py-0.5">
                          Images: {service.images.length}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  
                  
                  <td className="px-3 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(service)}
                      className="rounded-full border border-indigo-400/40 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-teal-800 transition hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                      disabled={isRowBusy(service.id)}
                    >
                      {service.active ? "Active" : "Paused"}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2 text-xs">
                      <button
                        type="button"
                        className="rounded-full border border-slate-300 dark:border-slate-700 px-3 py-1 text-slate-700 dark:text-slate-200 transition hover:border-indigo-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                        onClick={() => startEdit(service)}
                        disabled={isRowBusy(service.id)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-rose-500/60 px-3 py-1 text-rose-300 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-70"
                        onClick={() => handleDelete(service)}
                        disabled={isRowBusy(service.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {services.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center text-sm text-slate-500">
                    No services added yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
