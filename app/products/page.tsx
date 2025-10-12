'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { 
  Package, 
  Search, 
  Filter,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Download,
  RefreshCw,
  ArrowUpDown,
  X,
  Store as StoreIcon,
  DollarSign
} from 'lucide-react'

interface Product {
  id: string
  name: string
  description: string | null
  sku: string | null
  price: string
  compareAtPrice: string | null
  platform: string
  externalId: string
  importMethod: string
  categories: string[]
  tags: string[]
  images: any
  createdAt: string
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
}

export default function ProductsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [products, setProducts] = useState<Product[]>([])
  const [stores, setStores] = useState<StoreConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState('all')
  const [selectedStore, setSelectedStore] = useState('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [showFilters, setShowFilters] = useState(false)
  
  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const limit = 50

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    } else if (status === 'authenticated') {
      fetchStores()
      fetchProducts()
    }
  }, [status, page])

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      if (status === 'authenticated') {
        setPage(1) // Reset to page 1 on filter change
        fetchProducts()
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery, selectedPlatform, selectedStore, minPrice, maxPrice, sortBy, sortOrder])

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/stores')
      const data = await res.json()
      if (res.ok) {
        setStores(data.stores || [])
      }
    } catch (error) {
      console.error('Error fetching stores:', error)
    }
  }

  const fetchProducts = async () => {
    setSearching(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: searchQuery,
        platform: selectedPlatform,
        storeId: selectedStore,
        minPrice,
        maxPrice,
        sortBy,
        sortOrder
      })

      const res = await fetch(`/api/products?${params}`)
      const data = await res.json()
      
      if (res.ok) {
        setProducts(data.products || [])
        setTotalPages(data.pagination?.pages || 1)
        setTotalProducts(data.pagination?.total || 0)
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch products',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch products',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }

  const toggleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.add(productId)
    }
    setSelectedProducts(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) return
    
    if (!confirm(`Delete ${selectedProducts.size} product(s)? This cannot be undone.`)) return

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          productIds: Array.from(selectedProducts)
        })
      })

      if (res.ok) {
        toast({
          title: 'Success',
          description: `Deleted ${selectedProducts.size} product(s)`
        })
        setSelectedProducts(new Set())
        fetchProducts()
      } else {
        const data = await res.json()
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete products',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete products',
        variant: 'destructive'
      })
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedPlatform('all')
    setSelectedStore('all')
    setMinPrice('')
    setMaxPrice('')
    setSortBy('createdAt')
    setSortOrder('desc')
  }

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      BIGCOMMERCE: 'bg-blue-100 text-blue-800',
      SHOPIFY: 'bg-green-100 text-green-800',
      ETSY: 'bg-orange-100 text-orange-800',
      TIKTOK: 'bg-pink-100 text-pink-800'
    }
    return colors[platform] || 'bg-gray-100 text-gray-800'
  }

  if (loading || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold">Products</h1>
                <p className="text-sm text-muted-foreground">
                  {totalProducts} total products across {stores.length} store{stores.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedProducts.size > 0 && (
                <>
                  <Badge variant="secondary">
                    {selectedProducts.size} selected
                  </Badge>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchProducts}
                disabled={searching}
              >
                <RefreshCw className={`h-4 w-4 ${searching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Search Bar */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, SKU, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Advanced Filters */}
        {showFilters && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Advanced Filters
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Platforms</SelectItem>
                      <SelectItem value="BIGCOMMERCE">BigCommerce</SelectItem>
                      <SelectItem value="SHOPIFY">Shopify</SelectItem>
                      <SelectItem value="ETSY">Etsy</SelectItem>
                      <SelectItem value="TIKTOK">TikTok</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Store</Label>
                  <Select value={selectedStore} onValueChange={setSelectedStore}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stores</SelectItem>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.storeName} ({store.productCount})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sort By</Label>
                  <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="createdAt">Date Added</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="price">Price</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Min Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="999.99"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Products Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="p-4 text-left">
                      <Checkbox
                        checked={selectedProducts.size === products.length && products.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="p-4 text-left font-medium">Product</th>
                    <th className="p-4 text-left font-medium">SKU</th>
                    <th className="p-4 text-left font-medium">Price</th>
                    <th className="p-4 text-left font-medium">Platform</th>
                    <th className="p-4 text-left font-medium">Store</th>
                    <th className="p-4 text-left font-medium">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <Checkbox
                          checked={selectedProducts.has(product.id)}
                          onCheckedChange={() => toggleSelectProduct(product.id)}
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-start gap-3">
                          {product.images && (
                            <div className="w-12 h-12 bg-muted rounded flex-shrink-0 overflow-hidden">
                              {/* Placeholder for product image */}
                              <div className="w-full h-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
                                <Package className="h-6 w-6 text-blue-600" />
                              </div>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium truncate">{product.name}</p>
                            {product.description && (
                              <p className="text-sm text-muted-foreground truncate max-w-md">
                                {product.description}
                              </p>
                            )}
                            {product.tags.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {product.tags.slice(0, 3).map((tag, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-sm">{product.sku || '-'}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{parseFloat(product.price).toFixed(2)}</span>
                        </div>
                        {product.compareAtPrice && (
                          <span className="text-xs text-muted-foreground line-through">
                            ${parseFloat(product.compareAtPrice).toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge className={getPlatformColor(product.platform)}>
                          {product.platform}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <StoreIcon className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {product.storeConnection?.storeName || 'Legacy Import'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(product.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {products.length === 0 && (
              <div className="p-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || selectedPlatform !== 'all' || selectedStore !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Connect a store to start importing products'}
                </p>
                {!searchQuery && selectedPlatform === 'all' && selectedStore === 'all' && (
                  <Button onClick={() => router.push('/stores')}>
                    <StoreIcon className="h-4 w-4 mr-2" />
                    Connect Store
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalProducts)} of {totalProducts} products
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}