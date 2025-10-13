"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  X,
  AlertCircle 
} from 'lucide-react'

interface BulkOperation {
  id: string
  type: string
  status: string
  totalItems: number
  processedItems: number
  successItems: number
  failedItems: number
  progress: number
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  errorLog: string | null
}

interface JobStatusMonitorProps {
  onClose?: () => void
}

export function JobStatusMonitor({ onClose }: JobStatusMonitorProps) {
  const [jobs, setJobs] = useState<BulkOperation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJobs()
    
    // Poll for updates every 3 seconds
    const interval = setInterval(fetchJobs, 3000)
    return () => clearInterval(interval)
  }, [])

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs')
      const data = await res.json()
      if (res.ok) {
        setJobs(data.jobs || [])
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const cancelJob = async (jobId: string) => {
    try {
      await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' })
      fetchJobs()
    } catch (error) {
      console.error('Error cancelling job:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      case 'queued':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'cancelled':
        return <AlertCircle className="h-5 w-5 text-gray-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      completed: 'default',
      failed: 'destructive',
      processing: 'default',
      queued: 'secondary',
      cancelled: 'secondary'
    }
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  const formatJobType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const activeJobs = jobs.filter(j => j.status === 'processing' || j.status === 'queued')
  const completedJobs = jobs.filter(j => j.status === 'completed' || j.status === 'failed' || j.status === 'cancelled')

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Background Jobs</CardTitle>
            <CardDescription>
              {activeJobs.length} active • {completedJobs.length} completed
            </CardDescription>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No background jobs</p>
            </div>
          ) : (
            <>
              {/* Active Jobs */}
              {activeJobs.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Active Jobs</h4>
                  {activeJobs.map(job => (
                    <div key={job.id} className="p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(job.status)}
                          <div>
                            <div className="font-medium">{formatJobType(job.type)}</div>
                            <div className="text-xs text-muted-foreground">
                              {job.processedItems} / {job.totalItems} items
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(job.status)}
                          {job.status === 'queued' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cancelJob(job.id)}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                      <Progress value={job.progress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span>{job.progress}% complete</span>
                        <span>
                          {job.successItems > 0 && `${job.successItems} success`}
                          {job.failedItems > 0 && ` • ${job.failedItems} failed`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Completed Jobs */}
              {completedJobs.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Recent Jobs</h4>
                  {completedJobs.slice(0, 5).map(job => (
                    <div key={job.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(job.status)}
                          <div>
                            <div className="font-medium text-sm">{formatJobType(job.type)}</div>
                            <div className="text-xs text-muted-foreground">
                              {job.successItems} succeeded • {job.failedItems} failed
                            </div>
                          </div>
                        </div>
                        {getStatusBadge(job.status)}
                      </div>
                      {job.errorLog && (
                        <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
                          {job.errorLog}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}