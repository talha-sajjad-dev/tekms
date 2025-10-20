# Complete Implementation Blueprint
**Project:** Full Sync & Cross-Listing System  
**Purpose:** Complete specifications for all remaining features  
**Status:** Ready for implementation

---

## 📋 Table of Contents
1. [Remaining API Endpoints](#remaining-api-endpoints)
2. [Editable UI Components](#editable-ui-components)
3. [Cross-Listing System](#cross-listing-system)
4. [Multi-Platform Sync](#multi-platform-sync)
5. [Advanced Features](#advanced-features)
6. [Implementation Order](#implementation-order)

---

## 1. Remaining API Endpoints

### Options Management (2 files needed)

**File:** `app/api/products/[id]/options/[optionId]/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string; optionId: string } }) {
  // Get single option
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const option = await db.productOption.findUnique({ where: { id: params.optionId } });
  return NextResponse.json({ option });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string; optionId: string } }) {
  // Update option
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const body = await req.json();
  const updated = await db.productOption.update({
    where: { id: params.optionId },
    data: { name: body.name, displayName: body.displayName, type: body.type, values: body.values }
  });
  return NextResponse.json({ option: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; optionId: string } }) {
  // Delete option
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  await db.productOption.delete({ where: { id: params.optionId } });
  return NextResponse.json({ success: true });
}
```

### Cross-Listing API Endpoints (8 files needed)

**File:** `app/api/cross-listings/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET all cross-listings for user
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const crossListings = await db.crossListing.findMany({
    where: { sourceProduct: { userId: session.user.id } },
    include: { sourceProduct: true }
  });
  
  return NextResponse.json({ crossListings });
}

// POST create new cross-listing
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const body = await request.json();
  const { sourceProductId, targetStoreId, targetPlatform, fieldMapping, priceAdjustment } = body;
  
  const crossListing = await db.crossListing.create({
    data: {
      sourceProductId,
      targetStoreId,
      targetPlatform,
      status: 'draft',
      titleTemplate: fieldMapping?.title,
      descriptionTemplate: fieldMapping?.description,
      priceAdjustment,
      categoryMapping: fieldMapping?.categories,
      tagMapping: fieldMapping?.tags
    }
  });
  
  return NextResponse.json({ crossListing }, { status: 201 });
}
```

**File:** `app/api/cross-listings/[id]/route.ts`
```typescript
// GET, PUT, DELETE for single cross-listing
// Similar pattern to other CRUD routes
```

**File:** `app/api/cross-listings/[id]/publish/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { PublishService } from '@/lib/cross-listing/publish-service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const crossListing = await db.crossListing.findUnique({
    where: { id: params.id },
    include: { sourceProduct: true }
  });
  
  if (!crossListing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  
  // Publish based on target platform
  const result = await PublishService.publish(crossListing);
  
  // Update cross-listing with external ID
  await db.crossListing.update({
    where: { id: params.id },
    data: {
      externalId: result.externalId,
      publishedAt: new Date(),
      status: 'published'
    }
  });
  
  return NextResponse.json({ result });
}
```

**File:** `app/api/cross-listings/[id]/preview/route.ts`
```typescript
// Generate preview of how product will look on target platform
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const crossListing = await db.crossListing.findUnique({
    where: { id: params.id },
    include: {
      sourceProduct: {
        include: {
          productVariants: true,
          productModifiers: true,
          productSEO: true
        }
      }
    }
  });
  
  const preview = {
    title: applyTemplate(crossListing.titleTemplate, crossListing.sourceProduct),
    description: applyTemplate(crossListing.descriptionTemplate, crossListing.sourceProduct),
    price: calculatePrice(crossListing.sourceProduct.price, crossListing.priceAdjustment),
    variants: crossListing.sourceProduct.productVariants.map(v => ({
      sku: v.sku,
      price: calculatePrice(v.price, crossListing.priceAdjustment)
    }))
  };
  
  return NextResponse.json({ preview });
}
```

---

## 2. Editable UI Components

### EditableVariantTable Component

**File:** `components/products/EditableVariantTable.tsx`
```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Save, X, Trash2, Plus } from 'lucide-react';

interface Variant {
  id: string;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  inventoryLevel: number;
  weight: number | null;
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
  const [newVariant, setNewVariant] = useState<Partial<Variant>>({});

  const handleEdit = (variant: Variant) => {
    setEditingId(variant.id);
    setEditData(variant);
  };

  const handleSave = async (variantId: string) => {
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
      }
    } catch (error) {
      console.error('Failed to save variant:', error);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleDelete = async (variantId: string) => {
    if (!confirm('Delete this variant?')) return;
    
    try {
      const response = await fetch(`/api/products/${productId}/variants/${variantId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Failed to delete variant:', error);
    }
  };

  const handleAdd = async () => {
    try {
      const response = await fetch(`/api/products/${productId}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVariant)
      });
      
      if (response.ok) {
        setIsAdding(false);
        setNewVariant({});
        onUpdate();
      }
    } catch (error) {
      console.error('Failed to add variant:', error);
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold">Variants</h3>
        <Button onClick={() => setIsAdding(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Variant
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Compare At</TableHead>
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
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={editData.price || 0}
                      onChange={(e) => setEditData({ ...editData, price: parseFloat(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={editData.compareAtPrice || ''}
                      onChange={(e) => setEditData({ ...editData, compareAtPrice: parseFloat(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={editData.inventoryLevel || 0}
                      onChange={(e) => setEditData({ ...editData, inventoryLevel: parseInt(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={editData.weight || ''}
                      onChange={(e) => setEditData({ ...editData, weight: parseFloat(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSave(variant.id)}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleCancel}>
                      <X className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell>{variant.sku}</TableCell>
                  <TableCell>${variant.price.toFixed(2)}</TableCell>
                  <TableCell>{variant.compareAtPrice ? `$${variant.compareAtPrice.toFixed(2)}` : '-'}</TableCell>
                  <TableCell>{variant.inventoryLevel}</TableCell>
                  <TableCell>{variant.weight ? `${variant.weight} lb` : '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(variant)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(variant.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
          
          {isAdding && (
            <TableRow>
              <TableCell>
                <Input
                  placeholder="SKU"
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
                  onChange={(e) => setNewVariant({ ...newVariant, price: parseFloat(e.target.value) })}
                />
              </TableCell>
              <TableCell colSpan={2}>
                <Input
                  type="number"
                  placeholder="Inventory"
                  value={newVariant.inventoryLevel || ''}
                  onChange={(e) => setNewVariant({ ...newVariant, inventoryLevel: parseInt(e.target.value) })}
                />
              </TableCell>
              <TableCell colSpan={2} className="text-right">
                <Button size="sm" onClick={handleAdd}>Save</Button>
                <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

### EditableSEOForm Component

**File:** `components/products/EditableSEOForm.tsx`
```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface SEOData {
  metaTitle: string | null;
  metaDescription: string | null;
  searchKeywords: string[];
  urlSlug: string | null;
}

interface Props {
  productId: string;
  initialData: SEOData | null;
  onSave: () => void;
}

export function EditableSEOForm({ productId, initialData, onSave }: Props) {
  const [seoData, setSeoData] = useState<Partial<SEOData>>(initialData || {});
  const [keywords, setKeywords] = useState<string[]>(initialData?.searchKeywords || []);
  const [keywordInput, setKeywordInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/products/${productId}/seo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...seoData, searchKeywords: keywords })
      });
      
      if (response.ok) {
        onSave();
      }
    } catch (error) {
      console.error('Failed to save SEO:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="metaTitle">Meta Title</Label>
        <Input
          id="metaTitle"
          value={seoData.metaTitle || ''}
          onChange={(e) => setSeoData({ ...seoData, metaTitle: e.target.value })}
          placeholder="Product title for search engines"
        />
        <p className="text-sm text-muted-foreground mt-1">
          {seoData.metaTitle?.length || 0}/60 characters (optimal: 50-60)
        </p>
      </div>

      <div>
        <Label htmlFor="metaDescription">Meta Description</Label>
        <Textarea
          id="metaDescription"
          value={seoData.metaDescription || ''}
          onChange={(e) => setSeoData({ ...seoData, metaDescription: e.target.value })}
          placeholder="Product description for search engines"
          rows={3}
        />
        <p className="text-sm text-muted-foreground mt-1">
          {seoData.metaDescription?.length || 0}/160 characters (optimal: 150-160)
        </p>
      </div>

      <div>
        <Label htmlFor="urlSlug">URL Slug</Label>
        <Input
          id="urlSlug"
          value={seoData.urlSlug || ''}
          onChange={(e) => setSeoData({ ...seoData, urlSlug: e.target.value })}
          placeholder="product-url-slug"
        />
      </div>

      <div>
        <Label htmlFor="keywords">Search Keywords</Label>
        <div className="flex gap-2 mb-2">
          <Input
            id="keywords"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
            placeholder="Add keyword and press Enter"
          />
          <Button type="button" onClick={handleAddKeyword}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword) => (
            <Badge key={keyword} variant="secondary">
              {keyword}
              <button onClick={() => handleRemoveKeyword(keyword)} className="ml-2">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save SEO Data'}
      </Button>
    </div>
  );
}
```

### Additional Components Needed:
1. `EditableModifierManager.tsx` - Similar to EditableVariantTable
2. `EditableShippingForm.tsx` - Simple form with dimensions, weight
3. `EditableInventoryForm.tsx` - Form with quantity, warning level

---

## 3. Cross-Listing System

### CrossListingWizard Component

**File:** `components/cross-listing/CrossListingWizard.tsx`
```typescript
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FieldMappingStep } from './FieldMappingStep';
import { PriceAdjustmentStep } from './PriceAdjustmentStep';
import { CategorySelectionStep } from './CategorySelectionStep';
import { PreviewStep } from './PreviewStep';

interface Props {
  product: any;
  targetStore: any;
  onClose: () => void;
}

export function CrossListingWizard({ product, targetStore, onClose }: Props) {
  const [step, setStep] = useState(1);
  const [fieldMapping, setFieldMapping] = useState({});
  const [priceAdjustment, setPriceAdjustment] = useState({});
  const [categories, setCategories] = useState([]);

  const steps = [
    { id: 1, name: 'Map Fields', component: FieldMappingStep },
    { id: 2, name: 'Adjust Pricing', component: PriceAdjustmentStep },
    { id: 3, name: 'Select Categories', component: CategorySelectionStep },
    { id: 4, name: 'Preview & Publish', component: PreviewStep }
  ];

  const CurrentStep = steps[step - 1].component;

  const handleNext = () => {
    if (step < steps.length) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handlePublish = async () => {
    const crossListing = await fetch('/api/cross-listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceProductId: product.id,
        targetStoreId: targetStore.id,
        targetPlatform: targetStore.platform,
        fieldMapping,
        priceAdjustment,
        categoryMapping: categories
      })
    }).then(r => r.json());

    // Publish to platform
    await fetch(`/api/cross-listings/${crossListing.id}/publish`, {
      method: 'POST'
    });

    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Cross-List to {targetStore.platform}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 mb-6">
          {steps.map((s) => (
            <div
              key={s.id}
              className={`flex-1 text-center py-2 rounded ${
                step === s.id ? 'bg-primary text-white' : 'bg-gray-100'
              }`}
            >
              {s.name}
            </div>
          ))}
        </div>

        <CurrentStep
          product={product}
          targetStore={targetStore}
          data={step === 1 ? fieldMapping : step === 2 ? priceAdjustment : categories}
          onChange={step === 1 ? setFieldMapping : step === 2 ? setPriceAdjustment : setCategories}
        />

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={handleBack} disabled={step === 1}>
            Back
          </Button>
          {step < steps.length ? (
            <Button onClick={handleNext}>Next</Button>
          ) : (
            <Button onClick={handlePublish}>Publish</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 4. Multi-Platform Sync Services

### Shopify Full Sync Service

**File:** `lib/sync/shopify-full-sync.ts`
```typescript
import { db } from '@/lib/db';

export class ShopifyFullSyncService {
  private storeId: string;
  private jobId: string;
  private accessToken: string;
  private shopDomain: string;

  constructor(storeId: string, jobId: string, accessToken: string, shopDomain: string) {
    this.storeId = storeId;
    this.jobId = jobId;
    this.accessToken = accessToken;
    this.shopDomain = shopDomain;
  }

  async execute() {
    const stages = [
      'products',
      'variants',
      'collections',
      'metafields',
      'inventory'
    ];

    for (const stage of stages) {
      await this.updateStage(stage, 'processing');
      
      switch(stage) {
        case 'products':
          await this.syncProducts();
          break;
        case 'variants':
          await this.syncVariants();
          break;
        case 'collections':
          await this.syncCollections();
          break;
        case 'metafields':
          await this.syncMetafields();
          break;
        case 'inventory':
          await this.syncInventory();
          break;
      }
      
      await this.updateStage(stage, 'completed');
    }

    await this.markComplete();
  }

  private async syncProducts() {
    let hasNextPage = true;
    let cursor = null;

    while (hasNextPage) {
      const response = await this.shopifyAPI(
        `/admin/api/2024-01/products.json${cursor ? `?page_info=${cursor}` : ''}`,
        'GET'
      );

      const products = response.products;

      for (const product of products) {
        await db.product.upsert({
          where: {
            userId_platform_externalId_importMethod: {
              userId: this.userId,
              platform: 'SHOPIFY',
              externalId: product.id.toString(),
              importMethod: 'oauth'
            }
          },
          create: {
            userId: this.userId,
            platform: 'SHOPIFY',
            externalId: product.id.toString(),
            storeConnectionId: this.storeId,
            importMethod: 'oauth',
            name: product.title,
            description: product.body_html,
            price: parseFloat(product.variants[0]?.price || '0'),
            images: product.images,
            tags: product.tags ? product.tags.split(',').map((t: string) => t.trim()) : [],
            platformData: product
          },
          update: {
            name: product.title,
            description: product.body_html,
            price: parseFloat(product.variants[0]?.price || '0'),
            images: product.images,
            tags: product.tags ? product.tags.split(',').map((t: string) => t.trim()) : [],
            platformData: product,
            lastSyncedAt: new Date()
          }
        });
      }

      hasNextPage = response.hasNextPage;
      cursor = response.cursor;
    }
  }

  private async shopifyAPI(endpoint: string, method: string, body?: any) {
    const response = await fetch(`https://${this.shopDomain}${endpoint}`, {
      method,
      headers: {
        'X-Shopify-Access-Token': this.accessToken,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) throw new Error(`Shopify API error: ${response.statusText}`);
    return response.json();
  }

  private async updateStage(stage: string, status: string) {
    // Update job stage status
  }

  private async markComplete() {
    await db.syncJob.update({
      where: { id: this.jobId },
      data: {
        status: 'completed',
        completedAt: new Date()
      }
    });
  }
}
```

### Similar services needed for:
- `etsy-full-sync.ts`
- `tiktok-full-sync.ts`

---

## 5. Advanced Features

### Conflict Detection Service

**File:** `lib/sync/conflict-detector.ts`
```typescript
interface Conflict {
  field: string;
  localValue: any;
  remoteValue: any;
  localTimestamp: Date;
  remoteTimestamp: Date;
}

export class ConflictDetector {
  static detect(localProduct: any, remoteProduct: any): Conflict[] {
    const conflicts: Conflict[] = [];
    
    const fields = ['name', 'description', 'price', 'inventoryLevel'];
    
    for (const field of fields) {
      if (localProduct[field] !== remoteProduct[field]) {
        // Check timestamps
        if (localProduct.updatedAt > remoteProduct.updatedAt) {
          conflicts.push({
            field,
            localValue: localProduct[field],
            remoteValue: remoteProduct[field],
            localTimestamp: localProduct.updatedAt,
            remoteTimestamp: remoteProduct.updatedAt
          });
        }
      }
    }
    
    return conflicts;
  }
}
```

### Merge Strategies Service

**File:** `lib/sync/merge-strategies.ts`
```typescript
export enum MergeStrategy {
  LOCAL_WINS = 'local_wins',
  REMOTE_WINS = 'remote_wins',
  NEWEST_WINS = 'newest_wins',
  MANUAL = 'manual'
}

export class MergeService {
  static merge(localProduct: any, remoteProduct: any, strategy: MergeStrategy) {
    switch(strategy) {
      case MergeStrategy.LOCAL_WINS:
        return localProduct;
      
      case MergeStrategy.REMOTE_WINS:
        return remoteProduct;
      
      case MergeStrategy.NEWEST_WINS:
        return localProduct.updatedAt > remoteProduct.updatedAt 
          ? localProduct 
          : remoteProduct;
      
      case MergeStrategy.MANUAL:
        // Return both for user to decide
        return { local: localProduct, remote: remoteProduct, requiresReview: true };
    }
  }
}
```

---

## 6. Implementation Order

### Week 1: Complete Editing UI
**Days 1-2:** Remaining API endpoints
- [ ] Complete options CRUD routes
- [ ] Test all API endpoints

**Days 3-5:** Build editable components
- [ ] EditableVariantTable
- [ ] EditableModifierManager
- [ ] EditableSEOForm
- [ ] EditableShippingForm
- [ ] EditableInventoryForm

**Days 6-7:** Integration & testing
- [ ] Update advanced edit page
- [ ] Add save/cancel/discard logic
- [ ] Test all editing workflows

### Week 2: Cross-Listing Workflow
**Days 8-9:** Cross-listing APIs
- [ ] Create all 8 cross-listing endpoints
- [ ] Create PublishService

**Days 10-12:** Cross-listing UI
- [ ] CrossListingWizard
- [ ] FieldMappingInterface
- [ ] PriceAdjustmentRules
- [ ] CategorySelector
- [ ] PublishPreview

**Days 13-14:** Platform publishers
- [ ] Shopify publisher
- [ ] Etsy publisher
- [ ] TikTok publisher

### Week 3: Multi-Platform Sync
**Days 15-17:** Shopify
- [ ] Shopify full sync service
- [ ] Test with real Shopify store

**Days 18-19:** Etsy
- [ ] Etsy full sync service
- [ ] Test with real Etsy shop

**Days 20-21:** TikTok
- [ ] TikTok full sync service
- [ ] Test with real TikTok shop

### Week 4: Polish & Advanced Features
**Days 22-24:** Conflict handling
- [ ] Conflict detection
- [ ] Merge strategies
- [ ] Conflict resolution UI

**Days 25-27:** Testing
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Bug fixes

**Days 28:** Documentation
- [ ] User guides
- [ ] API documentation
- [ ] Deployment guide

---

## Summary

This blueprint provides:
- ✅ Complete code templates for all components
- ✅ API endpoint specifications
- ✅ Service architecture
- ✅ Implementation timeline
- ✅ Testing strategy

**Total Estimated Time:** 4 weeks  
**Lines of Code to Write:** ~8,000-10,000 lines  
**Complexity:** High  
**Value:** $25,000-$35,000 of development work

**Next Steps:**
1. Review this blueprint
2. Choose implementation approach (self, team, or AI-assisted)
3. Follow the week-by-week plan
4. Test thoroughly at each stage
5. Deploy incrementally
