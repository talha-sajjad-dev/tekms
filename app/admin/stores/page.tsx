"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, Store, Search, RefreshCw, ExternalLink } from 'lucide-react'

interface StoreConnection {
  id: string
  platform: string
  storeName: string
  storeUrl: string | null
  productCount: number
  isActive: boolean
  lastSyncedAt: string | null
  syncStatus: string | null
  createdAt: string
  user: {
    email: string
    name: string | null
  }
  storeSubscription: {
    status: string
    pricingTier: {
      name: string
      monthlyPrice: number
    }
  } | null
}

export default function AdminStoresPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stores, setStores] = useState<StoreConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    } else if (status === 'authenticated') {
      if (session?.user?.role !== 'ADMIN') {
        router.push('/dashboard')
      } else {
        fetchStores()
      }
    }
  }, [status, session])

  const fetchStores = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/stores')
      const data = await res.json()
      if (res.ok) {
        setStores(data.stores || [])
      }
    } catch (error) {
      console.error('Error fetching stores:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredStores = stores.filter(store =>
    store.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.platform.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      BIGCOMMERCE: 'bg-blue-100 text-blue-800',
      SHOPIFY: 'bg-green-100 text-green-800',
      ETSY: 'bg-orange-100 text-orange-800',
      TIKTOK: 'bg-pink-100 text-pink-800'
    }
    return colors[platform] || 'bg-gray-100 text-gray-800'
  }

  const totalRevenue = stores.reduce((sum, store) => 
    sum + Number(store.storeSubscription?.pricingTier?.monthlyPrice || 0), 0
  )

  if (loading || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="border-b bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Store className="h-8 w-8 text-orange-600" />
            <div>
              <h1 className="text-2xl font-bold">Store Connections</h1>
              <p className="text-sm text-muted-foreground">
                All user store connections across platforms
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Stores</CardDescription>
              <CardTitle className="text-3xl">{stores.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active</CardDescription>
              <CardTitle className="text-3xl text-green-600">
                {stores.filter(s => s.isActive).length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Products</CardDescription>
              <CardTitle className="text-3xl">
                {stores.reduce((sum, s) => sum + s.productCount, 0).toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Monthly Revenue</CardDescription>
              <CardTitle className="text-3xl text-green-600">
                ${totalRevenue.toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by store name, user email, or platform..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={fetchStores}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stores Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Store Connections</CardTitle>
            <CardDescription>
              {filteredStores.length} of {stores.length} stores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Last Synced</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">
                      {store.storeName}
                      {store.storeUrl && (
                        <a 
                          href={`https://${store.storeUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 inline-block"
                        >
                          <ExternalLink className="h-3 w-3 text-blue-600" />
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {store.user.name || store.user.email}
                    </TableCell>
                    <TableCell>
                      <Badge className={getPlatformColor(store.platform)}>
                        {store.platform}
                      </Badge>
                    </TableCell>
                    <TableCell>{store.productCount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={store.isActive ? "default" : "secondary"}>
                        {store.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {store.storeSubscription ? (
                        <div className="text-sm">
                          <div>{store.storeSubscription.pricingTier.name}</div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {store.storeSubscription.status}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No subscription</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      ${store.storeSubscription?.pricingTier?.monthlyPrice.toFixed(2) || '0.00'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {store.lastSyncedAt 
                        ? new Date(store.lastSyncedAt).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}