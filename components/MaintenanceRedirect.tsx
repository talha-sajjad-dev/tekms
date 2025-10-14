'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export function MaintenanceRedirect() {
  const router = useRouter()
  const { data: session } = useSession()

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        // Skip check for admins
        if (session?.user?.role === 'ADMIN') {
          return
        }

        // Check if bypass cookie exists
        const cookies = document.cookie.split(';')
        const hasBypass = cookies.some(c => c.trim().startsWith('maintenance_bypass=true'))
        if (hasBypass) {
          return
        }

        // Check maintenance mode from settings
        const res = await fetch('/api/settings/public')
        const data = await res.json()
        
        if (data.settings?.['general.maintenance_mode'] === 'true') {
          router.push('/maintenance')
        }
      } catch (error) {
        console.error('Maintenance check failed:', error)
      }
    }

    checkMaintenance()
  }, [session, router])

  return null
}