"use client"

import Link from "next/link"
import { signOut } from "next-auth/react"
import { usePathname } from "next/navigation"
import { adminNavItems } from "./navItems"
import { ThemeToggle } from "./ThemeToggle"

type AdminTopbarProps = {
  user?: {
    name?: string | null
    email?: string | null
  }
}

export function AdminTopbar({ user }: AdminTopbarProps) {
  const pathname = usePathname()

  return (
    <header className="border-b border-border bg-white/80 px-4 py-4 backdrop-blur transition-colors dark:bg-slate-950/80">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-indigo-600 dark:text-indigo-400">Overview</p>
            <h1 className="text-xl font-semibold text-foreground">
              {adminNavItems.find((item) => pathname.startsWith(item.href))?.label ?? "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-foreground">{user?.name ?? "Admin"}</p>
              <p className="text-xs text-muted-foreground">{user?.email ?? "admin@kingscare.ca"}</p>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-xl bg-indigo-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500/90 focus-visible:ring-2 focus-visible:ring-indigo-400/60 dark:hover:bg-indigo-400"
            >
              Sign Out
            </button>
          </div>
        </div>

        <nav className="-mx-2 flex snap-x snap-mandatory gap-1 overflow-x-auto border-t border-border pt-3 text-xs text-muted-foreground transition-colors lg:hidden">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`snap-center rounded-full px-3 py-2 transition-colors ${
                  isActive
                    ? "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200"
                    : "hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}

