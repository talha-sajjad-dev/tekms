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
import { useToast } from '@/hooks/use-toast'
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  ArrowLeft,
  Eye,
  EyeOff
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'

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

export default function AdminPagesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingPage, setEditingPage] = useState<Page | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  
  const [formData, setFormData] = useState({
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
    if (status === 'unauthenticated') {
      router.push('/')
    } else if (status === 'authenticated') {
      if (session?.user?.role !== 'ADMIN') {
        router.push('/dashboard')
      } else {
        fetchPages()
      }
    }
  }, [status, session])

  const fetchPages = async () => {
    try {
      const res = await fetch('/api/admin/pages')
      const data = await res.json()
      
      if (res.ok) {
        setPages(data.pages || [])
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch pages',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const url = editingPage 
        ? `/api/admin/pages/${editingPage.id}`
        : '/api/admin/pages'
      
      const res = await fetch(url, {
        method: editingPage ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        toast({
          title: 'Success',
          description: `Page ${editingPage ? 'updated' : 'created'} successfully`
        })
        setShowForm(false)
        setEditingPage(null)
        fetchPages()
        resetForm()
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

  const handleEdit = (page: Page) => {
    setEditingPage(page)
    setFormData({
      slug: page.slug,
      title: page.title,
      content: page.content,
      metaTitle: page.metaTitle || '',
      metaDescription: page.metaDescription || '',
      isPublished: page.isPublished,
      isFooterLink: page.isFooterLink,
      displayOrder: page.displayOrder
    })
    setShowForm(true)
    setPreviewMode(false)
  }

  const handleDelete = async (id: string) => {
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

  const resetForm = () => {
    setFormData({
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
              <div>
                <h1 className="text-2xl font-bold">Page Management</h1>
                <p className="text-sm text-muted-foreground">
                  Manage footer pages and content
                </p>
              </div>
            </div>
            <Button onClick={() => { setShowForm(true); setEditingPage(null); resetForm() }}>
              <Plus className="h-4 w-4 mr-2" />
              New Page
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {!showForm ? (
          /* List View */
          <div className="grid gap-4">
            {pages.map((page) => (
              <Card key={page.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{page.title}</h3>
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
                      <p className="text-xs text-muted-foreground mt-1">
                        Updated: {new Date(page.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(page)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => window.open(`/${page.slug}`, '_blank')}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(page.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {pages.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No pages yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first page to get started</p>
                  <Button onClick={() => { setShowForm(true); resetForm() }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Page
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* Edit Form */
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
                      <Label htmlFor="title">Page Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="About Us"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slug">URL Slug</Label>
                      <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                        placeholder="about-us"
                      />
                      <p className="text-xs text-muted-foreground">URL: /{formData.slug}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Page Content (HTML)</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="<h1>Welcome</h1><p>Your content here...</p>"
                      rows={15}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">Supports HTML formatting</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="metaTitle">Meta Title (SEO)</Label>
                      <Input
                        id="metaTitle"
                        value={formData.metaTitle}
                        onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                        placeholder="About Us - TEKMS"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="metaDescription">Meta Description (SEO)</Label>
                      <Input
                        id="metaDescription"
                        value={formData.metaDescription}
                        onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                        placeholder="Learn more about TEKMS..."
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.isPublished}
                        onCheckedChange={(checked) => setFormData({ ...formData, isPublished: checked })}
                      />
                      <Label>Published</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.isFooterLink}
                        onCheckedChange={(checked) => setFormData({ ...formData, isFooterLink: checked })}
                      />
                      <Label>Show in Footer</Label>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="displayOrder">Display Order</Label>
                      <Input
                        id="displayOrder"
                        type="number"
                        value={formData.displayOrder}
                        onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                        className="w-24"
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* Preview */
                <div className="prose prose-slate max-w-none p-6 border rounded-lg bg-white">
                  <h1>{formData.title}</h1>
                  <div dangerouslySetInnerHTML={{ __html: formData.content }} />
                </div>
              )}

              <div className="flex items-center gap-2 pt-4 border-t">
                <Button onClick={handleSave} disabled={saving}>
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
                <Button variant="ghost" onClick={() => { setShowForm(false); setEditingPage(null); resetForm() }}>
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