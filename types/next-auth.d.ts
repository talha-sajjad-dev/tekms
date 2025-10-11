import { DefaultSession } from 'next-auth'
import { UserRole, SubscriptionTier, SubscriptionStatus } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: UserRole
      subscription?: {
        tier: SubscriptionTier
        status: SubscriptionStatus
      }
    } & DefaultSession['user']
  }

  interface User {
    role: UserRole
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    subscription?: {
      tier: SubscriptionTier
      status: SubscriptionStatus
    }
  }
}