import SpecialtyClinicsManager from "./SpecialtyClinicsManager"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function SpecialtyClinicsPage() {
  const clinics = await prisma.specialtyClinic.findMany({
    orderBy: { createdAt: "desc" },
  })

  const serializedClinics = clinics.map((clinic) => ({
    ...clinic,
    createdAt: clinic.createdAt.toISOString(),
    updatedAt: clinic.updatedAt.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">Operations</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Manage Specialty Clinics</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Add and update specialty clinic cards shown on the public site.
        </p>
      </header>
      <SpecialtyClinicsManager initialClinics={serializedClinics} />
    </div>
  )
}
