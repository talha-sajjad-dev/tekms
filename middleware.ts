import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/privacy",
    "/terms",
    "/maintenance",
    "/api/auth/signin",
    "/api/auth/signup",
    "/api/auth/callback",
    "/api/auth/session",
    "/api/auth/providers",
    "/api/auth/csrf",
    "/api/auth/register",
    "/api/settings/public",
    "/api/maintenance/unlock",
  ]

  // Check if route is public or API route (handled by route itself)
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route))
  const isNextInternal = pathname.startsWith("/_next") || pathname.startsWith("/api/auth/")

  // Allow public routes and Next.js internal routes
  if (isPublicRoute || isNextInternal) {
    return NextResponse.next()
  }

  // For protected routes, we'll let the page components handle authentication
  // This avoids importing heavy dependencies in middleware
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