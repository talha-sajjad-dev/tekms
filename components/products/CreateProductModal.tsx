"use client"

import { useState } from 'react'
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
import { Package, Plus, X, Save, Send, Loader2 } from 'lucide-react'

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

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateProductModal({ open, onOpenChange, onSuccess }: Props) {
  const { toast } = useToast()
  
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
  
  const generateSKU = () => {
    const sku = title
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 20)
    setBaseSKU(sku || 'PRODUCT-001')
  }
  
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
  
  const removeVariant = (id: string) => {
    setVariants(variants.filter(v => v.id !== id))
    toast({ title: 'Variant Removed' })
  }
  
  const handleSave = async (publishAfter = false) => {
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
          await loadStores()
          setShowPublishDialog(true)
        } else {
          resetForm()
          onOpenChange(false)
          onSuccess?.()
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
  
  const loadStores = async () => {
    setLoadingStores(true)
    try {
      const response = await fetch('/api/stores')
      const data = await response.json()
      
      if (response.ok) {
        setStores(data.stores || [])
        setSelectedStores((data.stores || []).filter((s: Store) => s.isActive).map((s: Store) => s.id))
      }
    } catch (error) {
      console.error('Error loading stores:', error)
    } finally {
      setLoadingStores(false)
    }
  }
  
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
        resetForm()
        onOpenChange(false)
        onSuccess?.()
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
  
  const resetForm = () => {
    setTitle('')
    setDescription('')
    setBaseSKU('')
    setBasePrice('')
    setCompareAtPrice('')
    setCategory('')
    setTags('')
    setProductStatus('DRAFT')
    setVariants([])
  }
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Create New Product
            </DialogTitle>
            <DialogDescription>
              Create once, publish to multiple platforms
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
            {/* Left Column - Main Form */}
            <div className="lg:col-span-2 space-y-4">
              {/* Basic Info */}
              <div className="space-y-3">
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
                    rows={3}
                    className="mt-1"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
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
                
                <div className="grid grid-cols-2 gap-3">
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
              </div>
              
              {/* Variants */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Variants</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => setShowVariantDialog(true)}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {variants.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No variants yet</p>
                  ) : (
                    <div className="space-y-2">
                      {variants.map((variant) => (
                        <div
                          key={variant.id}
                          className="flex items-center gap-2 p-2 rounded border text-sm"
                        >
                          <div className="flex-1 font-mono">{variant.sku}</div>
                          <Badge variant="secondary">${variant.price}</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeVariant(variant.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Right Column - Actions */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    className="w-full"
                    onClick={() => handleSave(false)}
                    disabled={saving || publishing}
                    size="sm"
                  >
                    {saving ? (
                      <><Loader2 className="h-3 w-3 mr-2 animate-spin" />Saving...</>
                    ) : (
                      <><Save className="h-3 w-3 mr-2" />Save as Draft</>
                    )}
                  </Button>
                  
                  <Button
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600"
                    onClick={() => handleSave(true)}
                    disabled={saving || publishing}
                    size="sm"
                  >
                    {saving ? (
                      <><Loader2 className="h-3 w-3 mr-2 animate-spin" />Creating...</>
                    ) : (
                      <><Send className="h-3 w-3 mr-2" />Save & Publish</>
                    )}
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={productStatus === 'PUBLISHED' ? 'default' : 'secondary'} className="text-xs">
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
        </DialogContent>
      </Dialog>
      
      {/* Variant Dialog */}
      <Dialog open={showVariantDialog} onOpenChange={setShowVariantDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Variant</DialogTitle>
            <DialogDescription>Create a product variation</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
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
            
            <div className="grid grid-cols-2 gap-3">
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
            <Button onClick={addVariant}>Add Variant</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Publish to Channels</DialogTitle>
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
                <p className="text-center py-8 text-muted-foreground">No stores connected</p>
              ) : (
                stores.map(store => (
                  <div
                    key={store.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                      selectedStores.includes(store.id)
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-accent'
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
              resetForm()
              onOpenChange(false)
              onSuccess?.()
            }}>
              Skip
            </Button>
            <Button
              onClick={handlePublish}
              disabled={selectedStores.length === 0 || publishing}
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
    </>
  )
}