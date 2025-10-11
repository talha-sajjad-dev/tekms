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
    <div className="min-h-screen">
      {/* Navigation */}
      <HomepageNav onSignInClick={() => setShowAuthModal(true)} />
      
      {/* Hero Section with Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-400 via-purple-500 to-pink-400">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-300/30 via-transparent to-pink-300/30 animate-pulse"></div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000,transparent)]"></div>
        
        <div className="relative container mx-auto px-4 py-20 md:py-32 lg:py-40">
          <div className="text-center max-w-5xl mx-auto space-y-8">
            <Badge variant="secondary" className="text-sm px-4 py-2 bg-white/90 text-purple-700 hover:bg-white border-0">
              🚀 The Future of Marketplace Management
            </Badge>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-white leading-tight">
              Manage All Your
              <br />
              <span className="bg-gradient-to-r from-yellow-200 via-pink-200 to-cyan-200 bg-clip-text text-transparent">
                Marketplace Listings
              </span>
              <br />
              From One Place
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto font-medium">
              Sync products across BigCommerce, Shopify, Etsy, and TikTok with ease.
              Powerful automation meets simple management.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button
                size="lg"
                className="text-lg px-10 py-7 bg-white text-purple-700 hover:bg-gray-100 font-bold shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105"
                onClick={() => setShowAuthModal(true)}
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-10 py-7 border-2 border-white bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm font-semibold shadow-lg"
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                Learn More
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-8 pt-6 text-white/80 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                <span>10 free products</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom wave separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="currentColor" className="text-background"/>
          </svg>
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
