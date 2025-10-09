import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export const metadata: Metadata = {
  title: 'Settings | TEKMS',
  description: 'Manage your account settings and preferences',
}

export default async function SettingsPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/api/auth/signin')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      subscription: true,
    },
  })

  if (!user) {
    redirect('/api/auth/signin')
  }

  const initials = user.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'U'

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Your profile information from Google OAuth
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-muted-foreground">Profile Picture</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Managed through your Google account
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={user.name || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Name is managed through your Google account
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email is managed through your Google account
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="role">Account Role</Label>
                <Input
                  id="role"
                  value={user.role}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Section */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>
              Your current subscription plan and status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Current Plan</Label>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {user.subscription?.tier || 'FREE'}
                  </span>
                  {user.subscription?.tier !== 'FREE' && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.subscription?.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                    }`}>
                      {user.subscription?.status}
                    </span>
                  )}
                </div>
              </div>

              {user.subscription?.stripeCurrentPeriodEnd && (
                <div className="grid gap-2">
                  <Label>Billing Period</Label>
                  <p className="text-sm text-muted-foreground">
                    Renews on {new Date(user.subscription.stripeCurrentPeriodEnd).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button asChild>
                <a href="/dashboard/billing">Manage Subscription</a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
            <CardDescription>
              Manage your account and data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Credentials</h4>
              <p className="text-sm text-muted-foreground">
                Manage your API credentials for BigCommerce, TikTok, and Etsy
              </p>
              <Button variant="outline" asChild>
                <a href="/dashboard/credentials">Manage Credentials</a>
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Usage Statistics</h4>
              <p className="text-sm text-muted-foreground">
                View your product usage and limits
              </p>
              <Button variant="outline" asChild>
                <a href="/dashboard/usage">View Usage</a>
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-destructive">Danger Zone</h4>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data
              </p>
              <Button variant="destructive" disabled>
                Delete Account
              </Button>
              <p className="text-xs text-muted-foreground">
                Contact support to delete your account
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}