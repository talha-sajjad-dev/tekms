"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { 
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Settings,
  Package,
  Link as LinkIcon,
  FileText,
  Zap
} from "lucide-react"

interface APIConfig {
  tiktokApiKey: string
  tiktokApiSecret: string
  tiktokShopId: string
}

interface SyncStatus {
  totalProducts: number
  synced: number
  failed: number
  inProgress: boolean
}

export default function TikTokDirectPage() {
  const [apiConfig, setApiConfig] = useState<APIConfig>({
    tiktokApiKey: "",
    tiktokApiSecret: "",
    tiktokShopId: ""
  })
  
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [apiDocs, setApiDocs] = useState("")

  const handleConfigChange = (field: keyof APIConfig, value: string) => {
    setApiConfig(prev => ({ ...prev, [field]: value }))
  }

  const testConnection = async () => {
    setTesting(true)
    try {
      const response = await fetch('/api/tiktok-direct/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiConfig)
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Connection Successful",
          description: "Both BigCommerce and TikTok APIs are connected successfully",
        })
      } else {
        throw new Error(data.error || 'Connection failed')
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to APIs",
        variant: "destructive",
      })
    } finally {
      setTesting(false)
    }
  }

  const startSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/tiktok-direct/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiConfig)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSyncStatus(data.status)
        toast({
          title: "Sync Started",
          description: `Syncing ${data.status.totalProducts} products to TikTok`,
        })
      } else {
        throw new Error(data.error || 'Sync failed')
      }
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to start sync",
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
  }

  const saveApiDocs = () => {
    // This will be used to process the API documentation
    localStorage.setItem('tiktok_api_docs', apiDocs)
    toast({
      title: "Documentation Saved",
      description: "API documentation has been saved for reference",
    })
  }

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">TikTok Direct API Integration</h1>
          <p className="text-muted-foreground">
            Direct integration between BigCommerce and TikTok Shop using their official APIs
          </p>
        </div>

        {/* OAuth Authorization */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              TikTok Shop Authorization
            </CardTitle>
            <CardDescription>
              Connect your TikTok Shop account using OAuth
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>BigCommerce Connected</AlertTitle>
                <AlertDescription>
                  Using store: {process.env.NEXT_PUBLIC_STORE_HASH || 't48lqqxd8a'}
                </AlertDescription>
              </Alert>

              <Button
                onClick={() => window.location.href = '/api/tiktok-direct/authorize'}
                className="w-full"
                size="lg"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Connect TikTok Shop Account
              </Button>

              <p className="text-sm text-muted-foreground">
                You'll be redirected to TikTok to authorize this application. Make sure you've added the redirect URI in TikTok Developer Portal.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Required Parameters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Sync Configuration
            </CardTitle>
            <CardDescription>
              Configure parameters required for product sync
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="category-id">TikTok Category ID *</Label>
                <Input
                  id="category-id"
                  placeholder="e.g., 100123"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Find this in your TikTok Shop Seller Center → Product Categories
                </p>
              </div>
              <div>
                <Label htmlFor="warehouse-id">Warehouse ID *</Label>
                <Input
                  id="warehouse-id"
                  placeholder="e.g., WH123456"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Find this in TikTok Shop Seller Center → Logistics → Warehouses
                </p>
              </div>
              <div>
                <Label htmlFor="brand-id">Brand ID (Optional)</Label>
                <Input
                  id="brand-id"
                  placeholder="e.g., BR123456"
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sync Products */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Sync Products to TikTok
            </CardTitle>
            <CardDescription>
              Export products from BigCommerce to TikTok Shop
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>API Integration Status</AlertTitle>
                <AlertDescription>
                  This feature requires API documentation to be implemented. Please provide the BigCommerce and TikTok API documentation above.
                </AlertDescription>
              </Alert>

              <Button 
                onClick={startSync} 
                disabled={syncing}
                className="w-full"
                size="lg"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Syncing Products...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Start Product Sync
                  </>
                )}
              </Button>

              {syncStatus && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sync Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{syncStatus.totalProducts}</div>
                        <div className="text-sm text-muted-foreground">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{syncStatus.synced}</div>
                        <div className="text-sm text-muted-foreground">Synced</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{syncStatus.failed}</div>
                        <div className="text-sm text-muted-foreground">Failed</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Requirements & Restrictions */}
        <Card>
          <CardHeader>
            <CardTitle>Implementation Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Next Steps:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Paste BigCommerce API documentation in the documentation section above</li>
                  <li>Paste TikTok Shop API documentation in the documentation section above</li>
                  <li>I will implement the API integration based on the provided documentation</li>
                  <li>Configure your API credentials</li>
                  <li>Test the connection</li>
                  <li>Start syncing products</li>
                </ol>
              </div>

              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Ready for Implementation</AlertTitle>
                <AlertDescription>
                  The page structure is ready. Provide the API documentation to complete the integration.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>

      <Toaster />
    </div>
  )
}