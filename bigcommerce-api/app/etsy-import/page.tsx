"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { 
  Download, 
  ExternalLink, 
  RefreshCw, 
  Search,
  Info,
  CheckCircle2,
  AlertCircle,
  Package,
  Tags,
  Image,
  Zap,
  Star,
  DollarSign,
  Eye,
  EyeOff,
  Settings
} from "lucide-react"

interface Category {
  id: number
  name: string
  parent_id: number
  is_visible: boolean
}

interface SharedModifier {
  id: number
  name: string
  display_name: string
  type: string
  required: boolean
  optionCount: number
}

interface SharedVariantOption {
  id: string | number
  name: string
  display_name: string
  type: string
  valueCount?: number
  option_values?: Array<any>
  usage_count?: number
  sample_product_ids?: number[]
}

interface EtsyProductData {
  title: string
  description: string
  images: string[]
  tags: string[]
  materials: string[]
  category: string
  shop: string
  url: string
}

interface SEOAnalysis {
  keywordAnalysis: {
    primaryKeywords: string[]
    secondaryKeywords: string[]
    longTailKeywords: string[]
  }
  processedTags: {
    finalTags: string[]
    originalTags: string[]
    generatedTags: string[]
  }
  seoContent: {
    metaTitle: string
    metaDescription: string
    urlSlug: string
    searchKeywords: string
  }
  seoScore: number
  recommendations: string[]
}

