"use client"

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, X, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ImageUploadProps {
  label: string
  value: string
  onChange: (url: string) => void
  category?: string
  accept?: string
  maxSizeMB?: number
  showPreview?: boolean
  placeholder?: string
  description?: string
}

export function ImageUpload({
  label,
  value,
  onChange,
  category = 'general',
  accept = 'image/*',
  maxSizeMB = 5,
  showPreview = true,
  placeholder = '/logo.png',
  description
}: ImageUploadProps) {
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(value)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size
    const maxSize = maxSizeMB * 1024 * 1024
    if (file.size > maxSize) {
      toast({
        title: 'File Too Large',
        description: `Maximum file size is ${maxSizeMB}MB`,
        variant: 'destructive'
      })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', category)

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (res.ok) {
        onChange(data.url)
        setPreviewUrl(data.url)
        toast({
          title: 'Upload Successful',
          description: `File uploaded: ${data.filename}`
        })
      } else {
        toast({
          title: 'Upload Failed',
          description: data.error || 'Failed to upload file',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Upload Error',
        description: 'Failed to upload file',
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleClear = () => {
    onChange('')
    setPreviewUrl('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setPreviewUrl(e.target.value)
          }}
          placeholder={placeholder}
          className="flex-1"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      {showPreview && previewUrl && (
        <div className="mt-2 p-4 border rounded-lg bg-gray-50">
          <p className="text-xs text-muted-foreground mb-2">Preview:</p>
          <img 
            src={previewUrl} 
            alt={`${label} preview`}
            className="h-16 object-contain"
            onError={(e) => {
              e.currentTarget.src = '/placeholder.svg'
            }}
          />
        </div>
      )}
    </div>
  )
}