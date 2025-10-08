"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Package, ShoppingCart, TrendingUp, AlertTriangle } from "lucide-react"

interface Product {
  id: number
  name: string
  price: number
  inventory_level: number
  sku: string
  is_visible: boolean
}

interface Order {
  id: number
  status: string
  total_inc_tax: string
  date_created: string
  customer_id: number
}

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockItems: 0,
    totalOrders: 0,
    visibleProducts: 0,
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Fetch products
      const productsResponse = await fetch("/api/bigcommerce/products")
      const productsData = await productsResponse.json()

      // Fetch orders
      const ordersResponse = await fetch("/api/bigcommerce/orders?limit=10")
      const ordersData = await ordersResponse.json()

      // Fetch inventory
      const inventoryResponse = await fetch("/api/bigcommerce/inventory")
      const inventoryData = await inventoryResponse.json()

      if (productsData.data) {
        setProducts(productsData.data)
        const visibleProducts = productsData.data.filter((p: Product) => p.is_visible).length
        const lowStockItems = productsData.data.filter((p: Product) => p.inventory_level < 10).length

        setStats({
          totalProducts: productsData.data.length,
          lowStockItems,
          totalOrders: ordersData.length || 0,
          visibleProducts,
        })
      }

      if (ordersData) {
        setOrders(Array.isArray(ordersData) ? ordersData : [])
      }

      if (inventoryData.data) {
        setInventory(inventoryData.data)
      }

      toast({
        title: "Success",
        description: "Dashboard data loaded successfully",
      })
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">BigCommerce Dashboard</h1>
        <Button onClick={fetchDashboardData}>Refresh Data</Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">{stats.visibleProducts} visible</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Items with {"<"} 10 units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">Last 10 orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Store Hash</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">t48lqqxd8a</div>
            <p className="text-xs text-muted-foreground">Your store identifier</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Products</CardTitle>
              <CardDescription>Your latest products from BigCommerce</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {products.slice(0, 10).map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${product.price}</p>
                      <Badge variant={product.is_visible ? "default" : "secondary"}>
                        {product.is_visible ? "Visible" : "Hidden"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Levels</CardTitle>
              <CardDescription>Current stock levels for your products</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inventory.slice(0, 10).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Stock: {item.inventory_level}</p>
                      <Badge variant={item.inventory_level < 10 ? "destructive" : "default"}>
                        {item.inventory_level < 10 ? "Low Stock" : "In Stock"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest orders from your BigCommerce store</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orders.length > 0 ? (
                  orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">Order #{order.id}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.date_created).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${order.total_inc_tax}</p>
                        <Badge>{order.status}</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground">No recent orders found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Toaster />
    </div>
  )
}
