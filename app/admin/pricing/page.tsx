'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { 
  DollarSign, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  ArrowLeft,
  TrendingUp,
  Package
} from 'lucide-react'

interface PricingTier {
  id: string
  name: string
  minProducts: number
  maxProducts: number
  monthlyPrice: string
  yearlyPrice: string | null
  stripePriceId: string | null
  stripeYearlyPriceId: string | null
  features: string[]
  isActive: boolean
  displayOrder: number
  description: string | null
}

export default function AdminPricingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [tiers, setTiers] = useState<PricingTier[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null)
  const [showForm, setShowForm] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    minProducts: 0,
    maxProducts: 100,
    monthlyPrice: '10.00',
    yearlyPrice: '',
    stripePriceId: '',
    stripeYearlyPriceId: '',
    features: [] as string[],
    featuresText: '',
    isActive: true,
    displayOrder: 0,
    description: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    } else if (status === 'authenticated') {
      if (session?.user?.role !== 'ADMIN') {
        router.push('/dashboard')
      } else {
        fetchTiers()
      }
    }
  }, [status, session])

  const fetchTiers = async () => {
    try {
      const res = await fetch('/api/admin/pricing')
      const data = await res.json()
      
      if (res.ok) {
        setTiers(data.tiers || [])
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch pricing tiers',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch pricing tiers',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const features = formData.featuresText
        .split('\n')
        .filter(f => f.trim())
        .map(f => f.trim())

      const payload = {
        name: formData.name,
        minProducts: parseInt(formData.minProducts.toString()),
        maxProducts: parseInt(formData.maxProducts.toString()),
        monthlyPrice: formData.monthlyPrice,
        yearlyPrice: formData.yearlyPrice || null,
        stripePriceId: formData.stripePriceId || null,
        stripeYearlyPriceId: formData.stripeYearlyPriceId || null,
        features,
        isActive: formData.isActive,
        displayOrder: parseInt(formData.displayOrder.toString()),
        description: formData.description || null
      }

      const url = editingTier 
        ? `/api/admin/pricing/${editingTier.id}`
        : '/api/admin/pricing'
      
      const res = await fetch(url, {
        method: editingTier ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        toast({
          title: 'Success',
          description: `Pricing tier ${editingTier ? 'updated' : 'created'} successfully`
        })
        setShowForm(false)
        setEditingTier(null)
        fetchTiers()
        resetForm()
      } else {
        const data = await res.json()
        toast({
          title: 'Error',
          description: data.error || 'Failed to save pricing tier',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save pricing tier',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (tier: PricingTier) => {
    setEditingTier(tier)
    setFormData({
      name: tier.name,
      minProducts: tier.minProducts,
      maxProducts: tier.maxProducts,
      monthlyPrice: tier.monthlyPrice,
      yearlyPrice: tier.yearlyPrice || '',
      stripePriceId: tier.stripePriceId || '',
      stripeYearlyPriceId: tier.stripeYearlyPriceId || '',
      features: tier.features,
      featuresText: tier.features.join('\n'),
      isActive: tier.isActive,
      displayOrder: tier.displayOrder,
      description: tier.description || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pricing tier?')) return
    
    try {
      const res = await fetch(`/api/admin/pricing/${id}`, {
        method: 'DELETE'
      })

      const data = await res.json()

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Pricing tier deleted successfully'
        })
        fetchTiers()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete pricing tier',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete pricing tier',
        variant: 'destructive'
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      minProducts: 0,
      maxProducts: 100,
      monthlyPrice: '10.00',
      yearlyPrice: '',
      stripePriceId: '',
      stripeYearlyPriceId: '',
      features: [],
      featuresText: '',
      isActive: true,
      displayOrder: 0,
      description: ''
    })
  }

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div>
                  <h1 className="text-2xl font-bold">Pricing Tier Management</h1>
                  <p className="text-sm text-muted-foreground">
                    Manage per-store subscription pricing
                  </p>
                </div>
              </div>
            </div>
            <Button onClick={() => { setShowForm(true); setEditingTier(null); resetForm() }}>
              <Plus className="h-4 w-4 mr-2" />
              New Tier
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {!showForm ? (
          /* List View */
          <div className="grid gap-4">
            {tiers.map((tier) => (
              <Card key={tier.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{tier.name}</h3>
                        {tier.isActive ? (
                          <Badge variant="default" className="bg-green-600">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Product Range</p>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-blue-600" />
                            <p className="font-medium">
                              {tier.minProducts} - {tier.maxProducts === -1 ? 'Unlimited' : tier.maxProducts} products
                            </p>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Pricing</p>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <p className="font-medium">
                              ${tier.monthlyPrice}/month
                              {tier.yearlyPrice && (
                                <span className="text-sm text-muted-foreground ml-2">
                                  (${tier.yearlyPrice}/year)
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {tier.description && (
                        <p className="text-sm text-muted-foreground mt-3">{tier.description}</p>
                      )}

                      {tier.features.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium mb-1">Features:</p>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {tier.features.slice(0, 3).map((feature, idx) => (
                              <li key={idx}>✓ {feature}</li>
                            ))}
                            {tier.features.length > 3 && (
                              <li className="text-xs">+ {tier.features.length - 3} more...</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(tier)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(tier.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {tiers.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No pricing tiers yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first pricing tier to get started</p>
                  <Button onClick={() => { setShowForm(true); resetForm() }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Tier
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* Edit Form */
          <Card>
            <CardHeader>
              <CardTitle>{editingTier ? 'Edit Pricing Tier' : 'Create New Pricing Tier'}</CardTitle>
              <CardDescription>
                Configure per-store subscription pricing based on product count
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tier Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Starter, Growth, Pro"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="displayOrder">Display Order</Label>
                  <Input
                    id="displayOrder"
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this tier"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minProducts">Minimum Products</Label>
                  <Input
                    id="minProducts"
                    type="number"
                    value={formData.minProducts}
                    onChange={(e) => setFormData({ ...formData, minProducts: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxProducts">Maximum Products</Label>
                  <Input
                    id="maxProducts"
                    type="number"
                    value={formData.maxProducts}
                    onChange={(e) => setFormData({ ...formData, maxProducts: parseInt(e.target.value) || 0 })}
                    placeholder="100 (-1 for unlimited)"
                  />
                  <p className="text-xs text-muted-foreground">Use -1 for unlimited</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlyPrice">Monthly Price ($)</Label>
                  <Input
                    id="monthlyPrice"
                    type="number"
                    step="0.01"
                    value={formData.monthlyPrice}
                    onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
                    placeholder="10.00"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="yearlyPrice">Yearly Price ($) - Optional</Label>
                  <Input
                    id="yearlyPrice"
                    type="number"
                    step="0.01"
                    value={formData.yearlyPrice}
                    onChange={(e) => setFormData({ ...formData, yearlyPrice: e.target.value })}
                    placeholder="100.00"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stripePriceId">Stripe Price ID (Monthly)</Label>
                  <Input
                    id="stripePriceId"
                    value={formData.stripePriceId}
                    onChange={(e) => setFormData({ ...formData, stripePriceId: e.target.value })}
                    placeholder="price_..."
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">From Stripe Dashboard</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="stripeYearlyPriceId">Stripe Price ID (Yearly) - Optional</Label>
                  <Input
                    id="stripeYearlyPriceId"
                    value={formData.stripeYearlyPriceId}
                    onChange={(e) => setFormData({ ...formData, stripeYearlyPriceId: e.target.value })}
                    placeholder="price_..."
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="features">Features (one per line)</Label>
                <Textarea
                  id="features"
                  value={formData.featuresText}
                  onChange={(e) => setFormData({ ...formData, featuresText: e.target.value })}
                  placeholder="Multi-platform sync&#10;Priority support&#10;Advanced analytics"
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">Each line will be a separate feature</p>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label>Active (visible to users)</Label>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t">
                <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-blue-600 to-cyan-600">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Tier'}
                </Button>
                <Button variant="ghost" onClick={() => { setShowForm(false); setEditingTier(null); resetForm() }}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}