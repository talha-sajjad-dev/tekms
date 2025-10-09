import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth/helpers'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, CreditCard, Activity, TrendingUp } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Admin Dashboard | TEKMS',
  description: 'Manage users and subscriptions',
}

export default async function AdminPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/api/auth/signin')
  }

  // Check if user is admin
  const user = await requireAdmin()

  // Get statistics
  const [totalUsers, activeSubscriptions, totalUsage, recentUsers] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count({
      where: {
        status: 'ACTIVE',
        tier: { not: 'FREE' }
      }
    }),
    prisma.usageRecord.aggregate({
      _sum: {
        productCount: true
      },
      where: {
        createdAt: {
          gte: new Date(new Date().setDate(new Date().getDate() - 30))
        }
      }
    }),
    prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: true,
        _count: {
          select: {
            credentials: true,
            usage: true
          }
        }
      }
    })
  ])

  const stats = [
    {
      title: 'Total Users',
      value: totalUsers,
      icon: Users,
      description: 'Registered accounts'
    },
    {
      title: 'Active Subscriptions',
      value: activeSubscriptions,
      icon: CreditCard,
      description: 'Paid subscribers'
    },
    {
      title: 'Monthly Usage',
      value: totalUsage._sum.productCount || 0,
      icon: Activity,
      description: 'Products processed (30 days)'
    },
    {
      title: 'Revenue',
      value: `$${(activeSubscriptions * 50).toLocaleString()}`,
      icon: TrendingUp,
      description: 'Estimated monthly (avg $50/user)'
    }
  ]

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage users, subscriptions, and platform statistics
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Users</CardTitle>
          <CardDescription>
            Latest user registrations and their subscription status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Credentials</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.name || 'N/A'}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      user.subscription?.tier === 'FREE' ? 'outline' :
                      user.subscription?.tier === 'ENTERPRISE' ? 'default' :
                      'secondary'
                    }>
                      {user.subscription?.tier || 'FREE'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.subscription?.status && (
                      <Badge variant={
                        user.subscription.status === 'ACTIVE' ? 'default' :
                        user.subscription.status === 'TRIALING' ? 'secondary' :
                        'destructive'
                      }>
                        {user.subscription.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {user._count.credentials}
                  </TableCell>
                  <TableCell className="text-center">
                    {user._count.usage}
                  </TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" disabled>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Subscription Breakdown */}
      <div className="grid gap-4 md:grid-cols-2 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Distribution</CardTitle>
            <CardDescription>Users by subscription tier</CardDescription>
          </CardHeader>
          <CardContent>
            <SubscriptionBreakdown />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Health</CardTitle>
            <CardDescription>System status and metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Database</span>
              <Badge variant="default">Connected</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Stripe</span>
              <Badge variant="default">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Authentication</span>
              <Badge variant="default">Operational</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">API Endpoints</span>
              <Badge variant="default">Healthy</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

async function SubscriptionBreakdown() {
  const breakdown = await prisma.subscription.groupBy({
    by: ['tier'],
    _count: true
  })

  const freeUsers = await prisma.user.count({
    where: {
      subscription: null
    }
  })

  const tiers = [
    { name: 'FREE', count: freeUsers, color: 'bg-gray-500' },
    ...breakdown.map(b => ({
      name: b.tier,
      count: b._count,
      color: b.tier === 'STARTER' ? 'bg-blue-500' :
             b.tier === 'PROFESSIONAL' ? 'bg-purple-500' :
             'bg-green-500'
    }))
  ]

  const total = tiers.reduce((sum, tier) => sum + tier.count, 0)

  return (
    <div className="space-y-4">
      {tiers.map((tier) => (
        <div key={tier.name} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{tier.name}</span>
            <span className="text-muted-foreground">
              {tier.count} ({total > 0 ? Math.round((tier.count / total) * 100) : 0}%)
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${tier.color}`}
              style={{ width: `${total > 0 ? (tier.count / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}