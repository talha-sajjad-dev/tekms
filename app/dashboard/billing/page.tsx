'use client'

import { Suspense, useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { Check, Loader2, CreditCard, ExternalLink } from 'lucide-react'
import { SUBSCRIPTION_TIERS } from '@/lib/subscription/plans'
import { useSearchParams } from 'next/navigation'

type SubscriptionData = {
  tier: string
  status: string
  cancelAtPeriodEnd: boolean
  stripeCurrentPeriodEnd: string | null
  stripeCustomerId: string | null
}

function BillingContent() {
  const searchParams = useSearchParams()
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgradingTo, setUpgradingTo] = useState<string | null>(null)
  const [openingPortal, setOpeningPortal] = useState(false)

  useEffect(() => {
    fetchSubscription()

    // Check for success/cancel params
    if (searchParams.get('success')) {
      toast({
        title: 'Success!',
        description: 'Your subscription has been activated.',
      })
    } else if (searchParams.get('canceled')) {
      toast({
        title: 'Canceled',
        description: 'Subscription upgrade was canceled.',
        variant: 'destructive',
      })
    }
  }, [searchParams])

  const fetchSubscription = async () => {
    try {
      // This would be a real API call
      // For now, we'll simulate it
      setSubscription({
        tier: 'FREE',
        status: 'ACTIVE',
        cancelAtPeriodEnd: false,
        stripeCurrentPeriodEnd: null,
        stripeCustomerId: null,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load subscription data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (tier: string) => {
    setUpgradingTo(tier)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
      setUpgradingTo(null)
    }
  }

  const handleManageSubscription = async () => {
    setOpeningPortal(true)
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open customer portal')
      }

      // Redirect to Stripe Customer Portal
      window.location.href = data.url
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
      setOpeningPortal(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <p>Loading billing information...</p>
      </div>
    )
  }

  const currentTier = subscription?.tier || 'FREE'
  const currentConfig = SUBSCRIPTION_TIERS[currentTier as keyof typeof SUBSCRIPTION_TIERS]

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Current Plan */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                {subscription?.cancelAtPeriodEnd 
                  ? 'Your subscription will be canceled at the end of the billing period'
                  : 'Your active subscription plan'
                }
              </CardDescription>
            </div>
            <Badge className="text-lg px-4 py-2">
              {currentConfig.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Monthly Price</span>
              <span className="text-2xl font-bold">${currentConfig.price}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Product Limit</span>
              <span className="font-medium">
                {currentConfig.productLimit === -1 
                  ? 'Unlimited' 
                  : `${currentConfig.productLimit} products/month`
                }
              </span>
            </div>
            {subscription?.stripeCurrentPeriodEnd && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {subscription.cancelAtPeriodEnd ? 'Cancels on' : 'Renews on'}
                </span>
                <span className="font-medium">
                  {new Date(subscription.stripeCurrentPeriodEnd).toLocaleDateString()}
                </span>
              </div>
            )}
            {subscription?.stripeCustomerId && (
              <Button 
                onClick={handleManageSubscription}
                disabled={openingPortal}
                variant="outline"
                className="w-full"
              >
                {openingPortal ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening portal...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Manage Subscription
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Available Plans</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(SUBSCRIPTION_TIERS).map(([key, config]) => {
            const isCurrent = key === currentTier
            const isDowngrade = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'].indexOf(key) < 
                               ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'].indexOf(currentTier)
            
            return (
              <Card key={key} className={isCurrent ? 'border-primary border-2' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle>{config.name}</CardTitle>
                    {isCurrent && <Badge>Current</Badge>}
                  </div>
                  <CardDescription className="text-3xl font-bold">
                    ${config.price}
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {config.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {key !== 'FREE' && !isCurrent && (
                    <Button
                      onClick={() => handleUpgrade(key)}
                      disabled={!!upgradingTo || isDowngrade}
                      className="w-full"
                      variant={isDowngrade ? 'outline' : 'default'}
                    >
                      {upgradingTo === key ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : isDowngrade ? (
                        'Contact Support'
                      ) : (
                        'Upgrade'
                      )}
                    </Button>
                  )}
                  
                  {isCurrent && key !== 'FREE' && (
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled
                    >
                      Current Plan
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <Toaster />
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="container mx-auto py-10 px-4"><p>Loading...</p></div>}>
      <BillingContent />
    </Suspense>
  )
}