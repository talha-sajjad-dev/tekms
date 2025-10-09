'use client'

import { ShoppingCart, Video, Package, Zap, BarChart3, Lock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const features = [
  {
    icon: ShoppingCart,
    title: 'BigCommerce Integration',
    description: 'Seamlessly manage your BigCommerce products with bulk operations, automated pricing, and inventory sync.',
  },
  {
    icon: Video,
    title: 'TikTok Shop Export',
    description: 'Export your products to TikTok Shop with optimized formatting and automated catalog generation.',
  },
  {
    icon: Package,
    title: 'Etsy Import',
    description: 'Import Etsy listings directly into BigCommerce with automated SEO optimization and image processing.',
  },
  {
    icon: Zap,
    title: 'Bulk Operations',
    description: 'Save hours with bulk product updates, automated workflows, and batch processing capabilities.',
  },
  {
    icon: BarChart3,
    title: 'Usage Analytics',
    description: 'Track your product operations, monitor usage limits, and optimize your workflow with detailed insights.',
  },
  {
    icon: Lock,
    title: 'Secure Credentials',
    description: 'Your API credentials are encrypted and stored securely with enterprise-grade encryption.',
  },
]

export function Features() {
  return (
    <section id="features" className="py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Everything You Need to Scale
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features to automate your e-commerce workflow and save time
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}