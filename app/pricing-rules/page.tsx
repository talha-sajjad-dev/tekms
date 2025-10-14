'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Play, Calculator, Info } from 'lucide-react';
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

interface PricingRule {
  id: string;
  name: string;
  description?: string;
  appliesTo: string;
  storeIds: string[];
  productIds: string[];
  tags: string[];
  ruleType: string;
  value: string;
  platformRules: any;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

const RULE_TYPES = [
  { value: 'markup_percent', label: 'Markup Percentage', description: 'Add X% to base price (e.g., +10% for Etsy)' },
  { value: 'markup_fixed', label: 'Markup Fixed Amount', description: 'Add fixed $ to base price (e.g., +$5 shipping)' },
  { value: 'set_price', label: 'Set Fixed Price', description: 'Override with specific price' },
  { value: 'round_up', label: 'Round Up', description: 'Round up to nearest value (e.g., .99 endings)' },
  { value: 'round_down', label: 'Round Down', description: 'Round down to nearest value' },
];

const APPLIES_TO_OPTIONS = [
  { value: 'all', label: 'All Products', description: 'Apply to every product' },
  { value: 'specific_stores', label: 'Specific Stores', description: 'Apply to selected stores only' },
  { value: 'specific_products', label: 'Specific Products', description: 'Apply to selected products only' },
  { value: 'tagged', label: 'Tagged Products', description: 'Apply to products with specific tags' },
];

export default function PricingRulesPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCalculatorDialog, setShowCalculatorDialog] = useState(false);
  const [selectedRule, setSelectedRule] = useState<PricingRule | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    appliesTo: 'all',
    storeIds: [] as string[],
    productIds: [] as string[],
    tags: [] as string[],
    ruleType: 'markup_percent',
    value: '',
    isActive: true,
    priority: 0,
  });

  // Calculator state
  const [calcBasePrice, setCalcBasePrice] = useState('29.99');
  const [calcResult, setCalcResult] = useState<any>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/pricing-rules');
      const data = await response.json();
      
      if (data.success) {
        setRules(data.rules);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch pricing rules',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch pricing rules',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/pricing-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Pricing rule created successfully',
        });
        setShowCreateDialog(false);
        resetForm();
        fetchRules();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to create pricing rule',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create pricing rule',
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async () => {
    if (!selectedRule) return;

    try {
      const response = await fetch(`/api/pricing-rules/${selectedRule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Pricing rule updated successfully',
        });
        setShowEditDialog(false);
        setSelectedRule(null);
        resetForm();
        fetchRules();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update pricing rule',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update pricing rule',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedRule) return;

    try {
      const response = await fetch(`/api/pricing-rules/${selectedRule.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Pricing rule deleted successfully',
        });
        setShowDeleteDialog(false);
        setSelectedRule(null);
        fetchRules();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete pricing rule',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete pricing rule',
        variant: 'destructive',
      });
    }
  };

  const calculatePrice = async () => {
    try {
      const response = await fetch('/api/pricing-rules/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ basePrice: parseFloat(calcBasePrice) }),
      });

      const data = await response.json();

      if (data.success) {
        setCalcResult(data.calculation);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to calculate price',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to calculate price',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (rule: PricingRule) => {
    setSelectedRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      appliesTo: rule.appliesTo,
      storeIds: rule.storeIds,
      productIds: rule.productIds,
      tags: rule.tags,
      ruleType: rule.ruleType,
      value: rule.value,
      isActive: rule.isActive,
      priority: rule.priority,
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (rule: PricingRule) => {
    setSelectedRule(rule);
    setShowDeleteDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      appliesTo: 'all',
      storeIds: [],
      productIds: [],
      tags: [],
      ruleType: 'markup_percent',
      value: '',
      isActive: true,
      priority: 0,
    });
  };

  const getRuleTypeLabel = (type: string) => {
    return RULE_TYPES.find(t => t.value === type)?.label || type;
  };

  const getAppliesToLabel = (appliesTo: string) => {
    return APPLIES_TO_OPTIONS.find(o => o.value === appliesTo)?.label || appliesTo;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading pricing rules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Pricing Rules</h1>
          <p className="text-muted-foreground mt-2">
            Automate your pricing strategy with dynamic rules
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowCalculatorDialog(true)}
          >
            <Calculator className="mr-2 h-4 w-4" />
            Price Calculator
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Rule
          </Button>
        </div>
      </div>

      {rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Info className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No pricing rules yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first pricing rule to automate pricing across platforms
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Applies To</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{rule.name}</div>
                      {rule.description && (
                        <div className="text-sm text-muted-foreground">
                          {rule.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getRuleTypeLabel(rule.ruleType)}</TableCell>
                  <TableCell>
                    {rule.ruleType === 'markup_percent' && `+${rule.value}%`}
                    {rule.ruleType === 'markup_fixed' && `+$${rule.value}`}
                    {rule.ruleType === 'set_price' && `$${rule.value}`}
                    {(rule.ruleType === 'round_up' || rule.ruleType === 'round_down') && rule.value}
                  </TableCell>
                  <TableCell>{getAppliesToLabel(rule.appliesTo)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{rule.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(rule)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(rule)}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {showCreateDialog ? 'Create Pricing Rule' : 'Edit Pricing Rule'}
            </DialogTitle>
            <DialogDescription>
              Configure your pricing rule settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Rule Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Etsy +10% Markup"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ruleType">Rule Type *</Label>
                <Select
                  value={formData.ruleType}
                  onValueChange={(value) => setFormData({ ...formData, ruleType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RULE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">Value *</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder={formData.ruleType === 'markup_percent' ? '10' : '5.00'}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="appliesTo">Applies To *</Label>
              <Select
                value={formData.appliesTo}
                onValueChange={(value) => setFormData({ ...formData, appliesTo: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPLIES_TO_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
                <p className="text-sm text-muted-foreground">Higher priority rules apply first</p>
              </div>

              <div className="flex items-center space-x-2 mt-8">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Rule is active</Label>
              </div>
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
              {showCreateDialog ? 'Create Rule' : 'Update Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Pricing Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedRule?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price Calculator Dialog */}
      <Dialog open={showCalculatorDialog} onOpenChange={setShowCalculatorDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Price Calculator</DialogTitle>
            <DialogDescription>
              Preview how your active pricing rules affect product prices
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="calcBasePrice">Base Price</Label>
              <Input
                id="calcBasePrice"
                type="number"
                step="0.01"
                value={calcBasePrice}
                onChange={(e) => setCalcBasePrice(e.target.value)}
                placeholder="29.99"
              />
            </div>

            <Button onClick={calculatePrice} className="w-full">
              <Calculator className="mr-2 h-4 w-4" />
              Calculate Price
            </Button>

            {calcResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Calculation Result</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center text-lg">
                    <span>Original Price:</span>
                    <span className="font-bold">${calcResult.originalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg">
                    <span>Final Price:</span>
                    <span className="font-bold text-primary">${calcResult.finalPrice.toFixed(2)}</span>
                  </div>

                  {calcResult.appliedRules.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">Applied Rules:</h4>
                      {calcResult.breakdown.map((step: string, idx: number) => (
                        <div key={idx} className="text-sm text-muted-foreground">
                          {step}
                        </div>
                      ))}
                    </div>
                  )}

                  {calcResult.appliedRules.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No pricing rules applied to this product
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCalculatorDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}