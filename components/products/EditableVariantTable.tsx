'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Save, X, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Variant {
  id: string;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  costPrice: number | null;
  inventoryLevel: number;
  weight: number | null;
  weightUnit: string | null;
}

interface Props {
  productId: string;
  variants: Variant[];
  onUpdate: () => void;
}

export function EditableVariantTable({ productId, variants, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Variant>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newVariant, setNewVariant] = useState<Partial<Variant>>({
    price: 0,
    inventoryLevel: 0,
    weightUnit: 'lb'
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleEdit = (variant: Variant) => {
    setEditingId(variant.id);
    setEditData(variant);
  };

  const handleSave = async (variantId: string) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/products/${productId}/variants/${variantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });
      
      if (response.ok) {
        setEditingId(null);
        setEditData({});
        onUpdate();
        toast({
          title: 'Success',
          description: 'Variant updated successfully'
        });
      } else {
        throw new Error('Failed to update variant');
      }
    } catch (error) {
      console.error('Failed to save variant:', error);
      toast({
        title: 'Error',
        description: 'Failed to update variant',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleDelete = async (variantId: string) => {
    if (!confirm('Are you sure you want to delete this variant?')) return;
    
    try {
      const response = await fetch(`/api/products/${productId}/variants/${variantId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        onUpdate();
        toast({
          title: 'Success',
          description: 'Variant deleted successfully'
        });
      } else {
        throw new Error('Failed to delete variant');
      }
    } catch (error) {
      console.error('Failed to delete variant:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete variant',
        variant: 'destructive'
      });
    }
  };

  const handleAdd = async () => {
    if (!newVariant.sku) {
      toast({
        title: 'Error',
        description: 'SKU is required',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/products/${productId}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVariant)
      });
      
      if (response.ok) {
        setIsAdding(false);
        setNewVariant({ price: 0, inventoryLevel: 0, weightUnit: 'lb' });
        onUpdate();
        toast({
          title: 'Success',
          description: 'Variant added successfully'
        });
      } else {
        throw new Error('Failed to add variant');
      }
    } catch (error) {
      console.error('Failed to add variant:', error);
      toast({
        title: 'Error',
        description: 'Failed to add variant',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Product Variants</h3>
        <Button onClick={() => setIsAdding(true)} size="sm" disabled={isAdding}>
          <Plus className="h-4 w-4 mr-2" />
          Add Variant
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Compare At</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Inventory</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.map((variant) => (
              <TableRow key={variant.id}>
                {editingId === variant.id ? (
                  <>
                    <TableCell>
                      <Input
                        value={editData.sku || ''}
                        onChange={(e) => setEditData({ ...editData, sku: e.target.value })}
                        placeholder="SKU"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={editData.price || 0}
                        onChange={(e) => setEditData({ ...editData, price: parseFloat(e.target.value) || 0 })}
                        placeholder="Price"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={editData.compareAtPrice || ''}
                        onChange={(e) => setEditData({ ...editData, compareAtPrice: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="Compare"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={editData.costPrice || ''}
                        onChange={(e) => setEditData({ ...editData, costPrice: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="Cost"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={editData.inventoryLevel || 0}
                        onChange={(e) => setEditData({ ...editData, inventoryLevel: parseInt(e.target.value) || 0 })}
                        placeholder="Stock"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={editData.weight || ''}
                        onChange={(e) => setEditData({ ...editData, weight: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="Weight"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleSave(variant.id)}
                          disabled={isSaving}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleCancel}
                          disabled={isSaving}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="font-medium">{variant.sku || '-'}</TableCell>
                    <TableCell>${Number(variant.price).toFixed(2)}</TableCell>
                    <TableCell>{variant.compareAtPrice ? `$${Number(variant.compareAtPrice).toFixed(2)}` : '-'}</TableCell>
                    <TableCell>{variant.costPrice ? `$${Number(variant.costPrice).toFixed(2)}` : '-'}</TableCell>
                    <TableCell>{variant.inventoryLevel}</TableCell>
                    <TableCell>
                      {variant.weight ? `${Number(variant.weight).toFixed(2)} ${variant.weightUnit || 'lb'}` : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEdit(variant)}
                          disabled={editingId !== null || isAdding}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(variant.id)}
                          disabled={editingId !== null || isAdding}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
            
            {isAdding && (
              <TableRow>
                <TableCell>
                  <Input
                    placeholder="SKU *"
                    value={newVariant.sku || ''}
                    onChange={(e) => setNewVariant({ ...newVariant, sku: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    value={newVariant.price || ''}
                    onChange={(e) => setNewVariant({ ...newVariant, price: parseFloat(e.target.value) || 0 })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Compare"
                    value={newVariant.compareAtPrice || ''}
                    onChange={(e) => setNewVariant({ ...newVariant, compareAtPrice: e.target.value ? parseFloat(e.target.value) : null })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Cost"
                    value={newVariant.costPrice || ''}
                    onChange={(e) => setNewVariant({ ...newVariant, costPrice: e.target.value ? parseFloat(e.target.value) : null })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    placeholder="Stock"
                    value={newVariant.inventoryLevel || ''}
                    onChange={(e) => setNewVariant({ ...newVariant, inventoryLevel: parseInt(e.target.value) || 0 })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Weight"
                    value={newVariant.weight || ''}
                    onChange={(e) => setNewVariant({ ...newVariant, weight: e.target.value ? parseFloat(e.target.value) : null })}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleAdd}
                      disabled={isSaving}
                    >
                      Save
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setIsAdding(false);
                        setNewVariant({ price: 0, inventoryLevel: 0, weightUnit: 'lb' });
                      }}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {variants.length === 0 && !isAdding && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No variants yet. Click "Add Variant" to create one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}