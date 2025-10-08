"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"

export default function DebugModifiersPage() {
  const [modifiers, setModifiers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [rawData, setRawData] = useState<any>(null)

  const fetchAndDebugModifiers = async () => {
    setLoading(true)
    try {
      console.log("=== DEBUGGING MODIFIER FETCH ===")

      // Try the existing modifiers endpoint
      const response = await fetch("/api/bigcommerce/modifiers/existing")
      const data = await response.json()

      console.log("Raw API response:", data)
      setRawData(data)

      if (data.data && Array.isArray(data.data)) {
        setModifiers(data.data)
        console.log("Modifiers found:", data.data.length)

        // Log each modifier's details
        data.data.forEach((modifier, idx) => {
          console.log(`Modifier ${idx + 1}:`, {
            id: modifier.id,
            display_name: modifier.display_name,
            type: modifier.type,
            typeof_type: typeof modifier.type,
            required: modifier.required,
            option_values: modifier.option_values?.length || 0,
            raw_modifier: modifier,
          })
        })
      }

      toast({
        title: "Debug Complete",
        description: `Found ${data.data?.length || 0} modifiers`,
      })
    } catch (error) {
      console.error("Error debugging modifiers:", error)
      toast({
        title: "Error",
        description: "Failed to debug modifiers",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testSingleModifierApplication = async (modifier: any) => {
    try {
      console.log("=== TESTING SINGLE MODIFIER APPLICATION ===")
      console.log("Original modifier:", modifier)

      // Clean the modifier exactly as we do in the main page
      const cleanModifier = {
        display_name: modifier.display_name,
        type: modifier.type, // Use the exact type from BigCommerce
        required: modifier.required || false,
      }

      // Handle option values if they exist
      if (modifier.option_values && Array.isArray(modifier.option_values)) {
        cleanModifier.option_values = modifier.option_values.map((option, index) => ({
          label: option.label,
          sort_order: index,
          value_data:
            option.price_adjustment !== undefined
              ? {
                  price_adjustment: option.price_adjustment,
                }
              : null,
          is_default: option.is_default || false,
        }))
      }

      console.log("Clean modifier to send:", cleanModifier)

      // Test with product 4223
      const response = await fetch(`/api/bigcommerce/catalog/products/4223/modifiers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cleanModifier),
      })

      const responseText = await response.text()
      console.log("Response status:", response.status)
      console.log("Response text:", responseText)

      if (response.ok) {
        toast({
          title: "Success!",
          description: `Successfully applied modifier: ${modifier.display_name}`,
        })
      } else {
        let errorData
        try {
          errorData = JSON.parse(responseText)
        } catch {
          errorData = { message: responseText }
        }

        toast({
          title: "Failed",
          description: `Error applying ${modifier.display_name}: ${errorData.title || errorData.message}`,
          variant: "destructive",
        })

        console.error("Application failed:", errorData)
      }
    } catch (error) {
      console.error("Test failed:", error)
      toast({
        title: "Test Error",
        description: "Failed to test modifier application",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    fetchAndDebugModifiers()
  }, [])

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Debug Modifiers</h1>
      <p className="text-muted-foreground mb-8">
        Let's see exactly what modifier data we're getting from BigCommerce and why it's failing.
      </p>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Fetch and Analyze Modifiers</CardTitle>
            <CardDescription>Get the raw modifier data from BigCommerce</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchAndDebugModifiers} disabled={loading}>
              {loading ? "Fetching..." : "Fetch & Debug Modifiers"}
            </Button>
          </CardContent>
        </Card>

        {rawData && (
          <Card>
            <CardHeader>
              <CardTitle>Raw API Response</CardTitle>
              <CardDescription>The exact data we received from BigCommerce</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(rawData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {modifiers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Modifier Analysis</CardTitle>
              <CardDescription>Detailed breakdown of each modifier</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modifiers.map((modifier, idx) => (
                  <div key={idx} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium">{modifier.display_name}</h3>
                      <Button size="sm" onClick={() => testSingleModifierApplication(modifier)} variant="outline">
                        Test Apply
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>ID:</strong> {modifier.id}
                      </div>
                      <div>
                        <strong>Type:</strong> <Badge variant="outline">{modifier.type}</Badge>
                      </div>
                      <div>
                        <strong>Required:</strong> {modifier.required ? "Yes" : "No"}
                      </div>
                      <div>
                        <strong>Options:</strong> {modifier.option_values?.length || 0}
                      </div>
                    </div>

                    {modifier.option_values && modifier.option_values.length > 0 && (
                      <div className="mt-3">
                        <strong className="text-sm">Option Values:</strong>
                        <div className="mt-1 space-y-1">
                          {modifier.option_values.map((option, optIdx) => (
                            <div key={optIdx} className="text-xs bg-gray-50 p-2 rounded">
                              <strong>Label:</strong> {option.label} |<strong> Value:</strong> {option.value} |
                              <strong> Price:</strong> ${option.price_adjustment} |<strong> Default:</strong>{" "}
                              {option.is_default ? "Yes" : "No"}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-muted-foreground">View Raw Modifier Data</summary>
                      <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto max-h-32">
                        {JSON.stringify(modifier, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Toaster />
    </div>
  )
}
