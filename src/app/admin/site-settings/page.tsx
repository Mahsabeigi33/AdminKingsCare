import SiteSettingsManager from "./SiteSettingsManager"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function SiteSettingsPage() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: "site" } })

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">Settings</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Site Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Manage announcement text shown on the public home page hero.
        </p>
      </header>
      <SiteSettingsManager initialSettings={{ homeHeroAnnouncement: settings?.homeHeroAnnouncement ?? null }} />
    </div>
  )
}
