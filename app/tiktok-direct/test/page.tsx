"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Copy } from "lucide-react"

export default function TikTokTestPage() {
  const [appKey, setAppKey] = useState("sbawlkhjww8r7sef4q")
  const [redirectUri] = useState("http://localhost:3000/api/tiktok-direct/callback")
  const [state] = useState("test123")
  
  const generateAuthUrl = () => {
    const params = new URLSearchParams({
      app_key: appKey,
      state: state,
      redirect_uri: redirectUri,
      response_type: 'code'
    })
    return `https://auth.tiktok-shops.com/oauth/authorize?${params.toString()}`
  }

  const authUrl = generateAuthUrl()

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">TikTok OAuth Test</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>OAuth Configuration</CardTitle>
          <CardDescription>Test and verify your OAuth setup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="app-key">App Key (from TikTok Portal)</Label>
            <div className="flex gap-2">
              <Input
                id="app-key"
                value={appKey}
                onChange={(e) => setAppKey(e.target.value)}
              />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(appKey)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label>Redirect URI</Label>
            <div className="flex gap-2">
              <Input value={redirectUri} readOnly />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(redirectUri)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label>State</Label>
            <Input value={state} readOnly />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Generated OAuth URL</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg font-mono text-sm break-all mb-4">
            {authUrl}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => copyToClipboard(authUrl)} variant="outline">
              <Copy className="h-4 w-4 mr-2" />
              Copy URL
            </Button>
            <Button onClick={() => window.open(authUrl, '_blank')}>
              Test in New Tab
            </Button>
          </div>
        </CardContent>
      </Card>

      <Alert>
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-semibold">Verify in TikTok Developer Portal:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Copy the App Key above and compare with your TikTok Portal (must match exactly)</li>
              <li>Copy the Redirect URI and make sure it's added in TikTok Portal</li>
              <li>Make sure your app status is "Active" (not Draft or Under Review)</li>
              <li>Verify you're using the correct environment (Sandbox vs Production)</li>
              <li>Click "Test in New Tab" to see the actual TikTok error page</li>
            </ol>
          </div>
        </AlertDescription>
      </Alert>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Error 36004003 "invalid client_key" means:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>App Key doesn't match (check for typos, spaces, case sensitivity)</li>
              <li>App is not approved/active in TikTok Portal</li>
              <li>Wrong environment (using Sandbox key with Production endpoint or vice versa)</li>
              <li>App has been deleted or suspended</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}