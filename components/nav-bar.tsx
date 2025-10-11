"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function NavBar() {
  const pathname = usePathname()

  const links = [
    { href: "/", label: "Product Manager" },
    { href: "/dashboard", label: "Dashboard" },
    // Hidden: { href: "/modifiers", label: "Add Modifiers" },
    // Hidden: { href: "/catalog-pricing-fix", label: "Catalog Pricing Fix" },
    // Hidden: { href: "/clear-pricing", label: "Clear Pricing" },
    // Hidden: { href: "/apply-correct-pricing", label: "Apply Correct Pricing" },
    { href: "/tiktok-export", label: "TikTok Export" },
    { href: "/tiktok-direct", label: "TikTok Direct" },
    { href: "/etsy-import", label: "Etsy Import" },
  ]

  return (
    <div className="bg-background border-b">
      <div className="container flex h-16 items-center">
        <div className="mr-8 font-bold text-lg">BigCommerce API</div>
        <nav className="flex items-center space-x-6 text-sm font-medium">
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
    </div>
  )
}
