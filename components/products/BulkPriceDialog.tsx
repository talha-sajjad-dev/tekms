"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DollarSign } from 'lucide-react'

interface BulkPriceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedCount: number
  onConfirm: (action: string, value: number, unit: string) => void
}

export function BulkPriceDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm
}: BulkPriceDialogProps) {
  const [action, setAction] = useState<"increase" | "decrease" | "set">("increase")
  const [value, setValue] = useState("")
  const [unit, setUnit] = useState<"percent" | "fixed">("percent")

  const handleConfirm = () => {
    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue <= 0) {
      return
    }
    onConfirm(action, numValue, unit)
    setValue("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Price Update</DialogTitle>
          <DialogDescription>
            Update prices for {selectedCount} selected product{selectedCount !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Action</Label>
            <Select value={action} onValueChange={(v: any) => setAction(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="increase">Increase Price</SelectItem>
                <SelectItem value="decrease">Decrease Price</SelectItem>
                <SelectItem value="set">Set Fixed Price</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {action !== "set" && (
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select value={unit} onValueChange={(v: any) => setUnit(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Value</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder={action === "set" ? "Enter price" : "Enter value"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                step="0.01"
                min="0"
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {action === "increase" && unit === "percent" && "Increase all prices by this percentage"}
              {action === "decrease" && unit === "percent" && "Decrease all prices by this percentage"}
              {action === "increase" && unit === "fixed" && "Add this amount to all prices"}
              {action === "decrease" && unit === "fixed" && "Subtract this amount from all prices"}
              {action === "set" && "Set all products to this exact price"}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!value || parseFloat(value) <= 0}>
            Update {selectedCount} Product{selectedCount !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}