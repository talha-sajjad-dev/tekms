'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Check } from 'lucide-react'
import { SUBSCRIPTION_TIERS } from '@/lib/subscription/plans'
import { LoginModal } from '@/components/auth/login-modal'
import { useState } from 'react'

const tiers = [
  { key: 'FREE' as const, popular: false },
  { key: 'STARTER' as const, popular: true },
  { key: 'PROFESSIONAL' as const, popular: false },
  { key: 'ENTERPRISE' as const, popular: false },
]

export function Pricing() {
  const [showLoginModal, setShowLoginModal] = useState(false)

  return (
    <>
      <section id="pricing" className="py-20 lg:py-32 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free, upgrade as you grow. All plans include access to all platforms.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {tiers.map(({ key, popular }) => {
              const tier = SUBSCRIPTION_TIERS[key]
              return (
                <Card
                  key={key}
                  className={`relative flex flex-col ${
                    popular ? 'border-primary border-2 shadow-lg scale-105' : ''
                  }`}
                >
                  {popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-sm font-medium px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <CardHeader>
                    <CardTitle className="text-2xl">{tier.name}</CardTitle>
                    <CardDescription>
                      <span className="text-4xl font-bold text-foreground">
                        ${tier.price}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1">
                    <ul className="space-y-3">
                      {tier.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter>
                    <Button
                      className="w-full"
                      variant={popular ? 'default' : 'outline'}
                      size="lg"
                      onClick={() => setShowLoginModal(true)}
                    >
                      {key === 'FREE' ? 'Get Started' : 'Start Free Trial'}
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-12">
            All plans start with a free tier. Upgrade anytime. Cancel anytime.
          </p>
        </div>
      </section>

      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
    </>
  )
}