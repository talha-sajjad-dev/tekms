"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Trash2 } from "lucide-react"

interface Product {
  id: number
  name: string
  sku: string
}

interface Modifier {
  id: number
  product_id: number
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

export default function ViewModifiersPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [modifiers, setModifiers] = useState<Modifier[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  // Update the fetchProducts function to use the new endpoint
  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/bigcommerce/products/all")
      const data = await response.json()
      if (data.data) {
        setProducts(data.data)
      }
    } catch (error) {
      console.error("Error fetching products:", error)
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive",
      })
    }
  }

  const fetchModifiers = async (productId: string) => {
    if (!productId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/bigcommerce/modifiers?product_id=${productId}`)
      const data = await response.json()

      if (response.ok && data.data) {
        setModifiers(data.data)
      } else {
        setModifiers([])
      }
    } catch (error) {
      console.error("Error fetching modifiers:", error)
      toast({
        title: "Error",
        description: "Failed to fetch modifiers",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteModifier = async (productId: number, modifierId: number) => {
    try {
      const response = await fetch(`/api/bigcommerce/modifiers/${productId}/${modifierId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Modifier deleted successfully",
        })
        // Refresh modifiers
        fetchModifiers(selectedProduct)
      } else {
        throw new Error("Failed to delete modifier")
      }
    } catch (error) {
      console.error("Error deleting modifier:", error)
      toast({
        title: "Error",
        description: "Failed to delete modifier",
        variant: "destructive",
      })
    }
  }

  const handleProductChange = (productId: string) => {
    setSelectedProduct(productId)
    fetchModifiers(productId)
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">View Product Modifiers</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Select Product</CardTitle>
          <CardDescription>Choose a product to view its modifiers</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedProduct} onValueChange={handleProductChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a product" />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id.toString()}>
                  {product.name} (SKU: {product.sku})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading && (
        <div className="text-center py-8">
          <p>Loading modifiers...</p>
        </div>
      )}

      {!loading && selectedProduct && (
        <div className="space-y-6">
          {modifiers.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No modifiers found for this product.</p>
              </CardContent>
            </Card>
          ) : (
            modifiers.map((modifier) => (
              <Card key={modifier.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{modifier.display_name}</CardTitle>
                      <CardDescription>
                        Type: {modifier.type} • {modifier.required ? "Required" : "Optional"}
                      </CardDescription>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteModifier(modifier.product_id, modifier.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {modifier.option_values && modifier.option_values.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Options:</h4>
                      <div className="space-y-2">
                        {modifier.option_values.map((option) => (
                          <div key={option.id} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <span className="font-medium">{option.label}</span>
                              <span className="text-sm text-muted-foreground ml-2">({option.value})</span>
                              {option.is_default && (
                                <Badge variant="secondary" className="ml-2">
                                  Default
                                </Badge>
                              )}
                            </div>
                            {option.price_adjustment !== 0 && (
                              <Badge variant={option.price_adjustment > 0 ? "default" : "destructive"}>
                                {option.price_adjustment > 0 ? "+" : ""}${option.price_adjustment}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <Toaster />
    </div>
  )
}
