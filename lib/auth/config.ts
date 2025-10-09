import type { NextAuthConfig } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import type { Adapter } from 'next-auth/adapters'

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }: any) {
      if (session.user) {
        session.user.id = user.id
        session.user.role = user.role
      }
      return session
    },
    async signIn({ user }: any) {
      // Create free subscription for new users
      if (user.id) {
        const existingSubscription = await prisma.subscription.findUnique({
          where: { userId: user.id },
        })

        if (!existingSubscription) {
          await prisma.subscription.create({
            data: {
              userId: user.id,
              tier: 'FREE',
              status: 'ACTIVE',
            },
          })
        }
      }
      return true
    },
  },
  pages: {
    signIn: '/',
    error: '/auth/error',
  },
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  events: {
    async createUser({ user }: any) {
      console.log('New user created:', user.email)
    },
  },
}