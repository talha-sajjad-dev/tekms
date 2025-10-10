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
import { Plus, Trash2, ShoppingCart, Video, Package, Eye, EyeOff, ExternalLink, HelpCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

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
    guide: {
      title: 'Where to find BigCommerce credentials',
      steps: [
        'Log in to your BigCommerce store',
        'Go to Advanced Settings → API Accounts',
        'Click "Create API Account"',
        'Select "Create V2/V3 API Token"',
        'Set OAuth Scopes (read/write permissions)',
        'Click "Save" to generate your credentials'
      ],
      notes: [
        'Store Hash: Found in your store URL (store-xxxxx.mybigcommerce.com)',
        'Access Token: Generated when you create the API account',
        'Client ID & Secret: Provided after creating the API account'
      ],
      link: 'https://support.bigcommerce.com/s/article/Store-API-Accounts'
    }
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
    guide: {
      title: 'Where to find TikTok Shop credentials',
      steps: [
        'Go to TikTok Shop Seller Center',
        'Navigate to Settings → Open Platform',
        'Click "Create App" or select existing app',
        'Copy the App Key and App Secret',
        'Click "Generate Access Token"',
        'Authorize the required permissions'
      ],
      notes: [
        'App Key: Found in your app details',
        'App Secret: Displayed when creating the app (save it securely)',
        'Access Token: Generate from the authorization flow'
      ],
      link: 'https://seller-us.tiktok.com/university/essay?knowledge_id=6867891914828058374'
    }
  },
  ETSY: {
    name: 'Etsy',
    icon: Package,
    color: 'text-orange-600',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'text', placeholder: 'your-api-key' },
      { name: 'shopId', label: 'Shop ID', type: 'text', placeholder: 'your-shop-id' },
    ],
    guide: {
      title: 'Where to find Etsy credentials',
      steps: [
        'Go to Etsy Developers portal',
        'Sign in with your Etsy account',
        'Click "Apps" → "New App"',
        'Fill in app details and submit',
        'Once approved, get your API Key (Keystring)',
        'Find your Shop ID in your shop\'s URL or API response'
      ],
      notes: [
        'API Key: Found in your app details page',
        'Shop ID: Numeric ID from your shop URL or use the findAllShops API'
      ],
      link: 'https://www.etsy.com/developers/documentation/getting_started/register'
    }
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

              {selectedPlatform && (
                <>
                  <Alert>
                    <HelpCircle className="h-4 w-4" />
                    <AlertTitle>Need help finding your credentials?</AlertTitle>
                    <AlertDescription>
                      <Accordion type="single" collapsible className="w-full mt-2">
                        <AccordionItem value="guide" className="border-0">
                          <AccordionTrigger className="text-sm py-2">
                            View setup guide
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3 text-sm">
                              <div>
                                <p className="font-semibold mb-2">{platformConfig[selectedPlatform].guide.title}</p>
                                <ol className="list-decimal list-inside space-y-1">
                                  {platformConfig[selectedPlatform].guide.steps.map((step, i) => (
                                    <li key={i} className="text-muted-foreground">{step}</li>
                                  ))}
                                </ol>
                              </div>
                              <div className="bg-muted p-3 rounded-md">
                                <p className="font-semibold mb-1">Important Notes:</p>
                                <ul className="space-y-1">
                                  {platformConfig[selectedPlatform].guide.notes.map((note, i) => (
                                    <li key={i} className="text-muted-foreground text-xs">• {note}</li>
                                  ))}
                                </ul>
                              </div>
                              <a
                                href={platformConfig[selectedPlatform].guide.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-primary hover:underline text-sm"
                              >
                                Official Documentation
                                <ExternalLink className="ml-1 h-3 w-3" />
                              </a>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </AlertDescription>
                  </Alert>

                  {platformConfig[selectedPlatform].fields.map((field) => (
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
                </>
              )}

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