"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AuthModal } from "@/components/auth/auth-modal"
import { HomepageNav } from "@/components/homepage-nav"
import {
  ShoppingCart,
  Zap,
  Shield,
  TrendingUp,
  Globe,
  CheckCircle2,
  ArrowRight
} from "lucide-react"

export default function HomePage() {
  const [showAuthModal, setShowAuthModal] = useState(false)

  const features = [
    {
      icon: ShoppingCart,
      title: "Multi-Platform Sync",
      description: "Manage listings across BigCommerce, Shopify, Etsy, and TikTok from one dashboard"
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Optimized for handling thousands of products with advanced search capabilities"
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Enterprise-grade security with encrypted credential storage"
    },
    {
      icon: TrendingUp,
      title: "Smart Analytics",
      description: "Track performance and optimize your listings with real-time insights"
    },
    {
      icon: Globe,
      title: "Global Reach",
      description: "Expand your business across multiple marketplaces effortlessly"
    },
    {
      icon: CheckCircle2,
      title: "Easy to Use",
      description: "Intuitive interface designed for efficiency and productivity"
    }
  ]

  const plans = [
    {
      name: "Free",
      price: "$0",
      description: "Perfect for getting started",
      features: [
        "10 products",
        "BigCommerce & Shopify access",
        "Basic sync features",
        "Community support"
      ],
      popular: false
    },
    {
      name: "Professional",
      price: "$29",
      description: "For growing businesses",
      features: [
        "Unlimited products",
        "All marketplace access",
        "Etsy & TikTok integration",
        "Bulk operations",
        "Priority support",
        "Advanced analytics"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: "$99",
      description: "For large-scale operations",
      features: [
        "Everything in Professional",
        "API access",
        "Scheduled syncs",
        "Custom integrations",
        "Dedicated support",
        "SLA guarantee"
      ],
      popular: false
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Navigation */}
      <HomepageNav onSignInClick={() => setShowAuthModal(true)} />
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-4xl mx-auto space-y-8">
          <Badge variant="secondary" className="text-sm px-4 py-1">
            🚀 The Future of Marketplace Management
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Manage All Your
            <span className="text-primary"> Marketplace Listings</span>
            <br />
            From One Place
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            TEKMS Listing Manager simplifies multi-platform e-commerce. 
            Sync products across BigCommerce, Shopify, Etsy, and TikTok with ease.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="text-lg px-8"
              onClick={() => setShowAuthModal(true)}
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8"
              onClick={() => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              Learn More
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            No credit card required • 10 free products • Cancel anytime
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to streamline your marketplace operations
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <feature.icon className="h-12 w-12 text-primary mb-4" />
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your business needs
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative ${plan.popular ? 'border-primary border-2 shadow-lg' : ''}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
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
                <Button 
                  className="w-full" 
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => setShowAuthModal(true)}
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Streamline Your Marketplace Management?
            </h2>
            <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
              Join thousands of sellers who trust TEKMS to manage their multi-platform listings
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              className="text-lg px-8"
              onClick={() => setShowAuthModal(true)}
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© 2024 TEKMS Listing Manager. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="/privacy" className="hover:text-primary transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" className="hover:text-primary transition-colors">
                Terms of Service
              </a>
              <a href="mailto:support@tekmslisting.com" className="hover:text-primary transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </div>
  )
}
