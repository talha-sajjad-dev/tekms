'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Activity, TrendingUp, Calendar, ShoppingCart, Video, Package } from 'lucide-react'
import { SUBSCRIPTION_TIERS } from '@/lib/subscription/plans'

interface UsageData {
  monthlyTotal: number
  platformBreakdown: {
    BIGCOMMERCE: number
    TIKTOK: number
    ETSY: number
    total: number
  }
  limitStatus: {
    allowed: boolean
    current: number
    limit: number
    tier: string
    remaining: number
  }
  history: Array<{
    date: string
    count: number
  }>
  daysUntilReset: number
}

export default function UsagePage() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsage()
  }, [])

  const fetchUsage = async () => {
    try {
      const response = await fetch('/api/usage')
      const data = await response.json()
      setUsage(data)
    } catch (error) {
      console.error('Failed to fetch usage:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <p>Loading usage data...</p>
      </div>
    )
  }

  if (!usage) {
    return (
      <div className="container mx-auto py-10 px-4">
        <p>Failed to load usage data</p>
      </div>
    )
  }

  const { monthlyTotal, platformBreakdown, limitStatus, history, daysUntilReset } = usage
  const tierConfig = SUBSCRIPTION_TIERS[limitStatus.tier as keyof typeof SUBSCRIPTION_TIERS]
  const usagePercentage = limitStatus.limit === -1 
    ? 0 
    : (limitStatus.current / limitStatus.limit) * 100

  const platformStats = [
    {
      name: 'BigCommerce',
      count: platformBreakdown.BIGCOMMERCE,
      icon: ShoppingCart,
      color: 'text-blue-600',
    },
    {
      name: 'TikTok',
      count: platformBreakdown.TIKTOK,
      icon: Video,
      color: 'text-pink-600',
    },
    {
      name: 'Etsy',
      count: platformBreakdown.ETSY,
      icon: Package,
      color: 'text-orange-600',
    },
  ]

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Usage & Limits</h1>
        <p className="text-muted-foreground">
          Track your monthly product operations
        </p>
      </div>

      {/* Current Usage Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyTotal}</div>
            <p className="text-xs text-muted-foreground">
              {limitStatus.limit === -1 ? 'Unlimited' : `of ${limitStatus.limit} products`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {limitStatus.limit === -1 ? '∞' : limitStatus.remaining}
            </div>
            <p className="text-xs text-muted-foreground">
              Products left this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            <Badge variant={limitStatus.tier === 'FREE' ? 'secondary' : 'default'}>
              {tierConfig.name}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${tierConfig.price}
            </div>
            <p className="text-xs text-muted-foreground">per month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resets In</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{daysUntilReset}</div>
            <p className="text-xs text-muted-foreground">days</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Progress */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Monthly Usage</CardTitle>
          <CardDescription>
            {limitStatus.limit === -1 
              ? 'You have unlimited product operations' 
              : `${limitStatus.current} of ${limitStatus.limit} products used (${usagePercentage.toFixed(1)}%)`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {limitStatus.limit !== -1 && (
            <div className="space-y-2">
              <Progress 
                value={usagePercentage} 
                className="h-3"
              />
              {usagePercentage > 80 && (
                <p className="text-sm text-orange-600">
                  ⚠️ You're approaching your monthly limit. Consider upgrading your plan.
                </p>
              )}
            </div>
          )}
          {limitStatus.limit === -1 && (
            <p className="text-sm text-muted-foreground">
              Enjoy unlimited product operations with your {tierConfig.name} plan! 🎉
            </p>
          )}
        </CardContent>
      </Card>

      {/* Platform Breakdown */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Usage by Platform</CardTitle>
          <CardDescription>Products processed per platform this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {platformStats.map((platform) => {
              const Icon = platform.icon
              const percentage = monthlyTotal > 0 
                ? (platform.count / monthlyTotal) * 100 
                : 0
              
              return (
                <div key={platform.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${platform.color}`} />
                      <span className="text-sm font-medium">{platform.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {platform.count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Usage History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Product operations over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No usage data yet</p>
          ) : (
            <div className="space-y-2">
              {history.slice(-10).reverse().map((day) => (
                <div key={day.date} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {new Date(day.date).toLocaleDateString()}
                  </span>
                  <span className="font-medium">{day.count} products</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}