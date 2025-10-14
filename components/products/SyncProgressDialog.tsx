'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle, Info } from 'lucide-react'

interface SyncProgressDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  storeName: string
  jobId?: string
}

interface SyncStatus {
  jobId: string
  status: 'processing' | 'completed' | 'failed' | 'idle'
  totalItems: number
  processedItems: number
  failedItems?: number
  progress?: number
  results?: {
    synced: number
    failed: number
    total: number
  }
}

export function SyncProgressDialog({
  open,
  onOpenChange,
  storeId,
  storeName,
  jobId
}: SyncProgressDialogProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [canClose, setCanClose] = useState(false)

  useEffect(() => {
    if (!open || !storeId) return

    let intervalId: NodeJS.Timeout

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/stores/${storeId}/sync-status`)
        if (response.ok) {
          const data = await response.json()
          setStatus(data)

          // Allow closing dialog after sync completes or fails
          if (data.status === 'completed' || data.status === 'failed') {
            setCanClose(true)
            clearInterval(intervalId)
          }
        }
      } catch (error) {
        console.error('Failed to check sync status:', error)
      }
    }

    // Check immediately
    checkStatus()

    // Then check every 2 seconds
    intervalId = setInterval(checkStatus, 2000)

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [open, storeId])

  const handleClose = () => {
    if (status?.status === 'processing') {
      // Allow closing but warn user
      if (confirm('Sync is still in progress. The sync will continue in the background. Close anyway?')) {
        onOpenChange(false)
      }
    } else {
      onOpenChange(false)
    }
  }

  const getStatusIcon = () => {
    if (!status) return <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
    
    switch (status.status) {
      case 'processing':
        return <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle2 className="h-6 w-6 text-green-500" />
      case 'failed':
        return <XCircle className="h-6 w-6 text-red-500" />
      default:
        return <Info className="h-6 w-6 text-gray-500" />
    }
  }

  const getStatusText = () => {
    if (!status) return 'Initializing sync...'
    
    switch (status.status) {
      case 'processing':
        return 'Syncing products...'
      case 'completed':
        return 'Sync completed successfully!'
      case 'failed':
        return 'Sync failed'
      default:
        return 'Checking sync status...'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => {
        if (status?.status === 'processing') {
          e.preventDefault()
        }
      }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Product Sync
          </DialogTitle>
          <DialogDescription>
            Syncing products from {storeName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Progress Bar */}
          {status?.status === 'processing' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{status.processedItems || 0} / {status.totalItems || 0} products</span>
                <span>{status.progress || 0}%</span>
              </div>
              <Progress value={status.progress || 0} className="h-2" />
            </div>
          )}

          {/* Status Message */}
          <div className="rounded-lg border p-4">
            <p className="font-medium">{getStatusText()}</p>
            
            {status?.status === 'processing' && (
              <p className="mt-2 text-sm text-muted-foreground">
                This may take a few minutes for large catalogs...
              </p>
            )}
            
            {status?.status === 'completed' && status.results && (
              <div className="mt-2 space-y-1 text-sm">
                <p className="text-green-600">✓ {status.results.synced} products synced successfully</p>
                {status.results.failed > 0 && (
                  <p className="text-amber-600">⚠ {status.results.failed} products failed</p>
                )}
              </div>
            )}
            
            {status?.status === 'failed' && (
              <p className="mt-2 text-sm text-red-600">
                An error occurred during sync. Please try again.
              </p>
            )}
          </div>

          {/* Background Notice */}
          {status?.status === 'processing' && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-sm text-blue-800">
                <strong>💡 Tip:</strong> You can close this window and continue browsing. 
                The sync will continue in the background.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {status?.status === 'processing' ? (
            <Button variant="outline" onClick={handleClose}>
              Close (Background)
            </Button>
          ) : (
            <Button onClick={() => onOpenChange(false)}>
              {status?.status === 'completed' ? 'Done' : 'Close'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}