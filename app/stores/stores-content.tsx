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
  {
    value: "BIGCOMMERCE",
    label: "BigCommerce",
    color: "bg-blue-500",
    textColor: "text-blue-600",
    hoverColor: "hover:border-blue-400",
    logo: (
      <svg className="w-12 h-12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
      </svg>
    ),
    isComingSoon: false
  },
  {
    value: "SHOPIFY",
    label: "Shopify",
    color: "bg-green-500",
    textColor: "text-green-600",
    hoverColor: "hover:border-green-400",
    logo: (
      <svg className="w-12 h-12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14.8 7.1c-.1-.6-.5-.9-1-.9-.5 0-1.5.2-2.4.6-.3-1-.8-1.8-1.4-2.4-.9-.9-2-1.3-3.1-1.3h-.2c-.2-.2-.4-.3-.7-.3-.5 0-1 .4-1.1 1.1L3.5 13.4c-.1.4.2.8.6.8h4.1l2-12.1c.1-.5.5-.9 1-.9h.1c1.1 0 2 .9 2 2v.1c-.9.3-1.7.8-2.4 1.4-.6.6-1 1.4-1 2.3 0 1.8 1.5 3.3 3.3 3.3.7 0 1.4-.2 2-.7.5-.4.9-1 1-1.7l.1-.7z"/>
      </svg>
    ),
    isComingSoon: true
  },
  {
    value: "ETSY",
    label: "Etsy",
    color: "bg-orange-500",
    textColor: "text-orange-600",
    hoverColor: "hover:border-orange-400",
    logo: (
      <svg className="w-12 h-12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
      </svg>
    ),
    isComingSoon: false
  },
  {
    value: "TIKTOK",
    label: "TikTok Shop",
    color: "bg-pink-500",
    textColor: "text-pink-600",
    hoverColor: "hover:border-pink-400",
    logo: (
      <svg className="w-12 h-12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
    ),
    isComingSoon: false
  },
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
  const [showBigCommerceForm, setShowBigCommerceForm] = useState(false)
  const [showShopifyForm, setShowShopifyForm] = useState(false)
  const [bcFormData, setBcFormData] = useState({
    storeHash: '',
    accessToken: '',
    storeName: ''
  })
  const [shopifyShop, setShopifyShop] = useState('')
  const [bcConnecting, setBcConnecting] = useState(false)
  const [shopifyConnecting, setShopifyConnecting] = useState(false)

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

  const handleConnectPlatform = async (platformValue: string) => {
    const platform = PLATFORMS.find(p => p.value === platformValue)
    
    // Check if platform is coming soon (Shopify)
    if (platform?.isComingSoon) {
      // Check if user is admin
      const isAdmin = session?.user?.role === 'ADMIN'
      
      if (!isAdmin) {
        toast({
          title: "Coming Soon! 🚀",
          description: `${platform.label} integration is currently under development. We're working hard to bring it to you soon!`,
          duration: 5000,
        })
        setShowConnectModal(false)
        return
      } else {
        toast({
          title: "Admin Access",
          description: `You can connect ${platform.label} for testing purposes.`,
          duration: 3000,
        })
      }
    }
    
    setShowConnectModal(false)
    
    // BigCommerce requires manual credentials
    if (platformValue === 'BIGCOMMERCE') {
      setShowBigCommerceForm(true)
      return
    }
    
    // Shopify requires shop domain
    if (platformValue === 'SHOPIFY') {
      setShowShopifyForm(true)
      return
    }
    
    // TikTok and Etsy use direct OAuth
    try {
      const platformLower = platformValue.toLowerCase()
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
          description: data.error || `Failed to initiate ${PLATFORMS.find(p => p.value === platformValue)?.label} connection. Make sure OAuth credentials are configured in Admin → System Settings.`,
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
                   <span className={platform.textColor}>{platform.logo}</span>
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
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {platform.stores.map((store) => (
                      <Card key={store.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-8 h-8 rounded ${platform.color} flex items-center justify-center ${platform.textColor}`}>
                              <div className="scale-75">
                                {platform.logo}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm truncate">{store.storeName}</h3>
                            </div>
                          </div>
                          <div className="space-y-1 mb-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Products</span>
                              <span className="font-medium">{store.productCount}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {getStatusBadge(store.syncStatus, store.isActive)}
                            </div>
                            {store.lastSyncedAt && (
                              <div className="text-xs text-muted-foreground">
                                Synced {formatDate(store.lastSyncedAt)}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs h-7 text-destructive hover:text-destructive border-destructive/30"
                              onClick={() => setDisconnectId(store.id)}
                              title="Disconnect store"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Disconnect
                            </Button>
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
            <AlertDialogTitle>⚠️ Disconnect Store & Delete All Products</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold text-destructive">
                This action will permanently delete all products from this store!
              </p>
              <p>
                All {stores.find(s => s.id === disconnectId)?.productCount || 0} products will be removed from your database.
                You'll need to re-sync when you reconnect.
              </p>
              <p className="text-sm text-muted-foreground">
                This action cannot be undone. Make sure you have backups if needed.
              </p>
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

      {/* Connect Store Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowConnectModal(false)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Connect Store</CardTitle>
              <CardDescription>Choose a platform to connect</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {PLATFORMS.map((platform) => (
                <Button
                  key={platform.value}
                  variant="outline"
                  className={`relative h-32 flex flex-col gap-3 ${platform.hoverColor} transition-all duration-200`}
                  onClick={() => handleConnectPlatform(platform.value)}
                >
                  {platform.isComingSoon && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                        Coming Soon
                      </Badge>
                    </div>
                  )}
                  <div className={platform.textColor}>
                    {platform.logo}
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-semibold">{platform.label}</span>
                    {platform.isComingSoon && (
                      <span className="text-xs text-muted-foreground">Under Development</span>
                    )}
                  </div>
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

      {/* BigCommerce Credentials Form */}
      {showBigCommerceForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowBigCommerceForm(false)}>
          <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Connect BigCommerce Store</CardTitle>
              <CardDescription>
                Enter your BigCommerce store credentials. You can find these in your BigCommerce admin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Store Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="My BigCommerce Store"
                  value={bcFormData.storeName}
                  onChange={(e) => setBcFormData({...bcFormData, storeName: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">A friendly name for your store</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Store Hash</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                  placeholder="abc123def"
                  value={bcFormData.storeHash}
                  onChange={(e) => setBcFormData({...bcFormData, storeHash: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">
                  Found in your store's URL: https://store-<strong>abc123def</strong>.mybigcommerce.com
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Access Token</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                  placeholder="v2_..."
                  value={bcFormData.accessToken}
                  onChange={(e) => setBcFormData({...bcFormData, accessToken: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">
                  Generate from BigCommerce → Advanced Settings → API Accounts
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-xs text-blue-900">
                  <strong>Need help?</strong> Go to your BigCommerce admin → Advanced Settings → API Accounts →
                  Create API Account → Select required scopes (read/write products) → Save to get your access token.
                </p>
              </div>
            </CardContent>
            <div className="p-4 border-t flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowBigCommerceForm(false)
                  setBcFormData({storeHash: '', accessToken: '', storeName: ''})
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!bcFormData.storeName || !bcFormData.storeHash || !bcFormData.accessToken) {
                    toast({
                      title: "Missing Information",
                      description: "Please fill in all fields",
                      variant: "destructive"
                    })
                    return
                  }
                  
                  setBcConnecting(true)
                  try {
                    const res = await fetch('/api/auth/connect/bigcommerce', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(bcFormData)
                    })
                    
                    const data = await res.json()
                    
                    if (res.ok) {
                      toast({
                        title: "Store Connected!",
                        description: `${bcFormData.storeName} has been connected successfully.`,
                      })
                      setShowBigCommerceForm(false)
                      setBcFormData({storeHash: '', accessToken: '', storeName: ''})
                      fetchStores()
                    } else {
                      toast({
                        title: "Connection Failed",
                        description: data.error || "Failed to connect BigCommerce store",
                        variant: "destructive"
                      })
                    }
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to connect store",
                      variant: "destructive"
                    })
                  } finally {
                    setBcConnecting(false)
                  }
                }}
                disabled={bcConnecting}
                className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600"
              >
                {bcConnecting ? "Connecting..." : "Connect Store"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Shopify Shop Domain Form */}
      {showShopifyForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowShopifyForm(false)}>
          <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Connect Shopify Store</CardTitle>
              <CardDescription>
                Enter your Shopify store domain to connect
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Shopify Store Domain</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="my-store.myshopify.com"
                  value={shopifyShop}
                  onChange={(e) => setShopifyShop(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter your full Shopify domain (e.g., my-store.myshopify.com)
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-xs text-blue-900">
                  <strong>What happens next?</strong> You'll be redirected to Shopify to securely authorize access to your store.
                  We'll only access the products and inventory you give us permission to manage.
                </p>
              </div>
            </CardContent>
            <div className="p-4 border-t flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowShopifyForm(false)
                  setShopifyShop('')
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!shopifyShop) {
                    toast({
                      title: "Missing Information",
                      description: "Please enter your Shopify store domain",
                      variant: "destructive"
                    })
                    return
                  }
                  
                  setShopifyConnecting(true)
                  try {
                    const res = await fetch('/api/auth/connect/shopify', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ shop: shopifyShop })
                    })
                    
                    const data = await res.json()
                    
                    if (res.ok && data.authUrl) {
                      // Redirect to Shopify OAuth
                      window.location.href = data.authUrl
                    } else {
                      toast({
                        title: "Connection Failed",
                        description: data.error || "Failed to connect Shopify store. Make sure OAuth credentials are configured in Admin → System Settings.",
                        variant: "destructive"
                      })
                      setShopifyConnecting(false)
                    }
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to connect store",
                      variant: "destructive"
                    })
                    setShopifyConnecting(false)
                  }
                }}
                disabled={shopifyConnecting}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600"
              >
                {shopifyConnecting ? "Connecting..." : "Connect to Shopify"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}