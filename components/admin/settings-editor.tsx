"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Save, RefreshCw } from "lucide-react"

interface Setting {
  value: any
  type: string
  description?: string
  isPublic: boolean
  updatedAt: string
}

export function SettingsEditor() {
  const [settings, setSettings] = useState<Record<string, Record<string, Setting>>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings")
      if (res.ok) {
        const data = await res.json()
        setSettings(data.settings)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (category: string, key: string, value: any, type: string) => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          value,
          type,
          category,
        }),
      })

      if (res.ok) {
        toast({
          title: "Success",
          description: "Setting updated successfully",
        })
        await fetchSettings()
      } else {
        throw new Error("Failed to update setting")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update setting",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSave = (category: string, key: string, type: string) => {
    const value = (document.getElementById(`${category}-${key}`) as HTMLInputElement)?.value
    updateSetting(category, key, value, type)
  }

  const handleToggle = (category: string, key: string, checked: boolean) => {
    updateSetting(category, key, checked, "boolean")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <Tabs defaultValue="stripe" className="space-y-6">
      <TabsList>
        <TabsTrigger value="stripe">Stripe</TabsTrigger>
        <TabsTrigger value="email">Email</TabsTrigger>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="integrations">Integrations</TabsTrigger>
      </TabsList>

      {/* Stripe Settings */}
      <TabsContent value="stripe" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Stripe Configuration</CardTitle>
            <CardDescription>Configure Stripe payment processing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(settings.stripe || {}).map(([key, setting]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`stripe-${key}`} className="flex items-center justify-between">
                  <span>{key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</span>
                  {setting.description && (
                    <span className="text-xs text-muted-foreground">{setting.description}</span>
                  )}
                </Label>
                {setting.type === "boolean" ? (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`stripe-${key}`}
                      checked={setting.value}
                      onCheckedChange={(checked) => handleToggle("stripe", key, checked)}
                      disabled={saving}
                    />
                    <Label htmlFor={`stripe-${key}`} className="text-sm text-muted-foreground">
                      {setting.value ? "Enabled" : "Disabled"}
                    </Label>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      id={`stripe-${key}`}
                      type={key.includes("secret") || key.includes("key") ? "password" : "text"}
                      defaultValue={setting.value}
                      placeholder={`Enter ${key.replace(/_/g, " ")}`}
                      disabled={saving}
                    />
                    <Button
                      size="icon"
                      onClick={() => handleSave("stripe", key, setting.type)}
                      disabled={saving}
                    >
                      {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Email Settings */}
      <TabsContent value="email" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Email Configuration</CardTitle>
            <CardDescription>Configure email service settings (Resend)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(settings.email || {}).map(([key, setting]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`email-${key}`}>
                  {key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id={`email-${key}`}
                    type={key.includes("key") || key.includes("api") ? "password" : "text"}
                    defaultValue={setting.value}
                    placeholder={`Enter ${key.replace(/_/g, " ")}`}
                    disabled={saving}
                  />
                  <Button
                    size="icon"
                    onClick={() => handleSave("email", key, setting.type)}
                    disabled={saving}
                  >
                    {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  </Button>
                </div>
                {setting.description && (
                  <p className="text-xs text-muted-foreground">{setting.description}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      {/* General Settings */}
      <TabsContent value="general" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Application-wide settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(settings.general || {}).map(([key, setting]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`general-${key}`}>
                  {key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                </Label>
                {setting.type === "boolean" ? (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`general-${key}`}
                      checked={setting.value}
                      onCheckedChange={(checked) => handleToggle("general", key, checked)}
                      disabled={saving}
                    />
                    <Label htmlFor={`general-${key}`} className="text-sm text-muted-foreground">
                      {setting.value ? "Enabled" : "Disabled"}
                    </Label>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      id={`general-${key}`}
                      defaultValue={setting.value}
                      placeholder={`Enter ${key.replace(/_/g, " ")}`}
                      disabled={saving}
                    />
                    <Button
                      size="icon"
                      onClick={() => handleSave("general", key, setting.type)}
                      disabled={saving}
                    >
                      {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Integrations Settings */}
      <TabsContent value="integrations" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Third-Party Integrations</CardTitle>
            <CardDescription>Configure external services (Meilisearch, etc.)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(settings.integrations || {}).map(([key, setting]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`integrations-${key}`}>
                  {key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id={`integrations-${key}`}
                    type={key.includes("key") ? "password" : "text"}
                    defaultValue={setting.value}
                    placeholder={`Enter ${key.replace(/_/g, " ")}`}
                    disabled={saving}
                  />
                  <Button
                    size="icon"
                    onClick={() => handleSave("integrations", key, setting.type)}
                    disabled={saving}
                  >
                    {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}