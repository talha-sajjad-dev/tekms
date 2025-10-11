import Stripe from 'stripe'
import { getStripeKeys } from '@/lib/settings'

// Initialize with env var as fallback, will be updated from DB on first use
let stripeInstance: Stripe | null = null

export async function getStripe(): Promise<Stripe> {
  if (stripeInstance) {
    return stripeInstance
  }
  
  const { secretKey } = await getStripeKeys()
  
  if (!secretKey) {
    throw new Error('Stripe secret key not configured. Please set it in Admin > System Settings.')
  }
  
  stripeInstance = new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
    typescript: true,
  })
  
  return stripeInstance
}

// For backwards compatibility - returns a promise
export const stripe = getStripe()

export async function getStripeConfig() {
  const keys = await getStripeKeys()
  return {
    publishableKey: keys.publishableKey || '',
    webhookSecret: keys.webhookSecret || '',
    secretKey: keys.secretKey || '',
  }
}