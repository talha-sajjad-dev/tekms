'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SEOData {
  id?: string;
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
  const { toast } = useToast();

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const handleKeywordKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/products/${productId}/seo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...seoData, 
          searchKeywords: keywords 
        })
      });
      
      if (response.ok) {
        onSave();
        toast({
          title: 'Success',
          description: 'SEO data saved successfully'
        });
      } else {
        throw new Error('Failed to save SEO data');
      }
    } catch (error) {
      console.error('Failed to save SEO:', error);
      toast({
        title: 'Error',
        description: 'Failed to save SEO data',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const metaTitleLength = seoData.metaTitle?.length || 0;
  const metaDescLength = seoData.metaDescription?.length || 0;

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="metaTitle">Meta Title</Label>
        <Input
          id="metaTitle"
          value={seoData.metaTitle || ''}
          onChange={(e) => setSeoData({ ...seoData, metaTitle: e.target.value })}
          placeholder="Product title for search engines (50-60 characters)"
          maxLength={70}
        />
        <p className="text-sm text-muted-foreground mt-1">
          {metaTitleLength}/70 characters 
          {metaTitleLength >= 50 && metaTitleLength <= 60 && (
            <span className="text-green-600 ml-2">✓ Optimal length</span>
          )}
          {metaTitleLength > 60 && (
            <span className="text-amber-600 ml-2">⚠ May be truncated in search results</span>
          )}
        </p>
      </div>

      <div>
        <Label htmlFor="metaDescription">Meta Description</Label>
        <Textarea
          id="metaDescription"
          value={seoData.metaDescription || ''}
          onChange={(e) => setSeoData({ ...seoData, metaDescription: e.target.value })}
          placeholder="Product description for search engines (150-160 characters)"
          rows={3}
          maxLength={200}
        />
        <p className="text-sm text-muted-foreground mt-1">
          {metaDescLength}/200 characters
          {metaDescLength >= 150 && metaDescLength <= 160 && (
            <span className="text-green-600 ml-2">✓ Optimal length</span>
          )}
          {metaDescLength > 160 && (
            <span className="text-amber-600 ml-2">⚠ May be truncated in search results</span>
          )}
        </p>
      </div>

      <div>
        <Label htmlFor="urlSlug">URL Slug</Label>
        <Input
          id="urlSlug"
          value={seoData.urlSlug || ''}
          onChange={(e) => {
            // Auto-format to URL-friendly slug
            const slug = e.target.value
              .toLowerCase()
              .replace(/[^a-z0-9-]/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '');
            setSeoData({ ...seoData, urlSlug: slug });
          }}
          placeholder="product-url-slug"
        />
        <p className="text-sm text-muted-foreground mt-1">
          Use lowercase letters, numbers, and hyphens only
        </p>
      </div>

      <div>
        <Label htmlFor="keywords">Search Keywords</Label>
        <div className="flex gap-2 mb-3">
          <Input
            id="keywords"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyPress={handleKeywordKeyPress}
            placeholder="Add keyword and press Enter"
          />
          <Button type="button" onClick={handleAddKeyword} variant="outline">
            Add
          </Button>
        </div>
        
        {keywords.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword, index) => (
              <Badge key={index} variant="secondary" className="pl-3 pr-1">
                {keyword}
                <button
                  onClick={() => handleRemoveKeyword(keyword)}
                  className="ml-2 hover:bg-destructive/20 rounded-sm p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No keywords added yet. Add keywords to improve search visibility.
          </p>
        )}
      </div>

      <div className="flex gap-2 pt-4 border-t">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save SEO Data'}
        </Button>
        <Button 
          variant="outline" 
          onClick={() => {
            setSeoData(initialData || {});
            setKeywords(initialData?.searchKeywords || []);
          }}
          disabled={isSaving}
        >
          Reset
        </Button>
      </div>

      <div className="bg-muted p-4 rounded-lg">
        <h4 className="font-semibold mb-2">SEO Tips</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Keep meta title between 50-60 characters for best results</li>
          <li>• Meta description should be 150-160 characters</li>
          <li>• Include your main keyword in both title and description</li>
          <li>• Use descriptive, unique keywords relevant to the product</li>
          <li>• URL slugs should be short, descriptive, and keyword-rich</li>
        </ul>
      </div>
    </div>
  );
}