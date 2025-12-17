"use client"
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

type PatientServiceUsage = {
  id: string
  usedAt?: string | null
  service: {
    id: string
    name: string
  } | null
}

type Patient = {
  id: string
  firstName: string
  lastName: string
  phone?: string | null
  email?: string | null
  dob?: string | null
  notes?: string | null
  createdAt?: string
  serviceUsages?: PatientServiceUsage[]
}

type ServiceOption = {
  id: string
  name: string
}

type Props = {
  initialPatients: Patient[]
  services: ServiceOption[]
}

type FormState = {
  firstName: string
  lastName: string
  phone: string
  email: string
  dob: string
  notes: string
}

type ToastState = {
  tone: 'success' | 'error' | 'info'
  message: string
}

const emptyFormState: FormState = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  dob: '',
  notes: '',
}

const cardClass = 'rounded-3xl border border-slate-200/70 dark:border-slate-800/60 bg-white/90 dark:bg-slate-950/80 p-6 shadow-2xl shadow-slate-200/60 dark:shadow-black/20'

export default function PatientsManager({ initialPatients, services }: Props) {
  const router = useRouter()
  const [patients, setPatients] = useState(initialPatients)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({ ...emptyFormState })
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const isEditing = Boolean(editingPatientId)
  const editingPatient = isEditing ? patients.find((item) => item.id === editingPatientId) ?? null : null

  const handleChange = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const showToast = (tone: ToastState['tone'], message: string) => {
    setToast({ tone, message })
  }

  const resetForm = () => {
    setForm({ ...emptyFormState })
    setEditingPatientId(null)
    setSelectedServiceIds([])
  }

  const startEditing = (patient: Patient) => {
    setEditingPatientId(patient.id)
    setForm({
      firstName: patient.firstName ?? '',
      lastName: patient.lastName ?? '',
      phone: patient.phone ?? '',
      email: patient.email ?? '',
      dob: patient.dob
      ? typeof patient.dob === "string"
        ? patient.dob.slice(0, 10)
        : new Date(patient.dob).toISOString().slice(0, 10)
      : '',
      notes: patient.notes ?? '',
    })
    const existingServices = (patient.serviceUsages ?? [])
      .map((usage) => usage.service?.id ?? null)
      .filter((value): value is string => Boolean(value))
    setSelectedServiceIds(Array.from(new Set(existingServices)))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEditing = () => {
    if (!isEditing) return
    resetForm()
    showToast('info', 'Editing cancelled.')
  }

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServiceIds((previous) => {
      if (previous.includes(serviceId)) {
        return previous.filter((id) => id !== serviceId)
      }
      return [...previous, serviceId]
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.firstName.trim() || !form.lastName.trim()) {
      showToast('error', 'First and last name are required.')
      return
    }
    setSubmitting(true)
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      dob: form.dob ? new Date(form.dob).toISOString() : null,
      notes: form.notes.trim() || null,
      serviceIds: selectedServiceIds,
    }
    try {
      const endpoint = isEditing && editingPatientId ? `/api/patients/${editingPatientId}` : '/api/patients'
      const method = isEditing ? 'PUT' : 'POST'
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const errorMessage =
          (data && typeof data.error === 'string' && data.error.trim().length > 0)
            ? data.error
            : isEditing
              ? 'Unable to update patient.'
              : 'Unable to create patient.'
        showToast('error', errorMessage)
        return
      }

      if (!data) {
        showToast('error', 'Unexpected response from the server.')
        return
      }

      const savedPatient = data as Patient
      setPatients((prev) =>
        isEditing
          ? prev.map((item) => (item.id === savedPatient.id ? savedPatient : item))
          : [savedPatient, ...prev],
      )
      showToast('success', isEditing ? 'Patient updated successfully.' : 'Patient added successfully.')
      resetForm()
      router.refresh()
    } catch (error) {
      console.error(error)
      showToast('error', isEditing ? 'Unable to update patient.' : 'Unable to create patient.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (patient: Patient) => {
    if (!window.confirm(`Remove ${patient.firstName} ${patient.lastName}?`)) return
    setSubmitting(true)
    try {
      const response = await fetch(`/api/patients/${patient.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete patient')
      setPatients((prev) => prev.filter((item) => item.id !== patient.id))
      if (editingPatientId === patient.id) {
        resetForm()
      }
      showToast('success', 'Patient removed.')
      router.refresh()
    } catch (error) {
      console.error(error)
      showToast('error', 'Unable to delete patient.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed right-6 top-6 z-40 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg transition ${
            toast.tone === 'success'
              ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
              : toast.tone === 'error'
                ? 'border-rose-400/40 bg-rose-500/10 text-rose-100'
                : 'border-sky-400/40 bg-sky-500/10 text-sky-100'
          }`}
        >
          <span className="font-medium uppercase tracking-[0.2em]">
            {toast.tone === 'success' ? 'Success' : toast.tone === 'error' ? 'Error' : 'Notice'}
          </span>
          <span className="text-slate-900 dark:text-slate-100">{toast.message}</span>
        </div>
      )}
      <section className={cardClass}>
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">
              {isEditing ? 'Update Patient' : 'Add Patient'}
            </p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {isEditing ? 'Edit patient details' : 'Create a new record'}
            </h2>
          </div>
          {editingPatient && (
            <span className="text-xs uppercase tracking-[0.3em] text-amber-300">
              Editing: {editingPatient.firstName} {editingPatient.lastName}
            </span>
          )}
        </header>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">First name</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              value={form.firstName}
              onChange={(event) => handleChange('firstName', event.target.value)}
              required
              disabled={submitting}
            />
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Last name</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              value={form.lastName}
              onChange={(event) => handleChange('lastName', event.target.value)}
              required
              disabled={submitting}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Phone</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              value={form.phone}
              onChange={(event) => handleChange('phone', event.target.value)}
              placeholder="(555) 123-4567"
              disabled={submitting}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Email</label>
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              value={form.email}
              onChange={(event) => handleChange('email', event.target.value)}
              placeholder="patient@domain.com"
              disabled={submitting}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Date of birth</label>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              value={form.dob}
              onChange={(event) => handleChange('dob', event.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="lg:col-span-6">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Notes</label>
            <textarea
              className="mt-1 h-20 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              placeholder="Allergies, preferred contact, insurance notes"
              value={form.notes}
              onChange={(event) => handleChange('notes', event.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="lg:col-span-6">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Services used</label>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-600">
              Select services to track in this patient&apos;s history.
            </p>
            {services.length > 0 ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((service) => {
                  const checked = selectedServiceIds.includes(service.id)
                  return (
                    <label
                      key={service.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${
                        checked ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-200' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-400 dark:border-slate-600 bg-slate-100 dark:bg-slate-900/70 text-indigo-500 focus:ring-indigo-400"
                        checked={checked}
                        onChange={() => handleServiceToggle(service.id)}
                        disabled={submitting}
                      />
                      <span className="font-medium tracking-[0.18em]">{service.name}</span>
                    </label>
                  )
                })}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-3 py-2 text-xs tracking-[0.18em] text-slate-500">
                No services available yet. Create services first to log patient history.
              </p>
            )}
          </div>
          <div className="lg:col-span-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting
                ? isEditing
                  ? 'Updating...'
                  : 'Saving...'
                : isEditing
                  ? 'Update Patient'
                  : 'Add Patient'}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={cancelEditing}
                disabled={submitting}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-slate-700 dark:text-slate-200 transition hover:border-amber-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className={cardClass}>
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">Directory</p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Patients on file</h2>
          </div>
          <span className="text-xs text-slate-500">{patients.length} records</span>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-slate-600 dark:text-slate-300">
            <thead className="text-xs uppercase tracking-[0.3em] text-slate-500">
              <tr className="border-b border-slate-200/70 dark:border-slate-800/60">
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Contact</th>
                <th className="px-3 py-2 text-left">DOB</th>
                <th className="px-3 py-2 text-left">Notes</th>
                <th className="px-3 py-2 text-left">Services</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id} className="border-b border-slate-200/60 dark:border-slate-800/40 last:border-b-0">
                  <td className="px-3 py-3 text-slate-900 dark:text-slate-100 font-medium">
                    {patient.firstName} {patient.lastName}
                    {patient.createdAt && (
                      <p className="text-xs text-slate-500">Added {format(new Date(patient.createdAt), 'MMM d, yyyy')}</p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400">
                    <div>{patient.phone || '--'}</div>
                    <div>{patient.email || ''}</div>
                  </td>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400">
                    {patient.dob ? format(new Date(patient.dob), 'MMM d, yyyy') : '--'}
                  </td>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400">
                    {patient.notes ? (
                      <span className="line-clamp-2 text-xs text-slate-500">{patient.notes}</span>
                    ) : (
                      <span className="text-xs text-slate-600">No notes</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400">
                    {patient.serviceUsages && patient.serviceUsages.length > 0 ? (
                      <ul className="space-y-1 text-xs text-slate-500">
                        {patient.serviceUsages.slice(0, 5).map((usage) => (
                          <li key={usage.id} className="flex flex-wrap items-center gap-2">
                            <span className="text-slate-700 dark:text-slate-200">{usage.service?.name ?? 'Service removed'}</span>
                            {usage.usedAt && (
                              <span className="text-slate-500">{format(new Date(usage.usedAt), 'MMM d, yyyy')}</span>
                            )}
                          </li>
                        ))}
                        {patient.serviceUsages.length > 5 && (
                          <li className="text-[10px] uppercase tracking-[0.2em] text-slate-600">
                            +{patient.serviceUsages.length - 5} more
                          </li>
                        )}
                      </ul>
                    ) : (
                      <span className="text-xs text-slate-600">No services yet</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex justify-end gap-2 text-xs">
                      <button
                        type="button"
                        className="rounded-full border border-slate-300 dark:border-slate-700 px-3 py-1 text-slate-700 dark:text-slate-200 transition hover:border-indigo-500 hover:text-white"
                        onClick={() => startEditing(patient)}
                        disabled={submitting}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-rose-500/60 px-3 py-1 text-rose-300 transition hover:bg-rose-500/10"
                        onClick={() => handleDelete(patient)}
                        disabled={submitting}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {patients.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-500">
                    No patients captured yet.
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


