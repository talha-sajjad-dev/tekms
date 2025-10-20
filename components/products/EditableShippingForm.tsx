'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

interface ShippingData {
  id?: string;
  weight: number | null;
  weightUnit: string | null;
  width: number | null;
  height: number | null;
  depth: number | null;
  dimensionUnit: string | null;
  fixedCost: number | null;
  freeShipping: boolean;
}

interface Props {
  productId: string;
  initialData: ShippingData | null;
  onSave: () => void;
}

export function EditableShippingForm({ productId, initialData, onSave }: Props) {
  const [shippingData, setShippingData] = useState<Partial<ShippingData>>(
    initialData || {
      weightUnit: 'lb',
      dimensionUnit: 'in',
      freeShipping: false
    }
  );
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/products/${productId}/shipping`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shippingData)
      });
      
      if (response.ok) {
        onSave();
        toast({
          title: 'Success',
          description: 'Shipping data saved successfully'
        });
      } else {
        throw new Error('Failed to save shipping data');
      }
    } catch (error) {
      console.error('Failed to save shipping:', error);
      toast({
        title: 'Error',
        description: 'Failed to save shipping data',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setShippingData(initialData || {
      weightUnit: 'lb',
      dimensionUnit: 'in',
      freeShipping: false
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="weight">Weight</Label>
          <div className="flex gap-2">
            <Input
              id="weight"
              type="number"
              step="0.01"
              value={shippingData.weight || ''}
              onChange={(e) =>
                setShippingData({
                  ...shippingData,
                  weight: e.target.value ? parseFloat(e.target.value) : null
                })
              }
              placeholder="0.00"
            />
            <Select
              value={shippingData.weightUnit || 'lb'}
              onValueChange={(value) =>
                setShippingData({ ...shippingData, weightUnit: value })
              }
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lb">lb</SelectItem>
                <SelectItem value="oz">oz</SelectItem>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="g">g</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="fixedCost">Fixed Shipping Cost</Label>
          <Input
            id="fixedCost"
            type="number"
            step="0.01"
            value={shippingData.fixedCost || ''}
            onChange={(e) =>
              setShippingData({
                ...shippingData,
                fixedCost: e.target.value ? parseFloat(e.target.value) : null
              })
            }
            placeholder="0.00"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Leave empty for calculated shipping
          </p>
        </div>
      </div>

      <div>
        <Label className="mb-3 block">Package Dimensions</Label>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <Label htmlFor="width" className="text-sm">
              Width
            </Label>
            <Input
              id="width"
              type="number"
              step="0.01"
              value={shippingData.width || ''}
              onChange={(e) =>
                setShippingData({
                  ...shippingData,
                  width: e.target.value ? parseFloat(e.target.value) : null
                })
              }
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="height" className="text-sm">
              Height
            </Label>
            <Input
              id="height"
              type="number"
              step="0.01"
              value={shippingData.height || ''}
              onChange={(e) =>
                setShippingData({
                  ...shippingData,
                  height: e.target.value ? parseFloat(e.target.value) : null
                })
              }
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="depth" className="text-sm">
              Depth
            </Label>
            <Input
              id="depth"
              type="number"
              step="0.01"
              value={shippingData.depth || ''}
              onChange={(e) =>
                setShippingData({
                  ...shippingData,
                  depth: e.target.value ? parseFloat(e.target.value) : null
                })
              }
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="dimensionUnit" className="text-sm">
              Unit
            </Label>
            <Select
              value={shippingData.dimensionUnit || 'in'}
              onValueChange={(value) =>
                setShippingData({ ...shippingData, dimensionUnit: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in">in</SelectItem>
                <SelectItem value="cm">cm</SelectItem>
                <SelectItem value="ft">ft</SelectItem>
                <SelectItem value="m">m</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <Label htmlFor="freeShipping" className="cursor-pointer">
            Free Shipping
          </Label>
          <p className="text-sm text-muted-foreground">
            Offer free shipping for this product
          </p>
        </div>
        <Switch
          id="freeShipping"
          checked={shippingData.freeShipping || false}
          onCheckedChange={(checked) =>
            setShippingData({ ...shippingData, freeShipping: checked })
          }
        />
      </div>

      <div className="flex gap-2 pt-4 border-t">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Shipping Data'}
        </Button>
        <Button variant="outline" onClick={handleReset} disabled={isSaving}>
          Reset
        </Button>
      </div>

      <div className="bg-muted p-4 rounded-lg">
        <h4 className="font-semibold mb-2">Shipping Tips</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Accurate weight and dimensions help calculate shipping costs</li>
          <li>• Use fixed cost for flat-rate shipping</li>
          <li>• Free shipping can increase conversion rates</li>
          <li>• Measure package dimensions including padding/box</li>
        </ul>
      </div>
    </div>
  );
}