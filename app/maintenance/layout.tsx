import type React from "react"

export default function MaintenanceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // This layout skips the MaintenanceCheck to prevent redirect loops
  return <>{children}</>
}