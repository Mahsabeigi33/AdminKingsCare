import { prisma } from "@/lib/prisma"
import { format } from "date-fns"

const STAT_CARD_CLASSES = "rounded-3xl border border-slate-200/70 dark:border-slate-800/60 bg-white/90 dark:bg-slate-950/80 p-6 shadow-2xl shadow-slate-200/60 dark:shadow-black/20"

const STATUS_COLORS: Record<string, string> = {
  BOOKED: "text-amber-300 bg-amber-500/10 border-amber-400/40",
  COMPLETED: "text-emerald-300 bg-emerald-500/10 border-emerald-400/40",
  CANCELLED: "text-rose-300 bg-rose-500/10 border-rose-400/40",
  NO_SHOW: "text-slate-600 dark:text-slate-300 bg-slate-500/10 border-slate-400/40",
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

export default async function DashboardPage() {
  const now = new Date()

  const [patientsCount, appointmentsCount, servicesCount, upcomingCount, latestAppointments, popularServices, newPatients] =
    await Promise.all([
      prisma.patient.count(),
      prisma.appointment.count(),
      prisma.service.count(),
      prisma.appointment.count({ where: { date: { gte: now }, status: { in: ["BOOKED"] } } }),
      prisma.appointment.findMany({
        orderBy: { date: "desc" },
        take: 6,
        include: {
          
          patient: { select: { firstName: true, lastName: true } },
          service: { select: { name: true } },
        },
      }),
      prisma.service.findMany({
        orderBy: { appointments: { _count: "desc" } },
        take: 5,
        where: { active: true },
        include: { _count: { select: { appointments: true } } },
      }),
      prisma.patient.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, firstName: true, lastName: true, createdAt: true },
      }),
    ])

  const stats = [
    {
      label: "Total Patients",
      value: patientsCount,
      delta: newPatients.length,
      descriptor: "new this week",
    },
    {
      label: "Total Appointments",
      value: appointmentsCount,
      delta: upcomingCount,
      descriptor: "upcoming",
    },
    {
      label: "Active Services",
      value: servicesCount,
      delta: popularServices.length > 0
        ? Math.max(
            ...popularServices.map(
              (service: { _count: { appointments: number } }) =>
                service._count.appointments
            )
          )
        : 0,
      descriptor: "top service bookings",
    },
     
  ]

  return (
    <div className="space-y-10">
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className={`${STAT_CARD_CLASSES} relative overflow-hidden`}>
            <div className="space-y-4">
              <div>
                <p className="text-sm uppercase tracking-[0.32em] text-indigo-500 dark:text-indigo-300/70">{item.label}</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
                  {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
                </p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-indigo-600 dark:text-indigo-200">{item.delta.toLocaleString()}</span> {item.descriptor}
              </p>
            </div>
            <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full border border-indigo-500/40 bg-indigo-500/10 blur-2xl" />
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4 rounded-3xl border border-slate-200/70 dark:border-slate-800/60 bg-white/90 dark:bg-slate-950/80 p-6 shadow-2xl shadow-slate-200/60 dark:shadow-black/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">Today Flow</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">Recent Appointments</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.3em] text-slate-500">
                <tr className="border-b border-slate-200/70 dark:border-slate-800/60">
                  <th className="px-3 py-2">Patient</th>
                  <th className="px-3 py-2">Service</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2 text-center">Status</th>
                </tr>
              </thead>
             <tbody>
              {latestAppointments.map((appointment: {
                id: string | number
                date: string | Date | null
                status?: string | null
                patient?: { firstName?: string | null; lastName?: string | null } | null
                service?: { name?: string | null } | null
              }) => (
                <tr key={appointment.id} className="border-b border-slate-200/60 dark:border-slate-800/40 last:border-b-0">
                  <td className="px-3 py-3 text-slate-700 dark:text-slate-200">
                    {appointment.patient?.firstName} {appointment.patient?.lastName}
                  </td>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{appointment.service?.name}</td>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400">
                    {appointment.date
                      ? format(new Date(appointment.date), "MMM d, yyyy 'at' h:mm a")
                      : '-'}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                        STATUS_COLORS[appointment.status ?? ""] ??
                        "text-slate-600 dark:text-slate-300 border-slate-400 dark:border-slate-600 bg-slate-700/40"
                      }`}
                    >
                      {appointment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800/60 bg-white/90 dark:bg-slate-950/80 p-6 shadow-2xl shadow-slate-200/60 dark:shadow-black/20">
            <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">Service Mix</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">Top Performing Services</h2>
            <ul className="mt-4 space-y-4 text-sm">
              {popularServices.map((service: {
                id: string | number
                name: string
                priceCents: number
                _count: { appointments: number }
              }) => (
                <li key={service.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-200">{service.name}</p>
                    <p className="text-xs text-slate-500">{formatPrice(service.priceCents)}</p>
                  </div>
                  <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-200">
                    {service._count.appointments}
                  </span>
                </li>
              ))}
              {popularServices.length === 0 && (
                <li className="text-sm text-slate-500">No services available yet.</li>
              )}
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800/60 bg-white/90 dark:bg-slate-950/80 p-6 shadow-2xl shadow-slate-200/60 dark:shadow-black/20">
            <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">New Patients</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">This Week</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {newPatients.map((patient: {
                id: string | number
                firstName?: string
                lastName?: string
                createdAt: string | number | Date
              }) => (
                <li key={patient.id} className="flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-200">{patient.firstName} {patient.lastName}</span>
                  <span className="text-xs text-slate-500">{format(new Date(patient.createdAt), "MMM d")}</span>
                </li>
              ))}
              {newPatients.length === 0 && (
                <li className="text-sm text-slate-500">No patients added yet.</li>
              )}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}


