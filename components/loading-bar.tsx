'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function LoadingBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Start loading
    setLoading(true)
    setProgress(0)

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev
        return prev + Math.random() * 10
      })
    }, 100)

    // Complete after route change
    const completeTimer = setTimeout(() => {
      setProgress(100)
      setTimeout(() => {
        setLoading(false)
        setProgress(0)
      }, 200)
    }, 500)

    return () => {
      clearInterval(progressInterval)
      clearTimeout(completeTimer)
    }
  }, [pathname, searchParams])

  if (!loading && progress === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999]">
      <div
        className="h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 transition-all duration-300 ease-out shadow-lg"
        style={{
          width: `${progress}%`,
          boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
        }}
      >
        <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1s_ease-in-out_infinite]"></div>
      </div>
    </div>
  )
}