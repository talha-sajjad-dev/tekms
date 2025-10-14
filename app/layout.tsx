import type React from "react"
import { Suspense } from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { Footer } from "@/components/footer"
import { LoadingBar } from "@/components/loading-bar"
import { MaintenanceRedirect } from "@/components/MaintenanceRedirect"
import { Providers } from "./providers"

const inter = Inter({ subsets: ["latin"] })

// Metadata is now dynamic - see DynamicMetadata component below
export const metadata = {
  title: "TEKMS Listing Manager",
  description: "Manage all your marketplace listings in one place - BigCommerce, Shopify, Etsy, TikTok",
  generator: 'v0.dev'
}

// Dynamic favicon and title component
function DynamicMetadata() {
  if (typeof window === 'undefined') return null
  
  // Fetch and apply settings on client side
  fetch('/api/settings/public')
    .then(res => res.json())
    .then(data => {
      const settings = data.settings || {}
      
      // Update favicon
      if (settings['website.favicon_url']) {
        const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link')
        link.type = 'image/x-icon'
        link.rel = 'icon'
        link.href = settings['website.favicon_url']
        if (!document.querySelector("link[rel*='icon']")) {
          document.getElementsByTagName('head')[0].appendChild(link)
        }
      }
      
      // Update title
      if (settings['website.name']) {
        document.title = settings['website.name']
      }
    })
    .catch(console.error)
  
  return null
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} flex flex-col min-h-screen`} suppressHydrationWarning>
        <Providers>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <MaintenanceRedirect />
            <DynamicMetadata />
            <Suspense fallback={null}>
              <LoadingBar />
            </Suspense>
            <div className="flex-1">
              {children}
            </div>
            <Footer />
            <Toaster />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}
