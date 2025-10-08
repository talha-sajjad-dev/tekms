import { promises as fs } from 'fs'
import path from 'path'
import type { StoreData, QuoteRequest, QuoteStatus } from '@/types/bigcommerce-app'

const DATA_DIR = path.join(process.cwd(), 'data')
const STORES_FILE = path.join(DATA_DIR, 'stores.json')
const QUOTES_FILE = path.join(DATA_DIR, 'quotes.json')

interface StoresData {
  stores: Record<string, StoreData>
}

interface QuotesData {
  quotes: QuoteRequest[]
}

/**
 * Ensure data directory and files exist
 */
async function ensureDataFiles(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    
    // Ensure stores.json exists
    try {
      await fs.access(STORES_FILE)
    } catch {
      const initialStores: StoresData = { stores: {} }
      await fs.writeFile(STORES_FILE, JSON.stringify(initialStores, null, 2), 'utf-8')
    }
    
    // Ensure quotes.json exists
    try {
      await fs.access(QUOTES_FILE)
    } catch {
      const initialQuotes: QuotesData = { quotes: [] }
      await fs.writeFile(QUOTES_FILE, JSON.stringify(initialQuotes, null, 2), 'utf-8')
    }
  } catch (error) {
    console.error('Error ensuring data files:', error)
    throw new Error('Failed to initialize storage')
  }
}

// ============ Store Management ============

/**
 * Save store data (after OAuth)
 */
export async function saveStore(context: string, storeData: StoreData): Promise<void> {
  try {
    await ensureDataFiles()
    const data = await fs.readFile(STORES_FILE, 'utf-8')
    const stores: StoresData = JSON.parse(data)
    
    stores.stores[context] = storeData
    
    await fs.writeFile(STORES_FILE, JSON.stringify(stores, null, 2), 'utf-8')
  } catch (error) {
    console.error('Error saving store:', error)
    throw new Error('Failed to save store data')
  }
}

/**
 * Get store data by context
 */
export async function getStore(context: string): Promise<StoreData | null> {
  try {
    await ensureDataFiles()
    const data = await fs.readFile(STORES_FILE, 'utf-8')
    const stores: StoresData = JSON.parse(data)
    
    return stores.stores[context] || null
  } catch (error) {
    console.error('Error getting store:', error)
    return null
  }
}

/**
 * Get store by store hash
 */
export async function getStoreByHash(storeHash: string): Promise<StoreData | null> {
  try {
    await ensureDataFiles()
    const data = await fs.readFile(STORES_FILE, 'utf-8')
    const stores: StoresData = JSON.parse(data)
    
    const storeEntry = Object.entries(stores.stores).find(
      ([_, store]) => store.storeHash === storeHash
    )
    
    return storeEntry ? storeEntry[1] : null
  } catch (error) {
    console.error('Error getting store by hash:', error)
    return null
  }
}

/**
 * Remove store data (on uninstall)
 */
export async function removeStore(context: string): Promise<void> {
  try {
    await ensureDataFiles()
    const data = await fs.readFile(STORES_FILE, 'utf-8')
    const stores: StoresData = JSON.parse(data)
    
    delete stores.stores[context]
    
    await fs.writeFile(STORES_FILE, JSON.stringify(stores, null, 2), 'utf-8')
  } catch (error) {
    console.error('Error removing store:', error)
    throw new Error('Failed to remove store data')
  }
}

// ============ Quote Management ============

/**
 * Save a new quote
 */
export async function saveQuote(quote: QuoteRequest): Promise<void> {
  try {
    await ensureDataFiles()
    const data = await fs.readFile(QUOTES_FILE, 'utf-8')
    const quotes: QuotesData = JSON.parse(data)
    
    quotes.quotes.push(quote)
    
    await fs.writeFile(QUOTES_FILE, JSON.stringify(quotes, null, 2), 'utf-8')
  } catch (error) {
    console.error('Error saving quote:', error)
    throw new Error('Failed to save quote')
  }
}

/**
 * Get all quotes for a store
 */
export async function getQuotes(storeHash?: string): Promise<QuoteRequest[]> {
  try {
    await ensureDataFiles()
    const data = await fs.readFile(QUOTES_FILE, 'utf-8')
    const quotes: QuotesData = JSON.parse(data)
    
    if (storeHash) {
      return quotes.quotes.filter(q => q.storeHash === storeHash)
    }
    
    return quotes.quotes
  } catch (error) {
    console.error('Error getting quotes:', error)
    return []
  }
}

/**
 * Get quote by ID
 */
export async function getQuoteById(id: string): Promise<QuoteRequest | null> {
  try {
    await ensureDataFiles()
    const data = await fs.readFile(QUOTES_FILE, 'utf-8')
    const quotes: QuotesData = JSON.parse(data)
    
    return quotes.quotes.find(q => q.id === id) || null
  } catch (error) {
    console.error('Error getting quote:', error)
    return null
  }
}

/**
 * Update quote status
 */
export async function updateQuoteStatus(
  id: string,
  status: QuoteStatus
): Promise<QuoteRequest | null> {
  try {
    await ensureDataFiles()
    const data = await fs.readFile(QUOTES_FILE, 'utf-8')
    const quotes: QuotesData = JSON.parse(data)
    
    const quoteIndex = quotes.quotes.findIndex(q => q.id === id)
    
    if (quoteIndex === -1) {
      return null
    }
    
    quotes.quotes[quoteIndex].status = status
    quotes.quotes[quoteIndex].updatedAt = new Date().toISOString()
    
    if (status === 'contacted' && !quotes.quotes[quoteIndex].contactedAt) {
      quotes.quotes[quoteIndex].contactedAt = new Date().toISOString()
    }
    
    await fs.writeFile(QUOTES_FILE, JSON.stringify(quotes, null, 2), 'utf-8')
    
    return quotes.quotes[quoteIndex]
  } catch (error) {
    console.error('Error updating quote:', error)
    return null
  }
}

/**
 * Generate unique quote ID
 */
export function generateQuoteId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 9)
  return `quote_${timestamp}_${random}`
}