'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { Plus, Trash2, ShoppingCart, Video, Package, Eye, EyeOff } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface Credential {
  id: string
  platform: 'BIGCOMMERCE' | 'TIKTOK' | 'ETSY'
  label: string | null
  createdAt: string
}

const platformConfig = {
  BIGCOMMERCE: {
    name: 'BigCommerce',
    icon: ShoppingCart,
    color: 'text-blue-600',
    fields: [
      { name: 'storeHash', label: 'Store Hash', type: 'text', placeholder: 'your-store-hash' },
      { name: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'your-access-token' },
      { name: 'clientId', label: 'Client ID', type: 'text', placeholder: 'your-client-id' },
      { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'your-client-secret' },
    ],
  },
  TIKTOK: {
    name: 'TikTok Shop',
    icon: Video,
    color: 'text-pink-600',
    fields: [
      { name: 'appKey', label: 'App Key', type: 'text', placeholder: 'your-app-key' },
      { name: 'appSecret', label: 'App Secret', type: 'password', placeholder: 'your-app-secret' },
      { name: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'your-access-token' },
    ],
  },
  ETSY: {
    name: 'Etsy',
    icon: Package,
    color: 'text-orange-600',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'text', placeholder: 'your-api-key' },
      { name: 'shopId', label: 'Shop ID', type: 'text', placeholder: 'your-shop-id' },
    ],
  },
}

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddingCredential, setIsAddingCredential] = useState(false)
  const [showDialog, setShowDialog] = useState(false)

  // Form state
  const [selectedPlatform, setSelectedPlatform] = useState<keyof typeof platformConfig | ''>('')
  const [label, setLabel] = useState('')
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchCredentials()
  }, [])

  const fetchCredentials = async () => {
    try {
      const response = await fetch('/api/credentials')
      const data = await response.json()
      setCredentials(data.credentials || [])
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load credentials',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddCredential = async () => {
    if (!selectedPlatform) {
      toast({
        title: 'Error',
        description: 'Please select a platform',
        variant: 'destructive',
      })
      return
    }

    const config = platformConfig[selectedPlatform]
    const missingFields = config.fields.filter(field => !formData[field.name])
    
    if (missingFields.length > 0) {
      toast({
        title: 'Error',
        description: `Please fill in all required fields: ${missingFields.map(f => f.label).join(', ')}`,
        variant: 'destructive',
      })
      return
    }

    setIsAddingCredential(true)
    try {
      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: selectedPlatform,
          label,
          credentials: formData,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add credential')
      }

      toast({
        title: 'Success',
        description: 'Credential added successfully',
      })

      // Reset form
      setSelectedPlatform('')
      setLabel('')
      setFormData({})
      setShowDialog(false)
      fetchCredentials()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add credential',
        variant: 'destructive',
      })
    } finally {
      setIsAddingCredential(false)
    }
  }

  const handleDeleteCredential = async (id: string) => {
    if (!confirm('Are you sure you want to delete this credential?')) {
      return
    }

    try {
      const response = await fetch(`/api/credentials/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete credential')
      }

      toast({
        title: 'Success',
        description: 'Credential deleted successfully',
      })

      fetchCredentials()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete credential',
        variant: 'destructive',
      })
    }
  }

  const togglePasswordVisibility = (fieldName: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName],
    }))
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <p>Loading credentials...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">API Credentials</h1>
          <p className="text-muted-foreground">
            Manage your platform API credentials securely
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Credential
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Credential</DialogTitle>
              <DialogDescription>
                Add API credentials for a platform
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="platform">Platform *</Label>
                <Select value={selectedPlatform} onValueChange={(value: any) => {
                  setSelectedPlatform(value)
                  setFormData({})
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(platformConfig).map(([key, config]) => {
                      const Icon = config.icon
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${config.color}`} />
                            <span>{config.name}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="label">Label (optional)</Label>
                <Input
                  id="label"
                  placeholder="My Store 1"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>

              {selectedPlatform && platformConfig[selectedPlatform].fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>{field.label} *</Label>
                  <div className="relative">
                    <Input
                      id={field.name}
                      type={field.type === 'password' && !showPasswords[field.name] ? 'password' : 'text'}
                      placeholder={field.placeholder}
                      value={formData[field.name] || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        [field.name]: e.target.value
                      }))}
                    />
                    {field.type === 'password' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => togglePasswordVisibility(field.name)}
                      >
                        {showPasswords[field.name] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              <Button
                className="w-full"
                onClick={handleAddCredential}
                disabled={isAddingCredential || !selectedPlatform}
              >
                {isAddingCredential ? 'Adding...' : 'Add Credential'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {credentials.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                No credentials added yet. Add your first credential to get started.
              </p>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Credential
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {credentials.map((credential) => {
            const config = platformConfig[credential.platform]
            const Icon = config.icon
            return (
              <Card key={credential.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-6 w-6 ${config.color}`} />
                    <div>
                      <CardTitle className="text-lg">{config.name}</CardTitle>
                      <CardDescription>
                        {credential.label || 'Default credential'}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteCredential(credential.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Added {new Date(credential.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Toaster />
    </div>
  )
}