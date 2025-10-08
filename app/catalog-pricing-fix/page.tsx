'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

export default function CatalogPricingFixPage() {
  const [isClearingAll, setIsClearingAll] = useState(false)
  const [isAddingAll, setIsAddingAll] = useState(false)
  const [isClearingTest, setIsClearingTest] = useState(false)
  const [isAddingTest, setIsAddingTest] = useState(false)
  const [clearResult, setClearResult] = useState<any>(null)
  const [addResult, setAddResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const clearAllRules = async (testMode = false) => {
    if (testMode) {
      setIsClearingTest(true)
    } else {
      setIsClearingAll(true)
    }
    setError(null)
    setClearResult(null)

    try {
      console.log(`🧹 Starting to clear ${testMode ? 'test' : 'all'} product rules...`)
      
      const response = await fetch(`/api/bigcommerce/catalog/clear-all-product-rules${testMode ? '?test=true' : ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (data.success) {
        console.log('✅ Product rules cleared successfully:', data)
        setClearResult(data)
      } else {
        console.error('❌ Failed to clear product rules:', data.error)
        setError(data.error || 'Failed to clear product rules')
      }
    } catch (err) {
      console.error('❌ Error clearing product rules:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      if (testMode) {
        setIsClearingTest(false)
      } else {
        setIsClearingAll(false)
      }
    }
  }

  const addAllRules = async (testMode = false) => {
    if (testMode) {
      setIsAddingTest(true)
    } else {
      setIsAddingAll(true)
    }
    setError(null)
    setAddResult(null)

    try {
      console.log(`🔧 Starting to add ${testMode ? 'test' : 'all'} product rules...`)
      
      const response = await fetch(`/api/bigcommerce/catalog/add-all-product-rules${testMode ? '?test=true' : ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (data.success) {
        console.log('✅ Product rules added successfully:', data)
        setAddResult(data)
      } else {
        console.error('❌ Failed to add product rules:', data.error)
        setError(data.error || 'Failed to add product rules')
      }
    } catch (err) {
      console.error('❌ Error adding product rules:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      if (testMode) {
        setIsAddingTest(false)
      } else {
        setIsAddingAll(false)
      }
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Catalog Pricing Fix</h1>
        <p className="text-muted-foreground">
          Clear incorrect pricing rules from all products and re-apply only the correct ones
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Test Mode Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Test Mode 
              <Badge variant="outline">First 10 Products</Badge>
            </CardTitle>
            <CardDescription>
              Test the process on the first 10 products before applying to the entire catalog
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button 
                onClick={() => clearAllRules(true)} 
                disabled={isClearingTest}
                className="w-full"
                variant="destructive"
              >
                {isClearingTest ? 'Clearing Test Rules...' : 'Clear Rules (Test - 10 Products)'}
              </Button>
              
              <Button 
                onClick={() => addAllRules(true)} 
                disabled={isAddingTest}
                className="w-full"
                variant="default"
              >
                {isAddingTest ? 'Adding Test Rules...' : 'Add Correct Rules (Test - 10 Products)'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Full Catalog Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Full Catalog 
              <Badge variant="destructive">All ~1800 Products</Badge>
            </CardTitle>
            <CardDescription>
              Apply the fix to the entire catalog (use only after testing)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button 
                onClick={() => clearAllRules(false)} 
                disabled={isClearingAll}
                className="w-full"
                variant="destructive"
              >
                {isClearingAll ? 'Clearing All Rules...' : 'Clear Rules (ALL Products)'}
              </Button>
              
              <Button 
                onClick={() => addAllRules(false)} 
                disabled={isAddingAll}
                className="w-full"
                variant="default"
              >
                {isAddingAll ? 'Adding All Rules...' : 'Add Correct Rules (ALL Products)'}
              </Button>
            </div>
            
            <Alert className="border-orange-200 bg-orange-50">
              <AlertDescription className="text-orange-800">
                <strong>Warning:</strong> This will process ~1800 products and may take 30+ minutes to complete.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Clear Results */}
      {clearResult && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-green-600">
              ✅ Product Rules Cleared Successfully
              {clearResult.summary?.testMode && <Badge className="ml-2" variant="outline">Test Mode</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{clearResult.summary?.totalProductsProcessed || 0}</div>
                  <div className="text-sm text-blue-800">Products Processed</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{clearResult.summary?.productsWithRules || 0}</div>
                  <div className="text-sm text-purple-800">Products Had Rules</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{clearResult.summary?.totalRulesDeleted || 0}</div>
                  <div className="text-sm text-red-800">Rules Deleted</div>
                </div>
              </div>

              {clearResult.results && clearResult.results.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Products with Deleted Rules (showing first 20):</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {clearResult.results.slice(0, 20).map((product: any, index: number) => (
                      <div key={index} className="bg-gray-50 p-3 rounded border-l-4 border-red-400">
                        <div className="font-medium">{product.productName} (ID: {product.productId})</div>
                        <div className="text-sm text-gray-600">
                          Found {product.rulesFound} rules, deleted {product.rulesDeleted}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Results */}
      {addResult && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-blue-600">
              ✅ Product Rules Added Successfully
              {addResult.summary?.testMode && <Badge className="ml-2" variant="outline">Test Mode</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{addResult.summary?.totalProductsProcessed || 0}</div>
                  <div className="text-sm text-blue-800">Products Processed</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{addResult.summary?.productsWithRulesAdded || 0}</div>
                  <div className="text-sm text-green-800">Products Got Rules</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{addResult.summary?.totalRulesAdded || 0}</div>
                  <div className="text-sm text-purple-800">Rules Added</div>
                </div>
              </div>

              {addResult.results && addResult.results.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Products with Added Rules (showing first 20):</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {addResult.results.slice(0, 20).map((product: any, index: number) => (
                      <div key={index} className="bg-green-50 p-3 rounded border-l-4 border-green-400">
                        <div className="font-medium">{product.productName} (ID: {product.productId})</div>
                        <div className="text-sm text-green-600">
                          Added {product.rulesAdded} rules: {product.rules.map((r: any) => `${r.name} (+$${r.price_adjustment})`).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Recommended Process:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Start with <strong>Test Mode</strong> to verify the process works correctly</li>
                <li>Click "Clear Rules (Test - 10 Products)" to remove existing rules from 10 products</li>
                <li>Click "Add Correct Rules (Test - 10 Products)" to add only the correct pricing</li>
                <li>Verify the results look correct in BigCommerce admin</li>
                <li>If satisfied, proceed with "Full Catalog" buttons for all ~1800 products</li>
              </ol>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Correct Pricing Rules:</h4>
              <div className="text-sm space-y-1">
                <div><strong>Shirt Sizes:</strong> 2X-Large (+$4), 3X-Large (+$6), Large/others (free)</div>
                <div><strong>Shirt Styles:</strong> Women Vneck/Tanktop (+$2), Long Sleeve (+$6), Hoodie (+$10), others (free)</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}