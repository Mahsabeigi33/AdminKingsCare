import DoctorsManager from "./DoctorsManager"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function DoctorsPage() {
  const doctors = await prisma.doctor.findMany({
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  })

  const serialized = doctors.map((doctor) => ({
    ...doctor,
    createdAt: doctor.createdAt.toISOString(),
    updatedAt: doctor.updatedAt.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">Team</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Manage Doctors</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Create and update doctor profiles, photos, bios, and availability flags shown to clients.
        </p>
      </header>
      <DoctorsManager initialDoctors={serialized} />
    </div>
  )
}
