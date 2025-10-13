"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Star, MoreVertical, Trash2, Edit, Pin } from 'lucide-react'

interface SavedFilter {
  id: string
  name: string
  description: string | null
  filters: any
  isDefault: boolean
  isPinned: boolean
  useCount: number
  lastUsedAt: string | null
  createdAt: string
}

interface SavedFilterCardProps {
  filter: SavedFilter
  onApply: (filter: SavedFilter) => void
  onEdit: (filter: SavedFilter) => void
  onDelete: (filterId: string) => void
  onTogglePin: (filterId: string, isPinned: boolean) => void
  onSetDefault: (filterId: string) => void
}

export function SavedFilterCard({
  filter,
  onApply,
  onEdit,
  onDelete,
  onTogglePin,
  onSetDefault
}: SavedFilterCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const filterConfig = filter.filters as any
  const filterCount = Object.keys(filterConfig).filter(key => {
    const value = filterConfig[key]
    return value && (Array.isArray(value) ? value.length > 0 : value)
  }).length

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        filter.isDefault ? 'border-primary' : ''
      } ${filter.isPinned ? 'border-blue-300' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onApply(filter)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{filter.name}</CardTitle>
              {filter.isDefault && (
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              )}
              {filter.isPinned && (
                <Pin className="h-4 w-4 text-blue-500" />
              )}
            </div>
            {filter.description && (
              <CardDescription className="mt-1 text-sm">
                {filter.description}
              </CardDescription>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation()
                onSetDefault(filter.id)
              }}>
                <Star className="h-4 w-4 mr-2" />
                {filter.isDefault ? 'Remove Default' : 'Set as Default'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation()
                onTogglePin(filter.id, !filter.isPinned)
              }}>
                <Pin className="h-4 w-4 mr-2" />
                {filter.isPinned ? 'Unpin' : 'Pin to Top'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation()
                onEdit(filter)
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(filter.id)
                }}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center justify-between text-sm">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary">{filterCount} filters</Badge>
            {filter.useCount > 0 && (
              <Badge variant="outline">{filter.useCount} uses</Badge>
            )}
            {filterConfig.platforms && filterConfig.platforms.length > 0 && (
              <Badge variant="outline">
                {filterConfig.platforms.length} platform{filterConfig.platforms.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          {filter.lastUsedAt && (
            <span className="text-xs text-muted-foreground">
              Used {new Date(filter.lastUsedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}