"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import {
  Download,
  ExternalLink,
  RefreshCw,
  Search,
  CheckCircle2,
  Package,
  Image,
  Zap,
  Star,
  DollarSign,
  Eye,
  EyeOff,
  Settings,
  Lock,
  TrendingUp
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

// Default feature images to add to all Etsy imports
const DEFAULT_FEATURE_IMAGES = [
  'https://i.etsystatic.com/35917774/r/il/cb6d13/5715048924/il_1588xN.5715048924_6ucg.jpg',
  'https://i.etsystatic.com/35917774/r/il/1ad7ff/5114402664/il_1588xN.5114402664_paav.jpg',
  'https://i.etsystatic.com/35917774/r/il/dfb735/5114403010/il_1588xN.5114403010_sf8t.jpg',
  'https://i.etsystatic.com/35917774/r/il/0d2cb4/5114403406/il_1588xN.5114403406_fbg2.jpg'
]

export default function EtsyImportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [userTier, setUserTier] = useState<string>("")
  
  const [etsyUrl, setEtsyUrl] = useState("")
  const [categories, setCategories] = useState<Category[]>([])
  const [sharedModifiers, setSharedModifiers] = useState<SharedModifier[]>([])
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [selectedModifiers, setSelectedModifiers] = useState<number[]>([])
  const [etsyData, setEtsyData] = useState<EtsyProductData | null>(null)
  const [seoAnalysis, setSeoAnalysis] = useState<SEOAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([]) // Track which images to import

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
    colorOptions.map(color => color.name)
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
    if (status === "unauthenticated") {
      router.push("/")
    } else if (status === "authenticated") {
      checkAccess()
    }
  }, [status])

  useEffect(() => {
    if (hasAccess) {
      loadCategoriesAndModifiers()
    }
  }, [hasAccess])

  const checkAccess = async () => {
    try {
      const res = await fetch("/api/usage")
      if (res.ok) {
        const data = await res.json()
        setUserTier(data.tier)
        // Etsy is PRO+ only
        const allowed = data.features.etsy === true
        setHasAccess(allowed)
        
        if (!allowed) {
          toast({
            title: "Upgrade Required",
            description: "Etsy import is available on Professional and Enterprise plans only",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("Access check failed:", error)
    }
  }

  const loadCategoriesAndModifiers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/bigcommerce/categories-and-modifiers')
      const data = await response.json()
      
      if (data.success) {
        setCategories(data.data.categories)
        setSharedModifiers(data.data.sharedModifiers)
        toast({
          title: "Data Loaded",
          description: `Found ${data.data.categories.length} categories and ${data.data.sharedModifiers.length} shared modifiers`,
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
        // Add default feature images AFTER the scraped images
        const scrapedImages = data.data.images || []
        const allImages = [...scrapedImages, ...DEFAULT_FEATURE_IMAGES]
        
        // Update etsyData with combined images
        data.data.images = allImages
        setEtsyData(data.data)
        setSeoAnalysis(data.seoAnalysis)
        
        // Set all images as selected by default
        setSelectedImages(allImages)
        
        toast({
          title: "Product Scraped",
          description: `Found ${scrapedImages.length} product image${scrapedImages.length !== 1 ? 's' : ''} + 4 default feature images (at end).`,
        })
        
        console.log('📸 Scraped images:', scrapedImages)
        console.log('📸 Default images added at end')
        console.log('📸 Total images:', allImages.length)
      } else {
        throw new Error(data.error || 'Failed to scrape product')
      }
    } catch (error) {
      console.error("Scraping error:", error)
      toast({
        title: "Scraping Failed",
        description: error instanceof Error ? error.message : "Failed to scrape Etsy product",
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
          selectedColors,
          selectedImages, // Only import selected images
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

  if (status === "loading" || hasAccess === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="container mx-auto py-10">
        <div className="max-w-2xl mx-auto">
          <Card className="border-primary">
            <CardHeader className="text-center">
              <Lock className="h-16 w-16 mx-auto mb-4 text-primary" />
              <CardTitle className="text-2xl">Upgrade Required</CardTitle>
              <CardDescription>
                Etsy import is available on Professional and Enterprise plans
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertTitle>Your current plan: {userTier}</AlertTitle>
                <AlertDescription>
                  Upgrade to Professional or Enterprise to unlock Etsy product import functionality
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <h3 className="font-semibold">What you'll get with Professional:</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>✓ Unlimited products</li>
                  <li>✓ Etsy product import</li>
                  <li>✓ TikTok product export</li>
                  <li>✓ Bulk operations</li>
                  <li>✓ Advanced analytics</li>
                  <li>✓ Priority support</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button className="flex-1" onClick={() => router.push("/billing")}>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  View Plans & Upgrade
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => router.push("/dashboard")}>
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Etsy to BigCommerce Import</h1>
            <p className="text-muted-foreground">
              Import Etsy listings into BigCommerce with full SEO optimization
            </p>
          </div>
          <Badge variant="default" className="text-sm px-3 py-1">
            <Lock className="h-3 w-3 mr-1" />
            Professional Feature
          </Badge>
        </div>

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
              <div className="space-y-6">
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
                    </div>
                  )}
                </div>

                {/* Image Preview */}
                {etsyData.images && etsyData.images.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Product Images ({selectedImages.length} selected of {etsyData.images.length})
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {etsyData.images.map((imageUrl, index) => {
                        const isSelected = selectedImages.includes(imageUrl)
                        const isDefaultImage = DEFAULT_FEATURE_IMAGES.includes(imageUrl)
                        
                        return (
                          <div
                            key={index}
                            className={`relative group ${!isSelected ? 'opacity-50' : ''}`}
                          >
                            <div className={`aspect-square rounded-lg border-2 overflow-hidden bg-gray-50 ${
                              isSelected ? 'border-green-500' : 'border-gray-200'
                            }`}>
                              <img
                                src={imageUrl}
                                alt={`Product image ${index + 1}`}
                                className="w-full h-full object-cover hover:scale-110 transition-transform duration-200"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder.svg'
                                }}
                              />
                            </div>
                            
                            {/* Image number badge */}
                            <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                              #{index + 1}
                            </div>
                            
                            {/* Default image badge */}
                            {isDefaultImage && (
                              <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                                Default
                              </div>
                            )}
                            
                            {/* Remove button */}
                            {isSelected && (
                              <button
                                onClick={() => {
                                  setSelectedImages(prev => prev.filter(img => img !== imageUrl))
                                  toast({
                                    title: "Image Removed",
                                    description: `Image ${index + 1} will not be imported`,
                                  })
                                }}
                                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove this image"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            )}
                            
                            {/* Restore button for removed images */}
                            {!isSelected && (
                              <button
                                onClick={() => {
                                  setSelectedImages(prev => [...prev, imageUrl])
                                  toast({
                                    title: "Image Restored",
                                    description: `Image ${index + 1} will be imported`,
                                  })
                                }}
                                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <span className="bg-green-500 text-white text-xs px-3 py-1 rounded">
                                  Restore
                                </span>
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      ✓ {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''} will be imported to BigCommerce (hover over images to remove/restore)
                    </p>
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
              Set pricing, inventory, and visibility
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
                    </CardContent>
                  </Card>
                ))}
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
          </CardContent>
        </Card>

        {/* Step 5: Color Options */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Step 5: Select Color Options
            </CardTitle>
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
          </CardContent>
        </Card>

        {/* Step 6: SEO Options */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Step 6: SEO Options
            </CardTitle>
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
          </CardContent>
        </Card>
      </div>

      <Toaster />
    </div>
  )
}