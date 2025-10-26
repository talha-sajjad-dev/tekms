"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save, Loader2, Package, Settings, Image, Tag, FileText, TruckIcon, BarChart3, Share2 } from "lucide-react"

interface FullProduct {
  id: string
  name: string
  description: string | null
  sku: string | null
  price: number
  compareAtPrice: number | null
  platform: string
  externalId: string
  categories: string[]
  tags: string[]
  images: any
  platformData: any
  
  storeConnection: {
    id: string
    platform: string
    storeName: string
    storeUrl: string | null
  } | null
  
  productVariants: Array<{
    id: string
    sku: string | null
    price: number
    inventoryLevel: number
    optionValues: any
    weight: number | null
    images: any
  }>
  
  productModifiers: Array<{
    id: string
    name: string
    displayName: string
    type: string
    required: boolean
    values: any
  }>
  
  productOptions: Array<{
    id: string
    name: string
    displayName: string
    type: string
    values: any
  }>
  
  productCustomFields: Array<{
    id: string
    name: string
    value: string
  }>
  
  productSEO: {
    metaTitle: string | null
    metaDescription: string | null
    searchKeywords: string[]
    urlSlug: string | null
  } | null
  
  productShipping: {
    weight: number | null
    weightUnit: string | null
    width: number | null
    height: number | null
    depth: number | null
    dimensionUnit: string | null
    fixedCost: number | null
    freeShipping: boolean
  } | null
  
  productInventory: Array<{
    id: string
    quantity: number
    tracking: string
    warningLevel: number
  }>
  
  productBulkPricing: Array<{
    id: string
    minQuantity: number
    maxQuantity: number | null
    price: number
    type: string
  }>
  
  crossListings: Array<{
    id: string
    targetPlatform: string
    status: string
    externalId: string | null
  }>
}

