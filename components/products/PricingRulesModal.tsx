'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Calculator } from 'lucide-react';
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
  ruleType: string;
  value: string;
  isActive: boolean;
  priority: number;
}

const RULE_TYPES = [
  { value: 'markup_percent', label: 'Markup Percentage' },
  { value: 'markup_fixed', label: 'Markup Fixed Amount' },
  { value: 'set_price', label: 'Set Fixed Price' },
  { value: 'round_up', label: 'Round Up' },
  { value: 'round_down', label: 'Round Down' },
];

const APPLIES_TO_OPTIONS = [
  { value: 'all', label: 'All Products' },
  { value: 'specific_stores', label: 'Specific Stores' },
  { value: 'specific_products', label: 'Specific Products' },
  { value: 'tagged', label: 'Tagged Products' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PricingRulesModal({ open, onOpenChange }: Props) {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedRule, setSelectedRule] = useState<PricingRule | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    appliesTo: 'all',
    ruleType: 'markup_percent',
    value: '',
    isActive: true,
    priority: 0,
  });

  useEffect(() => {
    if (open) {
      fetchRules();
    }
  }, [open]);

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/pricing-rules');
      const data = await response.json();
      
      if (data.success) {
        setRules(data.rules);
      }
    } catch (error) {
      console.error('Error fetching pricing rules:', error);
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
        toast({ title: 'Success', description: 'Pricing rule created successfully' });
        setShowCreateDialog(false);
        resetForm();
        fetchRules();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create pricing rule', variant: 'destructive' });
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
        toast({ title: 'Success', description: 'Pricing rule updated successfully' });
        setShowEditDialog(false);
        setSelectedRule(null);
        resetForm();
        fetchRules();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update pricing rule', variant: 'destructive' });
    }
  };

  const handleDelete = async (rule: PricingRule) => {
    if (!confirm(`Delete pricing rule "${rule.name}"?`)) return;

    try {
      const response = await fetch(`/api/pricing-rules/${rule.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({ title: 'Success', description: 'Pricing rule deleted successfully' });
        fetchRules();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete pricing rule', variant: 'destructive' });
    }
  };

  const openEditDialog = (rule: PricingRule) => {
    setSelectedRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      appliesTo: rule.appliesTo,
      ruleType: rule.ruleType,
      value: rule.value,
      isActive: rule.isActive,
      priority: rule.priority,
    });
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      appliesTo: 'all',
      ruleType: 'markup_percent',
      value: '',
      isActive: true,
      priority: 0,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Pricing Rules
            </DialogTitle>
            <DialogDescription>
              Automate your pricing strategy with dynamic rules
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowCreateDialog(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create Rule
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : rules.length === 0 ? (
              <div className="text-center py-12">
                <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No pricing rules yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first pricing rule to automate pricing
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Rule
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <div className="font-medium">{rule.name}</div>
                        {rule.description && (
                          <div className="text-sm text-muted-foreground">{rule.description}</div>
                        )}
                      </TableCell>
                      <TableCell>{RULE_TYPES.find(t => t.value === rule.ruleType)?.label}</TableCell>
                      <TableCell>
                        {rule.ruleType === 'markup_percent' && `+${rule.value}%`}
                        {rule.ruleType === 'markup_fixed' && `+$${rule.value}`}
                        {rule.ruleType === 'set_price' && `$${rule.value}`}
                        {(rule.ruleType === 'round_up' || rule.ruleType === 'round_down') && rule.value}
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
                            onClick={() => handleDelete(rule)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {showCreateDialog ? 'Create Pricing Rule' : 'Edit Pricing Rule'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Rule Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Etsy +10% Markup"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
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

              <div>
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

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Rule is active</Label>
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
    </>
  );
}