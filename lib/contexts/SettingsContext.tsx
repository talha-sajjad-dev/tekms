"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface SettingsContextType {
  settings: Record<string, string>
  loading: boolean
  refresh: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType>({
  settings: {},
  loading: true,
  refresh: async () => {}
})

export function useSettings() {
  return useContext(SettingsContext)
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const fetchSettings = async () => {
    try {
      // Fetch public settings only (for frontend)
      const res = await fetch('/api/settings/public')
      const data = await res.json()
      
      if (res.ok) {
        setSettings(data.settings || {})
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const refresh = async () => {
    setLoading(true)
    await fetchSettings()
  }

  return (
    <SettingsContext.Provider value={{ settings, loading, refresh }}>
      {children}
    </SettingsContext.Provider>
  )
}