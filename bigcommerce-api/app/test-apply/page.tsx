"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react"

export default function TestApplyPage() {
  const [productId, setProductId] = useState("4223") // Default to a known working product
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const runTest = async () => {
    if (!productId) {
      toast({
        title: "Error",
        description: "Please enter a product ID",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/bigcommerce/test-modifier-apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: productId,
        }),
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        toast({
          title: "Test Successful!",
          description: "Modifier was successfully applied to the product",
        })
      } else {
        toast({
          title: "Test Failed",
          description: "Could not apply modifier - check results below",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Test error:", error)
      toast({
        title: "Test Error",
        description: "Failed to run test",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Test Modifier Application</h1>
      <p className="text-muted-foreground mb-8">
        Test applying a simple modifier to a single product to diagnose any issues.
      </p>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Single Product Test</CardTitle>
          <CardDescription>Test applying a simple text modifier to one product</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="product-id">Product ID</Label>
            <Input
              id="product-id"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="Enter a product ID"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Using product ID 4223 which we know exists from previous tests
            </p>
          </div>

          <Button onClick={runTest} disabled={loading || !productId} className="w-full">
            {loading ? "Testing Modifier Application..." : "Test Apply Simple Modifier"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Test Result
                {result.success ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    SUCCESS
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    FAILED
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.error ? (
                <p className="text-red-600">Error: {result.error}</p>
              ) : (
                <div className="space-y-2">
                  <p>
                    <strong>Product:</strong> {result.product?.name} (ID: {result.product?.id})
                  </p>
                  <p>
                    <strong>SKU:</strong> {result.product?.sku}
                  </p>
                  <p>
                    <strong>Modifiers Before:</strong> {result.current_modifiers_before?.length || 0}
                  </p>
                  <p>
                    <strong>Modifiers After:</strong> {result.current_modifiers_after?.length || 0}
                  </p>
                  <p>
                    <strong>API Response Status:</strong> {result.create_response?.status}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* API Response Details */}
          {result.create_response && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  API Response Details
                  {result.create_response.success ? (
                    <Badge className="bg-green-100 text-green-800">SUCCESS</Badge>
                  ) : (
                    <Badge variant="destructive">FAILED</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p>
                    <strong>Status Code:</strong> {result.create_response.status}
                  </p>

                  {result.create_response.data && (
                    <div>
                      <strong>Created Modifier ID:</strong> {result.create_response.data.data?.id || "N/A"}
                    </div>
                  )}

                  {result.create_response.error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded">
                      <h4 className="font-medium text-red-800">Error Details:</h4>
                      <pre className="text-sm text-red-600 mt-1 whitespace-pre-wrap">
                        {JSON.stringify(result.create_response.error, null, 2)}
                      </pre>
                    </div>
                  )}

                  {result.create_response.raw_response && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-muted-foreground">View Raw API Response</summary>
                      <pre className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-40">
                        {result.create_response.raw_response}
                      </pre>
                    </details>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Modifier Comparison */}
          {result.current_modifiers_before !== undefined && result.current_modifiers_after !== undefined && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Modifier Count Comparison
                  {result.current_modifiers_after.length > result.current_modifiers_before.length ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      MODIFIER ADDED
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      NO CHANGE
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Before Application</h4>
                    <p className="text-2xl font-bold">{result.current_modifiers_before.length}</p>
                    <p className="text-sm text-muted-foreground">modifiers</p>
                  </div>
                  <div>
                    <h4 className="font-medium">After Application</h4>
                    <p className="text-2xl font-bold">{result.current_modifiers_after.length}</p>
                    <p className="text-sm text-muted-foreground">modifiers</p>
                  </div>
                </div>

                {result.current_modifiers_after.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Current Modifiers:</h4>
                    <div className="space-y-1">
                      {result.current_modifiers_after.map((modifier: any, idx: number) => (
                        <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                          <strong>{modifier.display_name}</strong> (ID: {modifier.id}, Type: {modifier.type})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Debug Info */}
          {result.debug_info && (
            <Card>
              <CardHeader>
                <CardTitle>Debug Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>API URL:</strong> {result.debug_info.api_url}
                  </p>
                  <p>
                    <strong>Store Hash:</strong> {result.debug_info.store_hash}
                  </p>
                  <p>
                    <strong>Has Access Token:</strong> {result.debug_info.has_access_token ? "Yes" : "No"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Toaster />
    </div>
  )
}
