import type { NextAuthConfig } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const authConfig: NextAuthConfig = {
  trustHost: true,
  useSecureCookies: process.env.NODE_ENV === 'production',
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Use raw query to get user with password
        const users = await prisma.$queryRaw<Array<{
          id: string
          email: string
          name: string | null
          password: string | null
          role: 'USER' | 'ADMIN'
        }>>`
          SELECT id, email, name, password, role
          FROM "User"
          WHERE email = ${credentials.email as string}
        `

        const user = users[0]

        if (!user || !user.password) {
          return null
        }

        const isValid = await bcrypt.compare(credentials.password as string, user.password)
        
        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as 'USER' | 'ADMIN'
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      // Add user info to token on sign in
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }: any) {
      // Add token info to session
      if (session.user && token) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },
    async signIn({ user }: any) {
      // Create free subscription for new users (for OAuth providers)
      if (user.id && user.email) {
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
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === 'development',
  events: {
    async createUser({ user }: any) {
      console.log('New user created:', user.email)
    },
    async signIn({ user }: any) {
      console.log('User signed in:', user.email)
    },
  },
}