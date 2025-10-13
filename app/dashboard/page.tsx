"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { UserNav } from "@/components/user-nav"
import {
  Package,
  Store,
  CreditCard,
  ShoppingBag,
  TrendingUp,
  Link as LinkIcon,
  Shield
} from "lucide-react"

interface UsageSummary {
  tier: string
  productUsage: {
    allowed: boolean
    current: number
    limit: number
    percentage: number
    remaining: number
  }
  platformBreakdown: Record<string, number>
  features: {
    bigcommerce: boolean
    shopify: boolean
    etsy: boolean
    tiktok: boolean
    bulkOps: boolean
    scheduledSync: boolean
    analytics: boolean
    api: boolean
  }
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [loadingUsage, setLoadingUsage] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    } else if (status === "authenticated") {
      fetchUsage()
    }
  }, [status, router])

  const fetchUsage = async () => {
    try {
      const res = await fetch("/api/usage")
      if (res.ok) {
        const data = await res.json()
        setUsage(data)
      }
    } catch (error) {
      console.error("Failed to fetch usage:", error)
    } finally {
      setLoadingUsage(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Main quick actions for all users
  const quickActions = [
    {
      icon: Store,
      title: "Store Connections",
      description: "Connect and manage your marketplace stores",
      href: "/stores",
      highlight: true,
      badge: undefined
    },
    {
      icon: CreditCard,
      title: "Billing & Subscriptions",
      description: "Manage your subscriptions and payment",
      href: "/billing",
      badge: undefined
    },
    {
      icon: ShoppingBag,
      title: "Products",
      description: "Manage products, sync, and view analytics",
      href: "/products",
      badge: undefined
    }
  ]

  // Legacy features - only show for admin or users with permissions
  const isAdmin = session.user?.role === 'ADMIN'
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Package className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    TEKMS Dashboard
                  </h1>
                  <p className="text-sm text-gray-600">
                    Welcome back, {session.user?.name || session.user?.email}
                  </p>
                </div>
              </div>
            </div>
            <UserNav />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card className="border-blue-100 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardDescription>Connected Stores</CardDescription>
              <CardTitle className="text-3xl text-blue-600">
                {loadingUsage ? "..." : Object.keys(usage?.platformBreakdown || {}).length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600">
                {Object.keys(usage?.platformBreakdown || {}).length > 0
                  ? "Active connections"
                  : "No stores connected yet"}
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-blue-100 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardDescription>Subscription</CardDescription>
              <CardTitle className="text-2xl">
                <Badge
                  variant={usage?.tier === "FREE" ? "secondary" : "default"}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600"
                >
                  {loadingUsage ? "..." : usage?.tier || "Free"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="link"
                className="p-0 h-auto text-xs text-blue-600"
                onClick={() => router.push("/billing")}
              >
                Manage Billing →
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Quick Actions</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Card 
                key={index}
                className={`hover:shadow-lg transition-all cursor-pointer border-blue-100 bg-white/80 backdrop-blur-sm ${
                  action.highlight ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                }`}
                onClick={() => router.push(action.href)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-lg ${
                      action.highlight 
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600' 
                        : 'bg-blue-100'
                    }`}>
                      <action.icon className={`h-6 w-6 ${
                        action.highlight ? 'text-white' : 'text-blue-600'
                      }`} />
                    </div>
                    {action.badge && (
                      <Badge variant="outline" className="text-xs border-blue-200">
                        {action.badge}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg mt-4">{action.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {action.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* Admin Features - Only show for admins */}
        {isAdmin && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-orange-600" />
              <h2 className="text-2xl font-bold text-gray-900">Admin Tools</h2>
              <Badge variant="outline" className="border-orange-200 text-orange-600">Admin Only</Badge>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <Card 
                className="hover:shadow-lg transition-all cursor-pointer border-orange-100 bg-white/80"
                onClick={() => router.push("/admin")}
              >
                <CardHeader>
                  <div className="p-3 rounded-lg bg-orange-100 w-fit">
                    <Shield className="h-6 w-6 text-orange-600" />
                  </div>
                  <CardTitle className="text-lg mt-4">Admin Dashboard</CardTitle>
                  <CardDescription className="text-sm">
                    Manage users, pricing, and system settings
                  </CardDescription>
                </CardHeader>
              </Card>
              
              <Card 
                className="hover:shadow-lg transition-all cursor-pointer border-orange-100 bg-white/80"
                onClick={() => router.push("/credentials")}
              >
                <CardHeader>
                  <div className="p-3 rounded-lg bg-orange-100 w-fit">
                    <LinkIcon className="h-6 w-6 text-orange-600" />
                  </div>
                  <CardTitle className="text-lg mt-4">Legacy Credentials</CardTitle>
                  <CardDescription className="text-sm">
                    Manage API credentials (admin feature)
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        )}

        {/* Getting Started */}
        <Card className="border-blue-100 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">Getting Started</CardTitle>
            <CardDescription>
              Follow these steps to connect your stores and start managing listings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4 p-4 border border-blue-100 rounded-lg bg-blue-50/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1 text-gray-900">Connect Your Stores</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Connect your Shopify, Etsy, BigCommerce, or TikTok Shop with one click
                </p>
                <Button 
                  size="sm" 
                  onClick={() => router.push("/stores")}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  Connect Stores
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-600 font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1 text-gray-900">Choose Your Plan</h3>
                <p className="text-sm text-gray-600">
                  Select a subscription plan based on your store's product count
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg opacity-60">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-600 font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1 text-gray-900">Sync & Manage Products</h3>
                <p className="text-sm text-gray-600">
                  Automatically sync products and manage listings across all platforms
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upgrade CTA - Only for FREE tier */}
        {usage?.tier === 'FREE' && (
          <Card className="mt-8 bg-gradient-to-r from-blue-600 to-cyan-600 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-1">
                    Unlock Unlimited Stores
                  </h3>
                  <p className="text-blue-100">
                    Connect unlimited stores and manage thousands of products
                  </p>
                </div>
                <Button 
                  onClick={() => router.push("/billing")}
                  className="bg-white text-blue-600 hover:bg-gray-100"
                >
                  Upgrade Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
