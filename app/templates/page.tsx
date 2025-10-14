'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Copy, Package, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ProductTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  basePrice: string;
  priceBySize?: Record<string, number>;
  variantOptions: Record<string, string[]>;
  designSlots?: any;
  weight?: string;
  dimensions?: any;
  defaultTags: string[];
  defaultCategories?: any;
  isActive: boolean;
  useCount: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
  };
}

const CATEGORIES = [
  'Apparel',
  'Accessories',
  'Home & Living',
  'Stickers & Decals',
  'Phone Cases',
  'Other',
];

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProductTemplate | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    basePrice: '',
    weight: '',
    isActive: true,
  });

  // Variant options state (e.g., { "Size": ["S", "M", "L"], "Color": ["Black", "White"] })
  const [variantOptions, setVariantOptions] = useState<Record<string, string[]>>({
    Size: ['S', 'M', 'L', 'XL'],
    Color: ['Black', 'White'],
  });

  // Price by size state (e.g., { "S": 0, "M": 2, "L": 4, "XL": 6 })
  const [priceBySize, setPriceBySize] = useState<Record<string, number>>({
    S: 0,
    M: 2,
    L: 4,
    XL: 6,
  });

  // Default tags
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.templates);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch templates',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          variantOptions,
          priceBySize,
          defaultTags: tags,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Template created successfully',
        });
        setShowCreateDialog(false);
        resetForm();
        fetchTemplates();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to create template',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create template',
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async () => {
    if (!selectedTemplate) return;

    try {
      const response = await fetch(`/api/templates/${selectedTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          variantOptions,
          priceBySize,
          defaultTags: tags,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Template updated successfully',
        });
        setShowEditDialog(false);
        setSelectedTemplate(null);
        resetForm();
        fetchTemplates();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update template',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update template',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;

    try {
      const response = await fetch(`/api/templates/${selectedTemplate.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: data.message || 'Template deleted successfully',
        });
        setShowDeleteDialog(false);
        setSelectedTemplate(null);
        fetchTemplates();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete template',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      });
    }
  };

  const handleUseTemplate = (template: ProductTemplate) => {
    // Navigate to product creation page with template ID
    router.push(`/products/master/create?templateId=${template.id}`);
  };

  const openEditDialog = (template: ProductTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category || '',
      basePrice: template.basePrice,
      weight: template.weight || '',
      isActive: template.isActive,
    });
    setVariantOptions(template.variantOptions);
    setPriceBySize(template.priceBySize || {});
    setTags(template.defaultTags);
    setShowEditDialog(true);
  };

  const openDeleteDialog = (template: ProductTemplate) => {
    setSelectedTemplate(template);
    setShowDeleteDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      basePrice: '',
      weight: '',
      isActive: true,
    });
    setVariantOptions({
      Size: ['S', 'M', 'L', 'XL'],
      Color: ['Black', 'White'],
    });
    setPriceBySize({
      S: 0,
      M: 2,
      L: 4,
      XL: 6,
    });
    setTags([]);
    setTagInput('');
  };

  const addVariantOption = (optionName: string, value: string) => {
    if (!optionName || !value) return;
    
    setVariantOptions(prev => ({
      ...prev,
      [optionName]: [...(prev[optionName] || []), value],
    }));
  };

  const removeVariantOption = (optionName: string, value: string) => {
    setVariantOptions(prev => ({
      ...prev,
      [optionName]: prev[optionName].filter(v => v !== value),
    }));
  };

  const removeOptionCategory = (optionName: string) => {
    const newOptions = { ...variantOptions };
    delete newOptions[optionName];
    setVariantOptions(newOptions);
  };

  const addTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Product Templates</h1>
          <p className="text-muted-foreground mt-2">
            Create reusable templates for your POD products
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first product template to speed up product creation
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Base Price</TableHead>
                <TableHead>Variants</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{template.name}</div>
                      {template.description && (
                        <div className="text-sm text-muted-foreground">
                          {template.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {template.category ? (
                      <Badge variant="outline">{template.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">${template.basePrice}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(template.variantOptions).map(key => (
                        <Badge key={key} variant="secondary" className="text-xs">
                          {key}: {template.variantOptions[key].length}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{template.useCount} times</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.isActive ? 'default' : 'secondary'}>
                      {template.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleUseTemplate(template)}
                      >
                        <Copy className="mr-1 h-3 w-3" />
                        Use
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(template)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(template)}
                        disabled={Boolean(template._count?.products && template._count.products > 0)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setShowEditDialog(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {showCreateDialog ? 'Create Product Template' : 'Edit Product Template'}
            </DialogTitle>
            <DialogDescription>
              Configure your product template with variants and pricing
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold">Basic Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Basic T-Shirt"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Template description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="basePrice">Base Price * ($)</Label>
                  <Input
                    id="basePrice"
                    type="number"
                    step="0.01"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    placeholder="24.99"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (lbs)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    placeholder="0.5"
                  />
                </div>
              </div>
            </div>

            {/* Variant Options */}
            <div className="space-y-4">
              <h3 className="font-semibold">Variant Options *</h3>
              <p className="text-sm text-muted-foreground">
                Define the options available for this product (e.g., Size, Color)
              </p>

              {Object.entries(variantOptions).map(([optionName, values]) => (
                <Card key={optionName}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-sm">{optionName}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOptionCategory(optionName)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {values.map(value => (
                        <Badge key={value} variant="secondary">
                          {value}
                          <button
                            onClick={() => removeVariantOption(optionName, value)}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder={`Add ${optionName} value`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const value = e.currentTarget.value;
                            if (value) {
                              addVariantOption(optionName, value);
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="flex gap-2">
                <Input
                  placeholder="New option name (e.g., Material)"
                  id="newOptionName"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    const input = document.getElementById('newOptionName') as HTMLInputElement;
                    const name = input?.value;
                    if (name && !variantOptions[name]) {
                      setVariantOptions({ ...variantOptions, [name]: [] });
                      input.value = '';
                    }
                  }}
                >
                  Add Option
                </Button>
              </div>
            </div>

            {/* Price by Size */}
            {variantOptions.Size && variantOptions.Size.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Size-Based Pricing</h3>
                <p className="text-sm text-muted-foreground">
                  Add price adjustments for different sizes (added to base price)
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  {variantOptions.Size.map(size => (
                    <div key={size} className="flex items-center gap-2">
                      <Label className="w-12">{size}:</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={priceBySize[size] || 0}
                        onChange={(e) => setPriceBySize({
                          ...priceBySize,
                          [size]: parseFloat(e.target.value) || 0,
                        })}
                        placeholder="0.00"
                      />
                      <span className="text-sm text-muted-foreground">
                        = ${(parseFloat(formData.basePrice) + (priceBySize[size] || 0)).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Default Tags */}
            <div className="space-y-4">
              <h3 className="font-semibold">Default Tags</h3>
              <p className="text-sm text-muted-foreground">
                Tags that will be added to products created from this template
              </p>
              
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Add tag"
                />
                <Button variant="outline" onClick={addTag}>
                  Add
                </Button>
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Template is active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setShowEditDialog(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={showCreateDialog ? handleCreate : handleUpdate}>
              {showCreateDialog ? 'Create Template' : 'Update Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedTemplate?.name}"? 
              {selectedTemplate?._count?.products && selectedTemplate._count.products > 0 ? (
                <span className="text-destructive font-medium">
                  {' '}This template is being used by {selectedTemplate._count.products} product(s) and cannot be deleted.
                </span>
              ) : (
                ' This action cannot be undone.'
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={Boolean(selectedTemplate?._count?.products && selectedTemplate._count.products > 0)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}