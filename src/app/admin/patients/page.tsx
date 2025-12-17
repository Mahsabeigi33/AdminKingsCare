import PatientsManager from "./PatientsManager"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function PatientsPage() {
  const patients = await prisma.patient.findMany({
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      serviceUsages: {
        orderBy: { usedAt: "desc" },
        include: {
          service: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  })

  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  })

  const serializedPatients = patients.map((patient) => ({
    ...patient,
    createdAt: patient.createdAt.toISOString(),
    updatedAt: patient.updatedAt.toISOString(),
    dob: patient.dob ? patient.dob.toISOString() : null,
    serviceUsages: patient.serviceUsages.map((usage) => ({
      ...usage,
      usedAt: usage.usedAt.toISOString(),
    })),
  }));

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">People</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Manage Patients</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Maintain accurate patient records and quick actions for KingsCare Medical Clinic care teams.
        </p>
      </header>
      <PatientsManager
        initialPatients={serializedPatients}
        services={services}
      />
    </div>
  )
}

