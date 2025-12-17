"use client"

import { useMemo, useState } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import Select from "@mui/material/Select"
import Snackbar from "@mui/material/Snackbar"
import Alert from "@mui/material/Alert"
import Button from "@mui/material/Button"

export type Appointment = {
  id: string
  date: string
  status: "BOOKED" | "COMPLETED" | "CANCELLED" | "NO_SHOW"
  notes?: string | null
  customPatientName?: string | null
  patient: { id: string; firstName: string; lastName: string } | null
  service: { id: string; name: string; priceCents: number }
  staff?: { id: string; name: string | null } | null
}

type Patient = {
  id: string
  firstName: string
  lastName: string
}

type Service = {
  id: string
  name: string
  priceCents: number
}

type Staff = {
  id: string
  name: string | null
}

type Props = {
  initialAppointments: Appointment[]
  patients: Patient[]
  services: Service[]
  staff: Staff[]
}

type FormState = {
  patientMode: "existing" | "manual"
  patientId: string
  patientName: string
  patientSearch: string
  serviceId: string
  staffId: string
  datetime: string
  notes: string
}

type ViewMode = "today" | "date" | "all"

type ToastState = {
  open: boolean
  message: string
  severity: "success" | "error" | "info"
  actionLabel?: string
  onAction?: () => void
}

const STATUS_OPTIONS: Appointment["status"][] = ["BOOKED", "COMPLETED", "CANCELLED", "NO_SHOW"]

const cardClass = "rounded-3xl border border-slate-200/70 dark:border-slate-800/60 bg-white/90 dark:bg-slate-950/80 p-6 shadow-2xl shadow-slate-200/60 dark:shadow-black/20"

const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "CAD", minimumFractionDigits: 0 }).format(
    value / 100,
  )

const getPatientLabel = (patient: Patient | Appointment["patient"]) =>
  patient ? `${patient.firstName} ${patient.lastName}` : ""

const getAppointmentPatient = (appointment: Appointment) =>
  appointment.patient ? getPatientLabel(appointment.patient) : appointment.customPatientName ?? "Guest patient"

const toDateKey = (value: string) => format(new Date(value), "yyyy-MM-dd")

