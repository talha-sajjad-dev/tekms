'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Users,
  Search,
  Edit,
  Trash2,
  Save,
  ArrowLeft,
  Shield,
  Store,
  Package,
  ChevronLeft,
  ChevronRight,
  Crown,
  Gift
} from 'lucide-react'

interface User {
  id: string
  name: string | null
  email: string
  role: 'USER' | 'ADMIN'
  allowLegacyEtsyImport: boolean
  allowLegacyTikTokExport: boolean
  createdAt: string
  subscription: {
    tier: string
    status: string
  } | null
  storeConnections: Array<{
    id: string
    platform: string
    storeName: string
    isActive: boolean
    productCount: number
  }>
  _count: {
    products: number
    storeConnections: number
  }
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showGiftDialog, setShowGiftDialog] = useState(false)
  const [giftingUser, setGiftingUser] = useState<User | null>(null)
  
  const [formData, setFormData] = useState({
    role: 'USER' as 'USER' | 'ADMIN',
    allowLegacyEtsyImport: false,
    allowLegacyTikTokExport: false
  })
  
  const [giftData, setGiftData] = useState({
    tier: 'PAID',
    duration: 1,
    note: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    } else if (status === 'authenticated') {
      if (session?.user?.role !== 'ADMIN') {
        router.push('/dashboard')
      } else {
        fetchUsers()
      }
    }
  }, [status, session, page, searchQuery])

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search: searchQuery
      })

      const res = await fetch(`/api/admin/users?${params}`)
      const data = await res.json()
      
      if (res.ok) {
        setUsers(data.users || [])
        setTotalPages(data.pagination?.pages || 1)
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch users',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      role: user.role,
      allowLegacyEtsyImport: user.allowLegacyEtsyImport,
      allowLegacyTikTokExport: user.allowLegacyTikTokExport
    })
    setShowEditDialog(true)
  }

  const handleSave = async () => {
    if (!editingUser) return
    
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'User updated successfully'
        })
        setShowEditDialog(false)
        setEditingUser(null)
        fetchUsers()
      } else {
        const data = await res.json()
        toast({
          title: 'Error',
          description: data.error || 'Failed to update user',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update user',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to delete ${email}? This action cannot be undone.`)) return
    
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE'
      })

      const data = await res.json()

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'User deleted successfully'
        })
        fetchUsers()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete user',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive'
      })
    }
  }
  
  const handleGiftSubscription = async () => {
    if (!giftingUser) return
    
    setSaving(true)
    try {
      const res = await fetch('/api/admin/subscriptions/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: giftingUser.id,
          ...giftData
        })
      })

      if (res.ok) {
        toast({
          title: 'Subscription Gifted!',
          description: `${giftingUser.email} now has ${giftData.tier} for ${giftData.duration} month(s)`
        })
        setShowGiftDialog(false)
        setGiftingUser(null)
        setGiftData({ tier: 'PAID', duration: 1, note: '' })
        fetchUsers()
      } else {
        const data = await res.json()
        toast({
          title: 'Error',
          description: data.error || 'Failed to gift subscription',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to gift subscription',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setPage(1) // Reset to first page on search
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
                <Users className="h-8 w-8 text-purple-600" />
                <div>
                  <h1 className="text-2xl font-bold">User Management</h1>
                  <p className="text-sm text-muted-foreground">
                    Manage users, roles, and permissions
                  </p>
                </div>
              </div>
            </div>
            <Badge variant="outline" className="border-purple-200 text-purple-600">
              {users.length} Users
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        {!showEditDialog ? (
          <div className="space-y-4">
            {users.map((user) => (
              <Card key={user.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">
                          {user.name || 'No Name'}
                        </h3>
                        {user.role === 'ADMIN' ? (
                          <Badge className="bg-gradient-to-r from-orange-600 to-red-600">
                            <Crown className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline">User</Badge>
                        )}
                        {user.subscription && (
                          <Badge variant="secondary">{user.subscription.tier}</Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">{user.email}</p>
                      
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">
                            {user._count.storeConnections} store{user._count.storeConnections !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-green-600" />
                          <span className="text-sm">
                            {user._count.products} product{user._count.products !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Joined {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Legacy Permissions */}
                      {(user.allowLegacyEtsyImport || user.allowLegacyTikTokExport) && (
                        <div className="mt-3 flex gap-2">
                          {user.allowLegacyEtsyImport && (
                            <Badge variant="outline" className="text-xs">
                              Legacy Etsy Import
                            </Badge>
                          )}
                          {user.allowLegacyTikTokExport && (
                            <Badge variant="outline" className="text-xs">
                              Legacy TikTok Export
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Store Connections */}
                      {user.storeConnections.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium mb-1">Connected Stores:</p>
                          <div className="flex flex-wrap gap-2">
                            {user.storeConnections.map((store) => (
                              <Badge key={store.id} variant="secondary" className="text-xs">
                                {store.platform}: {store.storeName} ({store.productCount} products)
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
                        onClick={() => {
                          setGiftingUser(user)
                          setShowGiftDialog(true)
                        }}
                      >
                        <Gift className="h-4 w-4 mr-2" />
                        Gift Sub
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(user)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      {user.id !== session?.user?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user.id, user.email)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {users.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No users found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? 'Try a different search query' : 'No users in the system yet'}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Edit Dialog */
          <Card>
            <CardHeader>
              <CardTitle>Edit User</CardTitle>
              <CardDescription>
                Update user role and permissions for {editingUser?.email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="role">User Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: 'USER' | 'ADMIN') => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Admins have full access to admin panel and all features
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Legacy Feature Permissions</h4>
                <p className="text-sm text-muted-foreground">
                  Grant access to legacy features (non-OAuth based)
                </p>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Legacy Etsy Import</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow using old Etsy import method
                    </p>
                  </div>
                  <Switch
                    checked={formData.allowLegacyEtsyImport}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, allowLegacyEtsyImport: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Legacy TikTok Export</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow using old TikTok export method
                    </p>
                  </div>
                  <Switch
                    checked={formData.allowLegacyTikTokExport}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, allowLegacyTikTokExport: checked })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t">
                <Button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setShowEditDialog(false)
                    setEditingUser(null)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Gift Subscription Dialog */}
      <Dialog open={showGiftDialog} onOpenChange={setShowGiftDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gift Subscription</DialogTitle>
            <DialogDescription>
              Gift a premium subscription to {giftingUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subscription Tier</Label>
              <Select value={giftData.tier} onValueChange={(v) => setGiftData({...giftData, tier: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAID">Professional (Paid)</SelectItem>
                  <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={giftData.duration.toString()} onValueChange={(v) => setGiftData({...giftData, duration: parseInt(v)})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Month</SelectItem>
                  <SelectItem value="3">3 Months</SelectItem>
                  <SelectItem value="12">12 Months (1 Year)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Note (Optional)</Label>
              <Textarea
                placeholder="Add a note for the user..."
                value={giftData.note}
                onChange={(e) => setGiftData({...giftData, note: e.target.value})}
                rows={3}
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-900">
                <strong>Summary:</strong> {giftingUser?.email} will receive {giftData.tier} tier access for {giftData.duration} month(s).
                They will be notified via email.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGiftDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGiftSubscription}
              disabled={saving}
              className="bg-gradient-to-r from-blue-500 to-purple-500"
            >
              <Gift className="h-4 w-4 mr-2" />
              {saving ? 'Gifting...' : 'Gift Subscription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}