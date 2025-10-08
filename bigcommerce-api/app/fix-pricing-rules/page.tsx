'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertTriangle, Zap, Eye, Wrench } from 'lucide-react'

interface AnalysisData {
  totalProducts: number
  productsWithIssues: number
  totalIssues: number
  estimatedApiCalls: number
  estimatedTimeHours: number
}

interface Issue {
  type: 'incorrect_pricing' | 'unwanted_pricing'
  modifier: string
  value: string
  currentPrice: number
  correctPrice: number
  issue: string
}

interface ProductIssue {
  productId: number
  productName: string
  issues: Issue[]
}

interface FixSummary {
  totalProductsProcessed: number
  issuesFixed: number
  incorrectPricingRemoved: number
  correctPricingAdded: number
  productsFixed: number
}

export default function FixPricingRulesPage() {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [issues, setIssues] = useState<ProductIssue[]>([])
  const [fixSummary, setFixSummary] = useState<FixSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyzeIssues = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/bigcommerce/catalog/fix-pricing-rules')
      const data = await response.json()
      
      if (data.success) {
        setAnalysis(data.analysis)
        setIssues(data.issues || [])
      } else {
        setError(data.error || 'Failed to analyze pricing issues')
      }
    } catch (err) {
      setError('Failed to analyze pricing issues')
    } finally {
      setLoading(false)
    }
  }

  const fixPricingRules = async (dryRun: boolean = false) => {
    setFixing(true)
    setError(null)
    setFixSummary(null)
    
    try {
      const url = dryRun 
        ? '/api/bigcommerce/catalog/fix-pricing-rules?dry_run=true'
        : '/api/bigcommerce/catalog/fix-pricing-rules'
        
      const response = await fetch(url, { method: 'POST' })
      const data = await response.json()
      
      if (data.success) {
        setFixSummary(data.summary)
      } else {
        setError(data.error || 'Failed to fix pricing rules')
      }
    } catch (err) {
      setError('Failed to fix pricing rules')
    } finally {
      setFixing(false)
    }
  }

  const getIssueColor = (type: string) => {
    switch (type) {
      case 'incorrect_pricing': return 'bg-orange-100 text-orange-800'
      case 'unwanted_pricing': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fix Pricing Rules</h1>
          <p className="text-muted-foreground">
            Identify and fix incorrect pricing rules on your products
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Correct Rules Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Correct Pricing Rules</CardTitle>
          <CardDescription>
            Only these modifier values should have pricing adjustments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2 text-green-600">Shirt Size (Only these should have pricing)</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>2X-Large</span>
                  <Badge variant="secondary">+$4.00</Badge>
                </div>
                <div className="flex justify-between">
                  <span>3X-Large</span>
                  <Badge variant="secondary">+$6.00</Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  ❌ Small, Medium, Large, X-Large should have NO pricing
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-green-600">Shirt Style (Only these should have pricing)</h4>
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
                <div className="text-sm text-muted-foreground mt-2">
                  ❌ Basic styles like "Unisex Tshirt" should have NO pricing
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Step 1: Analyze Current Pricing Issues
          </CardTitle>
          <CardDescription>
            Check for incorrect pricing rules on your products
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={analyzeIssues} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Analyzing...' : 'Analyze Pricing Issues'}
          </Button>

          {analysis && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{analysis.totalProducts}</div>
                <div className="text-sm text-muted-foreground">Total Products</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{analysis.productsWithIssues}</div>
                <div className="text-sm text-muted-foreground">Products with Issues</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{analysis.totalIssues}</div>
                <div className="text-sm text-muted-foreground">Total Issues</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{analysis.estimatedApiCalls}</div>
                <div className="text-sm text-muted-foreground">API Calls to Fix</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{analysis.estimatedTimeHours}h</div>
                <div className="text-sm text-muted-foreground">Estimated Time</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issues Details */}
      {issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sample Issues Found</CardTitle>
            <CardDescription>
              First 20 products with pricing issues (showing sample)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {issues.map((product) => (
                <div key={product.productId} className="border rounded-lg p-4">
                  <h4 className="font-semibold">{product.productName} (ID: {product.productId})</h4>
                  <div className="mt-2 space-y-2">
                    {product.issues.map((issue, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getIssueColor(issue.type)}>
                            {issue.type === 'incorrect_pricing' ? 'Wrong Price' : 'Unwanted Price'}
                          </Badge>
                          <span className="text-sm">
                            {issue.modifier}: {issue.value}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ${issue.currentPrice} → ${issue.correctPrice}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fix Section */}
      {analysis && analysis.totalIssues > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Step 2: Fix Pricing Issues
            </CardTitle>
            <CardDescription>
              Choose how to fix the identified issues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-2 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-blue-600">Preview Changes</CardTitle>
                  <CardDescription>
                    See what would be fixed without making changes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => fixPricingRules(true)}
                    disabled={fixing}
                    className="w-full"
                    variant="outline"
                  >
                    {fixing ? 'Previewing...' : 'Preview Fix (Dry Run)'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 border-green-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-green-600">Apply Fixes</CardTitle>
                  <CardDescription>
                    Fix all identified pricing issues
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => fixPricingRules(false)}
                    disabled={fixing}
                    className="w-full"
                    variant="default"
                  >
                    {fixing ? 'Fixing...' : 'Fix All Issues'}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {fixing && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  <span className="text-sm">Fixing pricing issues... This may take some time.</span>
                </div>
                <Progress value={undefined} className="w-full" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results Section */}
      {fixSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Fix Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{fixSummary.issuesFixed}</div>
                <div className="text-sm text-muted-foreground">Issues Fixed</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{fixSummary.incorrectPricingRemoved}</div>
                <div className="text-sm text-muted-foreground">Incorrect Pricing Removed</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{fixSummary.correctPricingAdded}</div>
                <div className="text-sm text-muted-foreground">Correct Pricing Added</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{fixSummary.productsFixed}</div>
                <div className="text-sm text-muted-foreground">Products Fixed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}