"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { adminNavItems } from "./navItems"

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-white/70 px-4 py-6 text-slate-700 backdrop-blur transition-colors dark:border-border dark:bg-slate-950/60 dark:text-slate-200 lg:flex lg:flex-col lg:gap-6">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">KingsCare Medical Clinic</p>
        <h2 className="text-lg font-semibold text-foreground"> Admin Panel </h2>
      </div>

      <nav className="mt-4 space-y-1 text-sm font-medium">
        {adminNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const ItemIcon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${
                isActive
                  ? "bg-indigo-500/10 text-indigo-600 shadow-sm ring-1 ring-inset ring-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-200"
                  : "text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:text-slate-300 dark:hover:bg-slate-900/60 dark:hover:text-white"
              }`}
            >
              <ItemIcon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto rounded-2xl bg-slate-100/80 px-4 py-5 text-slate-600 transition-colors dark:bg-slate-900/70 dark:text-slate-300">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Need Help?</p>
        <p className="mt-2 text-sm">
          Reach out to support@pharmacylyfe.com
        </p>
      </div>
    </aside>
  )
}


