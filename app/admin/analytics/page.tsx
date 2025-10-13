"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BarChart3, TrendingUp, Package, Users } from 'lucide-react'
import { ProductAnalytics } from '@/components/products/ProductAnalytics'

export default function AdminAnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [systemStats, setSystemStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    } else if (status === 'authenticated') {
      if (session?.user?.role !== 'ADMIN') {
        router.push('/dashboard')
      } else {
        fetchData()
      }
    }
  }, [status, session])

  const fetchData = async () => {
    try {
      const [analyticsRes, statsRes] = await Promise.all([
        fetch('/api/analytics'),
        fetch('/api/admin/stats')
      ])

      if (analyticsRes.ok) {
        const data = await analyticsRes.json()
        setAnalyticsData(data)
      }

      if (statsRes.ok) {
        const data = await statsRes.json()
        setSystemStats(data)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="border-b bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <BarChart3 className="h-8 w-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold">Product Analytics</h1>
              <p className="text-sm text-muted-foreground">
                System-wide product statistics and insights
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* System Overview */}
        {systemStats && (
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Users</CardDescription>
                <CardTitle className="text-3xl text-blue-600">
                  {systemStats.totalUsers}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Connected Stores</CardDescription>
                <CardTitle className="text-3xl text-green-600">
                  {systemStats.totalStores}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Products</CardDescription>
                <CardTitle className="text-3xl text-purple-600">
                  {systemStats.totalProducts?.toLocaleString()}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Monthly Revenue</CardDescription>
                <CardTitle className="text-3xl text-green-600">
                  ${systemStats.monthlyRevenue?.toFixed(2)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Product Analytics */}
        {analyticsData && (
          <ProductAnalytics data={analyticsData} />
        )}
      </div>
    </div>
  )
}