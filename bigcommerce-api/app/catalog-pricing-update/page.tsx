'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, DollarSign, Package, AlertTriangle, Play, RefreshCw, Clock, Zap } from 'lucide-react'

interface UpdateResult {
  productId: number
  productName: string
  updated: boolean
  modifiersCount: number
  error?: string
}

interface UpdateSummary {
  totalProducts: number
  updatedProducts: number
  updatedModifiers: number
}

// Price rules configuration display
const PRICING_RULES = {
  "Shirt Size": {
    "2X-Large": 4.00,
    "3X-Large": 6.00
  },
  "Shirt Style": {
    "Women Vneck": 2.00,
    "Women Tanktop": 2.00,
    "Women Long Sleeve": 6.00,
    "Unisex Long Sleeve": 6.00,
    "Unisex Sweatshirts": 6.00,
    "Unisex Hoodie": 10.00
  }
}

export default function CatalogPricingUpdatePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [updateResults, setUpdateResults] = useState<UpdateResult[]>([])
  const [updateSummary, setUpdateSummary] = useState<UpdateSummary | null>(null)
  const [error, setError] = useState<string>('')
  const [estimatedTime, setEstimatedTime] = useState<string>('')

  const handleUpdateCatalog = async () => {
    setIsLoading(true)
    setError('')
    setUpdateResults([])
    setUpdateSummary(null)

    try {
      console.log('🚀 Starting catalog pricing rules update...')
      
      const response = await fetch('/api/bigcommerce/catalog/update-pricing-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update catalog')
      }

      if (data.success) {
        setUpdateSummary(data.summary)
        setUpdateResults(data.results || [])
        console.log('✅ Catalog update completed successfully')
      } else {
        throw new Error(data.error || 'Update failed')
      }

    } catch (err) {
      console.error('❌ Catalog update failed:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateRemainingProducts = async () => {
    if (!updateResults.length) {
      setError('No previous results found. Please run the full catalog update first.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      console.log('🎯 Starting update for remaining products...')
      
      // Get product IDs that were already updated
      const updatedProductIds = updateResults
        .filter(result => result.updated)
        .map(result => result.productId)
      
      console.log(`🚫 Excluding ${updatedProductIds.length} already updated products`)

      const response = await fetch('/api/bigcommerce/catalog/update-pricing-rules-remaining', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          excludeProductIds: updatedProductIds
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update remaining products')
      }

      if (data.success) {
        // Merge the new results with existing results
        const mergedResults = [...updateResults]
        
        // Update or add new results
        data.results.forEach((newResult: UpdateResult) => {
          const existingIndex = mergedResults.findIndex(r => r.productId === newResult.productId)
          if (existingIndex >= 0) {
            mergedResults[existingIndex] = newResult
          } else {
            mergedResults.push(newResult)
          }
        })

        // Update summary by combining both runs
        const totalUpdatedProducts = mergedResults.filter(r => r.updated).length
        const totalUpdatedModifiers = (updateSummary?.updatedModifiers || 0) + data.summary.updatedModifiers

        setUpdateSummary({
          totalProducts: updateSummary?.totalProducts || data.summary.totalProcessedProducts,
          updatedProducts: totalUpdatedProducts,
          updatedModifiers: totalUpdatedModifiers
        })
        
        setUpdateResults(mergedResults)
        console.log('✅ Remaining products update completed successfully')
      } else {
        throw new Error(data.error || 'Update failed')
      }

    } catch (err) {
      console.error('❌ Remaining products update failed:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const getSuccessRate = () => {
    if (!updateSummary) return 0
    return updateSummary.totalProducts > 0 
      ? Math.round((updateSummary.updatedProducts / updateSummary.totalProducts) * 100)
      : 0
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Catalog Pricing Rules Update</h1>
          <p className="text-muted-foreground mt-2">
            Apply pricing rules to all products in your BigCommerce catalog
          </p>
        </div>
      </div>

      {/* Rate Limit Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            API Rate Limiting
          </CardTitle>
          <CardDescription>
            BigCommerce API limits and optimization details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-yellow-50 rounded">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="font-semibold text-yellow-800">Plus Plan Limits</span>
              </div>
              <div className="text-sm text-yellow-700">
                <div>20,000 calls/hour</div>
                <div>150 calls/30 seconds</div>
              </div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-blue-800">Our Safety Limits</span>
              </div>
              <div className="text-sm text-blue-700">
                <div>16,000 calls/hour (80%)</div>
                <div>120 calls/30 seconds (80%)</div>
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-green-800">Smart Features</span>
              </div>
              <div className="text-sm text-green-700">
                <div>Auto rate limiting</div>
                <div>Retry on 429 errors</div>
                <div>Queue management</div>
              </div>
            </div>
          </div>
          
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Performance Note:</strong> With ~1800 products, expect the full catalog update to take 10-15 minutes 
              due to API rate limiting. The system will automatically pace requests to stay within BigCommerce limits.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Current Pricing Rules Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Current Pricing Rules
          </CardTitle>
          <CardDescription>
            These rules will be applied to all matching modifiers across your entire catalog
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(PRICING_RULES).map(([category, rules]) => (
              <div key={category} className="space-y-3">
                <h3 className="font-semibold text-lg">{category}</h3>
                <div className="space-y-2">
                  {Object.entries(rules).map(([option, price]) => (
                    <div key={option} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{option}</span>
                      <Badge variant="secondary">+${price.toFixed(2)}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Update Action Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Catalog Update
          </CardTitle>
          <CardDescription>
            This will scan all products in your catalog and apply price adjusters to matching modifier values
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> This operation will modify all products in your catalog. 
              Make sure you have a backup of your store data before proceeding.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Button 
              onClick={handleUpdateCatalog}
              disabled={isLoading}
              size="lg"
              className="w-full"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Updating Catalog...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Catalog Update
                </>
              )}
            </Button>

            {updateResults.length > 0 && getSuccessRate() < 100 && (
              <Button 
                onClick={handleUpdateRemainingProducts}
                disabled={isLoading}
                size="lg"
                variant="secondary"
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Updating Remaining Products...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Update Remaining Products Only
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Update Summary */}
      {updateSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Update Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-muted rounded">
                <div className="text-2xl font-bold">{updateSummary.totalProducts}</div>
                <div className="text-sm text-muted-foreground">Total Products</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">{updateSummary.updatedProducts}</div>
                <div className="text-sm text-muted-foreground">Products Updated</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">{updateSummary.updatedModifiers}</div>
                <div className="text-sm text-muted-foreground">Modifiers Updated</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Success Rate</span>
                <span>{getSuccessRate()}%</span>
              </div>
              <Progress value={getSuccessRate()} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Results */}
      {updateResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Results</CardTitle>
            <CardDescription>
              Product-by-product update results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {updateResults.map((result) => (
                <div 
                  key={result.productId} 
                  className={`flex items-center justify-between p-3 rounded border ${
                    result.updated 
                      ? 'bg-green-50 border-green-200' 
                      : result.error 
                      ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{result.productName}</div>
                    <div className="text-xs text-muted-foreground">
                      ID: {result.productId} • {result.modifiersCount} modifiers
                    </div>
                    {result.error && (
                      <div className="text-xs text-red-600 mt-1">{result.error}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {result.updated ? (
                      <Badge variant="default" className="bg-green-600">Updated</Badge>
                    ) : result.error ? (
                      <Badge variant="destructive">Error</Badge>
                    ) : (
                      <Badge variant="secondary">No Changes</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
