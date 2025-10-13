"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Save } from 'lucide-react'

interface SaveFilterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentFilters: any
  editingFilter?: {
    id: string
    name: string
    description: string | null
    isPinned: boolean
    isDefault: boolean
  } | null
  onSave: (filterData: {
    id?: string
    name: string
    description: string
    filters: any
    isPinned: boolean
    isDefault: boolean
  }) => void
}

export function SaveFilterDialog({
  open,
  onOpenChange,
  currentFilters,
  editingFilter,
  onSave
}: SaveFilterDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [isDefault, setIsDefault] = useState(false)

  useEffect(() => {
    if (editingFilter) {
      setName(editingFilter.name)
      setDescription(editingFilter.description || '')
      setIsPinned(editingFilter.isPinned)
      setIsDefault(editingFilter.isDefault)
    } else {
      setName('')
      setDescription('')
      setIsPinned(false)
      setIsDefault(false)
    }
  }, [editingFilter, open])

  const handleSave = () => {
    if (!name.trim()) return

    onSave({
      id: editingFilter?.id,
      name: name.trim(),
      description: description.trim(),
      filters: currentFilters,
      isPinned,
      isDefault
    })

    onOpenChange(false)
  }

  const filterSummary = () => {
    const filters = []
    if (currentFilters.search) filters.push(`Search: "${currentFilters.search}"`)
    if (currentFilters.platforms?.length > 0) {
      filters.push(`Platforms: ${currentFilters.platforms.join(', ')}`)
    }
    if (currentFilters.minPrice) filters.push(`Min: $${currentFilters.minPrice}`)
    if (currentFilters.maxPrice) filters.push(`Max: $${currentFilters.maxPrice}`)
    if (currentFilters.sortBy) {
      filters.push(`Sort: ${currentFilters.sortBy} (${currentFilters.sortOrder})`)
    }
    return filters.length > 0 ? filters.join(' • ') : 'No filters applied'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingFilter ? 'Edit Filter' : 'Save Current Filters'}
          </DialogTitle>
          <DialogDescription>
            Save your current filter settings for quick access later
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Filter Name *</Label>
            <Input
              placeholder="e.g., High Price Products, BigCommerce Only"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              placeholder="What does this filter show?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-3 p-3 bg-muted/30 rounded-md">
            <div className="text-sm font-medium">Current Filters:</div>
            <div className="text-xs text-muted-foreground">
              {filterSummary()}
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Pin to Top</Label>
                <p className="text-xs text-muted-foreground">
                  Show this filter at the top of your list
                </p>
              </div>
              <Switch
                checked={isPinned}
                onCheckedChange={setIsPinned}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Set as Default</Label>
                <p className="text-xs text-muted-foreground">
                  Apply this filter automatically when opening the page
                </p>
              </div>
              <Switch
                checked={isDefault}
                onCheckedChange={setIsDefault}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            <Save className="h-4 w-4 mr-2" />
            {editingFilter ? 'Update Filter' : 'Save Filter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}