export default function AdvancedProductEditPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const storeId = params.id as string
  const productId = params.productId as string

  const [product, setProduct] = useState<FullProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    } else if (status === "authenticated") {
      fetchProduct()
    }
  }, [status, productId])

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${productId}/full`)
      const data = await res.json()
      
      if (res.ok) {
        setProduct(data.product)
      } else {
        toast({
          title: "Error",
          description: "Failed to load product",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load product",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!product) return

    setSaving(true)
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: product.name,
          description: product.description,
          sku: product.sku,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          tags: product.tags,
          categories: product.categories,
          syncToBigCommerce: true
        }),
      })

      if (res.ok) {
        toast({
          title: "Success",
          description: "Product updated successfully",
        })
        router.push(`/products`)
      } else {
        toast({
          title: "Error",
          description: "Failed to update product",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (!product) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/products`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Advanced Product Edit</h1>
              <p className="text-sm text-muted-foreground">{product.name}</p>
            </div>
            <Badge variant="outline">{product.platform}</Badge>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </header>

      <div className="px-6 py-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-11 mb-6">
            <TabsTrigger value="basic">
              <Package className="h-4 w-4 mr-2" />
              Basic
            </TabsTrigger>
            <TabsTrigger value="variants">
              <Settings className="h-4 w-4 mr-2" />
              Variants ({product.productVariants?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="modifiers">
              <Settings className="h-4 w-4 mr-2" />
              Modifiers ({product.productModifiers?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="options">
              <Settings className="h-4 w-4 mr-2" />
              Options ({product.productOptions?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="images">
              <Image className="h-4 w-4 mr-2" />
              Images
            </TabsTrigger>
            <TabsTrigger value="seo">
              <Tag className="h-4 w-4 mr-2" />
              SEO
            </TabsTrigger>
            <TabsTrigger value="shipping">
              <TruckIcon className="h-4 w-4 mr-2" />
              Shipping
            </TabsTrigger>
            <TabsTrigger value="inventory">
              <BarChart3 className="h-4 w-4 mr-2" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="custom">
              <FileText className="h-4 w-4 mr-2" />
              Custom ({product.productCustomFields?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="crosslist">
              <Share2 className="h-4 w-4 mr-2" />
              Cross-List
            </TabsTrigger>
            <TabsTrigger value="platform">
              <FileText className="h-4 w-4 mr-2" />
              Raw Data
            </TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Basic Product Information</CardTitle>
                <CardDescription>Core product details from {product.storeConnection?.storeName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name</Label>
                    <Input
                      id="name"
                      value={product.name}
                      onChange={(e) => setProduct({ ...product, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      value={product.sku || ""}
                      onChange={(e) => setProduct({ ...product, sku: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={product.price}
                      onChange={(e) => setProduct({ ...product, price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="compareAtPrice">Compare At Price</Label>
                    <Input
                      id="compareAtPrice"
                      type="number"
                      step="0.01"
                      value={product.compareAtPrice || ""}
                      onChange={(e) => setProduct({ ...product, compareAtPrice: parseFloat(e.target.value) || null })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    rows={8}
                    value={product.description || ""}
                    onChange={(e) => setProduct({ ...product, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={product.tags?.join(", ") || ""}
                    onChange={(e) => setProduct({ ...product, tags: e.target.value.split(",").map(t => t.trim()) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>External ID</Label>
                  <Input value={product.externalId} disabled />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Variants Tab */}
          <TabsContent value="variants">
            <Card>
              <CardHeader>
                <CardTitle>Product Variants</CardTitle>
                <CardDescription>
                  {product.productVariants?.length || 0} variants synced from BigCommerce
                </CardDescription>
              </CardHeader>
              <CardContent>
                {product.productVariants && product.productVariants.length > 0 ? (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2 font-medium">SKU</th>
                            <th className="text-left p-2 font-medium">Options</th>
                            <th className="text-left p-2 font-medium">Price</th>
                            <th className="text-left p-2 font-medium">Inventory</th>
                            <th className="text-left p-2 font-medium">Weight</th>
                          </tr>
                        </thead>
                        <tbody>
                          {product.productVariants.map((variant) => (
                            <tr key={variant.id} className="border-b hover:bg-muted/50">
                              <td className="p-2 font-mono text-sm">{variant.sku || 'N/A'}</td>
                              <td className="p-2">
                                <div className="flex gap-1 flex-wrap">
                                  {Object.entries(variant.optionValues || {}).map(([key, value]) => (
                                    <Badge key={key} variant="secondary" className="text-xs">
                                      {key}: {String(value)}
                                    </Badge>
                                  ))}
                                </div>
                              </td>
                              <td className="p-2 font-medium">${Number(variant.price).toFixed(2)}</td>
                              <td className="p-2">
                                <Badge variant={variant.inventoryLevel > 10 ? "default" : "destructive"}>
                                  {variant.inventoryLevel}
                                </Badge>
                              </td>
                              <td className="p-2 text-sm text-muted-foreground">
                                {variant.weight ? `${variant.weight} lb` : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No variants synced for this product</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Modifiers Tab */}
          <TabsContent value="modifiers">
            <Card>
              <CardHeader>
                <CardTitle>Product Modifiers</CardTitle>
                <CardDescription>
                  Add-ons and customization options from BigCommerce
                </CardDescription>
              </CardHeader>
              <CardContent>
                {product.productModifiers && product.productModifiers.length > 0 ? (
                  <div className="space-y-4">
                    {product.productModifiers.map((modifier) => (
                      <Card key={modifier.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{modifier.displayName}</h4>
                            <div className="flex gap-2">
                              <Badge variant="outline">{modifier.type}</Badge>
                              {modifier.required && <Badge variant="destructive">Required</Badge>}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">Internal name: {modifier.name}</p>
                          
                          {modifier.values && Array.isArray(modifier.values) && modifier.values.length > 0 && (
                            <div className="mt-3">
                              <Label className="text-xs text-muted-foreground">Values:</Label>
                              <div className="flex gap-2 flex-wrap mt-1">
                                {modifier.values.map((value: any, idx: number) => (
                                  <Badge key={idx} variant="secondary">
                                    {value.label || value.value}
                                    {value.price_adjustment && ` (+$${value.price_adjustment})`}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No modifiers synced for this product</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Options Tab */}
          <TabsContent value="options">
            <Card>
              <CardHeader>
                <CardTitle>Product Options</CardTitle>
                <CardDescription>Color, Size, and other variation options</CardDescription>
              </CardHeader>
              <CardContent>
                {product.productOptions && product.productOptions.length > 0 ? (
                  <div className="space-y-4">
                    {product.productOptions.map((option) => (
                      <Card key={option.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{option.displayName}</h4>
                            <Badge variant="outline">{option.type}</Badge>
                          </div>
                          
                          <div className="mt-3">
                            <Label className="text-xs text-muted-foreground">Available Values:</Label>
                            <div className="flex gap-2 flex-wrap mt-1">
                              {Array.isArray(option.values) && option.values.map((value: any, idx: number) => (
                                <Badge key={idx} variant="secondary">
                                  {value.label || value}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No options synced for this product</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Images Tab */}
          <TabsContent value="images">
            <Card>
              <CardHeader>
                <CardTitle>Product Images</CardTitle>
                <CardDescription>Product and variant images</CardDescription>
              </CardHeader>
              <CardContent>
                {product.images && (product.images.images || product.images) ? (
                  <div className="grid grid-cols-4 gap-4">
                    {(Array.isArray(product.images.images) ? product.images.images : Array.isArray(product.images) ? product.images : []).map((img: any, idx: number) => (
                      <div key={idx} className="border rounded-lg overflow-hidden">
                        <img 
                          src={img.url_standard || img.url_thumbnail || img.url || '/placeholder.jpg'} 
                          alt={`Product image ${idx + 1}`}
                          className="w-full aspect-square object-cover"
                        />
                        <div className="p-2 bg-muted text-xs">
                          Image {idx + 1}
                          {img.is_thumbnail && <Badge variant="secondary" className="ml-2">Thumbnail</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No images available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SEO Tab */}
          <TabsContent value="seo">
            <Card>
              <CardHeader>
                <CardTitle>SEO Settings</CardTitle>
                <CardDescription>Search engine optimization data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {product.productSEO ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="metaTitle">Meta Title</Label>
                      <Input
                        id="metaTitle"
                        value={product.productSEO.metaTitle || ""}
                        disabled
                        placeholder="Not set"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="metaDescription">Meta Description</Label>
                      <Textarea
                        id="metaDescription"
                        rows={3}
                        value={product.productSEO.metaDescription || ""}
                        disabled
                        placeholder="Not set"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="urlSlug">URL Slug</Label>
                      <Input
                        id="urlSlug"
                        value={product.productSEO.urlSlug || ""}
                        disabled
                        placeholder="Not set"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Search Keywords</Label>
                      <div className="flex gap-2 flex-wrap">
                        {product.productSEO.searchKeywords?.map((keyword, idx) => (
                          <Badge key={idx} variant="secondary">{keyword}</Badge>
                        )) || <span className="text-sm text-muted-foreground">No keywords</span>}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No SEO data synced for this product</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shipping Tab */}
          <TabsContent value="shipping">
            <Card>
              <CardHeader>
                <CardTitle>Shipping Information</CardTitle>
                <CardDescription>Package dimensions and shipping costs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {product.productShipping ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Weight</Label>
                        <Input
                          value={product.productShipping.weight ? `${product.productShipping.weight} ${product.productShipping.weightUnit || 'lb'}` : 'Not set'}
                          disabled
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Fixed Shipping Cost</Label>
                        <Input
                          value={product.productShipping.fixedCost ? `$${product.productShipping.fixedCost}` : 'Not set'}
                          disabled
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Width</Label>
                        <Input
                          value={product.productShipping.width ? `${product.productShipping.width} ${product.productShipping.dimensionUnit || 'in'}` : 'Not set'}
                          disabled
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Height</Label>
                        <Input
                          value={product.productShipping.height ? `${product.productShipping.height} ${product.productShipping.dimensionUnit || 'in'}` : 'Not set'}
                          disabled
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Depth</Label>
                        <Input
                          value={product.productShipping.depth ? `${product.productShipping.depth} ${product.productShipping.dimensionUnit || 'in'}` : 'Not set'}
                          disabled
                        />
                      </div>
                    </div>

                    {product.productShipping.freeShipping && (
                      <Badge variant="default">Free Shipping Enabled</Badge>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No shipping data synced for this product</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Levels</CardTitle>
                <CardDescription>Stock levels and tracking settings</CardDescription>
              </CardHeader>
              <CardContent>
                {product.productInventory && product.productInventory.length > 0 ? (
                  <div className="space-y-4">
                    {product.productInventory.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Quantity: {inv.quantity}</p>
                          <p className="text-sm text-muted-foreground">Tracking: {inv.tracking}</p>
                          <p className="text-sm text-muted-foreground">Low stock warning: {inv.warningLevel}</p>
                        </div>
                        <Badge variant={inv.quantity > inv.warningLevel ? "default" : "destructive"}>
                          {inv.quantity > inv.warningLevel ? "In Stock" : "Low Stock"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No inventory data synced for this product</p>
                )}
                
                {product.productBulkPricing && product.productBulkPricing.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-3">Bulk Pricing Rules</h4>
                    <div className="space-y-2">
                      {product.productBulkPricing.map((pricing) => (
                        <div key={pricing.id} className="flex items-center justify-between p-3 border rounded">
                          <span className="text-sm">
                            {pricing.minQuantity}+ units
                            {pricing.maxQuantity && ` (up to ${pricing.maxQuantity})`}
                          </span>
                          <Badge>${Number(pricing.price).toFixed(2)} each</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Custom Fields Tab */}
          <TabsContent value="custom">
            <Card>
              <CardHeader>
                <CardTitle>Custom Fields</CardTitle>
                <CardDescription>Platform-specific metadata and custom attributes</CardDescription>
              </CardHeader>
              <CardContent>
                {product.productCustomFields && product.productCustomFields.length > 0 ? (
                  <div className="space-y-3">
                    {product.productCustomFields.map((field) => (
                      <div key={field.id} className="p-3 border rounded-lg">
                        <Label className="text-sm font-medium">{field.name}</Label>
                        <p className="mt-1 text-sm">{field.value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No custom fields synced for this product</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cross-Listing Tab */}
          <TabsContent value="crosslist">
            <Card>
              <CardHeader>
                <CardTitle>Cross-Listing</CardTitle>
                <CardDescription>Publish this product to other platforms</CardDescription>
              </CardHeader>
              <CardContent>
                {product.crossListings && product.crossListings.length > 0 ? (
                  <div className="space-y-3">
                    {product.crossListings.map((listing) => (
                      <div key={listing.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{listing.targetPlatform}</p>
                          <p className="text-sm text-muted-foreground">
                            {listing.externalId || 'Not published yet'}
                          </p>
                        </div>
                        <Badge variant={listing.status === 'published' ? 'default' : 'secondary'}>
                          {listing.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">This product is not cross-listed to any other platform</p>
                    <Button variant="outline" disabled>
                      Create Cross-Listing (Coming Soon)
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Platform Data Tab */}
          <TabsContent value="platform">
            <Card>
              <CardHeader>
                <CardTitle>Raw Platform Data</CardTitle>
                <CardDescription>Complete data from {product.platform}</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                  {JSON.stringify(product.platformData, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}