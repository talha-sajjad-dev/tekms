'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

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
  update: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue>({
  data: null,
  status: 'loading',
  update: async () => {},
})

export function useSession() {
  return useContext(SessionContext)
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', {
        credentials: 'include'
      })
      
      if (!res.ok) throw new Error('Failed to fetch session')
      
      const data = await res.json()
      
      if (data && data.user) {
        setSession(data)
        setStatus('authenticated')
      } else {
        setSession(null)
        setStatus('unauthenticated')
      }
    } catch (error) {
      setSession(null)
      setStatus('unauthenticated')
    }
  }, [])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  return (
    <SessionContext.Provider value={{ data: session, status, update: fetchSession }}>
      {children}
    </SessionContext.Provider>
  )
}