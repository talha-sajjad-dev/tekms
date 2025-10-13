"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { 
  ArrowLeft, 
  Save, 
  Upload, 
  Globe, 
  Image as ImageIcon,
  FileText,
  Link as LinkIcon,
  Search,
  Settings as SettingsIcon
} from "lucide-react"

interface Setting {
  key: string
  value: string
  category: string
}

export default function WebsiteSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Record<string, string>>({})

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    } else if (status === "authenticated") {
      // Check if user is admin
      if (session?.user?.role !== "ADMIN") {
        toast({
          title: "Access Denied",
          description: "Only administrators can access website settings",
          variant: "destructive"
        })
        router.push("/dashboard")
        return
      }
      fetchSettings()
    }
  }, [status])

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings?asObject=true")
      const data = await res.json()
      
      if (res.ok) {
        setSettings(data.settings || {})
      } else {
        toast({
          title: "Error",
          description: "Failed to load settings",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        key,
        value
      }))

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: settingsArray })
      })

      const data = await res.json()

      if (res.ok) {
        toast({
          title: "Success!",
          description: `Updated ${data.successCount} settings successfully`
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to save settings",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push("/admin")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <SettingsIcon className="h-6 w-6" />
                  Website Settings
                </h1>
                <p className="text-sm text-muted-foreground">
                  Manage your website branding, content, and configuration
                </p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save All Changes"}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Tabs defaultValue="branding" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="branding">
              <Globe className="h-4 w-4 mr-2" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="icons">
              <ImageIcon className="h-4 w-4 mr-2" />
              Platform Icons
            </TabsTrigger>
            <TabsTrigger value="pages">
              <FileText className="h-4 w-4 mr-2" />
              Pages
            </TabsTrigger>
            <TabsTrigger value="footer">
              <LinkIcon className="h-4 w-4 mr-2" />
              Footer
            </TabsTrigger>
            <TabsTrigger value="seo">
              <Search className="h-4 w-4 mr-2" />
              SEO
            </TabsTrigger>
            <TabsTrigger value="general">
              <SettingsIcon className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
          </TabsList>

          {/* Branding Tab */}
          <TabsContent value="branding">
            <Card>
              <CardHeader>
                <CardTitle>Website Branding</CardTitle>
                <CardDescription>
                  Configure your website's name, logo, and visual identity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="website-name">Website Name</Label>
                  <Input
                    id="website-name"
                    value={settings['website.name'] || ''}
                    onChange={(e) => updateSetting('website.name', e.target.value)}
                    placeholder="TEKMS Listing Manager"
                  />
                  <p className="text-xs text-muted-foreground">
                    Displayed in browser title and header
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="header-title">Header Title</Label>
                  <Input
                    id="header-title"
                    value={settings['website.header_title'] || ''}
                    onChange={(e) => updateSetting('website.header_title', e.target.value)}
                    placeholder="Multi-Platform Product Manager"
                  />
                  <p className="text-xs text-muted-foreground">
                    Shown in navigation bar
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={settings['website.tagline'] || ''}
                    onChange={(e) => updateSetting('website.tagline', e.target.value)}
                    placeholder="Manage products across multiple platforms"
                  />
                  <p className="text-xs text-muted-foreground">
                    Subtitle or slogan for your website
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo-url">Website Logo URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="logo-url"
                      value={settings['website.logo_url'] || ''}
                      onChange={(e) => updateSetting('website.logo_url', e.target.value)}
                      placeholder="/logo.png"
                    />
                    <Button variant="outline" disabled>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                  {settings['website.logo_url'] && (
                    <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                      <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                      <img 
                        src={settings['website.logo_url']} 
                        alt="Logo preview" 
                        className="h-12 object-contain"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-logo.svg'
                        }}
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Upload feature coming soon. For now, enter URL of logo file in /public folder
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="favicon-url">Favicon URL</Label>
                  <Input
                    id="favicon-url"
                    value={settings['website.favicon_url'] || ''}
                    onChange={(e) => updateSetting('website.favicon_url', e.target.value)}
                    placeholder="/favicon.ico"
                  />
                  <p className="text-xs text-muted-foreground">
                    Browser tab icon (16x16 or 32x32 pixels)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Platform Icons Tab */}
          <TabsContent value="icons">
            <Card>
              <CardHeader>
                <CardTitle>Platform Icons</CardTitle>
                <CardDescription>
                  Customize the icons shown in store connector
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>BigCommerce Icon</Label>
                    <Textarea
                      value={settings['platform.bigcommerce_icon'] || ''}
                      onChange={(e) => updateSetting('platform.bigcommerce_icon', e.target.value)}
                      placeholder='<svg viewBox="0 0 24 24">...</svg>'
                      rows={4}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Paste SVG code or leave empty for default
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Shopify Icon</Label>
                    <Textarea
                      value={settings['platform.shopify_icon'] || ''}
                      onChange={(e) => updateSetting('platform.shopify_icon', e.target.value)}
                      placeholder='<svg viewBox="0 0 24 24">...</svg>'
                      rows={4}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Paste SVG code or leave empty for default
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Etsy Icon</Label>
                    <Textarea
                      value={settings['platform.etsy_icon'] || ''}
                      onChange={(e) => updateSetting('platform.etsy_icon', e.target.value)}
                      placeholder='<svg viewBox="0 0 24 24">...</svg>'
                      rows={4}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Paste SVG code or leave empty for default
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>TikTok Icon</Label>
                    <Textarea
                      value={settings['platform.tiktok_icon'] || ''}
                      onChange={(e) => updateSetting('platform.tiktok_icon', e.target.value)}
                      placeholder='<svg viewBox="0 0 24 24">...</svg>'
                      rows={4}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Paste SVG code or leave empty for default
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Tip:</strong> Use SVG format for best quality. Find free icons at{" "}
                    <a href="https://heroicons.com" target="_blank" className="underline">Heroicons</a>
                    {" "}or{" "}
                    <a href="https://lucide.dev" target="_blank" className="underline">Lucide</a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pages Tab */}
          <TabsContent value="pages">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Homepage</CardTitle>
                  <CardDescription>Configure homepage content</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="homepage-hero">Hero Title</Label>
                    <Input
                      id="homepage-hero"
                      value={settings['page.homepage_hero'] || ''}
                      onChange={(e) => updateSetting('page.homepage_hero', e.target.value)}
                      placeholder="Welcome to TEKMS"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="homepage-desc">Hero Description</Label>
                    <Textarea
                      id="homepage-desc"
                      value={settings['page.homepage_description'] || ''}
                      onChange={(e) => updateSetting('page.homepage_description', e.target.value)}
                      placeholder="Manage your products across multiple platforms"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Content Pages</CardTitle>
                  <CardDescription>Manage about, contact, and legal pages</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="about-content">About Page Content</Label>
                    <Textarea
                      id="about-content"
                      value={settings['page.about_content'] || ''}
                      onChange={(e) => updateSetting('page.about_content', e.target.value)}
                      placeholder="Tell your story..."
                      rows={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      Basic HTML supported. Rich text editor coming soon.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-info">Contact Information</Label>
                    <Textarea
                      id="contact-info"
                      value={settings['page.contact_info'] || ''}
                      onChange={(e) => updateSetting('page.contact_info', e.target.value)}
                      placeholder="Email: support@example.com&#10;Phone: (555) 123-4567"
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Footer Tab */}
          <TabsContent value="footer">
            <Card>
              <CardHeader>
                <CardTitle>Footer Settings</CardTitle>
                <CardDescription>Configure footer content and social links</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="footer-copyright">Copyright Text</Label>
                  <Input
                    id="footer-copyright"
                    value={settings['footer.copyright_text'] || ''}
                    onChange={(e) => updateSetting('footer.copyright_text', e.target.value)}
                    placeholder={`© ${new Date().getFullYear()} TEKMS. All rights reserved.`}
                  />
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Social Media Links</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="social-twitter">Twitter/X URL</Label>
                      <Input
                        id="social-twitter"
                        value={settings['footer.social_twitter'] || ''}
                        onChange={(e) => updateSetting('footer.social_twitter', e.target.value)}
                        placeholder="https://twitter.com/yourhandle"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="social-facebook">Facebook URL</Label>
                      <Input
                        id="social-facebook"
                        value={settings['footer.social_facebook'] || ''}
                        onChange={(e) => updateSetting('footer.social_facebook', e.target.value)}
                        placeholder="https://facebook.com/yourpage"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="social-linkedin">LinkedIn URL</Label>
                      <Input
                        id="social-linkedin"
                        value={settings['footer.social_linkedin'] || ''}
                        onChange={(e) => updateSetting('footer.social_linkedin', e.target.value)}
                        placeholder="https://linkedin.com/company/yourcompany"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="social-instagram">Instagram URL</Label>
                      <Input
                        id="social-instagram"
                        value={settings['footer.social_instagram'] || ''}
                        onChange={(e) => updateSetting('footer.social_instagram', e.target.value)}
                        placeholder="https://instagram.com/yourhandle"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SEO Tab */}
          <TabsContent value="seo">
            <Card>
              <CardHeader>
                <CardTitle>SEO & Meta Tags</CardTitle>
                <CardDescription>
                  Optimize your website for search engines
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="meta-description">Meta Description</Label>
                  <Textarea
                    id="meta-description"
                    value={settings['seo.meta_description'] || ''}
                    onChange={(e) => updateSetting('seo.meta_description', e.target.value)}
                    placeholder="Manage your products across multiple e-commerce platforms from one dashboard"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    155-160 characters recommended for Google search results
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meta-keywords">Meta Keywords</Label>
                  <Input
                    id="meta-keywords"
                    value={settings['seo.meta_keywords'] || ''}
                    onChange={(e) => updateSetting('seo.meta_keywords', e.target.value)}
                    placeholder="product management, e-commerce, multi-platform"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated keywords
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="og-image">Open Graph Image URL</Label>
                  <Input
                    id="og-image"
                    value={settings['seo.og_image_url'] || ''}
                    onChange={(e) => updateSetting('seo.og_image_url', e.target.value)}
                    placeholder="/og-image.png"
                  />
                  <p className="text-xs text-muted-foreground">
                    Image shown when shared on social media (1200x630px recommended)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* General Tab */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Integrations and advanced configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="ga-id">Google Analytics ID</Label>
                  <Input
                    id="ga-id"
                    value={settings['general.google_analytics_id'] || ''}
                    onChange={(e) => updateSetting('general.google_analytics_id', e.target.value)}
                    placeholder="G-XXXXXXXXXX or UA-XXXXXXXXX-X"
                  />
                  <p className="text-xs text-muted-foreground">
                    Google Analytics tracking ID (optional)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom-css">Custom CSS</Label>
                  <Textarea
                    id="custom-css"
                    value={settings['general.custom_css'] || ''}
                    onChange={(e) => updateSetting('general.custom_css', e.target.value)}
                    placeholder=".my-class { color: blue; }"
                    rows={6}
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    Custom CSS to add to all pages
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-900">
                    <strong>⚠️ Advanced:</strong> Custom CSS can affect site styling. Test changes carefully.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sticky Save Button */}
        <div className="fixed bottom-6 right-6">
          <Button 
            size="lg" 
            onClick={handleSave} 
            disabled={saving}
            className="shadow-lg bg-gradient-to-r from-blue-600 to-cyan-600"
          >
            <Save className="h-5 w-5 mr-2" />
            {saving ? "Saving..." : "Save All Changes"}
          </Button>
        </div>
      </div>
    </div>
  )
}