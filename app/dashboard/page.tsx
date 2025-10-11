"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Package,
  Settings,
  LogOut,
  BarChart3,
  ShoppingBag,
  Key,
  Upload,
  Download,
  TrendingUp
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
    if (status === "authenticated") {
      fetchUsage()
    }
  }, [status])

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

  if (!session) {
    router.push("/")
    return null
  }

  const quickActions = [
    {
      icon: Upload,
      title: "Import from Etsy",
      description: "Import products from your Etsy shop",
      href: "/etsy-import",
      badge: "Enterprise"
    },
    {
      icon: Download,
      title: "Export to TikTok",
      description: "Export products to TikTok Shop",
      href: "/tiktok-export",
      badge: "Enterprise"
    },
    {
      icon: ShoppingBag,
      title: "Manage Products",
      description: "View and manage all your products",
      href: "/products"
    },
    {
      icon: Key,
      title: "API Credentials",
      description: "Manage marketplace credentials",
      href: "/credentials"
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">TEKMS Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {session.user?.name || session.user?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => router.push("/settings")}>
                <Settings className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Product Usage</CardDescription>
              <CardTitle className="text-3xl">
                {loadingUsage ? "..." : usage?.productUsage.current || 0}
                <span className="text-lg text-muted-foreground">
                  /{usage?.productUsage.limit === -1 ? "∞" : usage?.productUsage.limit || 10}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!loadingUsage && usage && (
                <>
                  <Progress value={usage.productUsage.percentage} className="h-2 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {usage.productUsage.limit === -1
                      ? "Unlimited products"
                      : `${usage.productUsage.remaining} remaining`}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Platforms</CardDescription>
              <CardTitle className="text-3xl">
                {loadingUsage ? "..." : Object.keys(usage?.platformBreakdown || {}).length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {Object.keys(usage?.platformBreakdown || {}).length > 0
                  ? Object.keys(usage?.platformBreakdown || {}).join(", ")
                  : "Connect your accounts"}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Subscription</CardDescription>
              <CardTitle className="text-3xl">
                <Badge variant={usage?.tier === "FREE" ? "secondary" : "default"}>
                  {loadingUsage ? "..." : usage?.tier || "Free"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="link" className="p-0 h-auto text-xs" onClick={() => router.push("/billing")}>
                Upgrade Plan →
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Available Features</CardDescription>
              <CardTitle className="text-3xl">
                {loadingUsage ? "..." :
                  Object.values(usage?.features || {}).filter(Boolean).length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {usage?.tier === "FREE" ? "Upgrade for more" : "All features active"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Card 
                key={index}
                className="hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => router.push(action.href)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <action.icon className="h-8 w-8 text-primary" />
                    {action.badge && (
                      <Badge variant="outline" className="text-xs">
                        {action.badge}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {action.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* Getting Started */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Follow these steps to set up your account and start managing your marketplace listings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Add Marketplace Credentials</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Connect your BigCommerce, Shopify, Etsy, or TikTok accounts
                </p>
                <Button size="sm" onClick={() => router.push("/credentials")}>
                  Add Credentials
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 border rounded-lg opacity-50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Import Your Products</h3>
                <p className="text-sm text-muted-foreground">
                  Import products from your existing marketplace accounts
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 border rounded-lg opacity-50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Start Managing Listings</h3>
                <p className="text-sm text-muted-foreground">
                  Sync products across marketplaces and optimize your listings
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upgrade CTA */}
        <Card className="mt-8 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">
                  Unlock Enterprise Features
                </h3>
                <p className="text-sm text-muted-foreground">
                  Get unlimited products, Etsy import, TikTok export, and more
                </p>
              </div>
              <Button onClick={() => router.push("/billing")}>
                Upgrade Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
