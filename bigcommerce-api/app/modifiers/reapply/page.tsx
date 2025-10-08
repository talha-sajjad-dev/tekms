"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Search,
  Zap,
  AlertTriangle
} from "lucide-react"

interface ProductWithoutModifiers {
  id: number
  name: string
  sku: string
}

interface CheckResult {
  productsWithoutModifiers: ProductWithoutModifiers[]
  productsWithModifiers: any[]
  summary: {
    total: number
    withoutModifiers: number
    withModifiers: number
  }
}

export default function ReapplyModifiersPage() {
  const [checking, setChecking] = useState(false)
  const [applying, setApplying] = useState(false)
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null)
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [applicationResult, setApplicationResult] = useState<any>(null)

  // Working modifier templates
  const workingModifierTemplates = [
    {
      id: "shirt_size",
      display_name: "Shirt Size",
      type: "dropdown",
      required: true,
      option_values: [
        { label: "Small", sort_order: 0, value_data: null, is_default: false },
        { label: "Medium", sort_order: 1, value_data: null, is_default: false },
        { label: "Large", sort_order: 2, value_data: null, is_default: false },
        { label: "X-Large", sort_order: 3, value_data: null, is_default: false },
        { label: "2X-Large", sort_order: 4, value_data: null, is_default: false },
        { label: "3X-Large", sort_order: 5, value_data: null, is_default: false },
      ],
    },
    {
      id: "shirt_style",
      display_name: "Shirt Style",
      type: "dropdown",
      required: true,
      option_values: [
        { label: "Women Regular Crewneck", sort_order: 0, value_data: null, is_default: false },
        { label: "Unisex Crewneck", sort_order: 1, value_data: null, is_default: false },
        { label: "Women Vneck", sort_order: 2, value_data: null, is_default: false },
        { label: "Unisex Vneck", sort_order: 3, value_data: null, is_default: false },
        { label: "Women Tanktop", sort_order: 4, value_data: null, is_default: false },
        { label: "Unisex Tanktop", sort_order: 5, value_data: null, is_default: false },
        { label: "Women Long Sleeve", sort_order: 6, value_data: null, is_default: false },
        { label: "Unisex Long Sleeve", sort_order: 7, value_data: null, is_default: false },
        { label: "Unisex Sweatshirts", sort_order: 8, value_data: null, is_default: false },
        { label: "Unisex Hoodie", sort_order: 9, value_data: null, is_default: false },
      ],
    },
    {
      id: "personalization",
      display_name: "Personalization",
      type: "text",
      required: true,
      option_values: [],
    },
  ]

  const checkProductsWithoutModifiers = async () => {
    setChecking(true)
    setCheckResult(null)
    setApplicationResult(null)
    
    try {
      const response = await fetch("/api/bigcommerce/modifiers/check-and-apply?check_only=true")
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { message: errorText || "Unknown error" }
        }
        console.error("Check Products API Error:", errorData)
        throw new Error(errorData.error || errorData.message || "Failed to check products")
      }
      
      const data = await response.json()
      setCheckResult(data)
      
      if (data.summary.withoutModifiers === 0) {
        toast({
          title: "All Products Have Modifiers",
          description: "Great! All your products already have modifiers applied.",
        })
      } else {
        toast({
          title: "Check Complete",
          description: `Found ${data.summary.withoutModifiers} products without modifiers`,
        })
      }
    } catch (error) {
      console.error("Error checking products:", error)
      toast({
        title: "Error",
        description: "Failed to check products",
        variant: "destructive",
      })
    } finally {
      setChecking(false)
    }
  }

  const handleModifierSelection = (modifierId: string, checked: boolean) => {
    if (checked) {
      setSelectedModifiers([...selectedModifiers, modifierId])
    } else {
      setSelectedModifiers(selectedModifiers.filter((id) => id !== modifierId))
    }
  }

  const applyModifiersToProductsWithout = async () => {
    if (!checkResult || checkResult.productsWithoutModifiers.length === 0) {
      toast({
        title: "No Products to Process",
        description: "Please check for products without modifiers first",
        variant: "destructive",
      })
      return
    }

    if (selectedModifiers.length === 0) {
      toast({
        title: "No Modifiers Selected",
        description: "Please select at least one modifier to apply",
        variant: "destructive",
      })
      return
    }

    setApplying(true)
    setProgress(0)
    setApplicationResult(null)

    try {
      // Get selected modifier objects
      const modifiersToApply = workingModifierTemplates.filter(m => 
        selectedModifiers.includes(m.id)
      ).map(({ id, ...modifier }) => modifier)

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90))
      }, 1000)

      const response = await fetch("/api/bigcommerce/modifiers/check-and-apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          modifiers: modifiersToApply,
        }),
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { message: errorText || "Unknown error" }
        }
        console.error("API Error:", errorData)
        throw new Error(errorData.error || errorData.message || "Failed to apply modifiers")
      }

      const data = await response.json()
      setApplicationResult(data)

      if (data.summary.successful > 0) {
        toast({
          title: "Success!",
          description: `Applied ${data.summary.successful} modifiers successfully`,
        })
      } else if (data.summary.failed > 0) {
        toast({
          title: "Some Errors Occurred",
          description: `${data.summary.failed} modifiers failed to apply`,
          variant: "destructive",
        })
      }

      // Refresh the check results
      await checkProductsWithoutModifiers()
    } catch (error) {
      console.error("Error applying modifiers:", error)
      toast({
        title: "Error",
        description: "Failed to apply modifiers",
        variant: "destructive",
      })
    } finally {
      setApplying(false)
      setProgress(0)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Re-apply Modifiers to Products</h1>
        <p className="text-muted-foreground mb-8">
          Check for products without modifiers and re-apply them with rate limiting for BigCommerce basic users.
        </p>

        {/* Rate Limit Info */}
        <Alert className="mb-8">
          <Zap className="h-4 w-4" />
          <AlertTitle>Rate Limiting Enabled</AlertTitle>
          <AlertDescription>
            This tool automatically handles BigCommerce API rate limits by:
            <ul className="list-disc list-inside mt-2">
              <li>Adding 1 second delay between API calls</li>
              <li>Processing products in batches of 10</li>
              <li>Waiting 5 seconds between batches</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Step 1: Check Products */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Step 1: Check Products Without Modifiers
            </CardTitle>
            <CardDescription>
              Scan your catalog to find products that don't have any modifiers applied
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={checkProductsWithoutModifiers} 
              disabled={checking || applying}
              className="w-full sm:w-auto"
            >
              {checking ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Checking Products...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Check Products
                </>
              )}
            </Button>

            {checkResult && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{checkResult.summary.total}</div>
                    <p className="text-xs text-muted-foreground">Total Products</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-orange-600">
                      {checkResult.summary.withoutModifiers}
                    </div>
                    <p className="text-xs text-muted-foreground">Without Modifiers</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">
                      {checkResult.summary.withModifiers}
                    </div>
                    <p className="text-xs text-muted-foreground">With Modifiers</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Select Modifiers and Apply */}
        {checkResult && checkResult.productsWithoutModifiers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Step 2: Select Modifiers to Apply
              </CardTitle>
              <CardDescription>
                Choose which modifiers to apply to the {checkResult.productsWithoutModifiers.length} products without modifiers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-6">
                {workingModifierTemplates.map((modifier) => (
                  <Card key={modifier.id} className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`modifier-${modifier.id}`}
                          checked={selectedModifiers.includes(modifier.id)}
                          onCheckedChange={(checked) => 
                            handleModifierSelection(modifier.id, checked as boolean)
                          }
                        />
                        <div className="flex-1">
                          <h4 className="font-medium">{modifier.display_name}</h4>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline">{modifier.type}</Badge>
                            <Badge variant={modifier.required ? "default" : "secondary"}>
                              {modifier.required ? "Required" : "Optional"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {modifier.option_values && modifier.option_values.length > 0 && (
                        <div className="text-sm ml-6">
                          <span className="font-medium">Options: </span>
                          {modifier.option_values.map((option, idx) => (
                            <span key={idx} className="text-muted-foreground">
                              {option.label}
                              {idx < modifier.option_values!.length - 1 && ", "}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {applying && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Applying modifiers...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    This may take a while due to rate limiting. Please don't close this page.
                  </p>
                </div>
              )}

              <Button
                onClick={applyModifiersToProductsWithout}
                disabled={applying || selectedModifiers.length === 0}
                className="w-full"
              >
                {applying ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Applying Modifiers (Rate Limited)...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Apply Selected Modifiers to {checkResult.productsWithoutModifiers.length} Products
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Application Results */}
        {applicationResult && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Application Results</CardTitle>
              <CardDescription>
                Summary of the modifier application process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{applicationResult.summary.processed}</div>
                    <p className="text-xs text-muted-foreground">Products Processed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">
                      {applicationResult.summary.successful}
                    </div>
                    <p className="text-xs text-muted-foreground">Successful</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-600">
                      {applicationResult.summary.failed}
                    </div>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </CardContent>
                </Card>
              </div>

              {applicationResult.errors && applicationResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Errors Occurred</AlertTitle>
                  <AlertDescription>
                    <details className="mt-2">
                      <summary className="cursor-pointer">
                        View {applicationResult.errors.length} error details
                      </summary>
                      <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                        {applicationResult.errors.map((error: any, idx: number) => (
                          <div key={idx} className="text-xs p-2 bg-red-50 rounded">
                            <p><strong>Product:</strong> {error.product_name || error.product_id}</p>
                            <p><strong>Modifier:</strong> {error.modifier_name}</p>
                            <p><strong>Error:</strong> {JSON.stringify(error.error)}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Toaster />
    </div>
  )
}