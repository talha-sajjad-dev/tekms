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
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { SuccessToast } from "@/components/ui/success-toast"
import { ImageUpload } from "@/components/admin/ImageUpload"
import {
  ArrowLeft,
  Save,
  Globe,
  Image as ImageIcon,
  FileText,
  Link as LinkIcon,
  Search,
  Settings as SettingsIcon,
  Plus,
  Edit,
  Trash2,
  Eye
} from "lucide-react"

interface Setting {
  key: string
  value: string
  category: string
}

interface Page {
  id: string
  slug: string
  title: string
  content: string
  metaTitle: string | null
  metaDescription: string | null
  isPublished: boolean
  isFooterLink: boolean
  displayOrder: number
  updatedAt: string
}

export default function WebsiteSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  
  // Page Management State
  const [pages, setPages] = useState<Page[]>([])
  const [editingPage, setEditingPage] = useState<Page | null>(null)
  const [showPageForm, setShowPageForm] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [pageFormData, setPageFormData] = useState({
    slug: '',
    title: '',
    content: '',
    metaTitle: '',
    metaDescription: '',
    isPublished: true,
    isFooterLink: false,
    displayOrder: 0
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    } else if (status === "authenticated") {
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
      fetchPages()
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

  const fetchPages = async () => {
    try {
      const res = await fetch('/api/admin/pages')
      const data = await res.json()
      if (res.ok) {
        setPages(data.pages || [])
      }
    } catch (error) {
      console.error('Error fetching pages:', error)
    }
  }

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSaveSettings = async () => {
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
        setSuccessMessage(`Settings saved successfully! Updated ${data.successCount} settings in database.`)
        setShowSuccess(true)
        toast({
          title: "Settings Saved",
          description: `Successfully updated ${data.successCount} settings`
        })
      } else {
        toast({
          title: "❌ Database Save Failed",
          description: data.error || "Failed to save settings to database. Please try again.",
          variant: "destructive",
          duration: 7000
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

  // Page Management Functions
  const handleSavePage = async () => {
    setSaving(true)
    try {
      const url = editingPage 
        ? `/api/admin/pages/${editingPage.id}`
        : '/api/admin/pages'
      
      const res = await fetch(url, {
        method: editingPage ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pageFormData)
      })

      if (res.ok) {
        toast({
          title: 'Success',
          description: `Page ${editingPage ? 'updated' : 'created'} successfully`
        })
        setShowPageForm(false)
        setEditingPage(null)
        fetchPages()
        resetPageForm()
      } else {
        const data = await res.json()
        toast({
          title: 'Error',
          description: data.error || 'Failed to save page',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save page',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEditPage = (page: Page) => {
    setEditingPage(page)
    setPageFormData({
      slug: page.slug,
      title: page.title,
      content: page.content,
      metaTitle: page.metaTitle || '',
      metaDescription: page.metaDescription || '',
      isPublished: page.isPublished,
      isFooterLink: page.isFooterLink,
      displayOrder: page.displayOrder
    })
    setShowPageForm(true)
    setPreviewMode(false)
  }

  const handleDeletePage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return
    
    try {
      const res = await fetch(`/api/admin/pages/${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Page deleted successfully'
        })
        fetchPages()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete page',
        variant: 'destructive'
      })
    }
  }

  const resetPageForm = () => {
    setPageFormData({
      slug: '',
      title: '',
      content: '',
      metaTitle: '',
      metaDescription: '',
      isPublished: true,
      isFooterLink: false,
      displayOrder: 0
    })
  }

  if (loading) {
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
                  Manage branding, pages, footer, icons, and SEO
                </p>
              </div>
            </div>
            <Button onClick={handleSaveSettings} disabled={saving}>
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

                <ImageUpload
                  label="Website Logo"
                  value={settings['website.logo_url'] || ''}
                  onChange={(url) => updateSetting('website.logo_url', url)}
                  category="branding"
                  accept="image/png,image/svg+xml,image/jpeg,image/webp"
                  maxSizeMB={2}
                  showPreview={true}
                  placeholder="/logo.png"
                  description="Upload PNG, SVG, JPEG, or WebP. Max 2MB. Recommended: transparent background PNG or SVG"
                />

                <ImageUpload
                  label="Favicon"
                  value={settings['website.favicon_url'] || ''}
                  onChange={(url) => updateSetting('website.favicon_url', url)}
                  category="branding"
                  accept="image/x-icon,image/vnd.microsoft.icon,image/png"
                  maxSizeMB={1}
                  showPreview={true}
                  placeholder="/favicon.ico"
                  description="Browser tab icon. Upload ICO or PNG (16x16 or 32x32 pixels recommended)"
                />

                <Button 
                  onClick={handleSaveSettings} 
                  disabled={saving}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Branding Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Platform Icons Tab */}
          <TabsContent value="icons">
            <Card>
              <CardHeader>
                <CardTitle>Platform Icons</CardTitle>
                <CardDescription>
                  Customize the icons shown in store connector. Leave empty to use defaults.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <ImageUpload
                    label="BigCommerce Icon"
                    value={settings['platform.bigcommerce_icon'] || ''}
                    onChange={(url) => updateSetting('platform.bigcommerce_icon', url)}
                    category="icons"
                    accept="image/svg+xml,image/png,image/jpeg"
                    maxSizeMB={1}
                    showPreview={true}
                    placeholder="/icons/bigcommerce.svg"
                    description="Upload SVG or PNG icon for BigCommerce (leave empty for default)"
                  />

                  <ImageUpload
                    label="Shopify Icon"
                    value={settings['platform.shopify_icon'] || ''}
                    onChange={(url) => updateSetting('platform.shopify_icon', url)}
                    category="icons"
                    accept="image/svg+xml,image/png,image/jpeg"
                    maxSizeMB={1}
                    showPreview={true}
                    placeholder="/icons/shopify.svg"
                    description="Upload SVG or PNG icon for Shopify (leave empty for default)"
                  />

                  <ImageUpload
                    label="Etsy Icon"
                    value={settings['platform.etsy_icon'] || ''}
                    onChange={(url) => updateSetting('platform.etsy_icon', url)}
                    category="icons"
                    accept="image/svg+xml,image/png,image/jpeg"
                    maxSizeMB={1}
                    showPreview={true}
                    placeholder="/icons/etsy.svg"
                    description="Upload SVG or PNG icon for Etsy (leave empty for default)"
                  />

                  <ImageUpload
                    label="TikTok Icon"
                    value={settings['platform.tiktok_icon'] || ''}
                    onChange={(url) => updateSetting('platform.tiktok_icon', url)}
                    category="icons"
                    accept="image/svg+xml,image/png,image/jpeg"
                    maxSizeMB={1}
                    showPreview={true}
                    placeholder="/icons/tiktok.svg"
                    description="Upload SVG or PNG icon for TikTok (leave empty for default)"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Tip:</strong> Use SVG format for best quality. Find free icons at{" "}
                    <a href="https://heroicons.com" target="_blank" className="underline">Heroicons</a>
                    {" "}or{" "}
                    <a href="https://lucide.dev" target="_blank" className="underline">Lucide</a>
                  </p>
                </div>

                <Button 
                  onClick={handleSaveSettings} 
                  disabled={saving}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Platform Icons"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pages Tab - Complete Page Management */}
          <TabsContent value="pages">
            {!showPageForm ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Page Management</CardTitle>
                        <CardDescription>
                          Manage footer pages, legal docs, and website content
                        </CardDescription>
                      </div>
                      <Button onClick={() => { setShowPageForm(true); setEditingPage(null); resetPageForm() }}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Page
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {pages.length === 0 ? (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No pages yet</h3>
                        <p className="text-muted-foreground mb-4">Create your first page to get started</p>
                        <Button onClick={() => { setShowPageForm(true); resetPageForm() }}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Page
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pages.map((page) => (
                          <div key={page.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/30">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold">{page.title}</h3>
                                {page.isPublished ? (
                                  <Badge variant="default">Published</Badge>
                                ) : (
                                  <Badge variant="secondary">Draft</Badge>
                                )}
                                {page.isFooterLink && (
                                  <Badge variant="outline">Footer Link</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">/{page.slug}</p>
                              <p className="text-xs text-muted-foreground">
                                Updated: {new Date(page.updatedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditPage(page)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => window.open(`/${page.slug}`, '_blank')}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeletePage(page.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>{editingPage ? 'Edit Page' : 'Create New Page'}</CardTitle>
                  <CardDescription>
                    {previewMode ? 'Preview mode' : 'Edit mode'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!previewMode ? (
                    <>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="page-title">Page Title</Label>
                          <Input
                            id="page-title"
                            value={pageFormData.title}
                            onChange={(e) => setPageFormData({ ...pageFormData, title: e.target.value })}
                            placeholder="About Us"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="page-slug">URL Slug</Label>
                          <Input
                            id="page-slug"
                            value={pageFormData.slug}
                            onChange={(e) => setPageFormData({ ...pageFormData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                            placeholder="about-us"
                          />
                          <p className="text-xs text-muted-foreground">URL: /{pageFormData.slug}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="page-content">Page Content (HTML)</Label>
                        <Textarea
                          id="page-content"
                          value={pageFormData.content}
                          onChange={(e) => setPageFormData({ ...pageFormData, content: e.target.value })}
                          placeholder="<h1>Welcome</h1><p>Your content here...</p>"
                          rows={15}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">Supports HTML formatting</p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="meta-title">Meta Title (SEO)</Label>
                          <Input
                            id="meta-title"
                            value={pageFormData.metaTitle}
                            onChange={(e) => setPageFormData({ ...pageFormData, metaTitle: e.target.value })}
                            placeholder="About Us - TEKMS"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="meta-desc">Meta Description (SEO)</Label>
                          <Input
                            id="meta-desc"
                            value={pageFormData.metaDescription}
                            onChange={(e) => setPageFormData({ ...pageFormData, metaDescription: e.target.value })}
                            placeholder="Learn more about TEKMS..."
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={pageFormData.isPublished}
                            onCheckedChange={(checked) => setPageFormData({ ...pageFormData, isPublished: checked })}
                          />
                          <Label>Published</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={pageFormData.isFooterLink}
                            onCheckedChange={(checked) => setPageFormData({ ...pageFormData, isFooterLink: checked })}
                          />
                          <Label>Show in Footer</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="display-order">Display Order</Label>
                          <Input
                            id="display-order"
                            type="number"
                            value={pageFormData.displayOrder}
                            onChange={(e) => setPageFormData({ ...pageFormData, displayOrder: parseInt(e.target.value) || 0 })}
                            className="w-24"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="prose prose-slate max-w-none p-6 border rounded-lg bg-white">
                      <h1>{pageFormData.title}</h1>
                      <div dangerouslySetInnerHTML={{ __html: pageFormData.content }} />
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-4 border-t">
                    <Button onClick={handleSavePage} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Page'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setPreviewMode(!previewMode)}
                    >
                      {previewMode ? <Edit className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                      {previewMode ? 'Edit' : 'Preview'}
                    </Button>
                    <Button variant="ghost" onClick={() => { setShowPageForm(false); setEditingPage(null); resetPageForm() }}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
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

                <Button 
                  onClick={handleSaveSettings} 
                  disabled={saving}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Footer Settings"}
                </Button>
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

                <Button 
                  onClick={handleSaveSettings} 
                  disabled={saving}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save SEO Settings"}
                </Button>
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

                <Button 
                  onClick={handleSaveSettings} 
                  disabled={saving}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save General Settings"}
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