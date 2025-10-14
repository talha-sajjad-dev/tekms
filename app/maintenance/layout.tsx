import type React from "react"

export default function MaintenanceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // This layout does NOT include MaintenanceRedirect to prevent redirect loops
  // Also no html/body tags to prevent nesting issues
  return <>{children}</>
}