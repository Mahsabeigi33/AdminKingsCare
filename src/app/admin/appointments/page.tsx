import AppointmentsManager, { type Appointment as ManagerAppointment } from "./AppointmentsManager"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function AppointmentsPage() {
  const [appointments, patients, services, staff] = await Promise.all([
    prisma.appointment.findMany({
      orderBy: { date: "desc" },
      take: 40,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        service: { select: { id: true, name: true, priceCents: true } },
        staff: { select: { id: true, name: true } },
      },
    }),
    prisma.patient.findMany({
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.service.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, priceCents: true },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ])

  const serializedAppointments: ManagerAppointment[] = appointments.map((appointment) => ({
    ...(appointment as unknown as Omit<ManagerAppointment, "date"> & { date: Date }),
    date: appointment.date.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">Scheduling</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Manage Appointments</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Track bookings, adjust statuses, and create new visits for KingsCare Medical Clinic patients.
        </p>
      </header>
      <AppointmentsManager
        initialAppointments={serializedAppointments}
        patients={patients}
        services={services}
        staff={staff}
      />
    </div>
  )
}

