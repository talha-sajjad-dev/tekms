'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  Settings, 
  Key, 
  Mail, 
  Bot, 
  Store, 
  Save,
  Eye,
  EyeOff,
  ArrowLeft,
  Shield,
  CheckCircle2
} from 'lucide-react'

interface Setting {
  key: string
  value: string
  category: string
  description?: string
  type: string
  isPublic: boolean
}

export default function AdminSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Setting[]>([])
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    } else if (status === 'authenticated') {
      if (session?.user?.role !== 'ADMIN') {
        toast({
          title: 'Access Denied',
          description: 'You must be an admin to access this page',
          variant: 'destructive'
        })
        router.push('/dashboard')
      } else {
        fetchSettings()
      }
    }
  }, [status, session])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings')
      const data = await res.json()
      
      if (res.ok) {
        setSettings(data.settings || [])
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch settings',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch settings',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (category: string) => {
    setSaving(true)
    try {
      const categorySettings = settings.filter(s => s.category === category)
      
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: categorySettings })
      })

      const data = await res.json()

      if (res.ok) {
        toast({
          title: 'Settings Saved',
          description: `${category} settings have been updated successfully`
        })
        // Don't refetch immediately - settings are already updated in local state
        // This prevents the "disappearing" issue where refetch happens too quickly
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to save settings',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => prev.map(s => 
      s.key === key ? { ...s, value } : s
    ))
  }

  const getSetting = (key: string) => {
    return settings.find(s => s.key === key)?.value || ''
  }

  const isSensitive = (key: string) => {
    return /key|secret|token|password|api/i.test(key)
  }

  const toggleShowSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }))
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
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="h-8 w-8 text-orange-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
                  <p className="text-sm text-gray-600">
                    Configure API keys and integrations
                  </p>
                </div>
              </div>
            </div>
            <Badge variant="outline" className="border-orange-200 text-orange-600">
              Admin Only
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Tabs defaultValue="stripe" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white">
            <TabsTrigger value="stripe" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Stripe
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              AI
            </TabsTrigger>
            <TabsTrigger value="oauth" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              OAuth
            </TabsTrigger>
            <TabsTrigger value="app" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              App
            </TabsTrigger>
          </TabsList>

          {/* Stripe Settings */}
          <TabsContent value="stripe" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Stripe Configuration</CardTitle>
                <CardDescription>
                  Configure your Stripe API keys for payment processing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="stripe_secret_key">Secret Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="stripe_secret_key"
                      type={showSecrets['stripe_secret_key'] ? 'text' : 'password'}
                      value={getSetting('stripe_secret_key')}
                      onChange={(e) => updateSetting('stripe_secret_key', e.target.value)}
                      placeholder="sk_live_..."
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleShowSecret('stripe_secret_key')}
                    >
                      {showSecrets['stripe_secret_key'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Your Stripe secret key (encrypted in database)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stripe_publishable_key">Publishable Key</Label>
                  <Input
                    id="stripe_publishable_key"
                    value={getSetting('stripe_publishable_key')}
                    onChange={(e) => updateSetting('stripe_publishable_key', e.target.value)}
                    placeholder="pk_live_..."
                    className="font-mono"
                  />
                  <p className="text-xs text-gray-500">
                    Your Stripe publishable key (safe to expose)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stripe_webhook_secret">Webhook Secret</Label>
                  <div className="flex gap-2">
                    <Input
                      id="stripe_webhook_secret"
                      type={showSecrets['stripe_webhook_secret'] ? 'text' : 'password'}
                      value={getSetting('stripe_webhook_secret')}
                      onChange={(e) => updateSetting('stripe_webhook_secret', e.target.value)}
                      placeholder="whsec_..."
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleShowSecret('stripe_webhook_secret')}
                    >
                      {showSecrets['stripe_webhook_secret'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Webhook signing secret from Stripe dashboard
                  </p>
                </div>

                <Button 
                  onClick={() => handleSave('stripe')} 
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Stripe Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Settings */}
          <TabsContent value="email" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Email Configuration</CardTitle>
                <CardDescription>
                  Configure your email service provider
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email_provider">Provider</Label>
                  <Input
                    id="email_provider"
                    value={getSetting('email_provider')}
                    onChange={(e) => updateSetting('email_provider', e.target.value)}
                    placeholder="resend"
                  />
                  <p className="text-xs text-gray-500">
                    Email service provider (resend, sendgrid, etc.)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email_api_key">API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="email_api_key"
                      type={showSecrets['email_api_key'] ? 'text' : 'password'}
                      value={getSetting('email_api_key')}
                      onChange={(e) => updateSetting('email_api_key', e.target.value)}
                      placeholder="re_..."
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleShowSecret('email_api_key')}
                    >
                      {showSecrets['email_api_key'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email_from_address">From Address</Label>
                  <Input
                    id="email_from_address"
                    type="email"
                    value={getSetting('email_from_address')}
                    onChange={(e) => updateSetting('email_from_address', e.target.value)}
                    placeholder="noreply@tekms.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email_from_name">From Name</Label>
                  <Input
                    id="email_from_name"
                    value={getSetting('email_from_name')}
                    onChange={(e) => updateSetting('email_from_name', e.target.value)}
                    placeholder="TEKMS Listing Manager"
                  />
                </div>

                <Button 
                  onClick={() => handleSave('email')} 
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Email Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Settings */}
          <TabsContent value="ai" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>AI Integration</CardTitle>
                <CardDescription>
                  Configure AI provider for content generation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ai_provider">Provider</Label>
                  <Input
                    id="ai_provider"
                    value={getSetting('ai_provider')}
                    onChange={(e) => updateSetting('ai_provider', e.target.value)}
                    placeholder="openai"
                  />
                  <p className="text-xs text-gray-500">
                    AI provider (openai, anthropic, etc.)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai_api_key">API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="ai_api_key"
                      type={showSecrets['ai_api_key'] ? 'text' : 'password'}
                      value={getSetting('ai_api_key')}
                      onChange={(e) => updateSetting('ai_api_key', e.target.value)}
                      placeholder="sk-..."
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleShowSecret('ai_api_key')}
                    >
                      {showSecrets['ai_api_key'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai_model">Model</Label>
                  <Input
                    id="ai_model"
                    value={getSetting('ai_model')}
                    onChange={(e) => updateSetting('ai_model', e.target.value)}
                    placeholder="gpt-4"
                  />
                  <p className="text-xs text-gray-500">
                    AI model to use (gpt-4, claude-3, etc.)
                  </p>
                </div>

                <Button 
                  onClick={() => handleSave('ai')} 
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save AI Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* OAuth Settings */}
          <TabsContent value="oauth" className="space-y-4">
            {['shopify', 'etsy', 'bigcommerce', 'tiktok'].map((platform) => {
              const isEtsy = platform === 'etsy'
              const clientIdLabel = isEtsy ? 'Keystring' : 'Client ID'
              const clientSecretLabel = isEtsy ? 'Shared Secret' : 'Client Secret'
              const clientIdPlaceholder = isEtsy ? 'Your Etsy Keystring' : 'OAuth Client ID'
              
              return (
                <Card key={platform}>
                  <CardHeader>
                    <CardTitle className="capitalize">{platform} OAuth</CardTitle>
                    <CardDescription>
                      {isEtsy ? 'Etsy API v3 credentials' : `OAuth credentials for ${platform} integration`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`${platform}_client_id`}>{clientIdLabel}</Label>
                      <Input
                        id={`${platform}_client_id`}
                        value={getSetting(`${platform}_client_id`)}
                        onChange={(e) => updateSetting(`${platform}_client_id`, e.target.value)}
                        placeholder={clientIdPlaceholder}
                        className="font-mono"
                      />
                      {isEtsy && (
                        <p className="text-xs text-gray-500">
                          From Etsy Developer Portal → Apps → Your App
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${platform}_client_secret`}>{clientSecretLabel}</Label>
                      <div className="flex gap-2">
                        <Input
                          id={`${platform}_client_secret`}
                          type={showSecrets[`${platform}_client_secret`] ? 'text' : 'password'}
                          value={getSetting(`${platform}_client_secret`)}
                          onChange={(e) => updateSetting(`${platform}_client_secret`, e.target.value)}
                          placeholder="..."
                          className="font-mono"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => toggleShowSecret(`${platform}_client_secret`)}
                        >
                          {showSecrets[`${platform}_client_secret`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${platform}_redirect_uri`}>Redirect URI</Label>
                      <Input
                        id={`${platform}_redirect_uri`}
                        value={getSetting(`${platform}_redirect_uri`)}
                        onChange={(e) => updateSetting(`${platform}_redirect_uri`, e.target.value)}
                        placeholder={`https://yourdomain.com/api/auth/callback/${platform}`}
                      />
                      <p className="text-xs text-gray-500">
                        Copy this URL to your {platform} app configuration
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            <Button
              onClick={() => handleSave('oauth')}
              disabled={saving}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save OAuth Settings'}
            </Button>
          </TabsContent>

          {/* App Settings */}
          <TabsContent value="app" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Application Settings</CardTitle>
                <CardDescription>
                  General application configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="app_name">Application Name</Label>
                  <Input
                    id="app_name"
                    value={getSetting('app_name')}
                    onChange={(e) => updateSetting('app_name', e.target.value)}
                    placeholder="TEKMS Listing Manager"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="app_url">Application URL</Label>
                  <Input
                    id="app_url"
                    value={getSetting('app_url')}
                    onChange={(e) => updateSetting('app_url', e.target.value)}
                    placeholder="https://yourdomain.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="support_email">Support Email</Label>
                  <Input
                    id="support_email"
                    type="email"
                    value={getSetting('support_email')}
                    onChange={(e) => updateSetting('support_email', e.target.value)}
                    placeholder="support@tekms.com"
                  />
                </div>

                <Button 
                  onClick={() => handleSave('app')} 
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save App Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}