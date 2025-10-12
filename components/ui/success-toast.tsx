'use client'

import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface SuccessToastProps {
  message: string
  onClose: () => void
}

export function SuccessToast({ message, onClose }: SuccessToastProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation
    setTimeout(() => setIsVisible(true), 10)
    
    // Auto close after 3 seconds
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300)
    }, 3000)

    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none">
      <div 
        className={`
          bg-green-600 text-white px-8 py-6 rounded-lg shadow-2xl
          flex items-center gap-4 pointer-events-auto
          transition-all duration-300 transform
          ${isVisible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}
        `}
      >
        <div className="bg-white rounded-full p-2">
          <CheckCircle2 className="h-8 w-8 text-green-600 animate-pulse" />
        </div>
        <div>
          <p className="font-semibold text-lg">Success!</p>
          <p className="text-green-50">{message}</p>
        </div>
      </div>
    </div>
  )
}