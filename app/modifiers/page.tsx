"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Search, RefreshCw, CheckCircle } from "lucide-react"

interface Product {
  id: number
  name: string
  sku: string
}

interface ExistingModifier {
  id: number
  display_name: string
  type: string
  required: boolean
  option_values?: Array<{
    id: number
    label: string
    value: string
    price_adjustment: number
    is_default: boolean
  }>
}

export default function ModifiersPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [existingModifiers, setExistingModifiers] = useState<ExistingModifier[]>([])
  const [selectedModifiers, setSelectedModifiers] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [productsLoading, setProductsLoading] = useState(true)
  const [modifiersLoading, setModifiersLoading] = useState(true)
  const [selectAll, setSelectAll] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [lastErrors, setLastErrors] = useState<any[]>([])
  const [successCount, setSuccessCount] = useState(0)

  // Predefined working modifier templates based on product 6013
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

  // Filter products based on search term
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [products, searchTerm])

  useEffect(() => {
    fetchProducts()
    // Set the working modifiers as available options
    setExistingModifiers(workingModifierTemplates)
    setModifiersLoading(false)
  }, [])

  const fetchProducts = async () => {
    setProductsLoading(true)
    try {
      const response = await fetch("/api/bigcommerce/products/all")
      const data = await response.json()

      if (data.data && Array.isArray(data.data)) {
        setProducts(data.data)
        toast({
          title: "Products Loaded",
          description: `Loaded ${data.data.length} products`,
        })
      } else if (data.error) {
        console.error("API returned error:", data.error, data.details)
        toast({
          title: "Error Loading Products",
          description: data.error,
          variant: "destructive",
        })
        setProducts([])
      } else {
        setProducts([])
        toast({
          title: "No Products Found",
          description: "No products were returned from the API",
        })
      }
    } catch (error) {
      console.error("Error fetching products:", error)
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive",
      })
      setProducts([])
    } finally {
      setProductsLoading(false)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked)
    if (checked) {
      setSelectedProducts(filteredProducts.map((p) => p.id))
    } else {
      setSelectedProducts([])
    }
  }

  const handleProductSelection = (productId: number, checked: boolean) => {
    let newSelectedProducts
    if (checked) {
      newSelectedProducts = [...selectedProducts, productId]
    } else {
      newSelectedProducts = selectedProducts.filter((id) => id !== productId)
    }

    setSelectedProducts(newSelectedProducts)

    const filteredProductIds = filteredProducts.map((p) => p.id)
    const allFilteredSelected = filteredProductIds.every((id) => newSelectedProducts.includes(id))
    setSelectAll(allFilteredSelected && filteredProducts.length > 0)
  }

  const handleModifierSelection = (modifierId: string, checked: boolean) => {
    if (checked) {
      setSelectedModifiers([...selectedModifiers, modifierId])
    } else {
      setSelectedModifiers(selectedModifiers.filter((id) => id !== modifierId))
    }
  }

  const applyWorkingModifiers = async () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one product",
        variant: "destructive",
      })
      return
    }

    if (selectedModifiers.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one modifier to apply",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setLastErrors([])
    setSuccessCount(0)

    try {
      // Get the selected modifier templates
      const modifierTemplates = workingModifierTemplates.filter((m) => selectedModifiers.includes(m.id))

      let totalSuccessful = 0
      let totalFailed = 0
      let totalSkipped = 0
      const allErrors = []

      // Apply each modifier template to all selected products
      for (const productId of selectedProducts) {
        // First, check existing modifiers on this product
        console.log(`Checking existing modifiers for product ${productId}...`)
        let existingProductModifiers = []

        try {
          const existingResponse = await fetch(`/api/bigcommerce/catalog/products/${productId}/modifiers`, {
            headers: {
              "Content-Type": "application/json",
            },
          })

          if (existingResponse.ok) {
            const existingData = await existingResponse.json()
            existingProductModifiers = existingData.data || []
            console.log(`Found ${existingProductModifiers.length} existing modifiers on product ${productId}`)
          }
        } catch (error) {
          console.error(`Error checking existing modifiers for product ${productId}:`, error)
        }

        // Now apply each selected modifier, checking for duplicates
        for (const modifierTemplate of modifierTemplates) {
          console.log(`Processing modifier: ${modifierTemplate.display_name} for product: ${productId}`)

          // Check if this modifier name already exists on the product
          const modifierExists = existingProductModifiers.some(
            (m) => m.display_name.toLowerCase() === modifierTemplate.display_name.toLowerCase(),
          )

          if (modifierExists) {
            console.log(`⏭️ Skipping ${modifierTemplate.display_name} - already exists on product ${productId}`)
            totalSkipped++
            continue
          }

          // Use the exact structure that works from product 6013
          const workingModifier = {
            display_name: modifierTemplate.display_name,
            type: modifierTemplate.type,
            required: modifierTemplate.required,
            option_values: modifierTemplate.option_values,
          }

          try {
            console.log(`Sending working modifier data:`, JSON.stringify(workingModifier, null, 2))

            const response = await fetch(`/api/bigcommerce/catalog/products/${productId}/modifiers`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(workingModifier),
            })

            if (response.ok) {
              totalSuccessful++
              console.log(`✅ Successfully applied ${modifierTemplate.display_name} to product ${productId}`)
            } else {
              totalFailed++
              const errorText = await response.text()
              let errorData
              try {
                errorData = JSON.parse(errorText)
              } catch {
                errorData = { message: errorText || "Unknown error" }
              }

              console.error(`❌ Failed to apply ${modifierTemplate.display_name} to product ${productId}:`, errorData)

              allErrors.push({
                product_id: productId,
                product_name: products.find((p) => p.id === productId)?.name || `Product ${productId}`,
                modifier: modifierTemplate.display_name,
                error: errorData,
                status: response.status,
              })
            }
          } catch (error) {
            totalFailed++
            console.error(`💥 Exception applying ${modifierTemplate.display_name} to product ${productId}:`, error)

            allErrors.push({
              product_id: productId,
              product_name: products.find((p) => p.id === productId)?.name || `Product ${productId}`,
              modifier: modifierTemplate.display_name,
              error: error instanceof Error ? error.message : "Unknown error",
            })
          }
        }
      }

      // Store results
      setLastErrors(allErrors)
      setSuccessCount(totalSuccessful)

      if (totalSuccessful > 0 || totalSkipped > 0) {
        toast({
          title: "Success! 🎉",
          description: `Applied ${totalSuccessful} modifiers successfully! ${
            totalSkipped > 0 ? `${totalSkipped} already existed and were skipped. ` : ""
          }${totalFailed > 0 ? `${totalFailed} failed.` : ""}`,
        })

        // Reset selections on success
        setSelectedProducts([])
        setSelectedModifiers([])
        setSelectAll(false)
      } else if (totalFailed > 0) {
        toast({
          title: "Application Failed",
          description: `Failed to apply modifiers. ${allErrors.length} errors occurred.`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "No Changes Made",
          description: "All selected modifiers already exist on these products.",
        })
      }

      // Log summary
      console.log(`=== MODIFIER APPLICATION COMPLETE ===`)
      console.log(`✅ Successful: ${totalSuccessful}`)
      console.log(`⏭️ Skipped (already exist): ${totalSkipped}`)
      console.log(`❌ Failed: ${totalFailed}`)
      console.log(`📊 Success Rate: ${Math.round((totalSuccessful / (totalSuccessful + totalFailed)) * 100)}%`)
    } catch (error) {
      console.error("Error applying working modifiers:", error)
      toast({
        title: "Error",
        description: "Failed to apply modifiers to products",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Apply Working Modifiers to Products</h1>
      <p className="text-muted-foreground mb-8">
        Apply the proven modifier templates from product 6013 to your selected products.
      </p>

      {successCount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-8 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
          <div>
            <h3 className="font-medium text-green-800">Success!</h3>
            <p className="text-green-700 text-sm mt-1">
              Successfully applied {successCount} modifiers using the working templates from product 6013.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Products</CardTitle>
            <CardDescription>Choose which products to apply modifiers to</CardDescription>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No products found</p>
                <Button onClick={fetchProducts} variant="outline" className="mt-2">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Loading Products
                </Button>
              </div>
            ) : (
              <>
                {/* Search */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products by name or SKU..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                {/* Select All */}
                <div className="mb-4 pb-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="select-all" checked={selectAll} onCheckedChange={handleSelectAll} />
                      <label
                        htmlFor="select-all"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Select All {searchTerm ? "Filtered" : ""} Products
                      </label>
                    </div>
                    <div className="flex gap-2">
                      {searchTerm && <Badge variant="outline">{filteredProducts.length} filtered</Badge>}
                      <Badge variant="secondary">{products.length} total</Badge>
                    </div>
                  </div>
                </div>

                {/* Product List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`product-${product.id}`}
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={(checked) => handleProductSelection(product.id, checked as boolean)}
                      />
                      <label
                        htmlFor={`product-${product.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {product.name} (SKU: {product.sku})
                      </label>
                    </div>
                  ))}
                </div>

                {filteredProducts.length === 0 && searchTerm && (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">No products found matching "{searchTerm}"</p>
                  </div>
                )}

                <div className="mt-4">
                  <Badge variant="secondary">
                    {selectedProducts.length} of {products.length} products selected
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Working Modifiers Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Working Modifiers</CardTitle>
            <CardDescription>These are the proven modifier templates from product 6013</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workingModifierTemplates.map((modifier) => (
                <Card key={modifier.id} className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`modifier-${modifier.id}`}
                        checked={selectedModifiers.includes(modifier.id)}
                        onCheckedChange={(checked) => handleModifierSelection(modifier.id, checked as boolean)}
                      />
                      <div className="flex-1">
                        <h4 className="font-medium">{modifier.display_name}</h4>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline">{modifier.type}</Badge>
                          <Badge variant={modifier.required ? "default" : "secondary"}>
                            {modifier.required ? "Required" : "Optional"}
                          </Badge>
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            ✅ Tested Working
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

            <div className="mt-4">
              <Badge variant="secondary">
                {selectedModifiers.length} of {workingModifierTemplates.length} modifiers selected
              </Badge>
            </div>

            <Button
              onClick={applyWorkingModifiers}
              disabled={loading || selectedProducts.length === 0 || selectedModifiers.length === 0}
              className="w-full mt-4"
            >
              {loading ? "Applying Modifiers..." : "Apply Selected Modifiers to Products"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {lastErrors.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-red-600">Error Details</CardTitle>
            <CardDescription>
              Details about the {lastErrors.length} errors that occurred during modifier application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {lastErrors.map((error, idx) => (
                <div key={idx} className="p-4 border border-red-200 rounded-lg bg-red-50">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-red-800">
                        {error.product_name} → {error.modifier}
                      </h4>
                      <Badge variant="destructive">Status: {error.status}</Badge>
                    </div>

                    <div className="text-sm">
                      <p>
                        <strong>Product ID:</strong> {error.product_id}
                      </p>
                      <p>
                        <strong>Modifier:</strong> {error.modifier}
                      </p>
                    </div>

                    <div className="mt-2">
                      <p className="text-sm font-medium text-red-800">Error Details:</p>
                      <pre className="text-xs bg-red-100 p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(error.error, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" onClick={() => setLastErrors([])} className="mt-4">
              Clear Error Details
            </Button>
          </CardContent>
        </Card>
      )}

      <Toaster />
    </div>
  )
}
