"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SettingsEditor } from "@/components/admin/settings-editor"
import { UserManagement } from "@/components/admin/user-management"
import {
  Users,
  Settings as SettingsIcon,
  DollarSign,
  Package,
  ArrowLeft,
  Shield,
  Database
} from "lucide-react"

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "authenticated") {
      // Check if user is admin
      if (session?.user?.role !== "ADMIN") {
        router.push("/dashboard")
      } else {
        setLoading(false)
      }
    } else if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, session])

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Admin Panel</h1>
                <p className="text-sm text-muted-foreground">
                  Manage users, settings, and system configuration
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="pricing">Pricing Plans</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Users</CardDescription>
                  <CardTitle className="text-3xl flex items-center gap-2">
                    <Users className="h-6 w-6 text-primary" />
                    <span>0</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Active accounts
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Products</CardDescription>
                  <CardTitle className="text-3xl flex items-center gap-2">
                    <Package className="h-6 w-6 text-primary" />
                    <span>0</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Across all users
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Revenue (MRR)</CardDescription>
                  <CardTitle className="text-3xl flex items-center gap-2">
                    <DollarSign className="h-6 w-6 text-primary" />
                    <span>$0</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Monthly recurring
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Database</CardDescription>
                  <CardTitle className="text-3xl flex items-center gap-2">
                    <Database className="h-6 w-6 text-primary" />
                    <span>OK</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    System healthy
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => {
                      const tab = document.querySelector('[value="users"]') as HTMLElement
                      tab?.click()
                    }}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Manage Users
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => {
                      const tab = document.querySelector('[value="pricing"]') as HTMLElement
                      tab?.click()
                    }}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Edit Pricing Plans
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => {
                      const tab = document.querySelector('[value="settings"]') as HTMLElement
                      tab?.click()
                    }}
                  >
                    <SettingsIcon className="h-4 w-4 mr-2" />
                    System Settings
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                  <CardDescription>Current system information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Database</span>
                    <span className="text-sm font-medium text-green-600">Connected</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Stripe Integration</span>
                    <span className="text-sm font-medium text-yellow-600">Pending Setup</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Email Service</span>
                    <span className="text-sm font-medium text-yellow-600">Pending Setup</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Search Engine</span>
                    <span className="text-sm font-medium text-yellow-600">Pending Setup</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle>Pricing Plans</CardTitle>
                <CardDescription>Manage subscription tiers and features</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Pricing plan editor coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>Configure integrations and system parameters</CardDescription>
              </CardHeader>
              <CardContent>
                <SettingsEditor />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}