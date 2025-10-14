'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Plus,
  Edit,
  Trash2,
  TestTube,
  TrendingUp,
  Tag,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface CategoryMapping {
  id: string;
  name: string;
  etsyTaxonomyId?: number;
  bcCategoryId?: number;
  shopifyCollection?: string;
  tiktokCategoryId?: string;
  keywords: string[];
  pattern?: string;
  timesUsed: number;
  createdAt: string;
  updatedAt: string;
}

interface CategoryStats {
  totalMappings: number;
  totalUsage: number;
  mostUsed: { name: string; timesUsed: number } | null;
  platformCoverage: {
    etsy: number;
    bigcommerce: number;
    shopify: number;
    tiktok: number;
  };
  averageKeywordsPerMapping: number;
}

export default function CategoryMappingsPage() {
  const [mappings, setMappings] = useState<CategoryMapping[]>([]);
  const [stats, setStats] = useState<CategoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<CategoryMapping | null>(null);
  const [testPattern, setTestPattern] = useState('');
  const [testText, setTestText] = useState('');
  const [testResult, setTestResult] = useState<boolean | null>(null);

  // Form state
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
    fetchMappings();
  }, []);

  const fetchMappings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/category-mappings?includeStats=true');
      const data = await response.json();

      if (data.success) {
        setMappings(data.mappings);
        setStats(data.stats);
      } else {
        toast.error('Failed to fetch category mappings');
      }
    } catch (error) {
      console.error('Error fetching mappings:', error);
      toast.error('Failed to fetch category mappings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.keywords) {
      toast.error('Name and keywords are required');
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
        toast.success(
          editingMapping ? 'Category mapping updated!' : 'Category mapping created!'
        );
        setIsDialogOpen(false);
        resetForm();
        fetchMappings();
      } else {
        toast.error(data.error || 'Failed to save category mapping');
      }
    } catch (error) {
      console.error('Error saving mapping:', error);
      toast.error('Failed to save category mapping');
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
      pattern: mapping.pattern || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category mapping?')) {
      return;
    }

    try {
      const response = await fetch(`/api/category-mappings/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Category mapping deleted!');
        fetchMappings();
      } else {
        toast.error(data.error || 'Failed to delete category mapping');
      }
    } catch (error) {
      console.error('Error deleting mapping:', error);
      toast.error('Failed to delete category mapping');
    }
  };

  const handleTestPattern = () => {
    if (!testPattern) {
      toast.error('Please enter a pattern to test');
      return;
    }

    try {
      const regex = new RegExp(testPattern, 'i');
      const matches = regex.test(testText);
      setTestResult(matches);
      toast.success(matches ? 'Pattern matches!' : 'Pattern does not match');
    } catch (error) {
      toast.error('Invalid regex pattern');
      setTestResult(null);
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

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading category mappings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Category Mappings</h1>
          <p className="text-muted-foreground mt-1">
            Auto-map products to platform-specific categories
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsTestDialogOpen(true)}>
            <TestTube className="mr-2 h-4 w-4" />
            Test Pattern
          </Button>
          <Button onClick={openNewDialog}>
            <Plus className="mr-2 h-4 w-4" />
            New Mapping
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Mappings</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMappings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsage}</div>
              <p className="text-xs text-muted-foreground mt-1">Times applied to products</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Used</CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.mostUsed ? stats.mostUsed.name : 'N/A'}
              </div>
              {stats.mostUsed && (
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.mostUsed.timesUsed} times
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Platform Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>BC: {stats.platformCoverage.bigcommerce}</span>
                  <span>Shopify: {stats.platformCoverage.shopify}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Etsy: {stats.platformCoverage.etsy}</span>
                  <span>TikTok: {stats.platformCoverage.tiktok}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mappings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Category Mappings</CardTitle>
          <CardDescription>
            Configure how products are automatically categorized across platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mappings.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No category mappings yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first category mapping to get started
              </p>
              <Button onClick={openNewDialog}>
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
                    <TableCell className="font-medium">
                      {mapping.name}
                      {mapping.pattern && (
                        <Badge variant="outline" className="ml-2">
                          Pattern
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {mapping.keywords.slice(0, 3).map((keyword, idx) => (
                          <Badge key={idx} variant="secondary">
                            {keyword}
                          </Badge>
                        ))}
                        {mapping.keywords.length > 3 && (
                          <Badge variant="secondary">
                            +{mapping.keywords.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {mapping.bcCategoryId && <Badge>BC</Badge>}
                        {mapping.shopifyCollection && <Badge>Shopify</Badge>}
                        {mapping.etsyTaxonomyId && <Badge>Etsy</Badge>}
                        {mapping.tiktokCategoryId && <Badge>TikTok</Badge>}
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
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMapping ? 'Edit Category Mapping' : 'New Category Mapping'}
            </DialogTitle>
            <DialogDescription>
              Configure how products are automatically mapped to categories
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                rows={3}
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                Products containing these keywords will be mapped to this category
              </p>
            </div>

            <div>
              <Label htmlFor="pattern">Pattern (optional regex)</Label>
              <Input
                id="pattern"
                value={formData.pattern}
                onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                placeholder="e.g., /t-?shirt/i"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Advanced: Use regex for more precise matching
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-semibold">Platform-Specific IDs</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bcCategoryId">BigCommerce Category ID</Label>
                  <Input
                    id="bcCategoryId"
                    type="number"
                    value={formData.bcCategoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, bcCategoryId: e.target.value })
                    }
                    placeholder="e.g., 23"
                  />
                </div>

                <div>
                  <Label htmlFor="shopifyCollection">Shopify Collection</Label>
                  <Input
                    id="shopifyCollection"
                    value={formData.shopifyCollection}
                    onChange={(e) =>
                      setFormData({ ...formData, shopifyCollection: e.target.value })
                    }
                    placeholder="e.g., t-shirts"
                  />
                </div>

                <div>
                  <Label htmlFor="etsyTaxonomyId">Etsy Taxonomy ID</Label>
                  <Input
                    id="etsyTaxonomyId"
                    type="number"
                    value={formData.etsyTaxonomyId}
                    onChange={(e) =>
                      setFormData({ ...formData, etsyTaxonomyId: e.target.value })
                    }
                    placeholder="e.g., 1234"
                  />
                </div>

                <div>
                  <Label htmlFor="tiktokCategoryId">TikTok Category ID</Label>
                  <Input
                    id="tiktokCategoryId"
                    value={formData.tiktokCategoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, tiktokCategoryId: e.target.value })
                    }
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
                  setIsDialogOpen(false);
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

      {/* Test Pattern Dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Regex Pattern</DialogTitle>
            <DialogDescription>
              Test your regex pattern against sample text
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="testPattern">Pattern</Label>
              <Input
                id="testPattern"
                value={testPattern}
                onChange={(e) => setTestPattern(e.target.value)}
                placeholder="/t-?shirt/i"
              />
            </div>

            <div>
              <Label htmlFor="testText">Sample Text</Label>
              <Textarea
                id="testText"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Enter product title or description to test..."
                rows={4}
              />
            </div>

            {testResult !== null && (
              <Alert variant={testResult ? 'default' : 'destructive'}>
                {testResult ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {testResult ? 'Pattern matches!' : 'Pattern does not match'}
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>
                Close
              </Button>
              <Button onClick={handleTestPattern}>Test Pattern</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}