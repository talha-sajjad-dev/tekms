import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { NavBar } from "@/components/nav-bar"
import { SessionProvider } from "next-auth/react"
import { LoadingBar } from "@/components/loading-bar"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "TEKMS - Multi-Channel E-commerce Automation",
  description: "Automate your multi-channel e-commerce product management across BigCommerce, TikTok, and Etsy",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <SessionProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <LoadingBar />
            <NavBar />
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
