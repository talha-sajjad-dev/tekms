"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Search, Edit, Shield, CreditCard } from "lucide-react"

interface User {
  id: string
  name: string | null
  email: string
  role: string
  createdAt: string
  subscription: {
    tier: string
    status: string
  } | null
  _count: {
    products: number
    credentials: number
  }
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRole, setFilterRole] = useState("all")
  const [filterTier, setFilterTier] = useState("all")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users")
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateUserSubscription = async (userId: string, tier: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      })

      if (res.ok) {
        toast({
          title: "Success",
          description: "User subscription updated",
        })
        fetchUsers()
      } else {
        throw new Error()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update subscription",
        variant: "destructive",
      })
    }
  }

  const updateUserRole = async (userId: string, role: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })

      if (res.ok) {
        toast({
          title: "Success",
          description: "User role updated",
        })
        fetchUsers()
      } else {
        throw new Error()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      })
    }
  }

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === "all" || user.role === filterRole
    const matchesTier = filterTier === "all" || user.subscription?.tier === filterTier
    
    return matchesSearch && matchesRole && matchesTier
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="USER">User</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTier} onValueChange={setFilterTier}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Subscription" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="FREE">Free</SelectItem>
            <SelectItem value="STARTER">Starter</SelectItem>
            <SelectItem value="PROFESSIONAL">Professional</SelectItem>
            <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-2xl">{users.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Free Tier</CardDescription>
            <CardTitle className="text-2xl">
              {users.filter(u => u.subscription?.tier === "FREE").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paid</CardDescription>
            <CardTitle className="text-2xl">
              {users.filter(u => u.subscription?.tier !== "FREE").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Admins</CardDescription>
            <CardTitle className="text-2xl">
              {users.filter(u => u.role === "ADMIN").length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Showing {filteredUsers.length} of {users.length} users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Credentials</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.name || "No name"}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                      <Shield className="h-3 w-3 mr-1" />
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.subscription?.tier === "ENTERPRISE" ? "default" :
                        user.subscription?.tier === "PROFESSIONAL" ? "default" :
                        "secondary"
                      }
                    >
                      <CreditCard className="h-3 w-3 mr-1" />
                      {user.subscription?.tier || "None"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{user._count.products}</TableCell>
                  <TableCell className="text-center">{user._count.credentials}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedUser(user)
                        setEditDialogOpen(true)
                      }}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Manage user subscription and permissions
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium mb-1">User</p>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Subscription Tier</p>
                <Select
                  defaultValue={selectedUser.subscription?.tier || "FREE"}
                  onValueChange={(value) => updateUserSubscription(selectedUser.id, value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FREE">Free (10 products)</SelectItem>
                    <SelectItem value="STARTER">Starter</SelectItem>
                    <SelectItem value="PROFESSIONAL">Professional (Unlimited)</SelectItem>
                    <SelectItem value="ENTERPRISE">Enterprise (All features)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Override user's subscription tier
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">User Role</p>
                <Select
                  defaultValue={selectedUser.role}
                  onValueChange={(value) => updateUserRole(selectedUser.id, value)}
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
                  Admin users have full system access
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Products</p>
                  <p className="text-2xl font-bold">{selectedUser._count.products}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Credentials</p>
                  <p className="text-2xl font-bold">{selectedUser._count.credentials}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}