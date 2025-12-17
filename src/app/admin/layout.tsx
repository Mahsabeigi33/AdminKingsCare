import type { ReactNode } from "react"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { AdminSidebar } from "@/components/admin/Sidebar"
import { AdminTopbar } from "@/components/admin/Topbar"
import { authOptions } from "@/lib/auth"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  return (
    <div className="admin-shell min-h-screen bg-background text-foreground transition-colors">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <AdminSidebar />
        <div className="flex flex-1 flex-col">
          <AdminTopbar user={session.user} />
          <main className="flex-1 overflow-y-auto bg-gradient-to-b from-background via-background to-muted/50 p-4 sm:p-6 lg:p-8 transition-colors dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
            <div className="mx-auto w-full max-w-6xl space-y-8">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
