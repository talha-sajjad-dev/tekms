/**
 * BigCommerce App Types
 */

// OAuth and Store Types
export interface OAuthTokenResponse {
  access_token: string
  scope: string
  user: {
    id: number
    username: string
    email: string
  }
  context: string
  account_uuid: string
}

export interface StoreData {
  accessToken: string
  scope: string
  storeHash: string
  installedAt: string
  user: {
    id: number
    username: string
    email: string
  }
}

export interface SignedPayload {
  store_hash: string
  timestamp: number
  user: {
    id: number
    email: string
  }
}

// Quote Types
export interface QuoteCustomer {
  name: string
  email: string
  phone: string
  company?: string
}

export interface QuoteProduct {
  id: number
  name: string
  sku: string
  price: number
  imageUrl?: string
}

export type QuoteStatus = 'pending' | 'contacted' | 'completed'

export interface QuoteRequest {
  id: string
  storeHash: string
  createdAt: string
  status: QuoteStatus
  customer: QuoteCustomer
  product: QuoteProduct
  quantity: number
  notes?: string
  updatedAt?: string
  contactedAt?: string
}

export interface QuoteSubmission {
  storeHash: string
  customer: QuoteCustomer
  product: QuoteProduct
  quantity: number
  notes?: string
}

// Widget Types
export interface WidgetTemplate {
  name: string
  template: string
  schema: WidgetSchema[]
}

export interface WidgetSchema {
  type: string
  label: string
  id?: string
  default?: any
  sections?: WidgetSection[]
}

export interface WidgetSection {
  label: string
  settings: WidgetSetting[]
}

export interface WidgetSetting {
  type: string
  label: string
  id: string
  default?: any
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface QuoteListResponse {
  quotes: QuoteRequest[]
  total: number
}

export interface QuoteSubmissionResponse {
  success: boolean
  quoteId: string
  message: string
}