const scrollToTop = () => {
  if (typeof window !== "undefined") {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
}

export default function AppointmentsManager({ initialAppointments, patients, services, staff }: Props) {
  const router = useRouter()
  const canSelectExisting = patients.length > 0
  const initialPatientMode: FormState["patientMode"] = canSelectExisting ? "existing" : "manual"

  const [appointments, setAppointments] = useState(initialAppointments)
  const [viewMode, setViewMode] = useState<ViewMode>("today")
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"))
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [form, setForm] = useState<FormState>(() => ({
    patientMode: initialPatientMode,
    patientId: initialPatientMode === "existing" ? patients[0]?.id ?? "" : "",
    patientName: "",
    patientSearch: "",
    serviceId: services[0]?.id ?? "",
    staffId: "",
    datetime: "",
    notes: "",
  }))

  const staffOptions = useMemo(() => staff.filter((member) => Boolean(member.name)), [staff])

  const filteredAppointments = useMemo(() => {
    if (viewMode === "all") return appointments
    const reference = viewMode === "today" ? format(new Date(), "yyyy-MM-dd") : selectedDate
    if (!reference) return appointments

    return appointments.filter((appointment) => toDateKey(appointment.date) === reference)
  }, [appointments, selectedDate, viewMode])

  const filteredPatients = useMemo(() => {
    if (!form.patientSearch.trim()) return patients
    const query = form.patientSearch.toLowerCase()
    const matches = patients.filter((patient) => getPatientLabel(patient).toLowerCase().includes(query))
    if (form.patientId && !matches.some((patient) => patient.id === form.patientId)) {
      const selected = patients.find((patient) => patient.id === form.patientId)
      if (selected) {
        return [selected, ...matches]
      }
    }
    return matches
  }, [form.patientId, form.patientSearch, patients])

  const handleFormChange = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const showToast = (input: Omit<ToastState, "open">) => {
    setToast({ ...input, open: true })
  }

  const closeToast = (_?: unknown, reason?: string) => {
    if (reason === "clickaway") return
    setToast((prev) => (prev ? { ...prev, open: false } : prev))
  }

  const handleToastAction = () => {
    if (toast?.onAction) {
      toast.onAction()
    }
    closeToast()
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.serviceId || !form.datetime) {
      showToast({ message: "Service and date are required.", severity: "error" })
      return
    }

    if (form.patientMode === "existing" && !form.patientId) {
      showToast({ message: "Select a patient for the appointment.", severity: "error" })
      return
    }

    if (form.patientMode === "manual" && !form.patientName.trim()) {
      showToast({ message: "Enter the patient's name.", severity: "error" })
      return
    }

    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        serviceId: form.serviceId,
        staffId: form.staffId || undefined,
        date: new Date(form.datetime).toISOString(),
        notes: form.notes.trim() || null,
      }

      if (form.patientMode === "existing") {
        payload.patientId = form.patientId
      } else {
        payload.patientName = form.patientName.trim()
      }

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error("Failed to create appointment")
      const created: Appointment = await response.json()
      setAppointments((prev) =>
        [...prev, created].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      )
      setForm({
        patientMode: initialPatientMode,
        patientId: initialPatientMode === "existing" ? patients[0]?.id ?? "" : "",
        patientName: "",
        patientSearch: "",
        serviceId: services[0]?.id ?? "",
        staffId: "",
        datetime: "",
        notes: "",
      })
      showToast({
        message: "Appointment created.",
        severity: "success",
        actionLabel: "View date",
        onAction: () => {
          setViewMode("date")
          setSelectedDate(toDateKey(created.date))
          scrollToTop()
        },
      })
      router.refresh()
    } catch (error) {
      console.error(error)
      showToast({ message: "Unable to create appointment.", severity: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (id: string, status: Appointment["status"]) => {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error("Failed to update status")
      const updated: Appointment = await response.json()
      setAppointments((prev) => prev.map((item) => (item.id === id ? updated : item)))
      showToast({
        message: `Status updated to ${status.replace("_", " ").toLowerCase()}.`,
        severity: "success",
        actionLabel: "Jump to today",
        onAction: () => {
          setViewMode("today")
          setSelectedDate(format(new Date(), "yyyy-MM-dd"))
          scrollToTop()
        },
      })
      router.refresh()
    } catch (error) {
      console.error(error)
      showToast({ message: "Unable to update status.", severity: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/appointments/${id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete appointment")
      setAppointments((prev) => prev.filter((item) => item.id !== id))
      showToast({
        message: "Appointment deleted.",
        severity: "info",
        actionLabel: "Refresh",
        onAction: () => {
          router.refresh()
        },
      })
      router.refresh()
    } catch (error) {
      console.error(error)
      showToast({ message: "Unable to delete appointment.", severity: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  const handlePatientModeChange = (mode: FormState["patientMode"]) => {
    if (mode === "existing" && !canSelectExisting) {
      showToast({ message: "No patients available yet. Use quick entry instead.", severity: "info" })
      return
    }
    setForm((prev) => ({
      ...prev,
      patientMode: mode,
      patientId: mode === "existing" ? prev.patientId || patients[0]?.id || "" : "",
      patientName: mode === "existing" ? "" : prev.patientName,
      patientSearch: mode === "existing" ? prev.patientSearch : "",
    }))
  }

  return (
    <div className="space-y-6">
      <Snackbar
        open={toast?.open ?? false}
        autoHideDuration={4000}
        onClose={closeToast}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        {toast ? (
          <Alert
            onClose={closeToast}
            severity={toast.severity}
            variant="filled"
            sx={{ width: "100%" }}
            action={
              toast.actionLabel ? (
                <Button color="inherit" size="small" onClick={handleToastAction}>
                  {toast.actionLabel}
                </Button>
              ) : null
            }
          >
            {toast.message}
          </Alert>
        ) : <></>}
      </Snackbar>

      <section className={cardClass}>
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">Add Appointment</p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Book a new visit</h2>
          </div>
        </header>
        <form onSubmit={handleCreate} className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="md:col-span-2 lg:col-span-2">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Patient</label>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                  form.patientMode === "existing"
                    ? "border-indigo-400 bg-indigo-500/20 text-indigo-100"
                    : "border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-100"
                } ${canSelectExisting ? "" : "cursor-not-allowed opacity-40"}`}
                onClick={() => handlePatientModeChange("existing")}
                disabled={!canSelectExisting}
              >
                From Directory
              </button>
              <button
                type="button"
                className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                  form.patientMode === "manual"
                    ? "border-indigo-400 bg-indigo-500/20 text-indigo-100"
                    : "border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-100"
                }`}
                onClick={() => handlePatientModeChange("manual")}
              >
                Quick Entry
              </button>
            </div>
            {form.patientMode === "existing" ? (
              <>
                <Select
                  className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                  value={form.patientId}
                  onChange={(event) => handleFormChange("patientId", event.target.value)}
                  native
                >
                  <option value="">Select a patient</option>
                  {filteredPatients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {getPatientLabel(patient)}
                    </option>
                  ))}
                </Select>
                <input
                  className="mt-3 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                  placeholder="Search patients..."
                  value={form.patientSearch}
                  onChange={(event) => handleFormChange("patientSearch", event.target.value)}
                />
              </>
            ) : (
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                placeholder="Add patient name"
                value={form.patientName}
                onChange={(event) => handleFormChange("patientName", event.target.value)}
              />
            )}
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Service</label>
            <Select
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              value={form.serviceId}
              onChange={(event) => handleFormChange("serviceId", event.target.value)}
              native
            >
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} | {formatPrice(service.priceCents)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Team Member</label>
            <Select
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              value={form.staffId}
              onChange={(event) => handleFormChange("staffId", event.target.value)}
              native
            >
              <option value="">Unassigned</option>
              {staffOptions.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Date &amp; Time</label>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              value={form.datetime}
              onChange={(event) => handleFormChange("datetime", event.target.value)}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Notes</label>
            <textarea
              className="mt-1 h-20 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              placeholder="Add any visit prep details"
              value={form.notes}
              onChange={(event) => handleFormChange("notes", event.target.value)}
            />
          </div>
          <div className="lg:col-span-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Saving..." : "Create Appointment"}
            </button>
          </div>
        </form>
      </section>

      <section className={cardClass}>
        <header className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">Pipeline</p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Upcoming &amp; recent visits</h2>
          </div>
          <span className="text-xs text-slate-500">
            Showing {filteredAppointments.length} of {appointments.length} records
          </span>
        </header>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["today", "date", "all"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.25em] transition ${
                  viewMode === mode
                    ? "border-indigo-400 bg-indigo-500/20 text-indigo-100"
                    : "border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-100"
                }`}
              >
                {mode === "today" ? "Today" : mode === "date" ? "Pick Date" : "All"}
              </button>
            ))}
          </div>
          {viewMode === "date" && (
            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none lg:w-auto"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-slate-600 dark:text-slate-300">
            <thead className="text-xs uppercase tracking-[0.3em] text-slate-500">
              <tr className="border-b border-slate-200/70 dark:border-slate-800/60">
                <th className="px-3 py-2 text-left">Patient</th>
                <th className="px-3 py-2 text-left">Service</th>
                <th className="px-3 py-2 text-left">Team</th>
                <th className="px-3 py-2 text-center">Scheduled</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((appointment) => (
                <tr key={appointment.id} className="border-b border-slate-200/60 dark:border-slate-800/40 last:border-b-0">
                  <td className="px-3 py-3 text-slate-900 dark:text-slate-100">{getAppointmentPatient(appointment)}</td>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400">
                    <div className="font-medium text-slate-700 dark:text-slate-200">{appointment.service.name}</div>
                    <p className="text-xs text-slate-500">{formatPrice(appointment.service.priceCents)}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{appointment.staff?.name ?? "Unassigned"}</td>
                  <td className="px-3 py-3 text-center text-slate-700 dark:text-slate-200">
                    {format(new Date(appointment.date), "MMM d, yyyy | h:mm a")}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Select
                      className="rounded-full border border-indigo-400/40 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100 focus:border-indigo-400 focus:outline-none"
                      value={appointment.status}
                      onChange={(event) =>
                        handleStatusChange(appointment.id, event.target.value as Appointment["status"])
                      }
                      disabled={submitting}
                      native
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status.replace("_", " ")}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      className="rounded-full border border-rose-500/60 px-3 py-1 text-xs text-rose-300 transition hover:bg-rose-500/10"
                      onClick={() => handleDelete(appointment.id)}
                      disabled={submitting}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filteredAppointments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-500">
                    No appointments match this view.
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


