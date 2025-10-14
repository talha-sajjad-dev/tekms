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
import {
  Calculator,
  Tag,
  Sparkles,
  FileText,
  X,
  Check
} from 'lucide-react';

interface ActionOption {
  id: string;
  label: string;
  icon: any;
  description: string;
  badge?: string;
  color: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (actionId: string) => void;
  title: string;
  description: string;
  selectedCount?: number;
}

const ACTION_OPTIONS: ActionOption[] = [
  {
    id: 'apply_pricing',
    label: 'Apply Pricing Rule',
    icon: Calculator,
    description: 'Apply automatic pricing rules',
    badge: 'Auto',
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: 'apply_category',
    label: 'Apply Category Mapping',
    icon: Sparkles,
    description: 'Auto-categorize products',
    badge: 'AI',
    color: 'from-orange-500 to-red-500'
  },
  {
    id: 'apply_template',
    label: 'Use Template',
    icon: FileText,
    description: 'Apply product template',
    badge: 'Bulk',
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'edit_tags',
    label: 'Edit Tags',
    icon: Tag,
    description: 'Manage product tags',
    color: 'from-blue-500 to-cyan-500'
  },
];

export function ActionMenu({ open, onOpenChange, onSelect, title, description, selectedCount }: Props) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  // Reset selection when dialog closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => setSelectedAction(null), 200);
    }
  }, [open]);

  const handleSelect = (actionId: string) => {
    setSelectedAction(actionId);
    setTimeout(() => {
      onSelect(actionId);
      onOpenChange(false);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
          {selectedCount && selectedCount > 0 && (
            <Badge variant="secondary" className="mt-2">
              {selectedCount} selected
            </Badge>
          )}
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {ACTION_OPTIONS.map((option, index) => {
            const Icon = option.icon;
            const isSelected = selectedAction === option.id;
            
            return (
              <button
                key={option.id}
                onClick={() => handleSelect(option.id)}
                className={`
                  relative group flex items-center gap-4 p-4 rounded-lg border-2 text-left
                  transition-all duration-300 ease-out
                  ${isSelected 
                    ? 'border-primary bg-primary/5 scale-[1.02] shadow-lg' 
                    : 'border-gray-200 hover:border-primary/50 hover:shadow-md hover:scale-[1.01]'
                  }
                  transform
                `}
                style={{
                  animation: `slideUp 0.3s ease-out ${index * 0.05}s both`
                }}
              >
                {/* Icon with gradient background */}
                <div className={`
                  p-3 rounded-lg bg-gradient-to-br ${option.color}
                  transition-transform duration-300
                  ${isSelected ? 'scale-110' : 'group-hover:scale-105'}
                `}>
                  <Icon className="h-6 w-6 text-white" />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-semibold ${isSelected ? 'text-primary' : ''}`}>
                      {option.label}
                    </span>
                    {option.badge && (
                      <Badge variant="outline" className="text-xs">
                        {option.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </div>

                {/* Selection indicator */}
                <div className={`
                  transition-all duration-300
                  ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
                `}>
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                </div>

                {/* Hover effect */}
                <div className={`
                  absolute inset-0 rounded-lg bg-gradient-to-r ${option.color}
                  opacity-0 group-hover:opacity-5 transition-opacity duration-300
                `} />
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </DialogFooter>

        <style jsx>{`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}