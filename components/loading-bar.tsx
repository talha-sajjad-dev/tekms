'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export function LoadingBar() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(timer)
  }, [pathname])

  if (!loading) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-blue-600 to-cyan-600 animate-pulse">
      <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 animate-[shimmer_1s_ease-in-out_infinite]"></div>
    </div>
  )
}