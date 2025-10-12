"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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
import { 
  ArrowLeft, 
  Search, 
  Trash2, 
  Edit, 
  DollarSign, 
  Image as ImageIcon,
  Package,
  RefreshCw,
  X,
  Plus
} from "lucide-react"

interface Product {
  id: string
  externalId: string
  name: string
  sku: string | null
  price: number
  compareAtPrice: number | null
  images: any
  variants: any
  platformData: any
  syncStatus: string | null
}

interface StoreInfo {
  id: string
  storeName: string
  platform: string
  externalStoreId: string
}

export default function StoreProductsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const storeId = params.id as string

  const [store, setStore] = useState<StoreInfo | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [priceFilter, setPriceFilter] = useState("all")
  
  // Dialogs
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [showBulkPriceEdit, setShowBulkPriceEdit] = useState(false)
  const [showImageEdit, setShowImageEdit] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  
  // Bulk edit states
  const [bulkPriceAction, setBulkPriceAction] = useState<"increase" | "decrease" | "set">("increase")
  const [bulkPriceValue, setBulkPriceValue] = useState("")
  const [bulkPriceUnit, setBulkPriceUnit] = useState<"percent" | "fixed">("percent")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    } else if (status === "authenticated") {
      fetchStore()
      fetchProducts()
    }
  }, [status, storeId])

  useEffect(() => {
    filterProducts()
  }, [products, searchQuery, priceFilter])

  const fetchStore = async () => {
    try {
      const res = await fetch(`/api/stores/${storeId}`)
      const data = await res.json()
      if (res.ok) {
        setStore(data.store)
      }
    } catch (error) {
      console.error("Error fetching store:", error)
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/products?storeId=${storeId}`)
      const data = await res.json()
      if (res.ok) {
        setProducts(data.products || [])
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch products",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filterProducts = () => {
    let filtered = products

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Price filter
    if (priceFilter !== "all") {
      filtered = filtered.filter((p) => {
        if (priceFilter === "under25") return p.price < 25
        if (priceFilter === "25to50") return p.price >= 25 && p.price <= 50
        if (priceFilter === "50to100") return p.price > 50 && p.price <= 100
        if (priceFilter === "over100") return p.price > 100
        return true
      })
    }

    setFilteredProducts(filtered)
  }

  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(filteredProducts.map((p) => p.id)))
    }
  }

  const toggleSelect = (productId: string) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.add(productId)
    }
    setSelectedProducts(newSelected)
  }

  const handleBulkDelete = async () => {
    toast({
      title: "Bulk Delete",
      description: `Deleting ${selectedProducts.size} products... (This would call the API)`,
    })
    setShowBulkDelete(false)
    setSelectedProducts(new Set())
    // TODO: Implement actual bulk delete API call
  }

  const handleBulkPriceEdit = async () => {
    const value = parseFloat(bulkPriceValue)
    if (isNaN(value) || value <= 0) {
      toast({
        title: "Invalid Value",
        description: "Please enter a valid positive number",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Bulk Price Update",
      description: `Updating prices for ${selectedProducts.size} products... (This would call the API)`,
    })
    setShowBulkPriceEdit(false)
    setSelectedProducts(new Set())
    // TODO: Implement actual bulk price update API call
  }

  const getProductImage = (product: Product) => {
    if (product.images?.images && product.images.images.length > 0) {
      return product.images.images[0].url_thumbnail || product.images.images[0].url_standard
    }
    return "/placeholder.jpg"
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/stores/${storeId}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Product Management</h1>
              <p className="text-sm text-muted-foreground">
                {store?.storeName} - {filteredProducts.length} products
              </p>
            </div>
            <Button onClick={fetchProducts}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters & Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Search Products</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Price Range</Label>
                <Select value={priceFilter} onValueChange={setPriceFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prices</SelectItem>
                    <SelectItem value="under25">Under $25</SelectItem>
                    <SelectItem value="25to50">$25 - $50</SelectItem>
                    <SelectItem value="50to100">$50 - $100</SelectItem>
                    <SelectItem value="over100">Over $100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quick Actions</Label>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSearchQuery("")
                    setPriceFilter("all")
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedProducts.size > 0 && (
          <Card className="mb-6 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Package className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">
                      {selectedProducts.size} product{selectedProducts.size !== 1 ? "s" : ""} selected
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Choose a bulk action below
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkPriceEdit(true)}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Edit Prices
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkDelete(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedProducts(new Set())}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Products Grid */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Products</CardTitle>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">Select All</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || priceFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Sync your store to import products"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors ${
                      selectedProducts.has(product.id) ? "bg-accent/30 border-primary" : ""
                    }`}
                  >
                    <Checkbox
                      checked={selectedProducts.has(product.id)}
                      onCheckedChange={() => toggleSelect(product.id)}
                    />
                    
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.jpg"
                      }}
                    />
                    
                    <div className="flex-1">
                      <h3 className="font-semibold">{product.name}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        {product.sku && <span>SKU: {product.sku}</span>}
                        <span>ID: {product.externalId}</span>
                        {product.syncStatus && (
                          <Badge variant="outline" className="text-xs">
                            {product.syncStatus}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-bold text-lg">${product.price.toFixed(2)}</div>
                      {product.compareAtPrice && (
                        <div className="text-sm text-muted-foreground line-through">
                          ${product.compareAtPrice.toFixed(2)}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingProduct(product)
                          setShowImageEdit(true)
                        }}
                      >
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          toast({
                            title: "Edit Product",
                            description: "Product editor would open here",
                          })
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedProducts.size} Products?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected products from your database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Products
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Price Edit Dialog */}
      <Dialog open={showBulkPriceEdit} onOpenChange={setShowBulkPriceEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Price Update</DialogTitle>
            <DialogDescription>
              Update prices for {selectedProducts.size} selected products
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={bulkPriceAction} onValueChange={(v: any) => setBulkPriceAction(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">Increase Price</SelectItem>
                  <SelectItem value="decrease">Decrease Price</SelectItem>
                  <SelectItem value="set">Set Fixed Price</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bulkPriceAction !== "set" && (
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={bulkPriceUnit} onValueChange={(v: any) => setBulkPriceUnit(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                type="number"
                placeholder={bulkPriceAction === "set" ? "Enter price" : "Enter value"}
                value={bulkPriceValue}
                onChange={(e) => setBulkPriceValue(e.target.value)}
                step="0.01"
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                {bulkPriceAction === "increase" && bulkPriceUnit === "percent" && "Increase all prices by this percentage"}
                {bulkPriceAction === "decrease" && bulkPriceUnit === "percent" && "Decrease all prices by this percentage"}
                {bulkPriceAction === "increase" && bulkPriceUnit === "fixed" && "Add this amount to all prices"}
                {bulkPriceAction === "decrease" && bulkPriceUnit === "fixed" && "Subtract this amount from all prices"}
                {bulkPriceAction === "set" && "Set all products to this exact price"}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkPriceEdit(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkPriceEdit}>
              Update Prices
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Edit Dialog */}
      <Dialog open={showImageEdit} onOpenChange={setShowImageEdit}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Images - {editingProduct?.name}</DialogTitle>
            <DialogDescription>
              Add, remove, or reorder product images
            </DialogDescription>
          </DialogHeader>
          
          {editingProduct && (
            <div className="space-y-4 py-4">
              {editingProduct.images?.images && editingProduct.images.images.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {editingProduct.images.images.map((img: any, index: number) => (
                    <div key={index} className="relative group">
                      <img
                        src={img.url_standard || img.url_thumbnail}
                        alt={`Product image ${index + 1}`}
                        className="w-full h-48 object-cover rounded border"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          toast({
                            title: "Delete Image",
                            description: `Would delete image ${index + 1}`,
                          })
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                        Image {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed rounded">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No images available</p>
                </div>
              )}
              
              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add New Image
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImageEdit(false)}>
              Close
            </Button>
            <Button onClick={() => {
              toast({
                title: "Success",
                description: "Image changes would be saved",
              })
              setShowImageEdit(false)
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}