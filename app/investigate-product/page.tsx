"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"

export default function InvestigateProductPage() {
  const [productId, setProductId] = useState("4225") // Default to the problematic product
  const [loading, setLoading] = useState(false)
  const [productData, setProductData] = useState<any>(null)
  const [modifiersData, setModifiersData] = useState<any>(null)
  const [testResults, setTestResults] = useState<any[]>([])

  const investigateProduct = async () => {
    if (!productId) {
      toast({
        title: "Error",
        description: "Please enter a product ID",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setProductData(null)
    setModifiersData(null)
    setTestResults([])

    try {
      console.log(`=== INVESTIGATING PRODUCT ${productId} ===`)

      // Step 1: Get product details
      console.log("Step 1: Fetching product details...")
      const productResponse = await fetch(`/api/bigcommerce/products/${productId}`)
      const productResult = await productResponse.json()

      if (productResponse.ok) {
        setProductData(productResult.data)
        console.log("Product found:", productResult.data.name)
      } else {
        throw new Error(`Product not found: ${productResult.error}`)
      }

      // Step 2: Get existing modifiers
      console.log("Step 2: Fetching existing modifiers...")
      const modifiersResponse = await fetch(`/api/bigcommerce/catalog/products/${productId}/modifiers`)
      const modifiersResult = await modifiersResponse.json()

      if (modifiersResponse.ok) {
        setModifiersData(modifiersResult)
        console.log(`Found ${modifiersResult.data?.length || 0} existing modifiers`)
      } else {
        console.log("No modifiers found or error:", modifiersResult)
        setModifiersData({ data: [], error: modifiersResult })
      }

      // Step 3: Test each modifier individually
      console.log("Step 3: Testing individual modifier creation...")
      const testModifiers = [
        {
          display_name: "Shirt Size",
          type: "dropdown",
          required: true,
          option_values: [
            { label: "Small", sort_order: 0, value_data: null, is_default: false },
            { label: "Medium", sort_order: 1, value_data: null, is_default: false },
          ],
        },
        {
          display_name: "Shirt Style",
          type: "dropdown",
          required: true,
          option_values: [
            { label: "Women Regular Crewneck", sort_order: 0, value_data: null, is_default: false },
            { label: "Unisex Crewneck", sort_order: 1, value_data: null, is_default: false },
          ],
        },
        {
          display_name: "Personalization",
          type: "text",
          required: true,
          option_values: [],
        },
      ]

      const results = []

      for (const testModifier of testModifiers) {
        console.log(`Testing modifier: ${testModifier.display_name}`)

        try {
          const testResponse = await fetch(`/api/bigcommerce/catalog/products/${productId}/modifiers`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(testModifier),
          })

          const testResponseText = await testResponse.text()
          console.log(`${testModifier.display_name} response:`, testResponse.status, testResponseText)

          let testResponseData
          try {
            testResponseData = testResponseText ? JSON.parse(testResponseText) : {}
          } catch {
            testResponseData = { raw: testResponseText }
          }

          results.push({
            modifier_name: testModifier.display_name,
            success: testResponse.ok,
            status: testResponse.status,
            response: testResponseData,
            raw_response: testResponseText,
          })
        } catch (error) {
          console.error(`Error testing ${testModifier.display_name}:`, error)
          results.push({
            modifier_name: testModifier.display_name,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          })
        }
      }

      setTestResults(results)

      // Step 4: Check modifiers again after test
      console.log("Step 4: Checking modifiers after test...")
      const finalModifiersResponse = await fetch(`/api/bigcommerce/catalog/products/${productId}/modifiers`)
      const finalModifiersResult = await finalModifiersResponse.json()

      if (finalModifiersResponse.ok) {
        console.log(`Final modifier count: ${finalModifiersResult.data?.length || 0}`)
      }

      toast({
        title: "Investigation Complete",
        description: `Investigated product ${productId} and tested modifier creation`,
      })
    } catch (error) {
      console.error("Investigation failed:", error)
      toast({
        title: "Investigation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const clearModifiers = async () => {
    if (!productId || !modifiersData?.data?.length) {
      toast({
        title: "Error",
        description: "No modifiers to clear",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      console.log(`Clearing all modifiers from product ${productId}...`)

      for (const modifier of modifiersData.data) {
        try {
          const deleteResponse = await fetch(`/api/bigcommerce/modifiers/${productId}/${modifier.id}`, {
            method: "DELETE",
          })

          if (deleteResponse.ok) {
            console.log(`✅ Deleted modifier: ${modifier.display_name} (ID: ${modifier.id})`)
          } else {
            console.error(`❌ Failed to delete modifier: ${modifier.display_name}`)
          }
        } catch (error) {
          console.error(`Error deleting modifier ${modifier.id}:`, error)
        }
      }

      toast({
        title: "Modifiers Cleared",
        description: `Attempted to clear all modifiers from product ${productId}`,
      })

      // Refresh the investigation
      setTimeout(() => investigateProduct(), 1000)
    } catch (error) {
      console.error("Error clearing modifiers:", error)
      toast({
        title: "Error",
        description: "Failed to clear modifiers",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Investigate Product Modifiers</h1>
      <p className="text-muted-foreground mb-8">
        Deep dive into what's happening with modifiers on a specific product to understand the "already exists" error.
      </p>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Product Investigation</CardTitle>
          <CardDescription>Enter a product ID to investigate its modifier situation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="product-id">Product ID</Label>
            <Input
              id="product-id"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="Enter product ID (e.g., 4225)"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={investigateProduct} disabled={loading || !productId}>
              {loading ? "Investigating..." : "Investigate Product"}
            </Button>
            {modifiersData?.data?.length > 0 && (
              <Button onClick={clearModifiers} disabled={loading} variant="destructive">
                Clear All Modifiers
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {productData && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>ID:</strong> {productData.id}
              </div>
              <div>
                <strong>SKU:</strong> {productData.sku}
              </div>
              <div className="col-span-2">
                <strong>Name:</strong> {productData.name}
              </div>
              <div>
                <strong>Type:</strong> {productData.type}
              </div>
              <div>
                <strong>Visible:</strong> {productData.is_visible ? "Yes" : "No"}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {modifiersData && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Current Modifiers
              <Badge variant="secondary">{modifiersData.data?.length || 0} found</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {modifiersData.data && modifiersData.data.length > 0 ? (
              <div className="space-y-3">
                {modifiersData.data.map((modifier, idx) => (
                  <div key={idx} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{modifier.display_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          ID: {modifier.id} | Type: {modifier.type} | Required: {modifier.required ? "Yes" : "No"}
                        </p>
                      </div>
                      <Badge variant="outline">Exists</Badge>
                    </div>
                    {modifier.option_values && modifier.option_values.length > 0 && (
                      <div className="mt-2 text-sm">
                        <strong>Options:</strong> {modifier.option_values.map((opt) => opt.label).join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">No modifiers found on this product</p>
              </div>
            )}

            {modifiersData.error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <h4 className="font-medium text-red-800">API Error:</h4>
                <pre className="text-xs text-red-600 mt-1">{JSON.stringify(modifiersData.error, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Modifier Creation Test Results</CardTitle>
            <CardDescription>Results from attempting to create each modifier individually</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{result.modifier_name}</h4>
                    <div className="flex gap-2">
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? "Success" : "Failed"}
                      </Badge>
                      {result.status && <Badge variant="outline">Status: {result.status}</Badge>}
                    </div>
                  </div>

                  {result.response && (
                    <div className="mt-2">
                      <details>
                        <summary className="cursor-pointer text-sm text-muted-foreground">View API Response</summary>
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-32">
                          {JSON.stringify(result.response, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}

                  {result.error && (
                    <div className="mt-2 text-sm text-red-600">
                      <strong>Error:</strong> {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Toaster />
    </div>
  )
}
