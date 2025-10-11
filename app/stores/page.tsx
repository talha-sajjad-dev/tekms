"use client"

import { Suspense } from "react"
import StoresPageContent from "./stores-content"

export default function StoresPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <StoresPageContent />
    </Suspense>
  )
}