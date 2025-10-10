import type { NextAuthConfig } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const authConfig: NextAuthConfig = {
  trustHost: true,
  useSecureCookies: false, // Disable for proxy compatibility
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
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
    async jwt({ token, user, account, profile }: any) {
      console.log('[AUTH] JWT callback triggered', {
        hasUser: !!user,
        hasAccount: !!account,
        accountProvider: account?.provider,
        userEmail: user?.email
      })
      
      // Add user info to token on sign in
      if (user) {
        token.id = user.id
        token.role = user.role
        console.log('[AUTH] Added user to token:', { id: user.id, role: user.role })
      }
      return token
    },
    async session({ session, token }: any) {
      console.log('[AUTH] Session callback triggered', {
        hasSession: !!session,
        hasToken: !!token,
        tokenId: token?.id
      })
      
      // Add token info to session
      if (session.user && token) {
        session.user.id = token.id
        session.user.role = token.role
        console.log('[AUTH] Session created for user:', token.id)
      }
      return session
    },
    async signIn({ user, account, profile }: any) {
      console.log('[AUTH] SignIn callback triggered', {
        provider: account?.provider,
        userEmail: user?.email,
        userId: user?.id,
        hasProfile: !!profile
      })
      
      try {
        // For OAuth providers, ensure user exists in database
        if (account?.provider === 'google') {
          console.log('[AUTH] Google OAuth sign in for:', user.email)
          
          // Check if user exists
          let dbUser = await prisma.user.findUnique({
            where: { email: user.email },
          })
          
          // Create user if doesn't exist
          if (!dbUser) {
            console.log('[AUTH] Creating new user:', user.email)
            dbUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name || user.email,
                role: 'USER',
              },
            })
            console.log('[AUTH] User created with ID:', dbUser.id)
          } else {
            console.log('[AUTH] Existing user found:', dbUser.id)
          }
          
          // Update user object with database ID
          user.id = dbUser.id
          user.role = dbUser.role
          
          // Create free subscription if needed
          const existingSubscription = await prisma.subscription.findUnique({
            where: { userId: dbUser.id },
          })

          if (!existingSubscription) {
            console.log('[AUTH] Creating free subscription for:', dbUser.id)
            await prisma.subscription.create({
              data: {
                userId: dbUser.id,
                tier: 'FREE',
                status: 'ACTIVE',
              },
            })
          }
        }
        
        console.log('[AUTH] Sign in successful for:', user.email)
        return true
      } catch (error) {
        console.error('[AUTH] Sign in error:', error)
        return false
      }
    },
  },
  pages: {
    signIn: '/',
    error: '/auth/error',
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token', // Remove __Secure- prefix for proxy compatibility
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false, // Disabled for Nginx proxy
      },
    },
    pkceCodeVerifier: {
      name: 'next-auth.pkce.code_verifier',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false, // Disabled for Nginx proxy
      },
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: true, // Enable debug in all environments
  logger: {
    error(error: Error) {
      console.error('[AUTH ERROR]', error)
    },
    warn(code: string) {
      console.warn('[AUTH WARN]', code)
    },
    debug(code: string, metadata?: any) {
      console.log('[AUTH DEBUG]', code, metadata)
    }
  },
  events: {
    async createUser({ user }: any) {
      console.log('[AUTH EVENT] New user created:', user.email)
    },
    async signIn({ user }: any) {
      console.log('[AUTH EVENT] User signed in:', user.email)
    },
    async signOut({ token }: any) {
      console.log('[AUTH EVENT] User signed out:', token?.email)
    },
    async session({ session }: any) {
      console.log('[AUTH EVENT] Session checked:', session?.user?.email)
    }
  },
}