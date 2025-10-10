import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Video, Upload, FileSpreadsheet } from 'lucide-react'
import Link from 'next/link'

export default async function TikTokPage() {
  const session = await auth()
  
  if (!session) {
    redirect('/')
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">TikTok Shop Export</h1>
        <p className="text-muted-foreground">
          Export your products to TikTok Shop
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <FileSpreadsheet className="h-8 w-8 text-pink-600 mb-2" />
            <CardTitle>Export to Excel</CardTitle>
            <CardDescription>Generate TikTok Shop template</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Upload className="h-8 w-8 text-blue-600 mb-2" />
            <CardTitle>Bulk Export</CardTitle>
            <CardDescription>Export multiple products</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Video className="h-8 w-8 text-purple-600 mb-2" />
            <CardTitle>Product Mapping</CardTitle>
            <CardDescription>Map product attributes</CardDescription>
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
            Export your products to TikTok Shop format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This feature allows you to export your products from BigCommerce to TikTok Shop's required Excel format.
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Configure your BigCommerce credentials</li>
              <li>Select products to export</li>
              <li>Generate TikTok Shop Excel template</li>
              <li>Upload to TikTok Seller Center</li>
            </ol>
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