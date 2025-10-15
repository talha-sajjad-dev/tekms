'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Copy, Package, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  variantOptions: Record<string, string[]>;
  useCount: number;
  isActive: boolean;
}

const CATEGORIES = ['Apparel', 'Accessories', 'Home & Living', 'Stickers & Decals', 'Phone Cases', 'Other'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate?: (templateId: string) => void;
}

export function TemplatesModal({ open, onOpenChange, onSelectTemplate }: Props) {
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProductTemplate | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    basePrice: '',
    isActive: true,
  });

  const [variantOptions, setVariantOptions] = useState<Record<string, string[]>>({});

  const [colorSwatches, setColorSwatches] = useState<Record<string, string>>({});

  const PRESET_SIZES = {
    'Standard': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    'Plus Size': ['1X', '2X', '3X', '4X', '5X'],
    'Numeric': ['2', '4', '6', '8', '10', '12', '14', '16'],
    'Youth': ['YS', 'YM', 'YL', 'YXL'],
  };

  // Predefined variation types for selection
  const VARIATION_TYPES = [
    'Size',
    'Color',
    'Material',
    'Style',
    'Fit',
    'Length',
    'Neckline',
    'Sleeve Length',
    'Pattern',
    'Finish',
    'Thickness',
    'Weight',
    'Design',
    'Theme',
    'Occasion',
    'Season',
    'Gender',
    'Age Group',
    'Custom',
  ] as const;

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
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
          defaultTags: [],
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({ title: 'Success', description: 'Template created successfully' });
        setShowCreateDialog(false);
        resetForm();
        fetchTemplates();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create template', variant: 'destructive' });
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
          defaultTags: [],
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({ title: 'Success', description: 'Template updated successfully' });
        setShowEditDialog(false);
        setSelectedTemplate(null);
        resetForm();
        fetchTemplates();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update template', variant: 'destructive' });
    }
  };

  const handleDelete = async (template: ProductTemplate) => {
    if (!confirm(`Delete template "${template.name}"?`)) return;

    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({ title: 'Success', description: data.message || 'Template deleted' });
        fetchTemplates();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete template', variant: 'destructive' });
    }
  };

  const openEditDialog = (template: ProductTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category || '',
      basePrice: template.basePrice,
      isActive: template.isActive,
    });
    setVariantOptions(template.variantOptions);
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      basePrice: '',
      isActive: true,
    });
    setVariantOptions({});
    setColorSwatches({});
  };

  const addNewVariationType = (typeName: string) => {
    if (!typeName || variantOptions[typeName]) {
      toast({
        title: 'Error',
        description: typeName ? 'This variation type already exists' : 'Please enter a variation type name',
        variant: 'destructive',
      });
      return;
    }
    
    setVariantOptions(prev => ({
      ...prev,
      [typeName]: [],
    }));
  };

  const removeVariationType = (optionName: string) => {
    const newOptions = { ...variantOptions };
    delete newOptions[optionName];
    setVariantOptions(newOptions);
    
    // Clean up color swatches if removing Color variation
    if (optionName === 'Color') {
      setColorSwatches({});
    }
  };

  const addVariantOption = (optionName: string, value: string, hexColor?: string) => {
    if (!optionName || !value) return;
    
    if (value.length > 20) {
      toast({
        title: 'Error',
        description: 'Option value cannot exceed 20 characters',
        variant: 'destructive',
      });
      return;
    }
    
    if (variantOptions[optionName]?.includes(value)) {
      toast({
        title: 'Error',
        description: 'This value already exists',
        variant: 'destructive',
      });
      return;
    }
    
    setVariantOptions(prev => ({
      ...prev,
      [optionName]: [...(prev[optionName] || []), value],
    }));

    if (optionName === 'Color' && hexColor) {
      setColorSwatches(prev => ({
        ...prev,
        [value]: hexColor,
      }));
    }
  };

  const addPresetSizes = (preset: string) => {
    const sizes = PRESET_SIZES[preset as keyof typeof PRESET_SIZES];
    if (sizes) {
      setVariantOptions(prev => ({
        ...prev,
        Size: [...new Set([...(prev.Size || []), ...sizes])],
      }));
    }
  };

  const removeVariantOption = (optionName: string, value: string) => {
    setVariantOptions(prev => ({
      ...prev,
      [optionName]: prev[optionName].filter(v => v !== value),
    }));
    
    if (optionName === 'Color' && colorSwatches[value]) {
      const newSwatches = { ...colorSwatches };
      delete newSwatches[value];
      setColorSwatches(newSwatches);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product Templates
            </DialogTitle>
            <DialogDescription>
              Create reusable templates for your POD products
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowCreateDialog(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first template to speed up product creation
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Template
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Base Price</TableHead>
                    <TableHead>Variants</TableHead>
                    <TableHead>Used</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="text-sm text-muted-foreground">{template.description}</div>
                        )}
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
                        <Badge variant="outline">{template.useCount}x</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {onSelectTemplate && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                onSelectTemplate(template.id);
                                onOpenChange(false);
                              }}
                            >
                              <Copy className="mr-1 h-3 w-3" />
                              Use
                            </Button>
                          )}
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
                            onClick={() => handleDelete(template)}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {showCreateDialog ? 'Create Template' : 'Edit Template'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Basic T-Shirt"
                />
              </div>

              <div>
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

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Template description"
                rows={2}
              />
            </div>

            <div>
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

            <div>
              <div className="space-y-3">
                <div>
                  <Label>Variation Types</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select variation types for your template (e.g., Size, Color, Material)
                  </p>
                </div>

                <div className="flex gap-2">
                  <Select onValueChange={(value) => {
                    if (value && !variantOptions[value]) {
                      addNewVariationType(value);
                    }
                  }}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select variation type" />
                    </SelectTrigger>
                    <SelectContent>
                      {VARIATION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Allow custom option name if needed
                      const customName = prompt('Enter custom variation type name:');
                      if (customName && !variantOptions[customName]) {
                        addNewVariationType(customName);
                      }
                    }}
                  >
                    Custom
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Select from common variation types above, or use "Custom" for unique options
                </p>
              </div>
              {Object.keys(variantOptions).length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg mb-2">
                  <p className="mb-2">No variation types added yet</p>
                  <p className="text-xs">Click "Add Type" above to create Size, Color, or custom variations</p>
                </div>
              )}
              <div className="space-y-2">
                {Object.entries(variantOptions).map(([optionName, values]) => (
                  <Card key={optionName}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm">{optionName}</CardTitle>
                          {optionName === 'Color' && (
                            <Badge variant="outline" className="text-xs">
                              <Palette className="h-3 w-3 mr-1" />
                              With Swatches
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVariationType(optionName)}
                          title="Remove this variation type"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {optionName === 'Size' && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Quick Add:</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.keys(PRESET_SIZES).map(preset => (
                              <Button
                                key={preset}
                                variant="outline"
                                size="sm"
                                onClick={() => addPresetSizes(preset)}
                                className="text-xs h-6"
                              >
                                + {preset}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-1">
                        {values.map(value => (
                          <Badge key={value} variant="secondary" className="flex items-center gap-1">
                            {optionName === 'Color' && colorSwatches[value] && (
                              <div
                                className="w-3 h-3 rounded-full border"
                                style={{ backgroundColor: colorSwatches[value] }}
                              />
                            )}
                            <span className="max-w-[100px] truncate" title={value}>{value}</span>
                            <button
                              onClick={() => removeVariantOption(optionName, value)}
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>

                      {optionName === 'Color' ? (
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Input
                              id={`color-name-${optionName}`}
                              placeholder="Color name (max 20 chars)"
                              maxLength={20}
                            />
                          </div>
                          <div className="w-20">
                            <Input
                              id={`color-hex-${optionName}`}
                              type="color"
                              defaultValue="#000000"
                              className="h-9 cursor-pointer"
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              const nameInput = document.getElementById(`color-name-${optionName}`) as HTMLInputElement;
                              const hexInput = document.getElementById(`color-hex-${optionName}`) as HTMLInputElement;
                              const name = nameInput?.value.trim();
                              const hex = hexInput?.value;
                              if (name) {
                                addVariantOption(optionName, name, hex);
                                nameInput.value = '';
                                hexInput.value = '#000000';
                              }
                            }}
                          >
                            Add
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            id={`option-input-${optionName}`}
                            placeholder={`Add ${optionName} (max 20 chars)`}
                            maxLength={20}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const value = e.currentTarget.value.trim();
                                if (value) {
                                  addVariantOption(optionName, value);
                                  e.currentTarget.value = '';
                                }
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              const input = document.getElementById(`option-input-${optionName}`) as HTMLInputElement;
                              const value = input?.value.trim();
                              if (value) {
                                addVariantOption(optionName, value);
                                input.value = '';
                              }
                            }}
                          >
                            Add
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

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
    </>
  );
}
