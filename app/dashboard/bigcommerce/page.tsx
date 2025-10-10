import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Settings, Package, Video, ShoppingBag, Sliders, DollarSign, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export default async function BigCommercePage() {
  const session = await auth()
  
  if (!session) {
    redirect('/')
  }

  // Check if user has BigCommerce credentials
  const hasCredentials = await prisma.userCredential.findFirst({
    where: {
      userId: session.user.id,
      platform: 'BIGCOMMERCE'
    }
  })

  const features = [
    {
      title: 'Product Modifiers',
      description: 'Manage product options, variants, and modifiers across your catalog',
      icon: Sliders,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      href: '/modifiers',
      enabled: true,
      features: [
        'Apply modifiers to multiple products',
        'Manage shared modifiers',
        'Bulk modifier operations',
        'View existing modifiers'
      ]
    },
    {
      title: 'Pricing Rules',
      description: 'Manage pricing rules and fix pricing issues automatically',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950',
      href: '/catalog-pricing-fix',
      enabled: true,
      features: [
        'Fix pricing rule conflicts',
        'Apply correct pricing to products',
        'Clear problematic pricing',
        'Update pricing rules in bulk'
      ]
    },
    {
      title: 'Export to TikTok Shop',
      description: 'Export your products to TikTok Shop format',
      icon: Video,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50 dark:bg-pink-950',
      href: '/tiktok-export',
      enabled: true,
      features: [
        'Export products to Excel',
        'TikTok Shop template format',
        'Automatic data mapping',
        'Bulk product export'
      ]
    },
    {
      title: 'Import from Etsy',
      description: 'Import products from Etsy listings to BigCommerce',
      icon: ShoppingBag,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      href: '/etsy-import',
      enabled: true,
      features: [
        'Scrape Etsy product data',
        'Automatic image import',
        'SEO-optimized descriptions',
        'Variant handling'
      ]
    },
  ]

  if (!hasCredentials) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">BigCommerce Integration</h1>
          <p className="text-muted-foreground">
            Connect your BigCommerce store to unlock powerful automation features
          </p>
        </div>

        <Card className="border-2 border-dashed">
          <CardHeader>
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle>Setup Required</CardTitle>
            <CardDescription>
              Add your BigCommerce API credentials to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Once you add your credentials, you'll be able to:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Manage product modifiers and variants across your entire catalog</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Fix pricing rules and apply correct pricing automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Export products to TikTok Shop in the correct format</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Import products from Etsy with automatic SEO optimization</span>
              </li>
            </ul>
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/dashboard/credentials">
                <Settings className="mr-2 h-4 w-4" />
                Add BigCommerce Credentials
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">BigCommerce Integration</h1>
            <p className="text-muted-foreground">
              Manage your BigCommerce store with powerful automation tools
            </p>
          </div>
          <Badge variant="secondary" className="hidden sm:flex">
            Connected
          </Badge>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {features.map((feature) => {
          const Icon = feature.icon
          return (
            <Link key={feature.href} href={feature.href}>
              <Card className="group hover:shadow-lg hover:border-primary/50 transition-all h-full cursor-pointer">
                <CardHeader>
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`p-3 rounded-lg ${feature.bgColor}`}>
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="mb-1 group-hover:text-primary transition-colors">
                        {feature.title}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {feature.description}
                      </CardDescription>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-4">
                    {feature.features.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            Learn more about each feature or manage your credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Button asChild variant="outline">
            <Link href="/dashboard/credentials">
              <Settings className="mr-2 h-4 w-4" />
              Manage Credentials
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/usage">
              <Package className="mr-2 h-4 w-4" />
              View Usage
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}