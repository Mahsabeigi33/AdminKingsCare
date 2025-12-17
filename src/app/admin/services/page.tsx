import ServicesManager from "./ServicesManager"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function ServicesPage() {
  const services = await prisma.service.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      parent: { select: { id: true, name: true } },
      subServices: {
        select: { id: true, name: true, active: true },
        orderBy: { name: "asc" },
      },
    },
  })

  const serializedServices = services.map((service) => ({
    ...service,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">Operations</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Manage Services</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Add, pause, or edit available services offered to KingsCare Medical Clinic visitors.
        </p>
      </header>
      <ServicesManager initialServices={serializedServices} />
    </div>
  )
}

