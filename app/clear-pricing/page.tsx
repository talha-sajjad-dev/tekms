'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ClearPricingPage() {
  const [isClearingModifiers, setIsClearingModifiers] = useState(false)
  const [isClearingRules, setIsClearingRules] = useState(false)
  const [isAddingRules, setIsAddingRules] = useState(false)
  const [productId, setProductId] = useState('6032')
  const [modifierResult, setModifierResult] = useState<any>(null)
  const [rulesResult, setRulesResult] = useState<any>(null)
  const [addRulesResult, setAddRulesResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const clearModifierPricing = async () => {
    if (!productId.trim()) {
      setError('Please enter a product ID')
      return
    }

    setIsClearingModifiers(true)
    setError(null)
    setModifierResult(null)

    try {
      console.log(`🧹 Starting to clear modifier pricing from product ${productId}...`)
      
      const response = await fetch(`/api/bigcommerce/catalog/clear-pricing?product_id=${productId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (data.success) {
        console.log('✅ Modifier pricing cleared successfully:', data)
        setModifierResult(data)
      } else {
        console.error('❌ Failed to clear modifier pricing:', data.error)
        setError(data.error || 'Failed to clear modifier pricing')
      }
    } catch (err) {
      console.error('❌ Error clearing modifier pricing:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsClearingModifiers(false)
    }
  }

  const clearProductRules = async () => {
    if (!productId.trim()) {
      setError('Please enter a product ID')
      return
    }

    setIsClearingRules(true)
    setError(null)
    setRulesResult(null)

    try {
      console.log(`🧹 Starting to clear product rules from product ${productId}...`)
      
      const response = await fetch(`/api/bigcommerce/catalog/clear-product-rules?product_id=${productId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (data.success) {
        console.log('✅ Product rules cleared successfully:', data)
        setRulesResult(data)
      } else {
        console.error('❌ Failed to clear product rules:', data.error)
        setError(data.error || 'Failed to clear product rules')
      }
    } catch (err) {
      console.error('❌ Error clearing product rules:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsClearingRules(false)
    }
  }

  const addProductRules = async () => {
    if (!productId.trim()) {
      setError('Please enter a product ID')
      return
    }

    setIsAddingRules(true)
    setError(null)
    setAddRulesResult(null)

    try {
      console.log(`🔧 Starting to add correct pricing rules to product ${productId}...`)
      
      const response = await fetch(`/api/bigcommerce/catalog/add-product-rules?product_id=${productId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (data.success) {
        console.log('✅ Product rules added successfully:', data)
        setAddRulesResult(data)
      } else {
        console.error('❌ Failed to add product rules:', data.error)
        setError(data.error || 'Failed to add product rules')
      }
    } catch (err) {
      console.error('❌ Error adding product rules:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsAddingRules(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Clear Product Pricing</h1>
        <p className="text-muted-foreground">
          Remove ALL pricing adjusters from a specific product to start fresh
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Clear Pricing Rules</CardTitle>
          <CardDescription>
            Remove ALL pricing rules from a product. Try both methods to ensure complete clearing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productId">Product ID</Label>
            <Input
              id="productId"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="Enter product ID (e.g., 6032)"
              className="max-w-xs"
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={clearProductRules}
                disabled={isClearingRules || !productId.trim()}
                className="flex-1 sm:flex-none"
                variant="destructive"
              >
                {isClearingRules ? 'Clearing Product Rules...' : `Clear Product Rules (v2 API)`}
              </Button>
              
              <Button
                onClick={clearModifierPricing}
                disabled={isClearingModifiers || !productId.trim()}
                className="flex-1 sm:flex-none"
                variant="outline"
              >
                {isClearingModifiers ? 'Clearing Modifier Pricing...' : `Clear Modifier Pricing (v3 API)`}
              </Button>
            </div>

            <div className="border-t pt-3">
              <Button
                onClick={addProductRules}
                disabled={isAddingRules || !productId.trim()}
                className="w-full sm:w-auto"
                variant="default"
              >
                {isAddingRules ? 'Adding Correct Rules...' : `Add Correct Pricing Rules (v2 API)`}
              </Button>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p><strong>Product Rules (v2):</strong> Complex pricing rules based on modifier combinations</p>
            <p><strong>Modifier Pricing (v3):</strong> Simple price adjusters on individual modifier values</p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {rulesResult && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-green-600">✅ Product Rules Cleared Successfully</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{rulesResult.summary?.totalRulesFound || 0}</div>
                  <div className="text-sm text-blue-800">Rules Found</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{rulesResult.summary?.rulesDeleted || 0}</div>
                  <div className="text-sm text-green-800">Rules Deleted</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{rulesResult.summary?.productId || 'N/A'}</div>
                  <div className="text-sm text-purple-800">Product ID</div>
                </div>
              </div>

              {rulesResult.deletedRules && rulesResult.deletedRules.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Deleted Product Rules:</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {rulesResult.deletedRules.map((rule: any, index: number) => (
                      <div key={index} className="bg-gray-50 p-3 rounded border-l-4 border-red-400">
                        <div className="font-medium">Rule ID: {rule.id}</div>
                        <div className="text-sm text-gray-600">Price Adjuster: {JSON.stringify(rule.price_adjuster)}</div>
                        <div className="text-sm text-gray-600">Conditions: {JSON.stringify(rule.conditions)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {modifierResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">✅ Modifier Pricing Cleared Successfully</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{modifierResult.summary?.totalUpdates || 0}</div>
                  <div className="text-sm text-blue-800">Total Updates</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{modifierResult.summary?.clearedValues || 0}</div>
                  <div className="text-sm text-green-800">Values Cleared</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{modifierResult.summary?.productId || 'N/A'}</div>
                  <div className="text-sm text-purple-800">Product ID</div>
                </div>
              </div>

              {modifierResult.results && modifierResult.results.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Changes Made:</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {modifierResult.results.map((change: any, index: number) => (
                      <div key={index} className="bg-gray-50 p-3 rounded border-l-4 border-red-400">
                        <div className="font-medium">{change.modifier}: {change.value}</div>
                        <div className="text-sm text-gray-600">{change.action}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {addRulesResult && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-blue-600">✅ Product Rules Added Successfully</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{addRulesResult.summary?.totalRulesAttempted || 0}</div>
                  <div className="text-sm text-blue-800">Rules Attempted</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{addRulesResult.summary?.rulesAdded || 0}</div>
                  <div className="text-sm text-green-800">Rules Added</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{addRulesResult.summary?.rulesSkipped || 0}</div>
                  <div className="text-sm text-red-800">Rules Skipped</div>
                </div>
              </div>

              {addRulesResult.addedRules && addRulesResult.addedRules.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-green-600">✅ Successfully Added Rules:</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {addRulesResult.addedRules.map((rule: any, index: number) => (
                      <div key={index} className="bg-green-50 p-3 rounded border-l-4 border-green-400">
                        <div className="font-medium">{rule.name}</div>
                        <div className="text-sm text-green-700">Price: +${rule.price_adjustment}</div>
                        <div className="text-sm text-green-600">Conditions: {rule.conditions.join(', ')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {addRulesResult.skippedRules && addRulesResult.skippedRules.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-red-600">⚠️ Skipped Rules:</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {addRulesResult.skippedRules.map((rule: any, index: number) => (
                      <div key={index} className="bg-red-50 p-3 rounded border-l-4 border-red-400">
                        <div className="font-medium">{rule.name}</div>
                        <div className="text-sm text-red-600">Reason: {rule.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {(rulesResult || modifierResult) && !addRulesResult && (
        <Alert className="mt-6 border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">
            Pricing rules have been cleared from product {productId}.
            You can now add the correct pricing rules using the "Add Correct Pricing Rules" button above.
          </AlertDescription>
        </Alert>
      )}

      {addRulesResult && (
        <Alert className="mt-6 border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-800">
            Pricing rules have been added to product {productId}.
            Check your BigCommerce admin to verify the rules are working correctly.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}