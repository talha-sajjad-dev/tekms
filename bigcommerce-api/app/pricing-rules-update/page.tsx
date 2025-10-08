'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, Clock, Zap } from 'lucide-react'

interface AnalysisData {
  totalProducts: number
  productsWithTargetModifiers: number
  modifiersNeedingPricing: number
  totalModifierValues: number
  estimatedApiCalls: number
  estimatedTimeHours: number
}

interface UpdateSummary {
  totalProducts: number
  productsWithTargetModifiers: number
  updatedProducts: number
  updatedModifiers: number
  forceUpdates: number
  regularUpdates: number
  successRate: string
}

export default function PricingRulesUpdatePage() {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [updateSummary, setUpdateSummary] = useState<UpdateSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyzeProducts = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/bigcommerce/catalog/update-pricing-rules')
      const data = await response.json()
      
      if (data.success) {
        setAnalysis(data.analysis)
      } else {
        setError(data.error || 'Failed to analyze products')
      }
    } catch (err) {
      setError('Failed to analyze products')
    } finally {
      setLoading(false)
    }
  }

  const updatePricingRules = async (forceUpdate: boolean = false) => {
    setUpdating(true)
    setError(null)
    setUpdateSummary(null)
    
    try {
      const url = forceUpdate 
        ? '/api/bigcommerce/catalog/update-pricing-rules?force=true'
        : '/api/bigcommerce/catalog/update-pricing-rules'
        
      const response = await fetch(url, { method: 'POST' })
      const data = await response.json()
      
      if (data.success) {
        setUpdateSummary(data.summary)
      } else {
        setError(data.error || 'Failed to update pricing rules')
      }
    } catch (err) {
      setError('Failed to update pricing rules')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pricing Rules Update</h1>
          <p className="text-muted-foreground">
            Update pricing rules on all products with Shirt Size and Shirt Style modifiers
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Analysis Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Step 1: Analyze Current State
          </CardTitle>
          <CardDescription>
            Check how many products need pricing rules updated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={analyzeProducts} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Analyzing...' : 'Analyze Products'}
          </Button>

          {analysis && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{analysis.totalProducts}</div>
                <div className="text-sm text-muted-foreground">Total Products</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{analysis.productsWithTargetModifiers}</div>
                <div className="text-sm text-muted-foreground">With Target Modifiers</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{analysis.modifiersNeedingPricing}</div>
                <div className="text-sm text-muted-foreground">Values Need Pricing</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{analysis.estimatedApiCalls}</div>
                <div className="text-sm text-muted-foreground">Estimated API Calls</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">{analysis.estimatedTimeHours}h</div>
                <div className="text-sm text-muted-foreground">Estimated Time</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Section */}
      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Step 2: Update Pricing Rules
            </CardTitle>
            <CardDescription>
              Choose your update strategy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Regular Update</CardTitle>
                  <CardDescription>
                    Only update products that need pricing changes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => updatePricingRules(false)}
                    disabled={updating}
                    className="w-full"
                    variant="outline"
                  >
                    {updating ? 'Updating...' : 'Regular Update'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 border-orange-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-orange-600">Force Update</CardTitle>
                  <CardDescription>
                    Update ALL products regardless of current pricing state
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => updatePricingRules(true)}
                    disabled={updating}
                    className="w-full"
                    variant="default"
                  >
                    {updating ? 'Force Updating...' : 'Force Update All'}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {updating && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Updating pricing rules... This may take several hours.</span>
                </div>
                <Progress value={undefined} className="w-full" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results Section */}
      {updateSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Update Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{updateSummary.updatedProducts}</div>
                <div className="text-sm text-muted-foreground">Products Updated</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{updateSummary.updatedModifiers}</div>
                <div className="text-sm text-muted-foreground">Modifiers Updated</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{updateSummary.forceUpdates}</div>
                <div className="text-sm text-muted-foreground">Force Updates</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{updateSummary.successRate}</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Rules Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Current Pricing Rules</CardTitle>
          <CardDescription>
            These are the pricing adjustments that will be applied
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Shirt Size</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>2X-Large</span>
                  <Badge variant="secondary">+$4.00</Badge>
                </div>
                <div className="flex justify-between">
                  <span>3X-Large</span>
                  <Badge variant="secondary">+$6.00</Badge>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Shirt Style</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Women Vneck</span>
                  <Badge variant="secondary">+$2.00</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Women Tanktop</span>
                  <Badge variant="secondary">+$2.00</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Women Long Sleeve</span>
                  <Badge variant="secondary">+$6.00</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Unisex Long Sleeve</span>
                  <Badge variant="secondary">+$6.00</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Unisex Sweatshirts</span>
                  <Badge variant="secondary">+$6.00</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Unisex Hoodie</span>
                  <Badge variant="secondary">+$10.00</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}