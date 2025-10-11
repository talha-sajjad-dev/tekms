"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Calendar,
  TrendingUp,
  AlertCircle
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

const PLANS = [
  {
    tier: "FREE",
    name: "Free",
    price: "$0",
    interval: "forever",
    features: [
      "10 products maximum",
      "BigCommerce integration",
      "Shopify integration",
      "Basic sync features",
      "Community support",
    ],
    limitations: ["No Etsy access", "No TikTok access", "No bulk operations"],
  },
  {
    tier: "PROFESSIONAL",
    name: "Professional",
    price: "$29",
    interval: "per month",
    popular: true,
    features: [
      "Unlimited products",
      "All marketplace access",
      "Etsy integration",
      "TikTok integration",
      "Bulk operations",
      "Scheduled syncs",
      "Advanced analytics",
      "Priority support",
    ],
    limitations: [],
  },
  {
    tier: "ENTERPRISE",
    name: "Enterprise",
    price: "$99",
    interval: "per month",
    features: [
      "Everything in Professional",
      "API access",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
      "Early access to features",
      "Custom feature development",
    ],
    limitations: [],
  },
]

export default function BillingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    } else if (status === "authenticated") {
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
      setLoading(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const currentPlan = PLANS.find(p => p.tier === usage?.tier) || PLANS[0]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Billing & Subscription</h1>
              <p className="text-sm text-muted-foreground">
                Manage your subscription and view usage
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Current Plan */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>Your active subscription details</CardDescription>
              </div>
              <Badge variant={usage?.tier === "FREE" ? "secondary" : "default"} className="text-lg px-4 py-2">
                {currentPlan.name}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Monthly Cost</p>
                <p className="text-2xl font-bold">{currentPlan.price}<span className="text-sm font-normal text-muted-foreground">/{currentPlan.interval}</span></p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Product Usage</p>
                <p className="text-2xl font-bold">
                  {usage?.productUsage.current}/{usage?.productUsage.limit === -1 ? "∞" : usage?.productUsage.limit}
                </p>
                {usage && usage.productUsage.limit !== -1 && (
                  <Progress value={usage.productUsage.percentage} className="h-2 mt-2" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <div className="flex items-center gap-2 text-2xl font-bold text-green-600">
                  <CheckCircle2 className="h-6 w-6" />
                  Active
                </div>
              </div>
            </div>

            {usage?.tier === "FREE" && usage.productUsage.percentage > 80 && (
              <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                    Approaching Limit
                  </h4>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    You're using {usage.productUsage.current} of {usage.productUsage.limit} products. 
                    Upgrade to Professional for unlimited products and more features.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Plans */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Available Plans</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <Card
                key={plan.tier}
                className={`relative ${
                  plan.popular ? "border-primary border-2 shadow-lg" : ""
                } ${plan.tier === usage?.tier ? "bg-muted/50" : ""}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                {plan.tier === usage?.tier && (
                  <Badge variant="outline" className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Current Plan
                  </Badge>
                )}
                
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">/{plan.interval}</span>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {plan.tier === usage?.tier ? (
                    <Button className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : plan.tier === "FREE" ? (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => {
                        alert("To downgrade, please contact support.")
                      }}
                    >
                      Downgrade
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() => {
                        alert("Stripe integration coming soon! Contact sales@tekmslisting.com to upgrade.")
                      }}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Upgrade to {plan.name}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Payment Method (Placeholder) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>Manage your payment information</CardDescription>
              </div>
              <CreditCard className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No payment method on file</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {usage?.tier === "FREE" 
                  ? "You're on the free plan. Add a payment method to upgrade."
                  : "Stripe integration coming soon"}
              </p>
              {usage?.tier === "FREE" && (
                <Button variant="outline" onClick={() => alert("Stripe integration coming soon!")}>
                  Add Payment Method
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}