"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"

export default function Home() {
  const [productId, setProductId] = useState("")
  const [productData, setProductData] = useState({
    name: "",
    price: "39.95",
    list_price: "29.95",
    description: "",
    weight: "",
    type: "physical",
  })
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  
  const colorOptions = [
    { name: "Black", hex: "#000000" },
    { name: "Navy", hex: "#000080" },
    { name: "Dark Gray Heather", hex: "#726F6F" },
    { name: "True Royal", hex: "#2361C7" },
    { name: "Soft Pink", hex: "#F8D0D0" },
    { name: "White", hex: "#FFFFFF" },
    { name: "Red", hex: "#E60A0A" },
    { name: "Kelly Green", hex: "#0EB821" },
    { name: "Orange", hex: "#FF7225" },
  ]
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setProductData((prev) => ({ ...prev, [name]: value }))
  }

  const handleGetProduct = async () => {
    if (!productId) {
      toast({
        title: "Error",
        description: "Please enter a product ID",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/bigcommerce/products/${productId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch product")
      }

      const data = await response.json()
      setProductData({
        name: data.data.name,
        price: data.data.price.toString(),
        list_price: data.data.list_price?.toString() || "29.95",
        description: data.data.description,
        weight: data.data.weight.toString(),
        type: data.data.type,
      })

      toast({
        title: "Success",
        description: "Product loaded successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch product",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProduct = async () => {
    if (!productId) {
      toast({
        title: "Error",
        description: "Please enter a product ID",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const payload = {
        name: productData.name,
        price: Number.parseFloat(productData.price),
        list_price: Number.parseFloat(productData.list_price),
        description: productData.description,
        weight: Number.parseFloat(productData.weight),
        type: productData.type,
      }

      const response = await fetch(`/api/bigcommerce/products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error("Failed to update product")
      }

      toast({
        title: "Success",
        description: "Product updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProduct = async () => {
    setLoading(true)
    try {
      const payload = {
        name: productData.name,
        price: Number.parseFloat(productData.price),
        list_price: Number.parseFloat(productData.list_price),
        description: productData.description,
        weight: Number.parseFloat(productData.weight),
        type: productData.type,
        selectedColors: selectedColors, // Include selected colors
      }

      const response = await fetch("/api/bigcommerce/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error("Failed to create product")
      }

      const data = await response.json()
      setProductId(data.data.id.toString())

      toast({
        title: "Success",
        description: `Product created successfully with ${selectedColors.length} color variations`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create product",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8 text-center">BigCommerce Product Manager</h1>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Update BigCommerce Listings</CardTitle>
          <CardDescription>
            Use this form to create or update product listings in your BigCommerce store.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="productId">Product ID</Label>
              <Input
                id="productId"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                placeholder="Enter product ID to update"
              />
            </div>
            <Button onClick={handleGetProduct} disabled={loading}>
              Load Product
            </Button>
          </div>

          <div>
            <Label htmlFor="name">Product Name</Label>
            <Input
              id="name"
              name="name"
              value={productData.name}
              onChange={handleInputChange}
              placeholder="Product name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                name="price"
                value={productData.price}
                onChange={handleInputChange}
                placeholder="Product price"
                type="number"
                step="0.01"
              />
            </div>
            <div>
              <Label htmlFor="list_price">List Price</Label>
              <Input
                id="list_price"
                name="list_price"
                value={productData.list_price}
                onChange={handleInputChange}
                placeholder="List price"
                type="number"
                step="0.01"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={productData.description}
              onChange={handleInputChange}
              placeholder="Product description"
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="weight">Weight</Label>
            <Input
              id="weight"
              name="weight"
              value={productData.weight}
              onChange={handleInputChange}
              placeholder="Product weight"
              type="number"
              step="0.01"
            />
          </div>

          <div>
            <Label className="text-base font-medium">Color Options</Label>
            <p className="text-sm text-muted-foreground mb-3">Select which colors to include as variations:</p>
            <div className="grid grid-cols-2 gap-3">
              {colorOptions.map((color, index) => (
                <div key={color.name} className="flex items-center space-x-3">
                  <Checkbox 
                    id={`color-${index}`}
                    checked={selectedColors.includes(color.name)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedColors(prev => [...prev, color.name])
                      } else {
                        setSelectedColors(prev => prev.filter(c => c !== color.name))
                      }
                    }}
                  />
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded border border-gray-300"
                      style={{ backgroundColor: color.hex }}
                    />
                    <Label htmlFor={`color-${index}`} className="text-sm font-normal cursor-pointer">
                      {color.name}
                    </Label>
                  </div>
                </div>
              ))}
            </div>
            {selectedColors.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Selected: {selectedColors.join(', ')}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button onClick={handleCreateProduct} disabled={loading} variant="outline">
            Create New Product
          </Button>
          <Button onClick={handleUpdateProduct} disabled={loading || !productId}>
            Update Product
          </Button>
        </CardFooter>
      </Card>
      <Toaster />
    </main>
  )
}
