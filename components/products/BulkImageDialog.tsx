'use client';

import { useState } from 'react';
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
import { Upload, X, Image as ImageIcon, Loader2, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productIds: string[];
  onSuccess?: () => void;
}

export function BulkImageDialog({ open, onOpenChange, productIds, onSuccess }: Props) {
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      addImages(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(file => 
        file.type.startsWith('image/')
      );
      addImages(files);
    }
  };

  const addImages = (files: File[]) => {
    setImages(prev => [...prev, ...files]);
    
    // Create preview URLs
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const addImageUrl = (url: string) => {
    if (url && url.trim()) {
      setImageUrls(prev => [...prev, url.trim()]);
      toast({
        title: 'Image URL Added',
        description: 'You can add more URLs or proceed to upload'
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (imageUrls.length === 0) {
      toast({
        title: 'No Images',
        description: 'Please add at least one image',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);

    try {
      // For now, we'll use the image URLs directly
      // In a real implementation, you'd upload files to storage first
      const response = await fetch('/api/products/bulk-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds,
          imageUrls: imageUrls,
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Images Added! 🎉',
          description: `Successfully added ${imageUrls.length} image(s) to ${data.updatedCount || productIds.length} product(s)`,
        });
        onOpenChange(false);
        resetForm();
        onSuccess?.();
      } else {
        toast({
          title: 'Upload Failed',
          description: data.error || 'Failed to add images',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: 'Error',
        description: 'Network error while uploading images',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setImages([]);
    setImageUrls([]);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
              <ImageIcon className="h-5 w-5 text-white" />
            </div>
            Add Images to Products
          </DialogTitle>
          <DialogDescription>
            Upload or add image URLs to {productIds.length} product{productIds.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Upload Area */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
              ${dragActive 
                ? 'border-primary bg-primary/5 scale-[1.02]' 
                : 'border-gray-300 hover:border-primary/50'
              }
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium mb-2">
              Drop images here or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supports JPG, PNG, GIF, WEBP (Max 5MB each)
            </p>
            <input
              id="file-upload"
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>

          {/* URL Input */}
          <div>
            <Label htmlFor="imageUrl">Or Add Image URL</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="imageUrl"
                placeholder="https://example.com/image.jpg"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addImageUrl(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={() => {
                  const input = document.getElementById('imageUrl') as HTMLInputElement;
                  if (input?.value) {
                    addImageUrl(input.value);
                    input.value = '';
                  }
                }}
              >
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Press Enter or click Add to include URL
            </p>
          </div>

          {/* Preview */}
          {imageUrls.length > 0 && (
            <div>
              <Label>Preview ({imageUrls.length} image{imageUrls.length !== 1 ? 's' : ''})</Label>
              <div className="grid grid-cols-4 gap-3 mt-2">
                {imageUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-50">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.jpg';
                        }}
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <div className="absolute bottom-1 left-1 right-1">
                      <Badge variant="secondary" className="text-xs w-full justify-center">
                        #{index + 1}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <strong>How it works:</strong> All images will be added to each selected product. 
              The first image becomes the primary image, others are additional views.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              onOpenChange(false);
              resetForm();
            }} 
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={imageUrls.length === 0 || uploading}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding Images...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Add to {productIds.length} Product{productIds.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}