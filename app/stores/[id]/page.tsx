"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, RefreshCw, Package, Calendar, Activity, Store as StoreIcon } from "lucide-react"

interface StoreDetails {
  id: string
  platform: string
  storeName: string
  storeUrl: string | null
  externalStoreId: string
  isActive: boolean
  lastSyncedAt: string | null
  syncStatus: string | null
  syncError: string | null
  productCount: number
  createdAt: string
  metadata: any
  storeSubscription: {
    id: string
    status: string
    productCount: number
    pricingTier: {
      name: string
      monthlyPrice: number
      minProducts: number
      maxProducts: number
    }
  } | null
}

export default function StoreDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const storeId = params.id as string

  const [store, setStore] = useState<StoreDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    } else if (status === "authenticated") {
      fetchStore()
    }
  }, [status, storeId])

  const fetchStore = async () => {
    try {
      const res = await fetch(`/api/stores/${storeId}`)
      const data = await res.json()

      if (res.ok) {
        setStore(data.store)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch store details",
          variant: "destructive",
        })
        router.push("/stores")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch store details",
        variant: "destructive",
      })
      router.push("/stores")
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    
    // Check if we should use background sync for large stores
    const useBackground = store && store.productCount > 1000
    
    if (useBackground) {
      toast({
        title: "🔄 Large Store Detected",
        description: `This store has ${store.productCount.toLocaleString()} products. Sync will run in the background to prevent timeouts. You can continue working while products are being synced.`,
        duration: 5000,
      })
    } else {
      toast({
        title: "🔄 Sync Started",
        description: `Syncing products from ${store?.storeName}...`,
      })
    }
    
    try {
      const res = await fetch(`/api/stores/${storeId}/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ background: useBackground }),
      })

      const data = await res.json()

      if (res.ok) {
        if (data.background) {
          toast({
            title: "✅ Background Sync Started",
            description: `Sync job ${data.jobId.slice(0, 8)}... is now running. This may take several minutes. The page will refresh automatically when complete.`,
            duration: 7000,
          })
          
          // Poll for completion every 10 seconds
          const pollInterval = setInterval(async () => {
            const storeRes = await fetch(`/api/stores/${storeId}`)
            const storeData = await storeRes.json()
            if (storeData.store.syncStatus !== 'processing') {
              clearInterval(pollInterval)
              fetchStore()
              toast({
                title: "✅ Sync Complete",
                description: `${storeData.store.productCount} products synced successfully!`,
              })
            }
          }, 10000)
          
          // Stop polling after 5 minutes
          setTimeout(() => clearInterval(pollInterval), 300000)
        } else {
          toast({
            title: "✅ Sync Complete!",
            description: `Successfully synced ${data.productCount} products from ${store?.storeName}`,
            duration: 5000,
          })
        }
        fetchStore()
      } else {
        toast({
          title: "❌ Sync Failed",
          description: data.error || "Failed to sync store",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to sync store. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return "Never"
    return new Date(date).toLocaleString()
  }

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "bigcommerce":
        return "bg-blue-500"
      case "shopify":
        return "bg-green-500"
      case "etsy":
        return "bg-orange-500"
      case "tiktok":
        return "bg-pink-500"
      default:
        return "bg-gray-500"
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!store) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/stores")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{store.storeName}</h1>
              <p className="text-sm text-muted-foreground">
                Store Management
              </p>
            </div>
            <Button onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync Now"}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
          {/* Platform Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Platform</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${getPlatformColor(store.platform)} flex items-center justify-center`}>
                  <StoreIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold">{store.platform}</div>
                  {store.storeUrl && (
                    <a 
                      href={`https://${store.storeUrl}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {store.storeUrl}
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Count Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Package className="h-10 w-10 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{store.productCount}</div>
                  <div className="text-xs text-muted-foreground">Total products</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Activity className="h-10 w-10 text-green-600" />
                <div>
                  <Badge variant={store.isActive ? "default" : "secondary"}>
                    {store.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    {store.syncStatus || "Not synced"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sync Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sync Information</CardTitle>
            <CardDescription>Last sync and error details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Last Synced:</span>
              <span className="text-sm text-muted-foreground">
                {formatDate(store.lastSyncedAt)}
              </span>
            </div>
            
            {store.syncError && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                <div className="font-semibold text-destructive mb-1">Sync Error</div>
                <div className="text-sm text-destructive/80">{store.syncError}</div>
              </div>
            )}
            
            {store.productCount > 5000 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md dark:bg-yellow-950/20">
                <div className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                  Large Product Catalog
                </div>
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  This store has {store.productCount.toLocaleString()} products. Syncs will automatically run in the background to prevent timeouts.
                  Product management pages use pagination for optimal performance.
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSync} disabled={syncing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync Products"}
              </Button>
              <Button variant="outline" onClick={() => router.push(`/stores/${storeId}/products`)}>
                <Package className="h-4 w-4 mr-2" />
                Manage Products
              </Button>
              <Button variant="outline" onClick={() => router.push("/products")}>
                View All Products
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Information */}
        {store.storeSubscription && (
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Billing and pricing tier information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{store.storeSubscription.pricingTier.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {store.storeSubscription.pricingTier.minProducts} - {store.storeSubscription.pricingTier.maxProducts === -1 ? "Unlimited" : store.storeSubscription.pricingTier.maxProducts} products
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    ${store.storeSubscription.pricingTier.monthlyPrice}/mo
                  </div>
                  <Badge variant={store.storeSubscription.status === "ACTIVE" ? "default" : "secondary"}>
                    {store.storeSubscription.status}
                  </Badge>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => router.push("/billing")}>
                View Billing Details
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Store Details */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Store Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Store ID:</span>
              <span className="font-mono">{store.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">External ID:</span>
              <span className="font-mono">{store.externalStoreId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span>{formatDate(store.createdAt)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}