import type React from "react"
import "@/app/globals.css"

export default function SimpleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}