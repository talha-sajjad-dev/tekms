"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSession } from "@/components/providers/session-provider"
import { UserMenu } from "@/components/auth/user-menu"
import { Button } from "@/components/ui/button"
import { LoginModal } from "@/components/auth/login-modal"
import { Zap } from "lucide-react"
import { useState } from "react"

export function NavBar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [showLoginModal, setShowLoginModal] = useState(false)

  // Show different links based on authentication
  const publicLinks = [
    { href: "#features", label: "Features" },
    { href: "#pricing", label: "Pricing" },
    { href: "#faq", label: "FAQ" },
  ]

  const authenticatedLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/bigcommerce", label: "BigCommerce" },
    { href: "/dashboard/tiktok", label: "TikTok" },
    { href: "/dashboard/etsy", label: "Etsy" },
  ]

  const links = session ? authenticatedLinks : publicLinks

  return (
    <>
      <div className="bg-background border-b sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href={session ? "/dashboard" : "/"} className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">Commerce Automation</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "transition-colors hover:text-foreground/80",
                    pathname === link.href ? "text-foreground" : "text-foreground/60",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {session ? (
              <UserMenu user={session.user} />
            ) : (
              <Button onClick={() => setShowLoginModal(true)}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>

      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
    </>
  )
}
