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
      
      {/* Hero Section - Dark Navy Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 via-transparent to-cyan-500/10 animate-pulse"></div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000,transparent)]"></div>
        
        <div className="relative container mx-auto px-4 py-20 md:py-32 lg:py-40">
          <div className="text-center max-w-5xl mx-auto space-y-8">
            <Badge className="text-sm px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-lg">
              🚀 The Future of Marketplace Management
            </Badge>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-[#F8FAFC] leading-tight">
              Manage All Your
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Marketplace Listings
              </span>
              <br />
              From One Place
            </h1>
            
            <p className="text-xl md:text-2xl text-[#CBD5E1] max-w-3xl mx-auto font-medium leading-relaxed">
              Sync products across BigCommerce, Shopify, Etsy, and TikTok with ease. 
              Powerful automation meets simple management.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button 
                size="lg" 
                className="text-lg px-10 py-7 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105"
                onClick={() => setShowAuthModal(true)}
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-10 py-7 border-2 border-white/20 bg-white/5 text-white hover:bg-white/10 backdrop-blur-sm font-semibold shadow-lg"
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                Learn More
              </Button>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-6 pt-6 text-[#CBD5E1] text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-cyan-400" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-cyan-400" />
                <span>10 free products</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-cyan-400" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom wave separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
          </svg>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="bg-white container mx-auto px-4 py-20 md:py-28">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 text-blue-600 border-blue-200 bg-blue-50">
            Features
          </Badge>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-[#0F172A]">
            Everything You Need to <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Succeed</span>
          </h2>
          <p className="text-xl text-[#64748B] max-w-3xl mx-auto leading-relaxed">
            Powerful features designed to streamline your marketplace operations and scale your business
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="group relative border-2 border-[#E2E8F0] hover:border-blue-200 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-100 hover:-translate-y-2 bg-white"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-cyan-50/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
              <CardHeader className="relative">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-xl mb-2 text-[#0F172A] group-hover:text-blue-600 transition-colors">{feature.title}</CardTitle>
                <CardDescription className="text-base text-[#64748B] leading-relaxed">{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="relative py-20 md:py-28 overflow-hidden bg-[#F8FAFC]">
        
        <div className="relative container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 text-blue-600 border-blue-200 bg-blue-50">
              Pricing
            </Badge>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-[#0F172A]">
              Simple, <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Transparent</span> Pricing
            </h2>
            <p className="text-xl text-[#64748B] max-w-3xl mx-auto">
              Choose the perfect plan to scale your marketplace business
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative group hover:-translate-y-2 transition-all duration-300 bg-white ${
                  plan.popular 
                    ? 'border-2 border-blue-500 shadow-2xl shadow-blue-200/50 scale-105' 
                    : 'border-2 border-[#E2E8F0] hover:border-blue-200 hover:shadow-xl'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-5 left-0 right-0 flex justify-center">
                    <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-1 text-sm font-semibold shadow-lg">
                      ⭐ Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-8 pt-8">
                  <CardTitle className="text-2xl mb-2 text-[#0F172A]">{plan.name}</CardTitle>
                  <CardDescription className="text-base text-[#64748B]">{plan.description}</CardDescription>
                  <div className="mt-6">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-5xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                        {plan.price}
                      </span>
                      <span className="text-[#64748B] text-lg">/month</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="rounded-full bg-blue-50 p-1 mt-0.5">
                          <CheckCircle2 className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="text-sm text-[#334155] leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full py-6 font-semibold text-base ${
                      plan.popular 
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl' 
                        : 'border-2 border-[#E2E8F0] hover:bg-blue-50 text-[#0F172A]'
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => setShowAuthModal(true)}
                  >
                    {plan.popular ? 'Start Free Trial' : 'Get Started'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <p className="text-center mt-12 text-sm text-[#64748B]">
            All plans include a 14-day free trial. No credit card required.
          </p>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] p-12 md:p-16">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full -ml-48 -mb-48"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-cyan-500/5"></div>
          
          <div className="relative text-center text-white">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 text-[#F8FAFC]">
              Ready to Scale Your Business?
            </h2>
            <p className="text-xl md:text-2xl mb-10 text-[#CBD5E1] max-w-3xl mx-auto font-medium leading-relaxed">
              Join thousands of sellers who trust TEKMS to manage their multi-platform listings
            </p>
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-lg px-10 py-7 font-bold shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105"
              onClick={() => setShowAuthModal(true)}
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <div className="flex flex-wrap items-center justify-center gap-6 pt-8 text-[#CBD5E1] text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-cyan-400" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-cyan-400" />
                <span>10 free products</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-cyan-400" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">TEKMS</span>
              </div>
              <p className="text-[#64748B] mb-4 max-w-sm leading-relaxed">
                The all-in-one marketplace management platform for modern e-commerce sellers.
              </p>
              <p className="text-sm text-[#94A3B8]">
                © 2024 TEKMS Listing Manager. All rights reserved.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4 text-[#0F172A]">Product</h3>
              <ul className="space-y-2 text-sm text-[#64748B]">
                <li><a href="#features" className="hover:text-blue-600 transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a></li>
                <li><a href="/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4 text-[#0F172A]">Legal</h3>
              <ul className="space-y-2 text-sm text-[#64748B]">
                <li><a href="/privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-blue-600 transition-colors">Terms of Service</a></li>
                <li><a href="mailto:support@tekmslisting.com" className="hover:text-blue-600 transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </div>
  )
}