export default function EtsyImportPage() {
  const [etsyUrl, setEtsyUrl] = useState("")
  const [categories, setCategories] = useState<Category[]>([])
  const [sharedModifiers, setSharedModifiers] = useState<SharedModifier[]>([])
  const [sharedVariantOptions, setSharedVariantOptions] = useState<SharedVariantOption[]>([])
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [selectedModifiers, setSelectedModifiers] = useState<number[]>([])
  const [selectedVariantOptions, setSelectedVariantOptions] = useState<(string | number)[]>([])
  const [etsyData, setEtsyData] = useState<EtsyProductData | null>(null)
  const [seoAnalysis, setSeoAnalysis] = useState<SEOAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [importing, setImporting] = useState(false)

  // Product settings
  const [price, setPrice] = useState<number>(39.95)
  const [salePrice, setSalePrice] = useState<number>(29.95)
  const [costPrice, setCostPrice] = useState<number>(0)
  const colorOptions = [
    { name: "Black", hex: "#000000" },
    { name: "Navy", hex: "#000080" },
    { name: "Dark Gray Heather", hex: "#726F6F" },
    { name: "True Royal", hex: "#2361C7" },
    { name: "Soft Pink", hex: "#F8D0D0" },
    { name: "White", hex: "#FFFFFF" },
    { name: "Red", hex: "#E60A0A" },
    { name: "Kelly Green", hex: "#0EB821" },
    { name: "Orange", hex: "#FF7225" },
  ]
  
  const [selectedColors, setSelectedColors] = useState<string[]>(
    colorOptions.map(color => color.name) // Pre-select all colors by default
  )
  const [trackInventory, setTrackInventory] = useState(false)
  const [inventoryLevel, setInventoryLevel] = useState<number>(0)
  const [isVisible, setIsVisible] = useState(true)

  // SEO Options
  const [generateTags, setGenerateTags] = useState(true)
  const [optimizeContent, setOptimizeContent] = useState(true)
  const [replaceImages, setReplaceImages] = useState(true)
  const [maxTags, setMaxTags] = useState(20)

  useEffect(() => {
    loadCategoriesAndModifiers()
  }, [])

  const loadCategoriesAndModifiers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/bigcommerce/categories-and-modifiers')
      const data = await response.json()
      
      if (data.success) {
        setCategories(data.data.categories)
        setSharedModifiers(data.data.sharedModifiers)
        setSharedVariantOptions(data.data.variantOptions || [])
        toast({
          title: "Data Loaded",
          description: `Found ${data.data.categories.length} categories, ${data.data.sharedModifiers.length} shared modifiers, and ${data.data.variantOptions?.length || 0} variant options`,
        })
      } else {
        throw new Error(data.error || 'Failed to load data')
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "Failed to load categories and modifiers",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const scrapeEtsyProduct = async () => {
    if (!etsyUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter an Etsy URL",
        variant: "destructive",
      })
      return
    }

    setScraping(true)
    try {
      const response = await fetch('/api/etsy/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: etsyUrl,
          options: {
            includeImages: true,
            includeTags: true,
            includeMaterials: true,
            generateSEO: true
          }
        })
      })

      const data = await response.json()

      if (data.success) {
        setEtsyData(data.data)
        setSeoAnalysis(data.seoAnalysis)
        toast({
          title: "Product Scraped",
          description: `Successfully extracted data for: ${data.data.title}`,
        })
      } else {
        throw new Error(data.error || 'Failed to scrape product')
      }
    } catch (error) {
      console.error("Scraping error:", error)
      toast({
        title: "Scraping Failed",
        description: error instanceof Error ? error.message : "Failed to scrape Etsy product. Please try again or check if the URL is correct.",
        variant: "destructive",
      })
    } finally {
      setScraping(false)
    }
  }

  const importProduct = async () => {
    if (!etsyData) {
      toast({
        title: "Error",
        description: "Please scrape an Etsy product first",
        variant: "destructive",
      })
      return
    }

    if (price <= 0) {
      toast({
        title: "Error",
        description: "Please set a valid price",
        variant: "destructive",
      })
      return
    }

    setImporting(true)
    try {
      const response = await fetch('/api/etsy/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          etsyUrl: etsyUrl,
          selectedCategories,
          selectedModifiers,
          selectedVariantOptions,
          selectedColors, // Include manual color selections
          pricing: {
            price,
            salePrice: salePrice > 0 ? salePrice : undefined,
            costPrice: costPrice > 0 ? costPrice : undefined
          },
          inventory: {
            trackInventory,
            inventoryLevel: trackInventory ? inventoryLevel : undefined
          },
          visibility: isVisible,
          seoOptions: {
            generateTags,
            optimizeContent,
            replaceImages,
            maxTags
          }
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Import Successful!",
          description: `Product created with ID: ${data.productId}. SEO Score: ${data.seoReport.seoScore}/100`,
        })
        
        // Reset form
        setEtsyUrl("")
        setEtsyData(null)
        setSeoAnalysis(null)
        setSelectedCategories([])
        setSelectedModifiers([])
        setSelectedVariantOptions([])
      } else {
        throw new Error(data.error || 'Failed to import product')
      }
    } catch (error) {
      console.error("Import error:", error)
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import product",
        variant: "destructive",
      })
    } finally {
      setImporting(false)
    }
  }

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const toggleModifier = (modifierId: number) => {
    setSelectedModifiers(prev =>
      prev.includes(modifierId)
        ? prev.filter(id => id !== modifierId)
        : [...prev, modifierId]
    )
  }

  const toggleVariantOption = (variantId: string | number) => {
    setSelectedVariantOptions(prev =>
      prev.includes(variantId)
        ? prev.filter(id => id !== variantId)
        : [...prev, variantId]
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Etsy to BigCommerce Import</h1>
        <p className="text-muted-foreground mb-8">
          Import Etsy listings into BigCommerce with full SEO optimization. Create fresh products with custom categories, modifiers, and pricing.
        </p>

        {/* Step 1: Etsy URL Input */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Step 1: Enter Etsy Product URL
            </CardTitle>
            <CardDescription>
              Paste the URL of the Etsy product you want to import
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="etsy-url">Etsy Product URL</Label>
                <Input
                  id="etsy-url"
                  placeholder="https://www.etsy.com/listing/..."
                  value={etsyUrl}
                  onChange={(e) => setEtsyUrl(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={scrapeEtsyProduct}
                  disabled={scraping || !etsyUrl.trim()}
                >
                  {scraping ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Scraping...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Scrape Product
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Etsy Product Preview */}
        {etsyData && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Etsy Product Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">{etsyData.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {etsyData.description.substring(0, 200)}...
                  </p>
                  <div className="flex gap-2 mb-2">
                    <Badge variant="outline">
                      <Package className="h-3 w-3 mr-1" />
                      {etsyData.category}
                    </Badge>
                    <Badge variant="outline">
                      <Image className="h-3 w-3 mr-1" />
                      {etsyData.images.length} images
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {etsyData.tags.slice(0, 8).map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {etsyData.tags.length > 8 && (
                      <Badge variant="secondary" className="text-xs">
                        +{etsyData.tags.length - 8} more
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* SEO Analysis */}
                {seoAnalysis && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="font-semibold">SEO Analysis</span>
                      <Badge variant={seoAnalysis.seoScore >= 80 ? "default" : seoAnalysis.seoScore >= 60 ? "secondary" : "destructive"}>
                        <Star className="h-3 w-3 mr-1" />
                        {seoAnalysis.seoScore}/100
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Keywords:</span> {seoAnalysis.keywordAnalysis.primaryKeywords.slice(0, 5).join(', ')}
                      </div>
                      <div>
                        <span className="font-medium">Tags Generated:</span> {seoAnalysis.processedTags.finalTags.length}
                      </div>
                      <div>
                        <span className="font-medium">Meta Title:</span> {seoAnalysis.seoContent.metaTitle}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Product Configuration */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Step 2: Configure Product
            </CardTitle>
            <CardDescription>
              Set pricing, inventory, and visibility for the new product
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Pricing */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Pricing
                </h4>
                <div>
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="sale-price">Sale Price</Label>
                  <Input
                    id="sale-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="cost-price">Cost Price</Label>
                  <Input
                    id="cost-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Inventory */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Inventory
                </h4>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="track-inventory"
                    checked={trackInventory}
                    onCheckedChange={(checked) => setTrackInventory(checked === true)}
                  />
                  <Label htmlFor="track-inventory">Track inventory</Label>
                </div>
                {trackInventory && (
                  <div>
                    <Label htmlFor="inventory-level">Inventory Level</Label>
                    <Input
                      id="inventory-level"
                      type="number"
                      min="0"
                      value={inventoryLevel}
                      onChange={(e) => setInventoryLevel(parseInt(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                )}
              </div>

              {/* Visibility */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  Visibility
                </h4>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is-visible"
                    checked={isVisible}
                    onCheckedChange={(checked) => setIsVisible(checked === true)}
                  />
                  <Label htmlFor="is-visible">Product is visible</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Categories */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Step 3: Select Categories
            </CardTitle>
            <CardDescription>
              Choose which categories this product should belong to
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading categories...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {categories.map((category) => (
                  <Card 
                    key={category.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedCategories.includes(category.id) ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => toggleCategory(category.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{category.name}</h4>
                        <Checkbox 
                          checked={selectedCategories.includes(category.id)}
                          onChange={() => {}}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">ID: {category.id}</p>
                      {!category.is_visible && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          Hidden
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {selectedCategories.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Selected Categories ({selectedCategories.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {selectedCategories.map(catId => {
                    const category = categories.find(c => c.id === catId)
                    return category ? (
                      <Badge key={catId} variant="default">
                        {category.name}
                      </Badge>
                    ) : null
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 4: Shared Modifiers */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Step 4: Select Shared Modifiers
            </CardTitle>
            <CardDescription>
              Choose which shared modifiers to apply to this product
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading modifiers...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {sharedModifiers.map((modifier) => (
                  <Card 
                    key={modifier.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedModifiers.includes(modifier.id) ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => toggleModifier(modifier.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-sm">{modifier.display_name}</h4>
                          <p className="text-xs text-muted-foreground">{modifier.name}</p>
                        </div>
                        <Checkbox
                          checked={selectedModifiers.includes(modifier.id)}
                          onChange={() => {}}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">Type: {modifier.type}</p>
                      <p className="text-xs text-muted-foreground">Options: {modifier.optionCount}</p>
                      {modifier.required && (
                        <Badge variant="destructive" className="text-xs mt-1">
                          Required
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {selectedModifiers.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Selected Modifiers ({selectedModifiers.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {selectedModifiers.map(modId => {
                    const modifier = sharedModifiers.find(m => m.id === modId)
                    return modifier ? (
                      <Badge key={modId} variant="default">
                        {modifier.display_name}
                      </Badge>
                    ) : null
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 5: Manual Color Options */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Step 5: Select Color Options
            </CardTitle>
            <CardDescription>
              Choose which colors to include as product variations (manual selection)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {colorOptions.map((color, index) => (
                <div key={color.name} className="flex items-center space-x-3">
                  <Checkbox 
                    id={`color-${index}`}
                    checked={selectedColors.includes(color.name)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedColors(prev => [...prev, color.name])
                      } else {
                        setSelectedColors(prev => prev.filter(c => c !== color.name))
                      }
                    }}
                  />
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-5 h-5 rounded border border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <Label htmlFor={`color-${index}`} className="text-sm font-normal cursor-pointer">
                      {color.name}
                    </Label>
                  </div>
                </div>
              ))}
            </div>
            {selectedColors.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Selected Colors ({selectedColors.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {selectedColors.map(colorName => (
                    <Badge key={colorName} variant="default">
                      {colorName}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 6: SEO Options */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Step 6: SEO Options
            </CardTitle>
            <CardDescription>
              Configure how the product should be optimized for search engines
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="generate-tags"
                    checked={generateTags}
                    onCheckedChange={(checked) => setGenerateTags(checked === true)}
                  />
                  <Label htmlFor="generate-tags">Generate additional SEO tags</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="optimize-content"
                    checked={optimizeContent}
                    onCheckedChange={(checked) => setOptimizeContent(checked === true)}
                  />
                  <Label htmlFor="optimize-content">Optimize product description</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="replace-images"
                    checked={replaceImages}
                    onCheckedChange={(checked) => setReplaceImages(checked === true)}
                  />
                  <Label htmlFor="replace-images">Import product images</Label>
                </div>
              </div>
              <div>
                <Label htmlFor="max-tags">Maximum Tags ({maxTags})</Label>
                <Input
                  id="max-tags"
                  type="number"
                  min="5"
                  max="50"
                  value={maxTags}
                  onChange={(e) => setMaxTags(parseInt(e.target.value) || 20)}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Import Button */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center">
              <Button
                onClick={importProduct}
                disabled={importing || !etsyData || price <= 0}
                size="lg"
                className="px-8"
              >
                {importing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Creating Product...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Create Product in BigCommerce
                  </>
                )}
              </Button>
            </div>
            {etsyData && (
              <div className="text-center text-sm text-muted-foreground mt-4 space-y-1">
                <p>Ready to create "{etsyData.title}" with price ${price}</p>
                <p>{selectedCategories.length} categories, {selectedModifiers.length} modifiers selected</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Toaster />
    </div>
  )
}
