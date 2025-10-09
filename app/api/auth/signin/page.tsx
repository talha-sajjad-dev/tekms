import { Metadata } from 'next'
import { Chrome } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Sign In | TEKMS',
  description: 'Sign in to your TEKMS account',
}

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Welcome to TEKMS</CardTitle>
          <CardDescription>
            Sign in to start automating your e-commerce workflow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action="/api/auth/signin/google" method="POST">
            <input type="hidden" name="callbackUrl" value="/dashboard" />
            <Button type="submit" className="w-full" size="lg">
              <Chrome className="mr-2 h-5 w-5" />
              Continue with Google
            </Button>
          </form>
          
          <div className="space-y-2 pt-4">
            <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
              <p className="text-sm font-semibold mb-2">✨ Free Tier Includes:</p>
              <ul className="text-sm space-y-1">
                <li>• 10 products per month</li>
                <li>• BigCommerce, TikTok, Etsy support</li>
                <li>• Encrypted credential storage</li>
                <li>• Usage analytics</li>
              </ul>
            </div>
          </div>
          
          <p className="text-xs text-center text-muted-foreground px-4">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}