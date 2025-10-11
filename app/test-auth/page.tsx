'use client'

import { signIn, signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestAuthPage() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (session) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-green-600">✅ Authentication Successful!</CardTitle>
              <CardDescription>You are logged in</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">Session Information:</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Email:</span> {session.user?.email}</p>
                  <p><span className="font-medium">Name:</span> {session.user?.name || 'Not provided'}</p>
                  <p><span className="font-medium">Role:</span> {session.user?.role}</p>
                  <p><span className="font-medium">User ID:</span> {session.user?.id}</p>
                  {session.user?.subscription && (
                    <>
                      <p><span className="font-medium">Subscription Tier:</span> {session.user.subscription.tier}</p>
                      <p><span className="font-medium">Subscription Status:</span> {session.user.subscription.status}</p>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Full Session Data:</h3>
                <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-64">
                  {JSON.stringify(session, null, 2)}
                </pre>
              </div>

              <Button 
                onClick={() => signOut({ callbackUrl: '/test-auth' })}
                variant="destructive"
                className="w-full"
              >
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">🔐 Test Authentication</CardTitle>
            <CardDescription className="text-center">
              Test Google OAuth & Email Login
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
              <p className="font-semibold text-yellow-900 mb-1">⚠️ Setup Required:</p>
              <p className="text-yellow-800">
                Follow the instructions in <code className="bg-yellow-100 px-1 rounded">docs/GOOGLE_OAUTH_SETUP.md</code> to configure Google OAuth.
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => signIn('google', { callbackUrl: '/test-auth' })}
                className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or use test credentials</span>
                </div>
              </div>

              <Button 
                onClick={() => signIn('credentials', { 
                  email: 'gokhansancar@gmail.com',
                  password: '123456789Gs_',
                  callbackUrl: '/test-auth'
                })}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                Test with Admin Credentials
              </Button>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs">
                <p className="font-semibold mb-1">Test Credentials:</p>
                <p>Email: gokhansancar@gmail.com</p>
                <p>Password: 123456789Gs_</p>
              </div>

              <Button 
                onClick={() => window.location.href = '/api/auth/signin'}
                variant="outline"
                className="w-full"
              >
                Go to NextAuth Default Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}