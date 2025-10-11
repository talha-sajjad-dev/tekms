"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Store, Package } from "lucide-react"

interface PricingCalculatorProps {
  onGetStarted?: () => void
}

export function PricingCalculator({ onGetStarted }: PricingCalculatorProps) {
  const [productCount, setProductCount] = useState(250) // Default to mid-range

  // Pricing tiers based on product count per store
  const getTierInfo = (count: number) => {
    if (count <= 10) return { name: "Free", price: 0, max: 10, color: "from-gray-500 to-gray-600" }
    if (count <= 100) return { name: "Starter", price: 10, max: 100, color: "from-blue-500 to-blue-600" }
    if (count <= 500) return { name: "Growth", price: 20, max: 500, color: "from-cyan-500 to-cyan-600" }
    if (count <= 1000) return { name: "Business", price: 30, max: 1000, color: "from-indigo-500 to-indigo-600" }
    if (count <= 2500) return { name: "Professional", price: 40, max: 2500, color: "from-purple-500 to-purple-600" }
    return { name: "Advanced", price: 50, max: 10000, color: "from-pink-500 to-pink-600" }
  }

  const currentTier = getTierInfo(productCount)

  // Convert slider value (0-100) to product count (0-5000)
  const sliderToProducts = (value: number) => {
    if (value === 0) return 0
    if (value <= 20) return Math.round((value / 20) * 100) // 0-100 products
    if (value <= 40) return 100 + Math.round(((value - 20) / 20) * 400) // 100-500 products
    if (value <= 60) return 500 + Math.round(((value - 40) / 20) * 500) // 500-1000 products
    if (value <= 80) return 1000 + Math.round(((value - 60) / 20) * 1500) // 1000-2500 products
    return 2500 + Math.round(((value - 80) / 20) * 2500) // 2500-5000 products
  }

  const productsToSlider = (products: number) => {
    if (products === 0) return 0
    if (products <= 100) return (products / 100) * 20
    if (products <= 500) return 20 + ((products - 100) / 400) * 20
    if (products <= 1000) return 40 + ((products - 500) / 500) * 20
    if (products <= 2500) return 60 + ((products - 1000) / 1500) * 20
    return 80 + ((products - 2500) / 2500) * 20
  }

  const handleSliderChange = (value: number[]) => {
    setProductCount(sliderToProducts(value[0]))
  }

  // Tier markers for the slider
  const tiers = [
    { label: "0", products: 0, position: 0 },
    { label: "10", products: 10, position: productsToSlider(10) },
    { label: "100", products: 100, position: 20 },
    { label: "500", products: 500, position: 40 },
    { label: "1K", products: 1000, position: 60 },
    { label: "2.5K", products: 2500, position: 80 },
    { label: "5K+", products: 5000, position: 100 },
  ]

  return (
    <Card className="border-2 border-blue-200 shadow-2xl bg-gradient-to-br from-white to-blue-50/30">
      <CardHeader className="text-center pb-6">
        <Badge className="mx-auto mb-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">
          💰 Interactive Pricing Calculator
        </Badge>
        <CardTitle className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          Calculate Your Price
        </CardTitle>
        <p className="text-[#64748B] mt-2">
          Move the slider to see pricing based on products per store
        </p>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Current Selection Display */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-blue-100">
          <div className="grid md:grid-cols-3 gap-6 items-center">
            {/* Product Count */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Package className="h-5 w-5 text-blue-600" />
                <p className="text-sm font-medium text-[#64748B]">Products</p>
              </div>
              <p className="text-4xl font-black text-[#0F172A]">
                {productCount.toLocaleString()}
              </p>
            </div>

            {/* Tier Name */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Store className="h-5 w-5 text-cyan-600" />
                <p className="text-sm font-medium text-[#64748B]">Tier</p>
              </div>
              <Badge className={`text-lg px-4 py-2 bg-gradient-to-r ${currentTier.color} text-white border-0 shadow-lg`}>
                {currentTier.name}
              </Badge>
            </div>

            {/* Price */}
            <div className="text-center">
              <p className="text-sm font-medium text-[#64748B] mb-2">Price per Store</p>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  ${currentTier.price}
                </span>
                <span className="text-[#64748B] text-lg">/month</span>
              </div>
            </div>
          </div>
        </div>

        {/* Slider */}
        <div className="px-4">
          <Slider
            value={[productsToSlider(productCount)]}
            onValueChange={handleSliderChange}
            max={100}
            step={1}
            className="w-full"
          />

          {/* Tier markers */}
          <div className="relative mt-4">
            {tiers.map((tier, index) => (
              <div
                key={index}
                className="absolute text-xs text-[#64748B] transform -translate-x-1/2"
                style={{ left: `${tier.position}%` }}
              >
                <div className="text-center">
                  <div className="w-px h-2 bg-[#CBD5E1] mx-auto mb-1"></div>
                  <span className="font-medium">{tier.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6">
          <h3 className="font-semibold text-[#0F172A] mb-4 text-center">
            What's Included (All Tiers)
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              "Unlimited store connections",
              "All marketplace platforms",
              "Shopify, BigCommerce, Etsy, TikTok",
              "Auto-tier upgrades",
              "Real-time sync",
              "Priority support",
              "Advanced analytics",
              "Cancel anytime"
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span className="text-sm text-[#334155]">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Note */}
        <div className="bg-blue-100 border-l-4 border-blue-500 p-4 rounded">
          <p className="text-sm text-blue-900 font-medium">
            💡 <strong>How it works:</strong> Connect unlimited stores. Each store is billed separately based on its product count. 
            Tiers automatically upgrade as you add more products to each store.
          </p>
        </div>

        {/* CTA Button */}
        <Button
          size="lg"
          className="w-full text-lg py-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold shadow-xl hover:shadow-2xl transition-all duration-300"
          onClick={onGetStarted}
        >
          Get Started Free
        </Button>

        <p className="text-center text-sm text-[#64748B]">
          Start with 1 free store (up to 10 products). No credit card required.
        </p>
      </CardContent>
    </Card>
  )
}