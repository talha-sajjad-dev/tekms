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
import { SuccessToast } from '@/components/ui/success-toast'
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
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

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
      } else if (settings.length === 0) {
        // Only fetch if we don't have settings yet
        fetchSettings()
      }
    }
  }, [status, session, settings.length])

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
        setSuccessMessage(`${category.charAt(0).toUpperCase() + category.slice(1)} settings saved successfully!`)
        setShowSuccess(true)
        toast({
          title: 'Settings Saved',
          description: `${category} settings have been updated successfully`
        })
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
    <>
      {showSuccess && (
        <SuccessToast
          message={successMessage}
          onClose={() => setShowSuccess(false)}
        />
      )}
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

          {/* Email Settings - Zoho Mail SMTP */}
          <TabsContent value="email" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Email Configuration (Zoho Mail SMTP)</CardTitle>
                <CardDescription>
                  Configure Zoho Mail SMTP for sending transactional emails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_host">SMTP Host</Label>
                  <Input
                    id="smtp_host"
                    value={getSetting('smtp_host')}
                    onChange={(e) => updateSetting('smtp_host', e.target.value)}
                    placeholder="smtp.zoho.com"
                  />
                  <p className="text-xs text-gray-500">
                    Zoho Mail SMTP server (smtp.zoho.com)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp_port">SMTP Port</Label>
                    <Input
                      id="smtp_port"
                      value={getSetting('smtp_port')}
                      onChange={(e) => updateSetting('smtp_port', e.target.value)}
                      placeholder="465"
                    />
                    <p className="text-xs text-gray-500">
                      Use 465 for SSL
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp_secure">Security</Label>
                    <Input
                      id="smtp_secure"
                      value={getSetting('smtp_secure')}
                      onChange={(e) => updateSetting('smtp_secure', e.target.value)}
                      placeholder="true"
                    />
                    <p className="text-xs text-gray-500">
                      true for SSL/TLS
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp_user">SMTP Username (Email)</Label>
                  <Input
                    id="smtp_user"
                    type="email"
                    value={getSetting('smtp_user')}
                    onChange={(e) => updateSetting('smtp_user', e.target.value)}
                    placeholder="noreply@yourdomain.com"
                  />
                  <p className="text-xs text-gray-500">
                    Your Zoho Mail email address
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp_password">SMTP Password (App Password)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="smtp_password"
                      type={showSecrets['smtp_password'] ? 'text' : 'password'}
                      value={getSetting('smtp_password')}
                      onChange={(e) => updateSetting('smtp_password', e.target.value)}
                      placeholder="App-specific password"
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleShowSecret('smtp_password')}
                    >
                      {showSecrets['smtp_password'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Generate app password in Zoho Mail → Settings → Security
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email_from_address">From Email Address</Label>
                  <Input
                    id="email_from_address"
                    type="email"
                    value={getSetting('email_from_address')}
                    onChange={(e) => updateSetting('email_from_address', e.target.value)}
                    placeholder="noreply@tekms.com"
                  />
                  <p className="text-xs text-gray-500">
                    Email address to send from (must match SMTP user)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email_from_name">From Name</Label>
                  <Input
                    id="email_from_name"
                    value={getSetting('email_from_name')}
                    onChange={(e) => updateSetting('email_from_name', e.target.value)}
                    placeholder="TEKMS Listing Manager"
                  />
                  <p className="text-xs text-gray-500">
                    Display name for outgoing emails
                  </p>
                </div>

                <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
                  <p className="text-xs text-blue-900">
                    <strong>Setup Instructions:</strong> Log into Zoho Mail → Settings → Security →
                    Application-Specific Passwords → Generate new password for "TEKMS App"
                  </p>
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
              const clientIdLabel = isEtsy ? 'Keystring (API Key)' : 'Client ID'
              const clientIdPlaceholder = isEtsy ? 'Your Etsy API Key' : 'OAuth Client ID'
              
              return (
                <Card key={platform}>
                  <CardHeader>
                    <CardTitle className="capitalize">{platform} OAuth</CardTitle>
                    <CardDescription>
                      {isEtsy ? 'Etsy API v3 - Only need API Key from developer portal' : `OAuth credentials for ${platform} integration`}
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
                      <p className="text-xs text-gray-500">
                        {isEtsy
                          ? 'From Etsy Developer Portal → Apps → Your App → "Keystring"'
                          : 'OAuth client identifier from provider'
                        }
                      </p>
                    </div>

                    {!isEtsy && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor={`${platform}_client_secret`}>Client Secret</Label>
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
                          <p className="text-xs text-gray-500">
                            OAuth client secret (encrypted in database)
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`${platform}_redirect_uri`}>Redirect URI</Label>
                          <div className="flex gap-2">
                            <Input
                              id={`${platform}_redirect_uri`}
                              value={getSetting(`${platform}_redirect_uri`)}
                              onChange={(e) => updateSetting(`${platform}_redirect_uri`, e.target.value)}
                              placeholder={`https://yourdomain.com/api/auth/callback/${platform}`}
                              className="font-mono text-sm"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const uri = getSetting(`${platform}_redirect_uri`) || `${window.location.origin}/api/auth/callback/${platform}`
                                navigator.clipboard.writeText(uri)
                                toast({
                                  title: "Copied!",
                                  description: "Redirect URI copied to clipboard"
                                })
                              }}
                            >
                              Copy
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500">
                            <strong>Register this exact URL</strong> in your {platform === 'shopify' ? 'Shopify Partners' : platform === 'tiktok' ? 'TikTok Developer' : platform} app → Allowed redirect URI(s)
                          </p>
                          <p className="text-xs text-blue-600">
                            Example: {window.location.origin}/api/auth/callback/{platform}
                          </p>
                        </div>
                      </>
                    )}
                    
                    {isEtsy && (
                      <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-900">
                        <p className="font-semibold mb-1">✓ Etsy OAuth is Simple!</p>
                        <ul className="text-xs space-y-1 mt-2">
                          <li>• Only need your API Keystring above</li>
                          <li>• No client secret (uses PKCE security)</li>
                          <li>• No redirect URI registration in portal</li>
                          <li>• Our app handles everything else automatically</li>
                        </ul>
                      </div>
                    )}
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
    </>
  )
}