import { ArrowLeft, Handshake } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <Card>
          <CardContent className="p-8 prose prose-slate max-w-none">
            <div className="flex items-center gap-3 mb-6">
              <Handshake className="h-10 w-10 text-blue-600" />
              <h1 className="text-4xl font-bold">Partners</h1>
            </div>
            
            <div className="space-y-6 text-gray-700">
              <p className="text-lg">
                TEKMS partners with leading e-commerce platforms and technology providers to deliver
                the best multi-marketplace management experience.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Marketplace Partners</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">Shopify</h3>
                  <p className="text-sm">Official Shopify Partner for seamless store integration</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">BigCommerce</h3>
                  <p className="text-sm">Verified BigCommerce technology partner</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">Etsy</h3>
                  <p className="text-sm">Certified Etsy API integration partner</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">TikTok Shop</h3>
                  <p className="text-sm">Official TikTok Shop partner</p>
                </div>
              </div>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Become a Partner</h2>
              <p>
                Interested in partnering with TEKMS? We're always looking for strategic partnerships
                that benefit our users. Contact us at{' '}
                <a href="mailto:partners@tekms.com" className="text-blue-600 hover:underline">
                  partners@tekms.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}