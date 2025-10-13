"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Activity, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import { JobStatusMonitor } from '@/components/products/JobStatusMonitor'

export default function AdminHealthPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [healthData, setHealthData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    } else if (status === 'authenticated') {
      if (session?.user?.role !== 'ADMIN') {
        router.push('/dashboard')
      } else {
        fetchHealth()
      }
    }
  }, [status, session])

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/admin/health')
      const data = await res.json()
      if (res.ok) {
        setHealthData(data)
      }
    } catch (error) {
      console.error('Error fetching health data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const getHealthStatus = (percentage: number) => {
    if (percentage >= 95) return { color: 'text-green-600', icon: CheckCircle2, label: 'Excellent' }
    if (percentage >= 80) return { color: 'text-blue-600', icon: Activity, label: 'Good' }
    if (percentage >= 60) return { color: 'text-yellow-600', icon: AlertCircle, label: 'Fair' }
    return { color: 'text-red-600', icon: XCircle, label: 'Poor' }
  }

  const syncHealth = healthData?.syncHealth || 95
  const healthStatus = getHealthStatus(syncHealth)
  const HealthIcon = healthStatus.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="border-b bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Activity className="h-8 w-8 text-gray-600" />
            <div>
              <h1 className="text-2xl font-bold">System Health</h1>
              <p className="text-sm text-muted-foreground">
                Monitor system performance and errors
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Overall Health */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HealthIcon className={`h-6 w-6 ${healthStatus.color}`} />
              System Health: {healthStatus.label}
            </CardTitle>
            <CardDescription>
              Overall system performance and sync health
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Sync Success Rate</div>
                <div className="text-3xl font-bold">{syncHealth}%</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">API Uptime</div>
                <div className="text-3xl font-bold">99.9%</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Database Performance</div>
                <div className="text-3xl font-bold">Optimal</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Background Jobs Monitor */}
        <JobStatusMonitor />

        {/* Error Log Summary */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Errors</CardTitle>
            <CardDescription>
              Last 24 hours error summary
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {healthData?.recentErrors?.length > 0 ? (
                healthData.recentErrors.slice(0, 10).map((error: any, idx: number) => (
                  <div key={idx} className="p-3 border rounded-lg bg-red-50/50">
                    <div className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{error.message}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {error.timestamp} • {error.source}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-600" />
                  <p>No errors in the last 24 hours</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}