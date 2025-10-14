"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { BulkPriceDialog } from '@/components/products/BulkPriceDialog'
import { BulkTagDialog } from '@/components/products/BulkTagDialog'
import { SyncProgressDialog } from '@/components/products/SyncProgressDialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Package,
  Search,
  RefreshCw,
  X,
  Download,
  Edit,
  CheckCircle2,
  AlertCircle,
  Home,
  ChevronLeft,
  ChevronRight,
  Save
} from 'lucide-react'

interface Product {
  id: string
  externalId: string
  name: string
  sku: string | null
  price: number
  compareAtPrice: number | null
  platform: string
  images: any
  tags: string[]
  categories: string[]
  syncStatus: string | null
  lastSyncedAt: string | null
  createdAt: string
  updatedAt: string
  platformData: any
  storeConnection: {
    id: string
    platform: string
    storeName: string
    storeUrl: string | null
  } | null
}

interface StoreConnection {
  id: string
  platform: string
  storeName: string
  productCount: number
  syncStatus: string | null
  lastSyncedAt: string | null
}

interface SavedFilter {
  id: string
  name: string
  useCount: number
  filters: any
}

export default function ProductsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [products, setProducts] = useState<Product[]>([])
  const [stores, setStores] = useState<StoreConnection[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  
  // Dialogs
  const [showPriceDialog, setShowPriceDialog] = useState(false)
  const [showTagDialog, setShowTagDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showSyncDialog, setShowSyncDialog] = useState(false)
  const [showProgressDialog, setShowProgressDialog] = useState(false)
  const [syncingStoreId, setSyncingStoreId] = useState<string>('')
  const [syncingStoreName, setSyncingStoreName] = useState<string>('')
  const [bulkOperating, setBulkOperating] = useState(false)
  const [syncing, setSyncing] = useState(false)
  
  // Quick edit state
  const [editedName, setEditedName] = useState('')
  const [editedPrice, setEditedPrice] = useState('')
  const [editedTags, setEditedTags] = useState('')
  const [saving, setSaving] = useState(false)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([])
  const [quickFilter, setQuickFilter] = useState<'all' | 'synced' | 'drafts' | 'errors' | 'pending'>('all')
  
  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 100

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    } else if (status === 'authenticated') {
      fetchStores()
      fetchProducts()
      fetchSavedFilters()
    }
  }, [status, page])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (status === 'authenticated') {
        setPage(1)
        fetchProducts()
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, selectedStoreIds, quickFilter])

  // Set edit fields when product selected
  useEffect(() => {
    if (selectedProduct) {
      setEditedName(selectedProduct.name)
      setEditedPrice(selectedProduct.price.toString())
      setEditedTags(selectedProduct.tags.join(', '))
    }
  }, [selectedProduct])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      if (e.key === '/') {
        e.preventDefault()
        document.querySelector<HTMLInputElement>('input[type="text"]')?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/stores')
      const data = await res.json()
      if (res.ok) setStores(data.stores || [])
    } catch (error) {
      console.error('Error fetching stores:', error)
    }
  }

  const fetchProducts = async () => {
    setSearching(true)
    try {
      const syncStatusFilter = quickFilter === 'synced' ? 'synced' : 
                              quickFilter === 'errors' ? 'error' :
                              quickFilter === 'pending' ? 'pending' : ''

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: searchQuery,
        storeIds: selectedStoreIds.join(','),
        syncStatus: syncStatusFilter
      })

      const res = await fetch(`/api/products/unified?${params}`)
      const data = await res.json()
      
      if (res.ok) {
        setProducts(data.products || [])
        setTotalPages(data.pagination?.pages || 1)
        setTotal(data.pagination?.total || 0)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }

  const fetchSavedFilters = async () => {
    try {
      const res = await fetch('/api/filters')
      const data = await res.json()
      if (res.ok) setSavedFilters((data.filters || []).slice(0, 4))
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedProducts(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedProducts.size === products.length && products.length > 0) {
      setSelectedProducts(new Set())
      setSelectedProduct(null)
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)))
    }
  }

  const handleQuickSave = async () => {
    if (!selectedProduct) return
    
    setSaving(true)
    try {
      const res = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editedName,
          price: parseFloat(editedPrice),
          tags: editedTags.split(',').map(t => t.trim()).filter(Boolean)
        })
      })

      if (res.ok) {
        toast({ title: 'Saved', description: 'Product updated successfully' })
        fetchProducts()
      } else {
        toast({ title: 'Error', description: 'Failed to save changes', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save changes', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleSyncClick = () => {
    if (stores.length === 0) {
      toast({
        title: 'No Stores Connected',
        description: 'Please connect a store first to sync products',
        variant: 'destructive'
      })
      setTimeout(() => router.push('/stores'), 1000)
      return
    }
    
    if (stores.length === 1) {
      // Preview sync for the only store
      handlePreviewSync(stores[0].id)
    } else {
      // Show store selection dialog
      setShowSyncDialog(true)
    }
  }

  const handlePreviewSync = async (storeId: string) => {
    const store = stores.find(s => s.id === storeId)
    if (!store) return
    
    console.log('🔄 Starting background sync for:', store.storeName)
    setShowSyncDialog(false)
    setSyncing(true)
    setSyncingStoreId(storeId)
    setSyncingStoreName(store.storeName)
    
    try {
      // Start background sync
      const res = await fetch(`/api/stores/${storeId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ background: true })
      })

      const data = await res.json()
      
      if (res.ok) {
        console.log('✅ Background sync started:', data.jobId)
        // Show progress dialog
        setShowProgressDialog(true)
      } else {
        console.log('❌ Sync failed to start:', data.error)
        toast({
          title: 'Sync Failed',
          description: data.error || 'Failed to start sync. Please try again.',
          variant: 'destructive',
          duration: 7000
        })
      }
    } catch (error) {
      console.error('❌ Sync error:', error)
      toast({
        title: 'Error',
        description: 'Network error while starting sync. Please check your connection.',
        variant: 'destructive'
      })
    } finally {
      setSyncing(false)
    }
  }
  
  const handleProgressDialogClose = (open: boolean) => {
    setShowProgressDialog(open)
    if (!open) {
      // Refresh data when dialog closes
      fetchStores()
      fetchProducts()
    }
  }

  const applyFilter = (filter: SavedFilter) => {
    const config = filter.filters as any
    setSearchQuery(config.search || '')
    setSelectedStoreIds(config.storeIds || [])
    setQuickFilter('all')
    toast({ title: 'Filter Applied', description: `Applied "${filter.name}"` })
  }

  const handleBulkPrice = async (action: string, value: number, unit: string) => {
    console.log('💰 Updating prices:', Array.from(selectedProducts), { action, value, unit })
    setBulkOperating(true)
    try {
      const res = await fetch('/api/products/unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'update_price',
          productIds: Array.from(selectedProducts),
          changes: { action, value, unit }
        })
      })

      const data = await res.json()
      console.log('Price update response:', data)

      if (res.ok) {
        toast({ title: 'Success', description: `Updated ${data.successItems} products` })
        fetchProducts()
        setSelectedProducts(new Set())
      } else {
        toast({ title: 'Failed', description: data.error || 'Check console', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Price update error:', error)
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    } finally {
      setBulkOperating(false)
    }
  }

  const handleBulkTags = async (action: string, tags: string[]) => {
    console.log('🏷️ Updating tags:', Array.from(selectedProducts), { action, tags })
    setBulkOperating(true)
    try {
      const res = await fetch('/api/products/unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'update_tags',
          productIds: Array.from(selectedProducts),
          changes: { action, tags }
        })
      })

      const data = await res.json()
      console.log('Tag update response:', data)

      if (res.ok) {
        toast({ title: 'Success', description: `Updated ${data.successItems} products` })
        fetchProducts()
        setSelectedProducts(new Set())
      } else {
        toast({ title: 'Failed', description: data.error || 'Check console', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Tag update error:', error)
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    } finally {
      setBulkOperating(false)
    }
  }

  const handleBulkDelete = async () => {
    console.log('🗑️ Deleting products:', Array.from(selectedProducts))
    setBulkOperating(true)
    try {
      const res = await fetch('/api/products/unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'delete',
          productIds: Array.from(selectedProducts)
        })
      })

      const data = await res.json()
      console.log('Delete response:', data)

      if (res.ok) {
        toast({ title: 'Success', description: `Deleted ${data.successItems} products` })
        fetchProducts()
        setSelectedProducts(new Set())
        setSelectedProduct(null)
      } else {
        console.error('Delete failed:', data)
        toast({
          title: 'Delete Failed',
          description: data.error || 'Failed to delete products. Check console for details.',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: 'Error',
        description: 'Network error while deleting products',
        variant: 'destructive'
      })
    } finally {
      setBulkOperating(false)
      setShowDeleteDialog(false)
    }
  }

  const handleExportCSV = () => {
    const headers = ['Name', 'SKU', 'Price', 'Platform', 'Store', 'Tags', 'Status']
    const rows = products
      .filter(p => selectedProducts.has(p.id))
      .map(p => [
        p.name, p.sku || '', p.price.toString(), p.platform,
        p.storeConnection?.storeName || 'Legacy', p.tags.join(';'), p.syncStatus || ''
      ])

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `products-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Exported', description: `${selectedProducts.size} products exported` })
  }

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      BIGCOMMERCE: 'bg-blue-500',
      SHOPIFY: 'bg-green-500',
      ETSY: 'bg-orange-500',
      TIKTOK: 'bg-pink-500'
    }
    return colors[platform] || 'bg-gray-500'
  }

  const getProductImage = (product: Product) => {
    try {
      if (product.images?.images && Array.isArray(product.images.images) && product.images.images.length > 0) {
        const img = product.images.images[0]
        return img.url_thumbnail || img.url_standard || img.url || "/placeholder.jpg"
      }
      if (Array.isArray(product.images) && product.images.length > 0) {
        const img = product.images[0]
        return img.url_thumbnail || img.url_standard || img.url || "/placeholder.jpg"
      }
      if (product.platformData?.images && Array.isArray(product.platformData.images)) {
        const img = product.platformData.images[0]
        return img.url_thumbnail || img.url_standard || img.url || "/placeholder.jpg"
      }
    } catch (e) {
      console.error("Image error for", product.id, e)
    }
    return "/placeholder.jpg"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const syncedCount = products.filter(p => p.syncStatus === 'synced').length
  const errorCount = products.filter(p => p.syncStatus === 'error').length

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navigation Bar */}
      <nav className="h-14 bg-white border-b flex items-center px-4 gap-4 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
          <Home className="h-4 w-4 mr-2" />
          Dashboard
        </Button>
        <span className="text-muted-foreground">/</span>
        <Button variant="ghost" size="sm" onClick={() => router.push('/stores')}>
          Stores
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">Products</span>
        
        <div className="flex-1" />
        
        <Button variant="outline" size="sm" onClick={() => router.push('/settings')}>
          Settings
        </Button>
      </nav>

      {/* Top Bar */}
      <header className="h-16 border-b bg-white/80 backdrop-blur-sm flex items-center px-4 gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-lg font-bold">Product Manager</h1>
            <p className="text-xs text-muted-foreground">{total.toLocaleString()} products</p>
          </div>
        </div>
        
        <div className="flex-1 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search title, SKU, tag, platform..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-16"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-muted rounded border">/</kbd>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Synced {syncedCount}</Badge>
          <Badge variant="destructive">Errors {errorCount}</Badge>
          <Button variant="outline" size="sm" onClick={fetchProducts} disabled={searching}>
            <RefreshCw className={`h-4 w-4 ${searching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      {/* Main 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-72 border-r bg-white p-3 overflow-y-auto shrink-0">
          {/* Connections */}
          <div className="mb-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
              Connections
            </div>
            <div className="space-y-2">
              {stores.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">
                  No stores connected
                  <Button variant="link" size="sm" onClick={() => router.push('/stores')} className="block mx-auto mt-2">
                    Connect Store
                  </Button>
                </div>
              ) : (
                stores.map(store => (
                  <div
                    key={store.id}
                    className={`group flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-accent/50 ${
                      selectedStoreIds.includes(store.id) ? 'bg-accent border-primary' : 'bg-card'
                    }`}
                  >
                    <div 
                      className="flex-1 flex items-center gap-2"
                      onClick={() => {
                        setSelectedStoreIds(prev =>
                          prev.includes(store.id) ? prev.filter(id => id !== store.id) : [...prev, store.id]
                        )
                      }}
                    >
                      <div className={`w-2 h-2 rounded-full ${getPlatformColor(store.platform)}`} />
                      <span className="text-sm flex-1 truncate">{store.storeName}</span>
                      <span className="text-xs text-muted-foreground">{store.productCount}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePreviewSync(store.id)
                      }}
                      disabled={syncing}
                    >
                      <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Saved Filters */}
          <div className="mb-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
              Saved Filters
            </div>
            <div className="space-y-2">
              {savedFilters.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-2">No saved filters</div>
              ) : (
                savedFilters.map(filter => (
                  <div
                    key={filter.id}
                    className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer"
                    onClick={() => applyFilter(filter)}
                  >
                    <span className="text-sm flex-1 truncate">{filter.name}</span>
                    <span className="text-xs text-muted-foreground">({filter.useCount})</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Store Stats */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
              Quick Stats
            </div>
            <div className="space-y-2">
              <div className="p-2 rounded-lg border bg-card">
                <div className="text-xs text-muted-foreground">Total Stores</div>
                <div className="text-lg font-semibold">{stores.length}</div>
              </div>
              <div className="p-2 rounded-lg border bg-card">
                <div className="text-xs text-muted-foreground">Sync Health</div>
                <div className="text-lg font-semibold">{total > 0 ? Math.round((syncedCount/total)*100) : 0}%</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Center Table */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-white/50">
            <Button size="sm" variant="outline" onClick={toggleSelectAll}>Select All</Button>
            <Button size="sm" variant="outline" disabled={selectedProducts.size === 0} onClick={() => setShowPriceDialog(true)}>
              Bulk Edit
            </Button>
            <Button size="sm" variant="outline" onClick={handleSyncClick} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
              Sync {stores.length > 1 ? '▾' : ''}
            </Button>
            <Button size="sm" variant="outline" disabled={selectedProducts.size === 0} onClick={() => setShowTagDialog(true)}>
              Tags
            </Button>
            <Button size="sm" variant="outline" disabled={selectedProducts.size === 0} onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-1" />Export
            </Button>
            <Button size="sm" variant="outline" disabled={selectedProducts.size === 0} onClick={() => setShowDeleteDialog(true)}>
              Delete
            </Button>
            <div className="flex-1" />
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-cyan-600" onClick={() => router.push('/stores')}>
              + Connect Store
            </Button>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
            {(['all', 'synced', 'drafts', 'errors', 'pending'] as const).map(f => (
              <button
                key={f}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  quickFilter === f 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-background hover:bg-accent'
                }`}
                onClick={() => setQuickFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-muted/50 z-10">
                <tr className="border-b">
                  <th className="p-3 text-left w-10">
                    <input type="checkbox" checked={selectedProducts.size === products.length && products.length > 0} onChange={toggleSelectAll} />
                  </th>
                  <th className="p-3 text-left w-16 text-xs font-semibold">Image</th>
                  <th className="p-3 text-left text-xs font-semibold">Title</th>
                  <th className="p-3 text-left text-xs font-semibold">SKU</th>
                  <th className="p-3 text-left text-xs font-semibold">Price</th>
                  <th className="p-3 text-left text-xs font-semibold">Status</th>
                  <th className="p-3 text-left text-xs font-semibold">Platform</th>
                  <th className="p-3 text-left text-xs font-semibold">Updated</th>
                  <th className="p-3 text-left text-xs font-semibold w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className={`border-b hover:bg-accent/30 cursor-pointer ${
                      selectedProducts.has(product.id) ? 'bg-accent/20' : ''
                    } ${selectedProduct?.id === product.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedProduct(product)}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="p-3">
                      <img 
                        src={getProductImage(product)} 
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded border bg-gray-100" 
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget
                          if (target.src !== window.location.origin + "/placeholder.jpg") {
                            target.src = "/placeholder.jpg"
                          }
                        }}
                      />
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-sm max-w-md truncate">{product.name}</div>
                      {product.tags.length > 0 && (
                        <div className="text-xs text-muted-foreground truncate">{product.tags[0]}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-xs text-muted-foreground">{product.sku || '-'}</span>
                    </td>
                    <td className="p-3 font-medium text-sm">${product.price.toFixed(2)}</td>
                    <td className="p-3">
                      {product.syncStatus === 'synced' && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />Synced
                        </Badge>
                      )}
                      {product.syncStatus === 'error' && (
                        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                          <AlertCircle className="h-3 w-3 mr-1" />Error
                        </Badge>
                      )}
                      {!product.syncStatus && (
                        <Badge variant="outline" className="text-xs bg-yellow-50">Pending</Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <div className={`w-6 h-6 rounded ${getPlatformColor(product.platform)}`} title={product.platform} />
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {new Date(product.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (product.storeConnection) {
                            router.push(`/stores/${product.storeConnection.id}/products/${product.id}/edit`)
                          }
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1" />Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t bg-white/50">
              <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages} ({total.toLocaleString()} products)
              </span>
              <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </main>

        {/* Right Drawer */}
        <aside className="w-96 border-l bg-white p-4 overflow-y-auto shrink-0">
          {selectedProduct ? (
            <div className="space-y-4">
              {/* Quick Edit */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
                    <Edit className="h-4 w-4" />Quick Edit
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Title</label>
                      <Input value={editedName} onChange={(e) => setEditedName(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Price</label>
                      <Input value={editedPrice} onChange={(e) => setEditedPrice(e.target.value)} className="mt-1" type="number" step="0.01" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Tags (comma-separated)</label>
                      <Input value={editedTags} onChange={(e) => setEditedTags(e.target.value)} className="mt-1" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="flex-1" onClick={handleQuickSave} disabled={saving}>
                      <Save className="h-3 w-3 mr-1" />{saving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="flex-1"
                      onClick={() => {
                        setEditedName(selectedProduct.name)
                        setEditedPrice(selectedProduct.price.toString())
                        setEditedTags(selectedProduct.tags.join(', '))
                      }}
                    >
                      Discard
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Product Info */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-3 text-sm">Product Info</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SKU</span>
                      <span className="font-mono">{selectedProduct.sku || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platform</span>
                      <Badge className={getPlatformColor(selectedProduct.platform) + ' text-white'}>
                        {selectedProduct.platform}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Store</span>
                      <span className="truncate">{selectedProduct.storeConnection?.storeName || 'Legacy'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Synced</span>
                      <span className="text-xs">
                        {selectedProduct.lastSyncedAt 
                          ? new Date(selectedProduct.lastSyncedAt).toLocaleString()
                          : 'Never'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Product Actions */}
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    if (selectedProduct.storeConnection) {
                      router.push(`/stores/${selectedProduct.storeConnection.id}/products/${selectedProduct.id}/edit`)
                    }
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Full Edit
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    toast({
                      title: "Coming Soon! 📊",
                      description: "Product analytics feature is under development. Track views, clicks, and conversions per product.",
                      duration: 5000
                    })
                  }}
                >
                  📊 View Analytics (Coming Soon)
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a product to view details</p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Floating Bulk Bar */}
      {selectedProducts.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm border rounded-full shadow-2xl px-4 py-2 flex items-center gap-3 z-50">
          <Badge variant="secondary">{selectedProducts.size} selected</Badge>
          <Button size="sm" variant="outline" onClick={() => setShowPriceDialog(true)}>Bulk Edit</Button>
          <Button size="sm" variant="outline" onClick={() => setShowTagDialog(true)}>Tags</Button>
          <Button size="sm" variant="outline" onClick={handleExportCSV}>Export</Button>
          <Button size="sm" variant="destructive" onClick={() => setShowDeleteDialog(true)}>Delete</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedProducts(new Set())}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <BulkPriceDialog open={showPriceDialog} onOpenChange={setShowPriceDialog} selectedCount={selectedProducts.size} onConfirm={handleBulkPrice} />
      <BulkTagDialog open={showTagDialog} onOpenChange={setShowTagDialog} selectedCount={selectedProducts.size} onConfirm={handleBulkTags} />
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedProducts.size} Products?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sync Store Selection Dialog */}
      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Store to Sync</DialogTitle>
            <DialogDescription>
              Choose which store you want to sync products from
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 py-4">
            {stores.map(store => (
              <Button
                key={store.id}
                variant="outline"
                className="w-full justify-between h-auto py-4"
                onClick={() => handlePreviewSync(store.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getPlatformColor(store.platform)}`} />
                  <div className="text-left">
                    <div className="font-medium">{store.storeName}</div>
                    <div className="text-xs text-muted-foreground">
                      {store.platform} • {store.productCount} products
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {store.lastSyncedAt
                    ? `Synced ${new Date(store.lastSyncedAt).toLocaleDateString()}`
                    : 'Never synced'}
                </div>
              </Button>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSyncDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Sync Progress Dialog */}
      <SyncProgressDialog
        open={showProgressDialog}
        onOpenChange={handleProgressDialogClose}
        storeId={syncingStoreId}
        storeName={syncingStoreName}
      />

    </div>
  )
}