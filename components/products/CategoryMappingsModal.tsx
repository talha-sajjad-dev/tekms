'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Tag, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface CategoryMapping {
  id: string;
  name: string;
  keywords: string[];
  etsyTaxonomyId?: number;
  bcCategoryId?: number;
  shopifyCollection?: string;
  tiktokCategoryId?: string;
  timesUsed: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryMappingsModal({ open, onOpenChange }: Props) {
  const [mappings, setMappings] = useState<CategoryMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingMapping, setEditingMapping] = useState<CategoryMapping | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    etsyTaxonomyId: '',
    bcCategoryId: '',
    shopifyCollection: '',
    tiktokCategoryId: '',
    keywords: '',
    pattern: '',
  });

  useEffect(() => {
    if (open) {
      fetchMappings();
    }
  }, [open]);

  const fetchMappings = async () => {
    try {
      const response = await fetch('/api/category-mappings');
      const data = await response.json();

      if (data.success) {
        setMappings(data.mappings);
      }
    } catch (error) {
      console.error('Error fetching mappings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.keywords) {
      toast({ title: 'Error', description: 'Name and keywords are required', variant: 'destructive' });
      return;
    }

    try {
      const keywords = formData.keywords
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k);

      const payload = {
        name: formData.name,
        keywords,
        ...(formData.etsyTaxonomyId && { etsyTaxonomyId: parseInt(formData.etsyTaxonomyId) }),
        ...(formData.bcCategoryId && { bcCategoryId: parseInt(formData.bcCategoryId) }),
        ...(formData.shopifyCollection && { shopifyCollection: formData.shopifyCollection }),
        ...(formData.tiktokCategoryId && { tiktokCategoryId: formData.tiktokCategoryId }),
        ...(formData.pattern && { pattern: formData.pattern }),
      };

      const url = editingMapping
        ? `/api/category-mappings/${editingMapping.id}`
        : '/api/category-mappings';
      const method = editingMapping ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: editingMapping ? 'Mapping updated!' : 'Mapping created!'
        });
        setShowCreateDialog(false);
        setShowEditDialog(false);
        resetForm();
        fetchMappings();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save category mapping', variant: 'destructive' });
    }
  };

  const handleEdit = (mapping: CategoryMapping) => {
    setEditingMapping(mapping);
    setFormData({
      name: mapping.name,
      etsyTaxonomyId: mapping.etsyTaxonomyId?.toString() || '',
      bcCategoryId: mapping.bcCategoryId?.toString() || '',
      shopifyCollection: mapping.shopifyCollection || '',
      tiktokCategoryId: mapping.tiktokCategoryId || '',
      keywords: mapping.keywords.join(', '),
      pattern: '',
    });
    setShowEditDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category mapping?')) return;

    try {
      const response = await fetch(`/api/category-mappings/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({ title: 'Success', description: 'Category mapping deleted!' });
        fetchMappings();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete category mapping', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      etsyTaxonomyId: '',
      bcCategoryId: '',
      shopifyCollection: '',
      tiktokCategoryId: '',
      keywords: '',
      pattern: '',
    });
    setEditingMapping(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Category Mappings
            </DialogTitle>
            <DialogDescription>
              Auto-map products to platform-specific categories
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowCreateDialog(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Mapping
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : mappings.length === 0 ? (
              <div className="text-center py-12">
                <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No category mappings yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first category mapping to get started
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Mapping
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Keywords</TableHead>
                    <TableHead>Platforms</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((mapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell className="font-medium">{mapping.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {mapping.keywords.slice(0, 3).map((keyword, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                          {mapping.keywords.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{mapping.keywords.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {mapping.bcCategoryId && <Badge className="text-xs">BC</Badge>}
                          {mapping.shopifyCollection && <Badge className="text-xs">Shopify</Badge>}
                          {mapping.etsyTaxonomyId && <Badge className="text-xs">Etsy</Badge>}
                          {mapping.tiktokCategoryId && <Badge className="text-xs">TikTok</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{mapping.timesUsed}x</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(mapping)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(mapping.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setShowEditDialog(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMapping ? 'Edit Category Mapping' : 'New Category Mapping'}
            </DialogTitle>
            <DialogDescription>
              Configure how products are automatically mapped to categories
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., T-Shirts"
                required
              />
            </div>

            <div>
              <Label htmlFor="keywords">Keywords * (comma-separated)</Label>
              <Textarea
                id="keywords"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                placeholder="shirt, tee, t-shirt, tshirt"
                rows={2}
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                Products containing these keywords will be mapped to this category
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Platform-Specific IDs</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="bcCategoryId">BigCommerce Category ID</Label>
                  <Input
                    id="bcCategoryId"
                    type="number"
                    value={formData.bcCategoryId}
                    onChange={(e) => setFormData({ ...formData, bcCategoryId: e.target.value })}
                    placeholder="e.g., 23"
                  />
                </div>

                <div>
                  <Label htmlFor="shopifyCollection">Shopify Collection</Label>
                  <Input
                    id="shopifyCollection"
                    value={formData.shopifyCollection}
                    onChange={(e) => setFormData({ ...formData, shopifyCollection: e.target.value })}
                    placeholder="e.g., t-shirts"
                  />
                </div>

                <div>
                  <Label htmlFor="etsyTaxonomyId">Etsy Taxonomy ID</Label>
                  <Input
                    id="etsyTaxonomyId"
                    type="number"
                    value={formData.etsyTaxonomyId}
                    onChange={(e) => setFormData({ ...formData, etsyTaxonomyId: e.target.value })}
                    placeholder="e.g., 1234"
                  />
                </div>

                <div>
                  <Label htmlFor="tiktokCategoryId">TikTok Category ID</Label>
                  <Input
                    id="tiktokCategoryId"
                    value={formData.tiktokCategoryId}
                    onChange={(e) => setFormData({ ...formData, tiktokCategoryId: e.target.value })}
                    placeholder="e.g., 12345"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setShowEditDialog(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingMapping ? 'Update Mapping' : 'Create Mapping'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}