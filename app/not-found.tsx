import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, ArrowLeft, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-blue-100 shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="text-9xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                404
              </div>
              <div className="absolute -top-4 -right-4">
                <div className="w-8 h-8 bg-blue-600 rounded-full animate-ping opacity-75"></div>
              </div>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">
            Page Not Found
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            Oops! The page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Common Pages:</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>
                <Link href="/dashboard" className="hover:underline flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/stores" className="hover:underline flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Store Connections
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:underline flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Products
                </Link>
              </li>
              <li>
                <Link href="/billing" className="hover:underline flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Billing
                </Link>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              asChild
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              <Link href="/dashboard">
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Link>
            </Button>
            
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500 pt-4">
            If you believe this is an error, please contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}