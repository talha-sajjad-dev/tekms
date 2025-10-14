'use client';

import { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { Calculator, Check, Loader2 } from 'lucide-react';

interface PricingRule {
  id: string;
  name: string;
  description?: string;
  ruleType: string;
  value: string;
  isActive: boolean;
  priority: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productIds: string[];
  onSuccess?: () => void;
}

const RULE_TYPE_LABELS: Record<string, string> = {
  markup_percent: 'Markup %',
  markup_fixed: 'Markup $',
  set_price: 'Fixed Price',
  round_up: 'Round Up',
  round_down: 'Round Down',
};

export function ApplyPricingDialog({ open, onOpenChange, productIds, onSuccess }: Props) {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const { toast } = useToast();

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
        // Only show active rules
        setRules(data.rules.filter((r: PricingRule) => r.isActive));
      }
    } catch (error) {
      console.error('Error fetching pricing rules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pricing rules',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!selectedRuleId) {
      toast({
        title: 'No Rule Selected',
        description: 'Please select a pricing rule to apply',
        variant: 'destructive'
      });
      return;
    }

    setApplying(true);

    try {
      const response = await fetch(`/api/pricing-rules/${selectedRuleId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Pricing Applied! 🎉',
          description: `Successfully applied pricing rule to ${data.updatedCount || productIds.length} product(s)`,
        });
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast({
          title: 'Failed to Apply Pricing',
          description: data.error || 'An error occurred',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error applying pricing rule:', error);
      toast({
        title: 'Error',
        description: 'Network error while applying pricing rule',
        variant: 'destructive'
      });
    } finally {
      setApplying(false);
    }
  };

  const formatValue = (rule: PricingRule) => {
    switch (rule.ruleType) {
      case 'markup_percent':
        return `+${rule.value}%`;
      case 'markup_fixed':
        return `+$${rule.value}`;
      case 'set_price':
        return `$${rule.value}`;
      default:
        return rule.value;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <Calculator className="h-5 w-5 text-white" />
            </div>
            Apply Pricing Rule
          </DialogTitle>
          <DialogDescription>
            Select a pricing rule to apply to {productIds.length} product{productIds.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-12">
              <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Active Pricing Rules</h3>
              <p className="text-muted-foreground mb-4">
                Create a pricing rule first to apply automatic pricing
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  // Could open pricing rules modal here
                }}
              >
                Create Pricing Rule
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {rules.map((rule, index) => {
                const isSelected = selectedRuleId === rule.id;
                
                return (
                  <button
                    key={rule.id}
                    onClick={() => setSelectedRuleId(rule.id)}
                    className={`
                      relative group flex items-start gap-4 p-4 rounded-lg border-2 text-left
                      transition-all duration-300 ease-out
                      ${isSelected 
                        ? 'border-primary bg-primary/5 shadow-lg scale-[1.01]' 
                        : 'border-gray-200 hover:border-primary/50 hover:shadow-md'
                      }
                      transform
                    `}
                    style={{
                      animation: `slideIn 0.3s ease-out ${index * 0.05}s both`
                    }}
                  >
                    {/* Rule Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-semibold ${isSelected ? 'text-primary' : ''}`}>
                          {rule.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {RULE_TYPE_LABELS[rule.ruleType] || rule.ruleType}
                        </Badge>
                        <Badge variant="secondary" className="text-xs font-mono">
                          {formatValue(rule)}
                        </Badge>
                      </div>
                      {rule.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {rule.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Priority: {rule.priority}</span>
                      </div>
                    </div>

                    {/* Selection indicator */}
                    <div className={`
                      transition-all duration-300
                      ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
                    `}>
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    </div>

                    {/* Hover gradient overlay */}
                    <div className={`
                      absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500
                      opacity-0 group-hover:opacity-5 transition-opacity duration-300
                    `} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>
            Cancel
          </Button>
          <Button 
            onClick={handleApply} 
            disabled={!selectedRuleId || applying || loading}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {applying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Apply to {productIds.length} Product{productIds.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>

        <style jsx>{`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}