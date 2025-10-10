import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package, Download, Search } from 'lucide-react'
import Link from 'next/link'

export default async function EtsyPage() {
  const session = await auth()
  
  if (!session) {
    redirect('/')
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Etsy Import</h1>
        <p className="text-muted-foreground">
          Import products from Etsy to BigCommerce
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <Search className="h-8 w-8 text-orange-600 mb-2" />
            <CardTitle>Search Products</CardTitle>
            <CardDescription>Find Etsy products to import</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Download className="h-8 w-8 text-blue-600 mb-2" />
            <CardTitle>Import Products</CardTitle>
            <CardDescription>Import to BigCommerce</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Package className="h-8 w-8 text-green-600 mb-2" />
            <CardTitle>Bulk Import</CardTitle>
            <CardDescription>Import multiple products</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>
            Import products from Etsy to your BigCommerce store
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This feature allows you to scrape product information from Etsy and import it into your BigCommerce store.
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Configure your BigCommerce credentials</li>
              <li>Enter Etsy product URLs</li>
              <li>Review scraped product data</li>
              <li>Import to BigCommerce with one click</li>
            </ol>
            <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
              <p className="text-sm font-semibold mb-2">✨ Features Include:</p>
              <ul className="text-sm space-y-1">
                <li>• Automatic image download and upload</li>
                <li>• SEO-optimized descriptions</li>
                <li>• Variant handling (sizes, colors)</li>
                <li>• Category mapping</li>
              </ul>
            </div>
            <Button asChild>
              <Link href="/dashboard/credentials">
                Setup Credentials
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}