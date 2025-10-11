'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CreditCard, Store, TrendingUp, DollarSign } from 'lucide-react'

interface StoreWithBilling {
  id: string
  storeName: string
  platform: string
  productCount: number
  tierName: string
  price: number
}

interface BillingData {
  total: number
  stores: StoreWithBilling[]
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true)
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBillingData()
  }, [])

  const fetchBillingData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/billing')
      if (!response.ok) throw new Error('Failed to fetch billing data')
      const data = await response.json()
      setBillingData(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'shopify': return '🛍️'
      case 'etsy': return '🎨'
      case 'bigcommerce': return '🏪'
      case 'tiktok': return '🎵'
      default: return '🏬'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Billing & Subscriptions
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your store subscriptions and view billing details
          </p>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Total Bill Summary */}
        {billingData && (
          <Card className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <DollarSign className="h-6 w-6" />
                Total Monthly Bill
              </CardTitle>
              <CardDescription className="text-blue-100">
                Your current monthly subscription cost
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold">
                ${billingData.total.toFixed(2)}
                <span className="text-2xl font-normal text-blue-100">/month</span>
              </div>
              <p className="text-blue-100 mt-2">
                {billingData.stores.length} active store{billingData.stores.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">No payment method on file</p>
                <p className="text-sm text-gray-500 mt-1">
                  Add a payment method to enable paid features
                </p>
              </div>
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
                Add Payment Method
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Store Subscriptions */}
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Store className="h-6 w-6 text-blue-600" />
            Store Subscriptions
          </h2>

          {billingData && billingData.stores.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No active store subscriptions</p>
                <p className="text-sm text-gray-500 mb-4">
                  Connect a store to get started
                </p>
                <Button 
                  onClick={() => window.location.href = '/stores'}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  Connect Your First Store
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {billingData?.stores.map((store) => (
                <Card key={store.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-4xl">{getPlatformIcon(store.platform)}</div>
                        <div>
                          <h3 className="font-semibold text-lg">{store.storeName}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {store.platform}
                            </Badge>
                            <Badge 
                              variant="secondary"
                              className="text-xs bg-blue-100 text-blue-700"
                            >
                              {store.tierName}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {store.productCount} products
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          ${store.price.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">/month</div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => handleUpgrade(store.id)}
                        >
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Upgrade
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Billing History (Placeholder) */}
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>
              View your past invoices and payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 text-center py-8">
              No billing history available yet
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  function handleUpgrade(storeId: string) {
    // TODO: Implement upgrade modal
    alert(`Upgrade functionality for store ${storeId} will be implemented`)
  }
}