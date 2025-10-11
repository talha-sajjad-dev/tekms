"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Package, Key, Trash2, Plus, ArrowLeft, Shield } from "lucide-react"

interface Credential {
  id: string
  platform: string
  label: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const PLATFORMS = [
  { value: "BIGCOMMERCE", label: "BigCommerce", color: "bg-blue-500" },
  { value: "SHOPIFY", label: "Shopify", color: "bg-green-500" },
  { value: "ETSY", label: "Etsy", color: "bg-orange-500" },
  { value: "TIKTOK", label: "TikTok", color: "bg-pink-500" },
]

export default function CredentialsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  const [credentials, setCredentials] = useState<Credential[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    platform: "",
    apiKey: "",
    label: "",
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    } else if (status === "authenticated") {
      fetchCredentials()
    }
  }, [status])

  const fetchCredentials = async () => {
    try {
      const res = await fetch("/api/credentials")
      const data = await res.json()
      
      if (res.ok) {
        setCredentials(data.credentials)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch credentials",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch credentials",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.platform || !formData.apiKey) {
      toast({
        title: "Error",
        description: "Platform and API key are required",
        variant: "destructive",
      })
      return
    }

    try {
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok) {
        toast({
          title: "Success",
          description: "Credential added successfully",
        })
        setCredentials([...credentials, data.credential])
        setShowAddForm(false)
        setFormData({ platform: "", apiKey: "", label: "" })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to add credential",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add credential",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/credentials/${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        toast({
          title: "Success",
          description: "Credential deleted successfully",
        })
        setCredentials(credentials.filter((c) => c.id !== id))
      } else {
        const data = await res.json()
        toast({
          title: "Error",
          description: data.error || "Failed to delete credential",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete credential",
        variant: "destructive",
      })
    } finally {
      setDeleteId(null)
    }
  }

  const getPlatformInfo = (platform: string) => {
    return PLATFORMS.find((p) => p.value === platform) || { label: platform, color: "bg-gray-500" }
  }

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
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">API Credentials</h1>
              <p className="text-sm text-muted-foreground">
                Manage your marketplace API keys securely
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Security Notice */}
        <Card className="mb-6 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Your credentials are encrypted
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  All API keys are encrypted using AES-256-GCM before being stored. 
                  They are never displayed in plain text after being saved.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Credential Button */}
        {!showAddForm && (
          <div className="mb-6">
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Credential
            </Button>
          </div>
        )}

        {/* Add Credential Form */}
        {showAddForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Add New Credential</CardTitle>
              <CardDescription>
                Enter your marketplace API credentials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <Select
                    value={formData.platform}
                    onValueChange={(value) =>
                      setFormData({ ...formData, platform: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map((platform) => (
                        <SelectItem key={platform.value} value={platform.value}>
                          {platform.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="label">Label (Optional)</Label>
                  <Input
                    id="label"
                    type="text"
                    placeholder="e.g., Main Store, Test Account"
                    value={formData.label}
                    onChange={(e) =>
                      setFormData({ ...formData, label: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key / Access Token</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Enter your API key"
                    value={formData.apiKey}
                    onChange={(e) =>
                      setFormData({ ...formData, apiKey: e.target.value })
                    }
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be encrypted and stored securely
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button type="submit">Save Credential</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false)
                      setFormData({ platform: "", apiKey: "", label: "" })
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Credentials List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Saved Credentials</h2>
          
          {credentials.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No credentials yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add your first marketplace credential to get started
                  </p>
                  {!showAddForm && (
                    <Button onClick={() => setShowAddForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Credential
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            credentials.map((credential) => {
              const platformInfo = getPlatformInfo(credential.platform)
              return (
                <Card key={credential.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg ${platformInfo.color} flex items-center justify-center`}>
                          <Package className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{platformInfo.label}</h3>
                            {credential.label && (
                              <Badge variant="outline">{credential.label}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Added {new Date(credential.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={credential.isActive ? "default" : "secondary"}>
                          {credential.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(credential.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Credential</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this credential? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}