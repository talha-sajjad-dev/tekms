"use client"

import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, DollarSign, Edit, Store as StoreIcon } from 'lucide-react'

interface Product {
  id: string
  externalId: string
  name: string
  sku: string | null
  price: number
  compareAtPrice: number | null
  platform: string
  images: any
  tags: string[]
  categories: string[]
  syncStatus: string | null
  lastSyncedAt: string | null
  createdAt: string
  storeConnection: {
    id: string
    platform: string
    storeName: string
    storeUrl: string | null
  } | null
}

interface VirtualizedProductTableProps {
  products: Product[]
  selectedProducts: Set<string>
  onToggleSelect: (productId: string) => void
  onToggleSelectAll: () => void
  onProductClick?: (product: Product) => void
  height?: number
  rowHeight?: number
}

export function VirtualizedProductTable({
  products,
  selectedProducts,
  onToggleSelect,
  onToggleSelectAll,
  onProductClick,
  height = 600,
  rowHeight = 72
}: VirtualizedProductTableProps) {
  
  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      BIGCOMMERCE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      SHOPIFY: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      ETSY: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      TIKTOK: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
    }
    return colors[platform] || 'bg-gray-100 text-gray-800'
  }

  const getSyncStatusColor = (status: string | null) => {
    if (!status) return 'bg-gray-100 text-gray-800'
    const colors: Record<string, string> = {
      synced: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800'
    }
    return colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800'
  }

  const getProductImage = (product: Product) => {
    try {
      if (product.images) {
        if (product.images.images && Array.isArray(product.images.images) && product.images.images.length > 0) {
          const img = product.images.images[0]
          return img.url_thumbnail || img.url_standard || img.url || "/placeholder.jpg"
        }
        if (Array.isArray(product.images) && product.images.length > 0) {
          const img = product.images[0]
          return img.url_thumbnail || img.url_standard || img.url || "/placeholder.jpg"
        }
        if (product.images.url) {
          return product.images.url
        }
      }
    } catch (error) {
      console.error("Error getting product image:", error)
    }
    return "/placeholder.jpg"
  }

  // Simple virtualization: only render visible items
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(height)
  
  const startIndex = Math.floor(scrollTop / rowHeight)
  const endIndex = Math.min(
    products.length - 1,
    Math.floor((scrollTop + containerHeight) / rowHeight) + 5 // Overscan
  )
  
  const visibleProducts = products.slice(startIndex, endIndex + 1)
  const totalHeight = products.length * rowHeight
  const offsetY = startIndex * rowHeight

  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        setScrollTop(containerRef.current.scrollTop)
      }
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true })
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Row renderer
  const renderRow = useCallback((product: Product, index: number) => {
    const isSelected = selectedProducts.has(product.id)

    return (
      <div
        key={product.id}
        style={{ height: `${rowHeight}px` }}
        className={`flex items-center gap-4 px-4 py-2 border-b hover:bg-muted/30 transition-colors ${
          isSelected ? 'bg-accent/20 border-l-4 border-l-primary' : ''
        }`}
      >
        {/* Checkbox */}
        <div className="w-10 flex items-center justify-center flex-shrink-0">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(product.id)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* Image */}
        <div className="w-12 h-12 flex-shrink-0">
          <img
            src={getProductImage(product)}
            alt={product.name}
            className="w-12 h-12 object-cover rounded bg-gray-100"
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget
              if (target.src !== window.location.origin + "/placeholder.jpg") {
                target.src = "/placeholder.jpg"
              }
            }}
          />
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <h3 
              className="font-medium text-sm truncate flex-1 cursor-pointer hover:text-primary"
              onClick={() => onProductClick?.(product)}
            >
              {product.name}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            {product.sku && <span className="font-mono">SKU: {product.sku}</span>}
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">ID: {product.externalId}</span>
          </div>
          {product.tags.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {product.tags.slice(0, 2).map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs px-1 py-0">
                  {tag}
                </Badge>
              ))}
              {product.tags.length > 2 && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  +{product.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Price */}
        <div className="w-24 text-right flex-shrink-0">
          <div className="flex items-center justify-end gap-1">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            <span className="font-bold text-sm">{product.price.toFixed(2)}</span>
          </div>
          {product.compareAtPrice && (
            <div className="text-xs text-muted-foreground line-through">
              ${product.compareAtPrice.toFixed(2)}
            </div>
          )}
        </div>

        {/* Platform */}
        <div className="w-28 flex-shrink-0">
          <Badge className={`${getPlatformColor(product.platform)} text-xs`}>
            {product.platform}
          </Badge>
        </div>

        {/* Store */}
        <div className="w-32 flex-shrink-0 hidden lg:block">
          <div className="flex items-center gap-1 text-xs truncate">
            <StoreIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="truncate">
              {product.storeConnection?.storeName || 'Legacy'}
            </span>
          </div>
        </div>

        {/* Sync Status */}
        <div className="w-20 flex-shrink-0 hidden xl:block">
          {product.syncStatus && (
            <Badge className={`${getSyncStatusColor(product.syncStatus)} text-xs`}>
              {product.syncStatus}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="w-16 flex-shrink-0 flex items-center justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation()
              onProductClick?.(product)
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }, [selectedProducts, onToggleSelect, onProductClick, rowHeight])

  const allSelected = products.length > 0 && selectedProducts.size === products.length

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 bg-muted/50 border-b font-medium text-sm">
        <div className="w-10 flex items-center justify-center flex-shrink-0">
          <Checkbox
            checked={allSelected}
            onCheckedChange={onToggleSelectAll}
          />
        </div>
        <div className="w-12 flex-shrink-0"></div>
        <div className="flex-1 min-w-0">Product</div>
        <div className="w-24 text-right flex-shrink-0">Price</div>
        <div className="w-28 flex-shrink-0">Platform</div>
        <div className="w-32 flex-shrink-0 hidden lg:block">Store</div>
        <div className="w-20 flex-shrink-0 hidden xl:block">Status</div>
        <div className="w-16 flex-shrink-0 text-right">Actions</div>
      </div>

      {/* Virtualized List */}
      {products.length === 0 ? (
        <div className="p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No products found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        <div
          ref={containerRef}
          style={{ height: `${height}px`, overflow: 'auto', position: 'relative' }}
        >
          <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
            <div style={{ transform: `translateY(${offsetY}px)` }}>
              {visibleProducts.map((product, idx) =>
                renderRow(product, startIndex + idx)
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer with count */}
      <div className="px-4 py-2 bg-muted/30 border-t text-sm text-muted-foreground">
        Showing {products.length.toLocaleString()} products
        {selectedProducts.size > 0 && (
          <span className="ml-2 text-primary font-medium">
            • {selectedProducts.size} selected
          </span>
        )}
      </div>
    </div>
  )
}