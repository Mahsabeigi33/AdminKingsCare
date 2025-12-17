import UsersManager from "./UsersManager"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  })

  const serializedUsers = users.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">Team</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Manage Admin Users</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Invite new teammates, adjust access, and reset credentials for the KingsCare Medical Clinic admin portal.
        </p>
      </header>
      <UsersManager initialUsers={serializedUsers} />
    </div>
  )

}
