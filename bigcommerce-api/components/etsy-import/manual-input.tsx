"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { X, Plus } from "lucide-react"

interface ManualInputProps {
  onDataSubmit: (data: {
    title: string
    description: string
    images: string[]
    tags: string[]
    materials: string[]
    category: string
    shop: string
    url: string
  }) => void
  etsyUrl: string
}

export function ManualInput({ onDataSubmit, etsyUrl }: ManualInputProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [shop, setShop] = useState("")
  const [imageUrls, setImageUrls] = useState<string[]>([""])
  const [tags, setTags] = useState<string[]>([])
  const [materials, setMaterials] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [newMaterial, setNewMaterial] = useState("")

  const addImageUrl = () => {
    setImageUrls([...imageUrls, ""])
  }

  const updateImageUrl = (index: number, value: string) => {
    const updated = [...imageUrls]
    updated[index] = value
    setImageUrls(updated)
  }

  const removeImageUrl = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index))
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const addMaterial = () => {
    if (newMaterial.trim() && !materials.includes(newMaterial.trim())) {
      setMaterials([...materials, newMaterial.trim()])
      setNewMaterial("")
    }
  }

  const removeMaterial = (materialToRemove: string) => {
    setMaterials(materials.filter(material => material !== materialToRemove))
  }

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) {
      alert("Please fill in at least the title and description")
      return
    }

    const validImageUrls = imageUrls.filter(url => url.trim().length > 0)

    onDataSubmit({
      title: title.trim(),
      description: description.trim(),
      images: validImageUrls,
      tags,
      materials,
      category: category.trim() || "General",
      shop: shop.trim() || "Unknown Shop",
      url: etsyUrl
    })
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Manual Product Data Entry</CardTitle>
        <CardDescription>
          Since automatic scraping failed, please manually enter the product information from the Etsy listing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="manual-title">Product Title *</Label>
            <Input
              id="manual-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter the product title from Etsy"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="manual-shop">Shop Name</Label>
            <Input
              id="manual-shop"
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              placeholder="Enter the Etsy shop name"
              className="mt-1"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="manual-description">Product Description *</Label>
          <Textarea
            id="manual-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Copy and paste the product description from Etsy"
            className="mt-1 min-h-32"
          />
        </div>

        {/* Category */}
        <div>
          <Label htmlFor="manual-category">Category</Label>
          <Input
            id="manual-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g., Jewelry, Clothing, Home Decor"
            className="mt-1"
          />
        </div>

        {/* Image URLs */}
        <div>
          <Label>Product Images</Label>
          <p className="text-sm text-muted-foreground mb-2">
            Right-click on images in the Etsy listing and copy image addresses
          </p>
          <div className="space-y-2">
            {imageUrls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={url}
                  onChange={(e) => updateImageUrl(index, e.target.value)}
                  placeholder={`Image URL ${index + 1}`}
                  className="flex-1"
                />
                {imageUrls.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeImageUrl(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addImageUrl}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Image URL
            </Button>
          </div>
        </div>

        {/* Tags */}
        <div>
          <Label>Tags</Label>
          <p className="text-sm text-muted-foreground mb-2">
            Add tags that describe the product (for SEO optimization)
          </p>
          <div className="flex gap-2 mb-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Enter a tag"
              className="flex-1"
              onKeyPress={(e) => e.key === 'Enter' && addTag()}
            />
            <Button type="button" onClick={addTag} size="sm">
              Add Tag
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                {tag} <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>
        </div>

        {/* Materials */}
        <div>
          <Label>Materials</Label>
          <p className="text-sm text-muted-foreground mb-2">
            Add materials used in the product
          </p>
          <div className="flex gap-2 mb-2">
            <Input
              value={newMaterial}
              onChange={(e) => setNewMaterial(e.target.value)}
              placeholder="Enter a material"
              className="flex-1"
              onKeyPress={(e) => e.key === 'Enter' && addMaterial()}
            />
            <Button type="button" onClick={addMaterial} size="sm">
              Add Material
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {materials.map((material, index) => (
              <Badge key={index} variant="outline" className="cursor-pointer" onClick={() => removeMaterial(material)}>
                {material} <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!title.trim() || !description.trim()}>
            Use This Data for Import
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}