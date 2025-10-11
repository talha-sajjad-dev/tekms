import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function CookiesPage() {
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
            <h1 className="text-4xl font-bold mb-6">Cookie Policy</h1>
            <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>
            
            <div className="space-y-6 text-gray-700">
              <p>
                This Cookie Policy explains how TEKMS Listing Manager uses cookies and similar technologies
                to recognize you when you visit our platform.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">What are cookies?</h2>
              <p>
                Cookies are small data files placed on your computer or mobile device when you visit a website.
                They help us provide you with a better experience by remembering your preferences and login information.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">How we use cookies</h2>
              <ul className="space-y-2">
                <li><strong>Essential cookies:</strong> Required for authentication and security</li>
                <li><strong>Performance cookies:</strong> Help us understand how you use our platform</li>
                <li><strong>Functionality cookies:</strong> Remember your preferences and settings</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Managing cookies</h2>
              <p>
                You can control and/or delete cookies as you wish. You can delete all cookies on your computer
                and most browsers have settings that prevent them from being placed.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}