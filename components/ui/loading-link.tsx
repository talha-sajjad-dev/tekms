'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingLinkProps {
  href: string
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function LoadingLink({ href, children, className, onClick }: LoadingLinkProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    setIsLoading(true)
    
    if (onClick) {
      onClick()
    }
    
    // Navigate after a brief moment to show loading state
    setTimeout(() => {
      router.push(href)
      // Reset loading after navigation
      setTimeout(() => setIsLoading(false), 500)
    }, 100)
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-2 transition-all',
        isLoading && 'opacity-70 cursor-wait',
        className
      )}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </Link>
  )
}