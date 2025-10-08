'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Zap, Play } from 'lucide-react'

interface FixSummary {
  totalProductsProcessed: number
  totalUpdates: number
  incorrectPricingRemoved: number
  correctPricingAdded: number
  productsFixed: number
}

export default function ApplyCorrectPricingPage() {
  const [fixSummary, setFixSummary] = useState<FixSummary | null>(null)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testSingleProduct = async (productId: number) => {
    setApplying(true)
    setError(null)
    setFixSummary(null)
    
    try {
      const response = await fetch(`/api/bigcommerce/catalog/apply-correct-pricing?test_product=${productId}`, {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        setFixSummary(data.summary)
      } else {
        setError(data.error || 'Failed to test pricing on product')
      }
    } catch (err) {
      setError('Failed to test pricing on product')
    } finally {
      setApplying(false)
    }
  }

  const applyCorrectPricing = async () => {
    setApplying(true)
    setError(null)
    setFixSummary(null)
    
    try {
      const response = await fetch('/api/bigcommerce/catalog/apply-correct-pricing', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        setFixSummary(data.summary)
      } else {
        setError(data.error || 'Failed to apply correct pricing')
      }
    } catch (err) {
      setError('Failed to apply correct pricing')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Apply Correct Pricing Rules</h1>
          <p className="text-muted-foreground">
            Fix all pricing rules across your entire catalog
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Apply Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Apply Correct Pricing to ALL Products
          </CardTitle>
          <CardDescription>
            This will fix pricing rules on your entire catalog. It will:
            <br />• Remove incorrect pricing (like Large with $4)
            <br />• Add correct pricing (like 2X-Large with $4)
            <br />• Ensure only the right sizes/styles have pricing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Button
              onClick={() => testSingleProduct(6032)}
              disabled={applying}
              className="w-full h-12 text-lg"
              size="lg"
              variant="outline"
            >
              <Play className="h-5 w-5 mr-2" />
              {applying ? 'Testing...' : 'Test on Product 6032 Only'}
            </Button>
            
            <Button
              onClick={applyCorrectPricing}
              disabled={applying}
              className="w-full h-12 text-lg"
              size="lg"
            >
              <Play className="h-5 w-5 mr-2" />
              {applying ? 'Applying Correct Pricing...' : 'Apply Correct Pricing to ALL Products'}
            </Button>
          </div>

          {applying && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span className="text-sm">Applying correct pricing rules to all products... This will take some time.</span>
              </div>
              <Progress value={undefined} className="w-full" />
              <div className="text-xs text-muted-foreground">
                Processing all products with rate limiting to respect BigCommerce API limits...
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {fixSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Pricing Rules Applied Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{fixSummary.totalProductsProcessed}</div>
                <div className="text-sm text-muted-foreground">Products Processed</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{fixSummary.totalUpdates}</div>
                <div className="text-sm text-muted-foreground">Total Updates Applied</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{fixSummary.incorrectPricingRemoved}</div>
                <div className="text-sm text-muted-foreground">Incorrect Pricing Removed</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{fixSummary.correctPricingAdded}</div>
                <div className="text-sm text-muted-foreground">Correct Pricing Added</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{fixSummary.productsFixed}</div>
                <div className="text-sm text-muted-foreground">Products Fixed</div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">✅ All Done!</h4>
              <p className="text-green-700 text-sm">
                Your pricing rules have been corrected. Now only 2X-Large and 3X-Large sizes will have pricing, 
                and only premium shirt styles will have pricing adjustments. Basic sizes and styles are now free.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* What Will Be Fixed */}
      <Card>
        <CardHeader>
          <CardTitle>Correct Pricing Rules</CardTitle>
          <CardDescription>
            These are the correct pricing rules that will be applied
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 text-green-600">Shirt Size - Correct Pricing</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                  <span>2X-Large</span>
                  <Badge className="bg-green-600">+$4.00</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                  <span>3X-Large</span>
                  <Badge className="bg-green-600">+$6.00</Badge>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-sm text-gray-600">
                    ✅ Small, Medium, Large, X-Large → FREE (no pricing)
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-green-600">Shirt Style - Correct Pricing</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                  <span>Women Vneck, Tanktop</span>
                  <Badge className="bg-green-600">+$2.00</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                  <span>Long Sleeve styles</span>
                  <Badge className="bg-green-600">+$6.00</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                  <span>Unisex Hoodie</span>
                  <Badge className="bg-green-600">+$10.00</Badge>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="text-sm text-gray-600">
                    ✅ Basic styles (Unisex Tshirt) → FREE (no pricing)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}