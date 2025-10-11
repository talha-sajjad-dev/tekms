import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function AboutPage() {
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
            <h1 className="text-4xl font-bold mb-6">About TEKMS Listing Manager</h1>
            
            <div className="space-y-6 text-gray-700">
              <p className="text-lg">
                TEKMS Listing Manager is a powerful SaaS platform designed to streamline multi-marketplace operations
                for e-commerce businesses of all sizes.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Our Mission</h2>
              <p>
                We empower online sellers to manage their product listings across multiple marketplaces from a single,
                unified dashboard. Whether you're selling on Shopify, Etsy, BigCommerce, or TikTok Shop, TEKMS makes
                it simple to sync, update, and optimize your inventory.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">What We Do</h2>
              <ul className="space-y-2">
                <li>Connect multiple marketplace stores in one place</li>
                <li>Automatic product synchronization across platforms</li>
                <li>Real-time inventory management</li>
                <li>Per-store subscription billing</li>
                <li>Advanced search and bulk operations</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Our Values</h2>
              <div className="grid md:grid-cols-3 gap-4 mt-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Simplicity</h3>
                  <p className="text-sm">Easy-to-use interface that anyone can master</p>
                </div>
                <div className="p-4 bg-cyan-50 rounded-lg">
                  <h3 className="font-semibold text-cyan-900 mb-2">Reliability</h3>
                  <p className="text-sm">99.9% uptime with enterprise-grade security</p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <h3 className="font-semibold text-indigo-900 mb-2">Growth</h3>
                  <p className="text-sm">Scale from 10 to 10,000+ products effortlessly</p>
                </div>
              </div>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Contact Us</h2>
              <p>
                Have questions? We'd love to hear from you. Reach out to our team at{' '}
                <a href="mailto:support@tekms.com" className="text-blue-600 hover:underline">
                  support@tekms.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}