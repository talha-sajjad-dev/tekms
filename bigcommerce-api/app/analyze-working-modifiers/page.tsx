"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { CheckCircle, Copy } from "lucide-react"

export default function AnalyzeWorkingModifiersPage() {
  const [workingModifiers, setWorkingModifiers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [testResults, setTestResults] = useState<any[]>([])

  const fetchWorkingModifiers = async () => {
    setLoading(true)
    try {
      console.log("Fetching working modifiers from product 6013...")

      const response = await fetch("/api/bigcommerce/products/6013/modifiers")
      const data = await response.json()

      if (data.success && data.modifiers) {
        setWorkingModifiers(data.modifiers)
        console.log("Working modifiers:", data.modifiers)

        toast({
          title: "Success!",
          description: `Found ${data.modifiers.length} working modifiers on product 6013`,
        })
      } else {
        toast({
          title: "No Modifiers Found",
          description: "Product 6013 doesn't have any modifiers yet",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching working modifiers:", error)
      toast({
        title: "Error",
        description: "Failed to fetch working modifiers",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testApplyToOtherProduct = async (modifier: any, targetProductId = 4223) => {
    try {
      console.log(`Testing modifier application to product ${targetProductId}...`)
      console.log("Original working modifier:", modifier)

      // Create a clean copy of the working modifier structure
      const cleanModifier = {
        display_name: modifier.display_name,
        type: modifier.type,
        required: modifier.required,
      }

      // Copy option values exactly as they appear in the working modifier
      if (modifier.option_values && Array.isArray(modifier.option_values)) {
        cleanModifier.option_values = modifier.option_values.map((option) => ({
          label: option.label,
          sort_order: option.sort_order,
          value_data: option.value_data,
          is_default: option.is_default,
        }))
      }

      // Copy any other fields that exist in the working modifier
      if (modifier.config) {
        cleanModifier.config = modifier.config
      }

      console.log("Clean modifier to apply:", cleanModifier)

      const response = await fetch(`/api/bigcommerce/catalog/products/${targetProductId}/modifiers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cleanModifier),
      })

      const responseText = await response.text()
      console.log(`Response status: ${response.status}`)
      console.log(`Response text: ${responseText}`)

      const result = {
        modifier_name: modifier.display_name,
        target_product: targetProductId,
        success: response.ok,
        status: response.status,
        response: responseText,
      }

      if (response.ok) {
        try {
          const responseData = JSON.parse(responseText)
          result.created_modifier_id = responseData.data?.id
        } catch (e) {
          // Response might be empty on success
        }

        toast({
          title: "Success!",
          description: `Applied "${modifier.display_name}" to product ${targetProductId}`,
        })
      } else {
        let errorData
        try {
          errorData = JSON.parse(responseText)
        } catch {
          errorData = { message: responseText }
        }

        result.error = errorData

        toast({
          title: "Failed",
          description: `Failed to apply "${modifier.display_name}": ${errorData.title || errorData.message}`,
          variant: "destructive",
        })
      }

      setTestResults((prev) => [...prev, result])
      return result
    } catch (error) {
      console.error("Test application failed:", error)
      const errorResult = {
        modifier_name: modifier.display_name,
        target_product: targetProductId,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }

      setTestResults((prev) => [...prev, errorResult])
      return errorResult
    }
  }

  const copyModifierStructure = (modifier: any) => {
    const cleanStructure = {
      display_name: modifier.display_name,
      type: modifier.type,
      required: modifier.required,
      option_values: modifier.option_values?.map((option) => ({
        label: option.label,
        sort_order: option.sort_order,
        value_data: option.value_data,
        is_default: option.is_default,
      })),
    }

    navigator.clipboard.writeText(JSON.stringify(cleanStructure, null, 2))
    toast({
      title: "Copied!",
      description: "Modifier structure copied to clipboard",
    })
  }

  useEffect(() => {
    fetchWorkingModifiers()
  }, [])

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Analyze Working Modifiers</h1>
      <p className="text-muted-foreground mb-8">
        Let's examine the modifiers that were successfully added to product 6013 and use them as a template.
      </p>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Fetch Working Modifiers</CardTitle>
            <CardDescription>Get the modifiers from product 6013 that were added manually</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchWorkingModifiers} disabled={loading}>
              {loading ? "Fetching..." : "Fetch Modifiers from Product 6013"}
            </Button>
          </CardContent>
        </Card>

        {workingModifiers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Working Modifier Templates</CardTitle>
              <CardDescription>These are the exact structures that work with BigCommerce</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workingModifiers.map((modifier, idx) => (
                  <div key={idx} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium">{modifier.display_name}</h3>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline">{modifier.type}</Badge>
                          <Badge variant={modifier.required ? "default" : "secondary"}>
                            {modifier.required ? "Required" : "Optional"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => copyModifierStructure(modifier)}>
                          <Copy className="h-3 w-3 mr-1" />
                          Copy Structure
                        </Button>
                        <Button size="sm" onClick={() => testApplyToOtherProduct(modifier)}>
                          Test Apply to 4223
                        </Button>
                      </div>
                    </div>

                    {modifier.option_values && modifier.option_values.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium mb-2">Option Values:</h4>
                        <div className="space-y-1">
                          {modifier.option_values.map((option, optIdx) => (
                            <div key={optIdx} className="text-xs bg-gray-50 p-2 rounded">
                              <strong>Label:</strong> {option.label} | <strong>Sort:</strong> {option.sort_order} |{" "}
                              <strong>Default:</strong> {option.is_default ? "Yes" : "No"}
                              {option.value_data && (
                                <>
                                  {" "}
                                  | <strong>Price Adj:</strong> ${option.value_data.price_adjustment || 0}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <details>
                      <summary className="cursor-pointer text-sm text-muted-foreground">
                        View Complete Structure
                      </summary>
                      <pre className="text-xs bg-gray-100 p-3 rounded mt-2 overflow-auto max-h-40">
                        {JSON.stringify(modifier, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>Results from testing the working modifier structures</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {testResults.map((result, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">
                          {result.modifier_name} → Product {result.target_product}
                        </h4>
                        {result.success && result.created_modifier_id && (
                          <p className="text-sm text-green-600">Created modifier ID: {result.created_modifier_id}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Badge variant="destructive">Failed</Badge>
                        )}
                      </div>
                    </div>

                    {result.error && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-red-600">View Error</summary>
                        <pre className="text-xs bg-red-100 p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(result.error, null, 2)}
                        </pre>
                      </details>
                    )}
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
