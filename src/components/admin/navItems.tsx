import type { ComponentType, SVGProps } from "react"

export type AdminNavItem = {
  href: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

const createIcon = (path: string) => {
  const Icon = (props: SVGProps<SVGSVGElement>) => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={1.8}
      stroke="currentColor"
      {...props}
    >
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  Icon.displayName = "AdminNavIcon"
  return Icon
}

const DashboardIcon = createIcon("M3 12h18M3 6h12M3 18h6")
const ServicesIcon = createIcon("M4 6h16l-1 12H5L4 6zm3 0V4a5 5 0 1110 0v2")
const AppointmentsIcon = createIcon("M8 6V4m8 2V4m-9 6h10m-12 10h14a1 1 0 001-1V9a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1z")
const BlogsIcon = createIcon("M5 4h9l5 5v11a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1zm9 0v5h5")
const UsersIcon = createIcon("M16 16v3m-8-3v3m12-5a4 4 0 10-8 0m-8 5v-1a5 5 0 015-5h6a5 5 0 015 5v1M8 7a4 4 0 118 0 4 4 0 01-8 0z")
const PatientsIcon = createIcon("M17 21v-2a4 4 0 00-4-4h-2a4 4 0 00-4 4v2m9-13a4 4 0 11-8 0 4 4 0 018 0z")

export const adminNavItems: AdminNavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/admin/services", label: "Services", icon: ServicesIcon },
  { href: "/admin/appointments", label: "Appointments", icon: AppointmentsIcon },
  { href: "/admin/blogs", label: "Blogs", icon: BlogsIcon },
  { href: "/admin/users", label: "Users", icon: UsersIcon },
  { href: "/admin/patients", label: "Patients", icon: PatientsIcon },
]
