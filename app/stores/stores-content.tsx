"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Store, 
  Plus, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Package,
  ArrowLeft
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface StoreConnection {
  id: string
  platform: string
  storeName: string
  storeUrl: string | null
  productCount: number
  isActive: boolean
  syncStatus: string | null
  lastSyncedAt: string | null
  createdAt: string
}

const PLATFORMS = [
  { value: "SHOPIFY", label: "Shopify", color: "bg-green-500", icon: "🟢" },
  { value: "ETSY", label: "Etsy", color: "bg-orange-500", icon: "🟠" },
  { value: "BIGCOMMERCE", label: "BigCommerce", color: "bg-blue-500", icon: "🔵" },
  { value: "TIKTOK", label: "TikTok Shop", color: "bg-pink-500", icon: "🎵" },
]

export default function StoresPageContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [stores, setStores] = useState<StoreConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [disconnectId, setDisconnectId] = useState<string | null>(null)
  const [showConnectModal, setShowConnectModal] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    } else if (status === "authenticated") {
      fetchStores()
      
      // Check for success/error from OAuth callback
      const success = searchParams.get('success')
      const error = searchParams.get('error')
      const storeName = searchParams.get('store')
      
      if (success && storeName) {
        toast({
          title: "Store Connected!",
          description: `${decodeURIComponent(storeName)} has been connected successfully.`,
        })
        // Clear URL params
        window.history.replaceState({}, '', '/stores')
      } else if (error) {
        toast({
          title: "Connection Failed",
          description: getErrorMessage(error),
          variant: "destructive",
        })
        window.history.replaceState({}, '', '/stores')
      }
    }
  }, [status, searchParams])

  const fetchStores = async () => {
    try {
      const res = await fetch("/api/stores")
      const data = await res.json()
      
      if (res.ok) {
        setStores(data.stores || [])
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch stores",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch stores",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async (id: string) => {
    try {
      const res = await fetch(`/api/stores/${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        toast({
          title: "Store Disconnected",
          description: "Store has been disconnected successfully",
        })
        setStores(stores.filter((s) => s.id !== id))
      } else {
        const data = await res.json()
        toast({
          title: "Error",
          description: data.error || "Failed to disconnect store",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect store",
        variant: "destructive",
      })
    } finally {
      setDisconnectId(null)
    }
  }

  const handleSync = async (id: string) => {
    try {
      toast({
        title: "Syncing...",
        description: "Store sync in progress",
      })
      
      const res = await fetch(`/api/stores/${id}/sync`, {
        method: "POST",
      })

      const data = await res.json()

      if (res.ok) {
        toast({
          title: "Sync Complete",
          description: `Synced ${data.productCount || 0} products`,
        })
        fetchStores()
      } else {
        toast({
          title: "Sync Failed",
          description: data.error || "Failed to sync store",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sync store",
        variant: "destructive",
      })
    }
  }

  const getPlatformInfo = (platform: string) => {
    return PLATFORMS.find((p) => p.value === platform) || { 
      label: platform, 
      color: "bg-gray-500",
      icon: "📦"
    }
  }

  const getStatusBadge = (status: string | null, isActive: boolean) => {
    if (!isActive) {
      return <Badge variant="secondary">Inactive</Badge>
    }
    
    switch (status) {
      case "connected":
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</Badge>
      case "error":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Error</Badge>
      case "needs_reauth":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Needs Re-auth</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getErrorMessage = (error: string): string => {
    const messages: Record<string, string> = {
      'missing_parameters': 'Missing required parameters',
      'invalid_state': 'Invalid security token. Please try again.',
      'shop_mismatch': 'Shop domain mismatch',
      'connection_failed': 'Failed to connect store',
      'unauthorized': 'You must be logged in',
    }
    return messages[error] || error.replace(/_/g, ' ')
  }

  const handleConnectPlatform = async (platform: string) => {
    setShowConnectModal(false)
    
    try {
      const platformLower = platform.toLowerCase()
      const res = await fetch(`/api/auth/connect/${platformLower}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      
      const data = await res.json()
      
      if (res.ok && data.authUrl) {
        // Redirect to OAuth provider
        window.location.href = data.authUrl
      } else {
        toast({
          title: "Connection Failed",
          description: data.error || `Failed to initiate ${PLATFORMS.find(p => p.value === platform)?.label} connection`,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect store. Please try again.",
        variant: "destructive",
      })
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'Never'
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    
    return d.toLocaleDateString()
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Group stores by platform
  const storesByPlatform = PLATFORMS.map(platform => ({
    ...platform,
    stores: stores.filter(s => s.platform === platform.value)
  }))

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Store Connections</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your marketplace store connections
                </p>
              </div>
            </div>
            <Button onClick={() => setShowConnectModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Connect Store
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* No Stores State */}
        {stores.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12">
              <div className="text-center">
                <Store className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Stores Connected</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Connect your first marketplace store to start managing your products
                  across multiple platforms from one dashboard.
                </p>
                <Button size="lg" onClick={() => setShowConnectModal(true)}>
                  <Plus className="h-5 w-5 mr-2" />
                  Connect Your First Store
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Stores by Platform */
          <div className="space-y-8">
            {storesByPlatform.map((platform) => (
              <div key={platform.value}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <span className="text-2xl">{platform.icon}</span>
                    {platform.label}
                  </h2>
                  {platform.stores.length === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowConnectModal(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Connect {platform.label}
                    </Button>
                  )}
                </div>

                {platform.stores.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="pt-8 pb-8">
                      <p className="text-center text-muted-foreground">
                        No {platform.label} stores connected
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {platform.stores.map((store) => (
                      <Card key={store.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4 flex-1">
                              <div className={`w-12 h-12 rounded-lg ${platform.color} flex items-center justify-center text-2xl`}>
                                {platform.icon}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-lg">{store.storeName}</h3>
                                  {getStatusBadge(store.syncStatus, store.isActive)}
                                </div>
                                {store.storeUrl && (
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {store.storeUrl}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Package className="h-4 w-4" />
                                    <span>{store.productCount} products</span>
                                  </div>
                                  <div>
                                    Last synced: {formatDate(store.lastSyncedAt)}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSync(store.id)}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Sync
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/stores/${store.id}`)}
                              >
                                Manage
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDisconnectId(store.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog open={!!disconnectId} onOpenChange={() => setDisconnectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Store</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect this store? Your products will be preserved
              but won't sync anymore. You can reconnect the store anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disconnectId && handleDisconnect(disconnectId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Connect Store Modal - Will implement next */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Connect Store</CardTitle>
              <CardDescription>Choose a platform to connect</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {PLATFORMS.map((platform) => (
                <Button
                  key={platform.value}
                  variant="outline"
                  className="h-24 flex flex-col gap-2"
                  onClick={() => handleConnectPlatform(platform.value)}
                >
                  <span className="text-3xl">{platform.icon}</span>
                  <span>{platform.label}</span>
                </Button>
              ))}
            </CardContent>
            <div className="p-4 border-t">
              <Button variant="ghost" onClick={() => setShowConnectModal(false)} className="w-full">
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}