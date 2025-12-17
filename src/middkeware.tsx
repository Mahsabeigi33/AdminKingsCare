export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    "/admin/:path*"       // everything under /admin requires auth
  ],
}
