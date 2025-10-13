'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Settings,
  Users,
  DollarSign,
  Shield,
  ArrowLeft,
  Store,
  Package,
  BarChart3,
  FileText
} from 'lucide-react'

export default function AdminDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    } else if (status === 'authenticated') {
      if (session?.user?.role !== 'ADMIN') {
        router.push('/dashboard')
      } else {
        fetchStats()
      }
    }
  }, [status, session])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats')
      const data = await res.json()
      if (res.ok) {
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (session?.user?.role !== 'ADMIN') {
    return null
  }

  const adminCards = [
    {
      title: 'System Settings',
      description: 'Configure API keys, OAuth, Stripe, Email, and AI integrations',
      icon: Settings,
      href: '/admin/settings',
      color: 'from-blue-600 to-cyan-600',
      badge: 'Essential'
    },
    {
      title: 'Website Settings',
      description: 'Manage branding, pages, footer, platform icons, and SEO',
      icon: FileText,
      href: '/admin/settings/website',
      color: 'from-cyan-600 to-blue-600',
      badge: null
    },
    {
      title: 'Pricing Tiers',
      description: 'Manage store pricing tiers and subscription plans',
      icon: DollarSign,
      href: '/admin/pricing',
      color: 'from-green-600 to-emerald-600',
      badge: null
    },
    {
      title: 'User Management',
      description: 'Manage users, permissions, and legacy feature access',
      icon: Users,
      href: '/admin/users',
      color: 'from-purple-600 to-pink-600',
      badge: null
    },
    {
      title: 'Store Connections',
      description: 'View all user store connections and subscriptions',
      icon: Store,
      href: '/admin/stores',
      color: 'from-orange-600 to-red-600',
      badge: null
    },
    {
      title: 'Product Analytics',
      description: 'View product statistics and import/export analytics',
      icon: BarChart3,
      href: '/admin/analytics',
      color: 'from-indigo-600 to-blue-600',
      badge: null
    },
    {
      title: 'System Health',
      description: 'Monitor system performance, errors, and API usage',
      icon: Package,
      href: '/admin/health',
      color: 'from-gray-600 to-slate-600',
      badge: null
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="h-8 w-8 text-orange-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                  <p className="text-sm text-gray-600">
                    System management and configuration
                  </p>
                </div>
              </div>
            </div>
            <Badge variant="outline" className="border-orange-200 text-orange-600">
              Admin Only
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Welcome Message */}
        <Card className="mb-8 bg-gradient-to-r from-orange-600 to-red-600 border-0 text-white">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-2">Welcome, Administrator</h2>
            <p className="text-orange-100">
              You have full access to system configuration, user management, and analytics.
            </p>
          </CardContent>
        </Card>

        {/* Admin Tools Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminCards.map((card, index) => (
            <Card 
              key={index}
              className="hover:shadow-lg transition-all cursor-pointer border-blue-100 bg-white/80 backdrop-blur-sm group"
              onClick={() => {
                if (!card.badge || card.badge === 'Essential' || card.badge === null) {
                  router.push(card.href)
                }
              }}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${card.color} group-hover:scale-110 transition-transform`}>
                    <card.icon className="h-6 w-6 text-white" />
                  </div>
                  {card.badge && (
                    <Badge 
                      variant={card.badge === 'Essential' ? 'default' : 'outline'}
                      className={
                        card.badge === 'Essential' 
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600'
                          : 'border-gray-300'
                      }
                    >
                      {card.badge}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg">{card.title}</CardTitle>
                <CardDescription className="text-sm">
                  {card.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid md:grid-cols-4 gap-4">
          <Card className="border-blue-100 bg-white/80">
            <CardHeader className="pb-2">
              <CardDescription>Total Users</CardDescription>
              <CardTitle className="text-3xl text-blue-600">
                {loading ? '...' : stats?.totalUsers || 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600">Active users</p>
            </CardContent>
          </Card>

          <Card className="border-blue-100 bg-white/80">
            <CardHeader className="pb-2">
              <CardDescription>Connected Stores</CardDescription>
              <CardTitle className="text-3xl text-blue-600">
                {loading ? '...' : stats?.totalStores || 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600">OAuth connections</p>
            </CardContent>
          </Card>

          <Card className="border-blue-100 bg-white/80">
            <CardHeader className="pb-2">
              <CardDescription>Total Products</CardDescription>
              <CardTitle className="text-3xl text-blue-600">
                {loading ? '...' : stats?.totalProducts?.toLocaleString() || 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600">Across all stores</p>
            </CardContent>
          </Card>

          <Card className="border-blue-100 bg-white/80">
            <CardHeader className="pb-2">
              <CardDescription>Monthly Revenue</CardDescription>
              <CardTitle className="text-3xl text-blue-600">
                ${loading ? '...' : stats?.monthlyRevenue?.toFixed(2) || '0.00'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600">Subscription income</p>
            </CardContent>
          </Card>
        </div>

        {/* Important Notes */}
        <Card className="mt-8 border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <Shield className="h-5 w-5" />
              Important Admin Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-orange-800">
            <p>• Configure System Settings first to enable OAuth store connections</p>
            <p>• All API keys and secrets are encrypted in the database (AES-256-GCM)</p>
            <p>• Changes take effect immediately without server restart</p>
            <p>• Users can only connect stores after OAuth credentials are configured</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}