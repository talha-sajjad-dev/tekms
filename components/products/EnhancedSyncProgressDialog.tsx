'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle, AlertCircle, Pause, Play, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Stage {
  name: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  itemsProcessed: number
  totalItems: number
  startedAt?: string
  completedAt?: string
  errors?: string[]
}

interface SyncStatus {
  jobId: string
  status: 'processing' | 'completed' | 'failed' | 'cancelled' | 'idle'
  totalItems: number
  processedItems: number
  failedItems?: number
  progress?: number
  
  // Enhanced fields
  isPaused?: boolean
  canPause?: boolean
  canResume?: boolean
  canCancel?: boolean
  stages?: Stage[]
  currentStage?: string
  estimatedTimeRemaining?: number
  
  results?: {
    synced: number
    failed: number
    total: number
  }
  
  errorLog?: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  storeName: string
  jobId?: string
}

export function EnhancedSyncProgressDialog({
  open,
  onOpenChange,
  storeId,
  storeName,
  jobId
}: Props) {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!open || !storeId) return

    let intervalId: NodeJS.Timeout

    const checkStatus = async () => {
      try {
        const url = jobId 
          ? `/api/stores/${storeId}/sync-status?jobId=${jobId}`
          : `/api/stores/${storeId}/sync-status`
          
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          setStatus(data)

          // Stop polling if sync completed, failed, or cancelled
          if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
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
  }, [open, storeId, jobId])

  const handlePause = async () => {
    if (!status?.jobId) return
    
    setLoading(true)
    try {
      const res = await fetch(`/api/stores/${storeId}/sync/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: status.jobId })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        toast({
          title: 'Sync Paused',
          description: 'Sync has been paused successfully'
        })
      } else {
        toast({
          title: 'Failed to Pause',
          description: data.error || 'Could not pause sync',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Network error while pausing sync',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResume = async () => {
    if (!status?.jobId) return
    
    setLoading(true)
    try {
      const res = await fetch(`/api/stores/${storeId}/sync/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: status.jobId })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        toast({
          title: 'Sync Resumed',
          description: 'Sync has been resumed successfully'
        })
      } else {
        toast({
          title: 'Failed to Resume',
          description: data.error || 'Could not resume sync',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Network error while resuming sync',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!status?.jobId) return
    
    if (!confirm('Are you sure you want to cancel this sync? Progress will be lost.')) {
      return
    }
    
    setLoading(true)
    try {
      const res = await fetch(`/api/stores/${storeId}/sync/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          jobId: status.jobId,
          reason: 'User cancelled from UI'
        })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        toast({
          title: 'Cancellation Requested',
          description: 'Sync will stop at the next checkpoint'
        })
      } else {
        toast({
          title: 'Failed to Cancel',
          description: data.error || 'Could not cancel sync',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Network error while cancelling sync',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (status?.status === 'processing' && !status.isPaused) {
      if (confirm('Sync is still running. It will continue in the background. Close anyway?')) {
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
        return status.isPaused 
          ? <Pause className="h-6 w-6 text-amber-500" />
          : <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle2 className="h-6 w-6 text-green-500" />
      case 'failed':
        return <XCircle className="h-6 w-6 text-red-500" />
      case 'cancelled':
        return <AlertCircle className="h-6 w-6 text-amber-500" />
      default:
        return <Loader2 className="h-6 w-6 text-gray-500" />
    }
  }

  const getStatusText = () => {
    if (!status) return 'Initializing sync...'
    
    switch (status.status) {
      case 'processing':
        return status.isPaused ? 'Sync Paused' : 'Syncing products...'
      case 'completed':
        return 'Sync completed successfully!'
      case 'failed':
        return 'Sync failed'
      case 'cancelled':
        return 'Sync cancelled'
      default:
        return 'Checking sync status...'
    }
  }

  const getStageIcon = (stage: Stage) => {
    switch (stage.status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
    }
  }

  const formatStageName = (name: string) => {
    return name.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Full Product Sync
          </DialogTitle>
          <DialogDescription>
            {storeName} - {getStatusText()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Overall Progress</span>
              <span>{status?.progress || 0}%</span>
            </div>
            <Progress value={status?.progress || 0} className="h-2" />
            {status?.processedItems !== undefined && status?.totalItems !== undefined && (
              <div className="text-xs text-muted-foreground text-center">
                {status.processedItems} / {status.totalItems} items
              </div>
            )}
          </div>

          {/* Sync Stages */}
          {status?.stages && status.stages.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Sync Stages</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {status.stages.map((stage: Stage, index: number) => (
                  <div 
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      stage.status === 'processing' 
                        ? 'bg-blue-50 border-blue-200'
                        : stage.status === 'completed'
                        ? 'bg-green-50 border-green-200'
                        : stage.status === 'failed'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gray-50'
                    }`}
                  >
                    {getStageIcon(stage)}
                    
                    <div className="flex-1">
                      <div className="font-medium text-sm capitalize">
                        {formatStageName(stage.name)}
                      </div>
                      {stage.totalItems > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {stage.itemsProcessed} / {stage.totalItems}
                        </div>
                      )}
                    </div>
                    
                    {stage.status === 'processing' && stage.totalItems > 0 && (
                      <div className="text-xs font-medium text-blue-600">
                        {Math.round((stage.itemsProcessed / stage.totalItems) * 100)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Message */}
          <div className="rounded-lg border p-4">
            <p className="font-medium">{getStatusText()}</p>
            
            {status?.status === 'processing' && !status.isPaused && (
              <p className="mt-2 text-sm text-muted-foreground">
                This may take a few minutes for large catalogs...
              </p>
            )}
            
            {status?.status === 'processing' && status.isPaused && (
              <p className="mt-2 text-sm text-amber-600">
                ⏸️ Sync is paused. Click Resume to continue.
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
              <div className="mt-2">
                <p className="text-sm text-red-600">
                  An error occurred during sync.
                </p>
                {status.errorLog && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer text-muted-foreground">
                      Show error details
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                      {status.errorLog}
                    </pre>
                  </details>
                )}
              </div>
            )}
            
            {status?.status === 'cancelled' && (
              <p className="mt-2 text-sm text-amber-600">
                Sync was cancelled by user.
              </p>
            )}
          </div>

          {/* Background Notice */}
          {status?.status === 'processing' && !status.isPaused && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-sm text-blue-800">
                <strong>💡 Tip:</strong> You can close this window and continue browsing. 
                The sync will continue in the background.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-2 border-t pt-4">
          <div className="flex gap-2">
            {status?.canPause && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handlePause}
                disabled={loading}
              >
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
            )}
            
            {status?.canResume && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleResume}
                disabled={loading}
              >
                <Play className="h-4 w-4 mr-1" />
                Resume
              </Button>
            )}
            
            {status?.canCancel && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleCancel}
                disabled={loading}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
          
          <Button onClick={handleClose} size="sm">
            {status?.status === 'processing' && !status.isPaused ? 'Close (Background)' : 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}