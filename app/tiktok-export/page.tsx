"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { 
  Download, 
  FileSpreadsheet, 
  RefreshCw, 
  Search,
  Info,
  CheckCircle2,
  AlertCircle,
  Package
} from "lucide-react"

interface TikTokProduct {
  'Product Title': string
  'Description': string
  'Price': number
  'SKU': string
  'Category': string
  'Brand': string
  'Image 1'?: string
  [key: string]: any
}

interface ProductGroup {
  baseProductId: string
  baseProductName: string
  baseSKU: string
  brand: string
  category: string
  variants: TikTokProduct[]
  hasImage: boolean
  productIds: number[] // Track actual BigCommerce product IDs
}

interface Template {
  headers: string[]
  columns: Array<{
    name: string
    required: boolean
    type: string
  }>
  requiredColumns: string[]
}

export default function TikTokExportPage() {
  const [products, setProducts] = useState<TikTokProduct[]>([])
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [template, setTemplate] = useState<Template | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadTemplate()
  }, [])

  useEffect(() => {
    loadProducts()
  }, [currentPage, searchTerm])

  // Group products by base SKU whenever products change
  useEffect(() => {
    const groups = groupProductsByBase(products)
    setProductGroups(groups)
  }, [products])

  const groupProductsByBase = (products: TikTokProduct[]): ProductGroup[] => {
    const groupMap = new Map<string, ProductGroup>()
    
    products.forEach(product => {
      // Get the base product title (without variant suffix)
      const baseTitle = product['Product Title'].split(' - ')[0]
      // Use the full product title as the key to keep products separate
      const productKey = baseTitle
      
      if (!groupMap.has(productKey)) {
        groupMap.set(productKey, {
          baseProductId: productKey,
          baseProductName: baseTitle,
          baseSKU: product.SKU.split('-')[0],
          brand: product.Brand,
          category: product.Category,
          variants: [],
          hasImage: !!product['Image 1'],
          productIds: []
        })
      }
      
      const group = groupMap.get(productKey)!
      group.variants.push(product)
      
      // Track product ID if available
      if (product.productId) {
        if (!group.productIds.includes(product.productId)) {
          group.productIds.push(product.productId)
        }
      }
      
      // Update hasImage if any variant has an image
      if (product['Image 1']) {
        group.hasImage = true
      }
    })
    
    return Array.from(groupMap.values())
  }

  const loadTemplate = async () => {
    try {
      const response = await fetch("/api/tiktok/template")
      const data = await response.json()
      
      if (data.success) {
        setTemplate(data.template)
        toast({
          title: "Template Loaded",
          description: `Found ${data.template.totalColumns} columns in TikTok template`,
        })
      }
    } catch (error) {
      console.error("Error loading template:", error)
      toast({
        title: "Error",
        description: "Failed to load TikTok template",
        variant: "destructive",
      })
    }
  }

  const loadProducts = async () => {
    setLoading(true)
    try {
      // Build API URL with optional search parameter
      let apiUrl = `/api/tiktok/export?limit=50&page=${currentPage}`
      if (searchTerm) {
        apiUrl += `&search=${encodeURIComponent(searchTerm)}`
      }
      
      const response = await fetch(apiUrl)
      const data = await response.json()
      
      if (data.success) {
        setProducts(data.data)
        setTotalPages(data.pagination.total_pages || 1)
        
        const groups = groupProductsByBase(data.data)
        
        if (!searchTerm) {
          toast({
            title: "Products Loaded",
            description: `Loaded ${groups.length} products with ${data.data.length} total variants`,
          })
        } else {
          toast({
            title: "Search Results",
            description: `Found ${groups.length} products matching "${searchTerm}"`,
          })
        }
      }
    } catch (error) {
      console.error("Error loading products:", error)
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedGroups(productGroups.map(g => g.baseProductId))
    } else {
      setSelectedGroups([])
    }
  }

  const handleGroupSelection = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedGroups([...selectedGroups, productId])
    } else {
      setSelectedGroups(selectedGroups.filter(s => s !== productId))
    }
  }

  const exportToExcel = async (exportAll: boolean = false) => {
    setExporting(true)
    try {
      const body: any = {}
      
      if (!exportAll && selectedGroups.length > 0) {
        // Get all product IDs from selected groups
        const productIds = selectedGroups.flatMap(groupId => {
          const group = productGroups.find(g => g.baseProductId === groupId)
          return group?.productIds || []
        })
        
        body.productIds = productIds
        toast({
          title: "Info",
          description: `Exporting ${selectedGroups.length} selected products (${productIds.length} total items) with all their variants...`,
        })
      } else if (exportAll) {
        toast({
          title: "Info",
          description: "Exporting all products...",
        })
      }
      
      const response = await fetch("/api/tiktok/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })
      
      if (!response.ok) {
        throw new Error("Export failed")
      }
      
      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `tiktok-products-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: "Export Successful",
        description: "TikTok product file has been downloaded",
      })
    } catch (error) {
      console.error("Error exporting:", error)
      toast({
        title: "Export Failed",
        description: "Failed to export products to Excel",
        variant: "destructive",
      })
    } finally {
      setExporting(false)
    }
  }

  // Handle search with debounce
  const handleSearchChange = (value: string) => {
    // Clear existing timeout
    if (searchDebounce) {
      clearTimeout(searchDebounce)
    }
    
    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      setSearchTerm(value)
      setCurrentPage(1) // Reset to first page on search
    }, 500)
    
    setSearchDebounce(timeout)
  }

  // Server-side filtering - just return all product groups
  const filteredGroups = productGroups

  // Calculate total variants for selected groups
  const selectedVariantCount = useMemo(() => {
    return selectedGroups.reduce((total, productId) => {
      const group = productGroups.find(g => g.baseProductId === productId)
      return total + (group?.variants.length || 0)
    }, 0)
  }, [selectedGroups, productGroups])

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">TikTok Product Export</h1>
        <p className="text-muted-foreground mb-8">
          Export your BigCommerce products using your pre-configured TikTok template. Select specific products or export all. Each product selection includes all its variants (sizes, colors, etc.).
        </p>

        {/* Template Info */}
        {template && (
          <Alert className="mb-8">
            <FileSpreadsheet className="h-4 w-4" />
            <AlertTitle>TikTok Template Loaded</AlertTitle>
            <AlertDescription>
              <div className="mt-2">
                <p>Total columns: {template.headers.length}</p>
                <p>Required fields: {template.requiredColumns.join(", ")}</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Export Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Export Options</CardTitle>
            <CardDescription>
              Export all products or select specific ones. Each product includes all its variants.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Button
                onClick={() => exportToExcel(true)}
                disabled={exporting || loading}
              >
                {exporting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export All Products
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => exportToExcel(false)}
                disabled={exporting || loading || selectedGroups.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Selected ({selectedGroups.length} products, {selectedVariantCount} variants)
              </Button>
              
              <Button
                variant="outline"
                onClick={loadProducts}
                disabled={loading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Product Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Product Groups</CardTitle>
            <CardDescription>
              Each checkbox selects a product with all its variants. Products are grouped by base SKU.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search entire catalog by name..."
                  defaultValue={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8"
                />
              </div>
              {searchTerm && (
                <p className="text-sm text-muted-foreground mt-2">
                  Searching entire catalog for "{searchTerm}"
                </p>
              )}
            </div>

            {/* Select All */}
            <div className="mb-4 pb-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedGroups.length === filteredGroups.length && filteredGroups.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <label
                    htmlFor="select-all"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Select All Products
                  </label>
                </div>
                <div className="text-sm text-muted-foreground">
                  {productGroups.length} products, {products.length} total variants
                </div>
              </div>
            </div>

            {/* Product List */}
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading products...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredGroups.map((group) => (
                  <Card key={group.baseProductId} className="p-4">
                    <div className="flex items-start space-x-4">
                      <Checkbox
                        checked={selectedGroups.includes(group.baseProductId)}
                        onCheckedChange={(checked) =>
                          handleGroupSelection(group.baseProductId, checked as boolean)
                        }
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{group.baseProductName}</h4>
                            <p className="text-sm text-muted-foreground">Base SKU: {group.baseSKU}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline">{group.category}</Badge>
                              <Badge variant="secondary">{group.brand}</Badge>
                              <Badge variant="default">
                                <Package className="h-3 w-3 mr-1" />
                                {group.variants.length} variant{group.variants.length > 1 ? 's' : ''}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            {group.hasImage ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-sm">Has images</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-orange-500">
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-sm">No images</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {filteredGroups.length === 0 && !loading && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchTerm ? `No products found matching "${searchTerm}"` : 'No products found'}
                </p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || loading}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || loading}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Toaster />
    </div>
  )
}