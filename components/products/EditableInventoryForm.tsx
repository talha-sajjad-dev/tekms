'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InventoryData {
  id?: string;
  quantity: number;
  tracking: string;
  warningLevel: number;
  variantId?: string | null;
  locationId?: string | null;
}

interface Props {
  productId: string;
  initialData: InventoryData[];
  onSave: () => void;
}

export function EditableInventoryForm({ productId, initialData, onSave }: Props) {
  const [inventoryData, setInventoryData] = useState<Partial<InventoryData>>(
    initialData[0] || {
      quantity: 0,
      tracking: 'product',
      warningLevel: 5
    }
  );
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/products/${productId}/inventory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inventoryData)
      });
      
      if (response.ok) {
        onSave();
        toast({
          title: 'Success',
          description: 'Inventory data saved successfully'
        });
      } else {
        throw new Error('Failed to save inventory data');
      }
    } catch (error) {
      console.error('Failed to save inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to save inventory data',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setInventoryData(initialData[0] || {
      quantity: 0,
      tracking: 'product',
      warningLevel: 5
    });
  };

  const isLowStock = inventoryData.quantity !== undefined && 
                     inventoryData.warningLevel !== undefined && 
                     inventoryData.quantity <= inventoryData.warningLevel;

  return (
    <div className="space-y-6">
      {isLowStock && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Stock level is at or below the warning threshold ({inventoryData.warningLevel} units)
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div>
          <Label htmlFor="quantity">Current Stock Level</Label>
          <Input
            id="quantity"
            type="number"
            value={inventoryData.quantity || 0}
            onChange={(e) =>
              setInventoryData({
                ...inventoryData,
                quantity: parseInt(e.target.value) || 0
              })
            }
            placeholder="0"
            className={isLowStock ? 'border-destructive' : ''}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Available units for sale
          </p>
        </div>

        <div>
          <Label htmlFor="warningLevel">Low Stock Warning Level</Label>
          <Input
            id="warningLevel"
            type="number"
            value={inventoryData.warningLevel || 5}
            onChange={(e) =>
              setInventoryData({
                ...inventoryData,
                warningLevel: parseInt(e.target.value) || 5
              })
            }
            placeholder="5"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Alert when stock reaches this level
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor="tracking">Inventory Tracking</Label>
        <Select
          value={inventoryData.tracking || 'product'}
          onValueChange={(value) =>
            setInventoryData({ ...inventoryData, tracking: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="product">Track at product level</SelectItem>
            <SelectItem value="variant">Track by variant</SelectItem>
            <SelectItem value="none">Don't track inventory</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground mt-1">
          {inventoryData.tracking === 'product' && 'Track total product inventory'}
          {inventoryData.tracking === 'variant' && 'Track inventory separately for each variant'}
          {inventoryData.tracking === 'none' && 'No inventory tracking (unlimited stock)'}
        </p>
      </div>

      {inventoryData.tracking !== 'none' && (
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">Inventory Summary</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Current Stock</p>
              <p className="text-2xl font-bold">
                {inventoryData.quantity || 0}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Warning Level</p>
              <p className="text-2xl font-bold">
                {inventoryData.warningLevel || 5}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className={`text-2xl font-bold ${isLowStock ? 'text-destructive' : 'text-green-600'}`}>
                {isLowStock ? 'Low' : 'OK'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-4 border-t">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Inventory Data'}
        </Button>
        <Button variant="outline" onClick={handleReset} disabled={isSaving}>
          Reset
        </Button>
      </div>

      <div className="bg-muted p-4 rounded-lg">
        <h4 className="font-semibold mb-2">Inventory Tips</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Set warning levels to get alerts before stock runs out</li>
          <li>• Use variant tracking for products with multiple SKUs</li>
          <li>• Disable tracking for digital products or services</li>
          <li>• Keep accurate counts to prevent overselling</li>
          <li>• Review low stock items regularly</li>
        </ul>
      </div>
    </div>
  );
}