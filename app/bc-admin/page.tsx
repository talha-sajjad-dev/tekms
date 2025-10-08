'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/use-toast'
import { Toaster } from '@/components/ui/toaster'
import type { QuoteRequest } from '@/types/bigcommerce-app'

export default function BigCommerceAdmin() {
  const searchParams = useSearchParams()
  const context = searchParams.get('context')
  const storeHash = searchParams.get('store_hash')
  
  const [quotes, setQuotes] = useState<QuoteRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'contacted' | 'completed'>('all')

  useEffect(() => {
    if (storeHash) {
      fetchQuotes()
    }
  }, [storeHash])

  async function fetchQuotes() {
    try {
      const response = await fetch(`/api/bc/quotes/list?store_hash=${storeHash}`)
      const data = await response.json()
      
      if (data.success) {
        setQuotes(data.quotes || [])
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load quotes',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error fetching quotes:', error)
      toast({
        title: 'Error',
        description: 'Failed to load quotes',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  async function updateQuoteStatus(quoteId: string, newStatus: 'pending' | 'contacted' | 'completed') {
    try {
      const response = await fetch(`/api/bc/quotes/${quoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Quote status updated'
        })
        fetchQuotes()
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update quote',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error updating quote:', error)
      toast({
        title: 'Error',
        description: 'Failed to update quote',
        variant: 'destructive'
      })
    }
  }

  const filteredQuotes = quotes.filter(q => {
    if (filter === 'all') return true
    return q.status === filter
  })

  const stats = {
    total: quotes.length,
    pending: quotes.filter(q => q.status === 'pending').length,
    contacted: quotes.filter(q => q.status === 'contacted').length,
    completed: quotes.filter(q => q.status === 'completed').length
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">Loading quotes...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Quote Requests</h1>
        <p className="text-muted-foreground">Manage customer quote requests from your store</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Contacted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.contacted}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs defaultValue="all" className="mb-6" onValueChange={(value) => setFilter(value as any)}>
        <TabsList>
          <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
          <TabsTrigger value="contacted">Contacted ({stats.contacted})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({stats.completed})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Quotes List */}
      <div className="space-y-4">
        {filteredQuotes.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No quotes found</p>
            </CardContent>
          </Card>
        ) : (
          filteredQuotes.map((quote) => (
            <Card key={quote.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{quote.customer.name}</CardTitle>
                    <CardDescription>
                      {new Date(quote.createdAt).toLocaleDateString()} at {new Date(quote.createdAt).toLocaleTimeString()}
                    </CardDescription>
                  </div>
                  <Badge variant={
                    quote.status === 'completed' ? 'default' :
                    quote.status === 'contacted' ? 'secondary' :
                    'outline'
                  }>
                    {quote.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Info */}
                  <div>
                    <h4 className="font-semibold mb-2">Customer Information</h4>
                    <dl className="space-y-1 text-sm">
                      <div>
                        <dt className="inline font-medium">Email:</dt>
                        <dd className="inline ml-2">
                          <a href={`mailto:${quote.customer.email}`} className="text-blue-600 hover:underline">
                            {quote.customer.email}
                          </a>
                        </dd>
                      </div>
                      <div>
                        <dt className="inline font-medium">Phone:</dt>
                        <dd className="inline ml-2">
                          <a href={`tel:${quote.customer.phone}`} className="text-blue-600 hover:underline">
                            {quote.customer.phone}
                          </a>
                        </dd>
                      </div>
                      {quote.customer.company && (
                        <div>
                          <dt className="inline font-medium">Company:</dt>
                          <dd className="inline ml-2">{quote.customer.company}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Product Info */}
                  <div>
                    <h4 className="font-semibold mb-2">Product Details</h4>
                    <dl className="space-y-1 text-sm">
                      <div>
                        <dt className="inline font-medium">Product:</dt>
                        <dd className="inline ml-2">{quote.product.name}</dd>
                      </div>
                      <div>
                        <dt className="inline font-medium">SKU:</dt>
                        <dd className="inline ml-2">{quote.product.sku}</dd>
                      </div>
                      <div>
                        <dt className="inline font-medium">Unit Price:</dt>
                        <dd className="inline ml-2">${quote.product.price}</dd>
                      </div>
                      <div>
                        <dt className="inline font-medium">Quantity:</dt>
                        <dd className="inline ml-2">{quote.quantity}</dd>
                      </div>
                      <div>
                        <dt className="inline font-medium">Total:</dt>
                        <dd className="inline ml-2 font-semibold">${(quote.product.price * quote.quantity).toFixed(2)}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {quote.notes && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Additional Notes</h4>
                    <p className="text-sm text-muted-foreground">{quote.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  {quote.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => updateQuoteStatus(quote.id, 'contacted')}
                    >
                      Mark as Contacted
                    </Button>
                  )}
                  {quote.status === 'contacted' && (
                    <Button
                      size="sm"
                      onClick={() => updateQuoteStatus(quote.id, 'completed')}
                    >
                      Mark as Completed
                    </Button>
                  )}
                  {quote.status !== 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuoteStatus(quote.id, 'pending')}
                    >
                      Reset to Pending
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Toaster />
    </div>
  )
}