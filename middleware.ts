import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

export async function middleware(request: NextRequest) {
  const session = await auth()
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/privacy",
    "/terms",
    "/api/auth/signin",
    "/api/auth/signup",
    "/api/auth/callback",
    "/api/auth/session",
    "/api/auth/providers",
    "/api/auth/csrf",
    "/api/auth/register",
  ]

  // Check if route is public or API route (handled by route itself)
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route))
  const isNextInternal = pathname.startsWith("/_next") || pathname.startsWith("/api/auth/")

  // Allow public routes and Next.js internal routes
  if (isPublicRoute || isNextInternal) {
    return NextResponse.next()
  }

  // Require authentication for all other routes
  if (!session?.user) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  // Admin-only routes
  if (pathname.startsWith("/admin")) {
    if (session.user.role !== "ADMIN") {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }
  }

  // Legacy/development pages - redirect to dashboard
  const legacyPages = [
    "/bc-admin",
    "/test",
    "/test-apply",
    "/test-auth",
    "/test-install",
    "/simple-test",
    "/debug-modifiers",
    "/investigate-product",
    "/apply-correct-pricing",
    "/catalog-pricing-fix",
    "/clear-pricing",
    "/modifiers",
    "/analyze-working-modifiers",
  ]

  if (legacyPages.some(page => pathname.startsWith(page))) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    url.searchParams.set("legacy_redirect", "true")
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}