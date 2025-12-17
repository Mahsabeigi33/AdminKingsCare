"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/theme/ThemeProvider"

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white/70 text-slate-700 shadow-sm transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-800"
    >
      {isDark ? <Sun aria-hidden className="h-4 w-4" /> : <Moon aria-hidden className="h-4 w-4" />}
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}


