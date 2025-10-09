import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShoppingCart, Video, Package, Activity } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const session = await auth()
  
  if (!session) {
    redirect('/')
  }

  const features = [
    {
      title: 'BigCommerce',
      description: 'Manage your BigCommerce products',
      icon: ShoppingCart,
      href: '/dashboard/bigcommerce',
      color: 'text-blue-600',
    },
    {
      title: 'TikTok Export',
      description: 'Export products to TikTok Shop',
      icon: Video,
      href: '/dashboard/tiktok',
      color: 'text-pink-600',
    },
    {
      title: 'Etsy Import',
      description: 'Import products from Etsy',
      icon: Package,
      href: '/dashboard/etsy',
      color: 'text-orange-600',
    },
    {
      title: 'Usage & Limits',
      description: 'Track your monthly usage',
      icon: Activity,
      href: '/dashboard/usage',
      color: 'text-green-600',
    },
  ]

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {session.user.name}!</h1>
        <p className="text-muted-foreground">
          Manage your e-commerce automation from one place
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {features.map((feature) => {
          const Icon = feature.icon
          return (
            <Link key={feature.href} href={feature.href}>
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <Icon className={`h-8 w-8 ${feature.color} mb-2`} />
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
          <CardDescription>
            Get started by adding your API credentials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Before you can start using the platform, you need to add your API credentials
              for the platforms you want to integrate.
            </p>
            <Button asChild>
              <Link href="/dashboard/credentials">
                Manage Credentials
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
