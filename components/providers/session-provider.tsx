'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface User {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  role?: 'USER' | 'ADMIN'
}

interface Session {
  user: User
  expires: string
}

interface SessionContextValue {
  data: Session | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
}

const SessionContext = createContext<SessionContextValue>({
  data: null,
  status: 'loading',
})

export function useSession() {
  return useContext(SessionContext)
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')

  useEffect(() => {
    // Fetch session from our API
    fetch('/api/auth/session')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch session')
        return res.json()
      })
      .then(data => {
        if (data && data.user) {
          setSession(data)
          setStatus('authenticated')
        } else {
          setSession(null)
          setStatus('unauthenticated')
        }
      })
      .catch(() => {
        setSession(null)
        setStatus('unauthenticated')
      })
  }, [])

  return (
    <SessionContext.Provider value={{ data: session, status }}>
      {children}
    </SessionContext.Provider>
  )
}