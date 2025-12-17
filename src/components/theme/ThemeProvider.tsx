"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

type Theme = "light" | "dark"

type ThemeContextValue = {
  theme: Theme
  setTheme: (next: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyThemeToDocument(theme: Theme) {
  if (typeof window === "undefined") return
  const root = window.document.documentElement
  root.classList.remove("light", "dark")
  root.classList.add(theme)
  root.style.colorScheme = theme
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark")
  const [hasUserPreference, setHasUserPreference] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    const stored = window.localStorage.getItem("admin-theme") as Theme | null
    if (stored === "light" || stored === "dark") {
      setHasUserPreference(true)
      setThemeState(stored)
      return
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    setThemeState(prefersDark ? "dark" : "light")
  }, [])

  useEffect(() => {
    applyThemeToDocument(theme)
  }, [theme])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (hasUserPreference) return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = (event: MediaQueryListEvent) => {
      setThemeState(event.matches ? "dark" : "light")
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [hasUserPreference])

  const persistTheme = useCallback((next: Theme) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("admin-theme", next)
    }
  }, [])

  const setTheme = useCallback(
    (next: Theme) => {
      setHasUserPreference(true)
      setThemeState(next)
      persistTheme(next)
    },
    [persistTheme]
  )

  const toggleTheme = useCallback(() => {
    setHasUserPreference(true)
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark"
      persistTheme(next)
      return next
    })
  }, [persistTheme])

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
