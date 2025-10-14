"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Plus,
  X,
  Save,
  Send,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  FileText
} from 'lucide-react'

interface Variant {
  id: string
  sku: string
  optionValues: Record<string, string>
  price: string
  compareAtPrice?: string
}

interface Store {
  id: string
  platform: string
  storeName: string
  isActive: boolean
}

interface ProductTemplate {
  id: string
  name: string
  description?: string
  category?: string
  basePrice: string
  priceBySize?: Record<string, number>
  variantOptions: Record<string, string[]>
  weight?: string
  defaultTags: string[]
}

export default function CreateMasterProductPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const { toast } = useToast()
  
  // Template support
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [templates, setTemplates] = useState<ProductTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ProductTemplate | null>(null)
  
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [baseSKU, setBaseSKU] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [compareAtPrice, setCompareAtPrice] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState('')
  const [productStatus, setProductStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT')
  
  // Variants
  const [variants, setVariants] = useState<Variant[]>([])
  const [showVariantDialog, setShowVariantDialog] = useState(false)
  const [currentVariant, setCurrentVariant] = useState<Partial<Variant>>({
    sku: '',
    optionValues: {},
    price: '',
    compareAtPrice: ''
  })
  
  // Publishing
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStores, setSelectedStores] = useState<string[]>([])
  const [createdProductId, setCreatedProductId] = useState<string>('')
  
  // UI state
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [loadingStores, setLoadingStores] = useState(false)
  
  // Load template if templateId in URL
  useEffect(() => {
    const templateId = searchParams.get('templateId')
    if (templateId) {
      loadTemplateById(templateId)
    }
  }, [searchParams])
  
  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    router.push('/')
    return null
  }
  
  // Load template by ID
  const loadTemplateById = async (templateId: string) => {
    try {
      const response = await fetch(`/api/templates/${templateId}`)
      const data = await response.json()
      
      if (data.success) {
        applyTemplate(data.template)
      } else {
        toast({
          title: 'Template Not Found',
          description: 'Could not load the selected template',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error loading template:', error)
    }
  }
  
  // Load templates list
  const loadTemplates = async () => {
    setLoadingTemplates(true)
    try {
      const response = await fetch('/api/templates?isActive=true')
      const data = await response.json()
      
      if (data.success) {
        setTemplates(data.templates)
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoadingTemplates(false)
    }
  }
  
  // Apply template to form
  const applyTemplate = (template: ProductTemplate) => {
    setTitle('')  // User should provide their own title
    setDescription(template.description || '')
    setCategory(template.category || '')
    setBasePrice(template.basePrice)
    setTags(template.defaultTags.join(', '))
    setSelectedTemplate(template)
    
    // Generate variants from template
    generateVariantsFromTemplate(template)
    
    toast({
      title: 'Template Applied!',
      description: `Using "${template.name}" template with ${Object.keys(template.variantOptions).length} variant options`,
    })
  }
  
  // Generate variants from template options
  const generateVariantsFromTemplate = (template: ProductTemplate) => {
    const variantOptions = template.variantOptions
    const priceBySize = template.priceBySize || {}
    const basePrice = parseFloat(template.basePrice)
    
    // Generate all combinations
    const optionNames = Object.keys(variantOptions)
    const combinations: Array<Record<string, string>> = []
    
    const generateCombinations = (index: number, current: Record<string, string>) => {
      if (index === optionNames.length) {
        combinations.push({ ...current })
        return
      }
      
      const optionName = optionNames[index]
      const optionValues = variantOptions[optionName]
      
      for (const value of optionValues) {
        current[optionName] = value
        generateCombinations(index + 1, current)
      }
    }
    
    generateCombinations(0, {})
    
    // Create variant objects
    const generatedVariants: Variant[] = combinations.map((combo) => {
      // Calculate price based on size if applicable
      let variantPrice = basePrice
      const size = combo.Size || combo.size
      if (size && priceBySize[size] !== undefined) {
        variantPrice = basePrice + priceBySize[size]
      }
      
      // Generate SKU
      const optionSuffix = Object.values(combo).join('-').replace(/[^a-zA-Z0-9]/g, '-')
      const sku = `${baseSKU || 'PRODUCT'}-${optionSuffix}`.toUpperCase()
      
      return {
        id: Math.random().toString(36).substring(7),
        sku,
        optionValues: combo,
        price: variantPrice.toFixed(2),
        compareAtPrice: undefined
      }
    })
    
    setVariants(generatedVariants)
    toast({
      title: 'Variants Generated',
      description: `Created ${generatedVariants.length} variants from template`,
    })
  }
  
  // Generate SKU from title
  const generateSKU = () => {
    const sku = title
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 20)
    setBaseSKU(sku || 'PRODUCT-001')
  }
  
  // Add variant
  const addVariant = () => {
    if (!currentVariant.sku || !currentVariant.price) {
      toast({ title: 'Missing Fields', description: 'SKU and Price are required', variant: 'destructive' })
      return
    }
    
    const variant: Variant = {
      id: Math.random().toString(36).substring(7),
      sku: currentVariant.sku,
      optionValues: currentVariant.optionValues || {},
      price: currentVariant.price,
      compareAtPrice: currentVariant.compareAtPrice
    }
    
    setVariants([...variants, variant])
    setCurrentVariant({ sku: '', optionValues: {}, price: '', compareAtPrice: '' })
    setShowVariantDialog(false)
    toast({ title: 'Variant Added', description: `${variant.sku} added successfully` })
  }
  
  // Remove variant
  const removeVariant = (id: string) => {
    setVariants(variants.filter(v => v.id !== id))
    toast({ title: 'Variant Removed' })
  }
  
  // Save product
  const handleSave = async (publishAfter = false) => {
    // Validation
    if (!title || !baseSKU || !basePrice) {
      toast({ title: 'Missing Fields', description: 'Title, SKU, and Price are required', variant: 'destructive' })
      return
    }
    
    setSaving(true)
    
    try {
      const response = await fetch('/api/products/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          baseSKU,
          basePrice: parseFloat(basePrice),
          compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
          category: category || null,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          status: productStatus,
          variants: variants.map(v => ({
            sku: v.sku,
            optionValues: v.optionValues,
            price: parseFloat(v.price),
            compareAtPrice: v.compareAtPrice ? parseFloat(v.compareAtPrice) : null,
            imageOverrides: []
          }))
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        toast({
          title: 'Product Created!',
          description: `${title} has been created successfully`
        })
        
        setCreatedProductId(data.product.id)
        
        if (publishAfter) {
          // Load stores and show publish dialog
          await loadStores()
          setShowPublishDialog(true)
        } else {
          // Redirect to products page
          setTimeout(() => router.push('/products'), 1500)
        }
      } else {
        toast({
          title: 'Failed to Create Product',
          description: data.error || 'Unknown error occurred',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Network error while creating product',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }
  
  // Load stores
  const loadStores = async () => {
    setLoadingStores(true)
    try {
      const response = await fetch('/api/stores')
      const data = await response.json()
      
      if (response.ok) {
        setStores(data.stores || [])
        // Pre-select all active stores
        setSelectedStores((data.stores || []).filter((s: Store) => s.isActive).map((s: Store) => s.id))
      }
    } catch (error) {
      console.error('Error loading stores:', error)
    } finally {
      setLoadingStores(false)
    }
  }
  
  // Publish to selected stores
  const handlePublish = async () => {
    if (selectedStores.length === 0) {
      toast({ title: 'No Stores Selected', description: 'Please select at least one store', variant: 'destructive' })
      return
    }
    
    setPublishing(true)
    
    try {
      const response = await fetch(`/api/products/master/${createdProductId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeIds: selectedStores })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        toast({
          title: 'Published Successfully! 🎉',
          description: data.message,
          duration: 5000
        })
        setShowPublishDialog(false)
        
        // Show success and redirect
        setTimeout(() => router.push('/products'), 2000)
      } else {
        toast({
          title: 'Publishing Failed',
          description: data.error || 'Some stores failed to publish',
          variant: 'destructive',
          duration: 7000
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Network error while publishing',
        variant: 'destructive'
      })
    } finally {
      setPublishing(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/products')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Package className="h-6 w-6" />
                Create New Product
                {selectedTemplate && (
                  <Badge variant="secondary" className="text-xs">
                    From: {selectedTemplate.name}
                  </Badge>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">
                Create once, publish to multiple platforms
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                loadTemplates()
                setShowTemplateDialog(true)
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              Use Template
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Form */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Core product details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Product Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Custom Print T-Shirt"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detailed product description..."
                    rows={4}
                    className="mt-1"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sku">SKU *</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="sku"
                        value={baseSKU}
                        onChange={(e) => setBaseSKU(e.target.value)}
                        placeholder="PRODUCT-001"
                      />
                      <Button variant="outline" size="sm" onClick={generateSKU} type="button">
                        Generate
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g., Apparel"
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="basePrice">Base Price *</Label>
                    <Input
                      id="basePrice"
                      type="number"
                      step="0.01"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      placeholder="29.99"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="compareAtPrice">Compare at Price</Label>
                    <Input
                      id="compareAtPrice"
                      type="number"
                      step="0.01"
                      value={compareAtPrice}
                      onChange={(e) => setCompareAtPrice(e.target.value)}
                      placeholder="39.99"
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="t-shirt, custom, cotton"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={productStatus} onValueChange={(value: any) => setProductStatus(value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="PUBLISHED">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            
            {/* Variants */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Variants</CardTitle>
                    <CardDescription>Add color, size, or other variations</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setShowVariantDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Variant
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {variants.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No variants yet. Add some to offer different options.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {variants.map((variant) => (
                      <div
                        key={variant.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50"
                      >
                        <div className="flex-1">
                          <div className="font-medium font-mono text-sm">{variant.sku}</div>
                          <div className="text-xs text-muted-foreground">
                            {Object.entries(variant.optionValues).map(([key, value]) => (
                              <span key={key} className="mr-2">
                                {key}: {value}
                              </span>
                            ))}
                          </div>
                        </div>
                        <Badge variant="secondary">${variant.price}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVariant(variant.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Right Column - Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  onClick={() => handleSave(false)}
                  disabled={saving || publishing}
                >
                  {saving ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" />Save as Draft</>
                  )}
                </Button>
                
                <Button
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600"
                  onClick={() => handleSave(true)}
                  disabled={saving || publishing}
                >
                  {saving ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
                  ) : (
                    <><Send className="h-4 w-4 mr-2" />Save & Publish</>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/products')}
                  disabled={saving || publishing}
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
            
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Product Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={productStatus === 'PUBLISHED' ? 'default' : 'secondary'}>
                    {productStatus}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Variants</span>
                  <span className="font-medium">{variants.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Price</span>
                  <span className="font-medium">${basePrice || '0.00'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      {/* Variant Dialog */}
      <Dialog open={showVariantDialog} onOpenChange={setShowVariantDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Variant</DialogTitle>
            <DialogDescription>
              Create a product variation (e.g., Small/Red, Medium/Blue)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="variantSKU">SKU *</Label>
              <Input
                id="variantSKU"
                value={currentVariant.sku}
                onChange={(e) => setCurrentVariant({ ...currentVariant, sku: e.target.value })}
                placeholder={`${baseSKU}-S-RED`}
                className="mt-1"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="variantOption1">Option 1 (e.g., Size)</Label>
                <Input
                  id="variantOption1"
                  placeholder="Option name"
                  onChange={(e) => {
                    const name = e.target.value
                    if (name) {
                      const newOptions = { ...currentVariant.optionValues }
                      delete newOptions['option1']
                      newOptions[name] = newOptions[name] || ''
                      setCurrentVariant({ ...currentVariant, optionValues: newOptions })
                    }
                  }}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Value</Label>
                <Input
                  placeholder="e.g., Small"
                  onChange={(e) => {
                    const keys = Object.keys(currentVariant.optionValues || {})
                    if (keys.length > 0) {
                      setCurrentVariant({
                        ...currentVariant,
                        optionValues: { ...currentVariant.optionValues, [keys[0]]: e.target.value }
                      })
                    }
                  }}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="variantPrice">Price *</Label>
                <Input
                  id="variantPrice"
                  type="number"
                  step="0.01"
                  value={currentVariant.price}
                  onChange={(e) => setCurrentVariant({ ...currentVariant, price: e.target.value })}
                  placeholder="29.99"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="variantComparePrice">Compare Price</Label>
                <Input
                  id="variantComparePrice"
                  type="number"
                  step="0.01"
                  value={currentVariant.compareAtPrice}
                  onChange={(e) => setCurrentVariant({ ...currentVariant, compareAtPrice: e.target.value })}
                  placeholder="39.99"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVariantDialog(false)}>
              Cancel
            </Button>
            <Button onClick={addVariant}>
              Add Variant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Product Created! Publish to Channels?
            </DialogTitle>
            <DialogDescription>
              Select which stores you want to publish this product to
            </DialogDescription>
          </DialogHeader>
          
          {loadingStores ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2 py-4 max-h-96 overflow-y-auto">
              {stores.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No stores connected</p>
                  <Button variant="link" onClick={() => router.push('/stores')} className="mt-2">
                    Connect a Store
                  </Button>
                </div>
              ) : (
                stores.map(store => (
                  <div
                    key={store.id}
                    className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedStores.includes(store.id)
                        ? 'bg-primary/10 border-primary'
                        : 'bg-card hover:bg-accent/50'
                    }`}
                    onClick={() => {
                      setSelectedStores(prev =>
                        prev.includes(store.id)
                          ? prev.filter(id => id !== store.id)
                          : [...prev, store.id]
                      )
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStores.includes(store.id)}
                      onChange={() => {}}
                      className="h-4 w-4"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{store.storeName}</div>
                      <div className="text-xs text-muted-foreground">{store.platform}</div>
                    </div>
                    {!store.isActive && (
                      <Badge variant="destructive" className="text-xs">Inactive</Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowPublishDialog(false)
              router.push('/products')
            }}>
              Skip for Now
            </Button>
            <Button
              onClick={handlePublish}
              disabled={selectedStores.length === 0 || publishing}
              className="bg-gradient-to-r from-blue-600 to-cyan-600"
            >
              {publishing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Publishing...</>
              ) : (
                <><Send className="h-4 w-4 mr-2" />Publish to {selectedStores.length} Store(s)</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Template Selector Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose a Template</DialogTitle>
            <DialogDescription>
              Select a product template to quickly set up your product
            </DialogDescription>
          </DialogHeader>
          
          {loadingTemplates ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">No templates available</p>
              <Button variant="outline" onClick={() => router.push('/templates')}>
                Create a Template
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => {
                    applyTemplate(template)
                    setShowTemplateDialog(false)
                  }}
                >
                  <CardHeader>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    {template.description && (
                      <CardDescription className="text-sm">
                        {template.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Base Price:</span>
                      <span className="font-medium">${template.basePrice}</span>
                    </div>
                    {template.category && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Category:</span>
                        <Badge variant="outline" className="text-xs">{template.category}</Badge>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.keys(template.variantOptions).map(key => (
                        <Badge key={key} variant="secondary" className="text-xs">
                          {key}: {template.variantOptions[key].length}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}