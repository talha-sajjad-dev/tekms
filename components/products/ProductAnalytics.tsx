"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  DollarSign,
  ShoppingCart,
  Activity,
  AlertTriangle
} from 'lucide-react'

interface AnalyticsData {
  totalProducts: number
  totalValue: number
  avgPrice: number
  platformBreakdown: Record<string, number>
  priceRanges: {
    under25: number
    range25to50: number
    range50to100: number
    over100: number
  }
  syncHealth: {
    synced: number
    errors: number
    pending: number
    total: number
  }
  trends: {
    productsAddedLast7Days: number
    productsAddedLast30Days: number
    avgPriceChange: number
  }
}

interface ProductAnalyticsProps {
  data: AnalyticsData
}

export function ProductAnalytics({ data }: ProductAnalyticsProps) {
  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      BIGCOMMERCE: 'bg-blue-500',
      SHOPIFY: 'bg-green-500',
      ETSY: 'bg-orange-500',
      TIKTOK: 'bg-pink-500'
    }
    return colors[platform] || 'bg-gray-500'
  }

  const syncHealthPercent = (data.syncHealth.synced / data.syncHealth.total) * 100

  return (
    <div className="space-y-4">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-3xl font-bold">{data.totalProducts.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">
                  +{data.trends.productsAddedLast7Days} this week
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-3xl font-bold">
                  ${data.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-muted-foreground">
                  Inventory value
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-3xl font-bold">${data.avgPrice.toFixed(2)}</div>
                <div className="flex items-center gap-1 text-xs">
                  {data.trends.avgPriceChange >= 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">+{data.trends.avgPriceChange.toFixed(1)}%</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 text-red-600" />
                      <span className="text-red-600">{data.trends.avgPriceChange.toFixed(1)}%</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sync Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-8 w-8 text-blue-600" />
              <div className="w-full">
                <div className="text-3xl font-bold">{syncHealthPercent.toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">
                  {data.syncHealth.errors > 0 && (
                    <span className="text-red-600">{data.syncHealth.errors} errors</span>
                  )}
                  {data.syncHealth.errors === 0 && 'All synced ✓'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Distribution</CardTitle>
          <CardDescription>Products per connected platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(data.platformBreakdown).map(([platform, count]) => {
              const percentage = (count / data.totalProducts) * 100
              return (
                <div key={platform} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getPlatformColor(platform)}`} />
                      <span className="font-medium">{platform}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {count.toLocaleString()} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getPlatformColor(platform)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Price Distribution */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Price Distribution</CardTitle>
            <CardDescription>Products by price range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Under $25', count: data.priceRanges.under25, color: 'bg-blue-500' },
                { label: '$25 - $50', count: data.priceRanges.range25to50, color: 'bg-green-500' },
                { label: '$50 - $100', count: data.priceRanges.range50to100, color: 'bg-orange-500' },
                { label: 'Over $100', count: data.priceRanges.over100, color: 'bg-purple-500' }
              ].map((range) => {
                const percentage = (range.count / data.totalProducts) * 100
                return (
                  <div key={range.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <div className={`w-3 h-3 rounded-full ${range.color}`} />
                      <span className="text-sm">{range.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${range.color}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-16 text-right">
                        {range.count}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sync Status</CardTitle>
            <CardDescription>Product synchronization health</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Synced</span>
                <Badge variant="default">{data.syncHealth.synced}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Errors</span>
                <Badge variant="destructive">{data.syncHealth.errors}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Pending</span>
                <Badge variant="secondary">{data.syncHealth.pending}</Badge>
              </div>
              
              {data.syncHealth.errors > 0 && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                    <div className="text-sm">
                      <div className="font-semibold text-destructive">
                        Sync Issues Detected
                      </div>
                      <div className="text-destructive/80 text-xs mt-1">
                        {data.syncHealth.errors} products failed to sync. Review errors in product details.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}