'use client'

import { Button } from '@/components/ui/button'
import { ArrowRight, Zap } from 'lucide-react'
import { LoginModal } from '@/components/auth/login-modal'
import { useState } from 'react'

export function Hero() {
  const [showLoginModal, setShowLoginModal] = useState(false)

  return (
    <>
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
              <Zap className="h-4 w-4" />
              <span>Multi-Channel E-commerce Automation</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Automate Your Product Management Across{' '}
              <span className="text-primary">All Platforms</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto">
              Seamlessly sync and manage products across BigCommerce, TikTok, and Etsy. 
              Save hours of manual work with intelligent automation.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                className="text-lg px-8 py-6 h-auto"
                onClick={() => setShowLoginModal(true)}
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 h-auto"
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                See How It Works
              </Button>
            </div>

            {/* Social Proof */}
            <p className="mt-8 text-sm text-muted-foreground">
              Start with 10 free products per month. No credit card required.
            </p>
          </div>
        </div>

        {/* Background Gradient */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 to-transparent" />
      </section>

      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
    </>
  )
}