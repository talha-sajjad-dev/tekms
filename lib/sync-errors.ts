/**
 * Sync Error Dictionary
 * Maps error codes to user-friendly messages with actionable next steps
 */

export interface ErrorInfo {
  type: string
  title: string
  message: string
  action: string
  canRetry: boolean
  retryAfter?: number // seconds
  severity: 'error' | 'warning' | 'info'
}

export const SYNC_ERRORS: Record<string, ErrorInfo> = {
  // Authentication Errors
  auth_failed: {
    type: 'auth_failed',
    title: 'Authentication Failed',
    message: 'Your store credentials are invalid or have expired',
    action: 'Please reconnect your store to refresh credentials',
    canRetry: false,
    severity: 'error'
  },
  token_expired: {
    type: 'token_expired',
    title: 'Access Token Expired',
    message: 'Your store access token has expired and needs to be refreshed',
    action: 'Reconnect your store or refresh the token in store settings',
    canRetry: false,
    severity: 'error'
  },
  invalid_credentials: {
    type: 'invalid_credentials',
    title: 'Invalid Credentials',
    message: 'The API credentials for this store are incorrect',
    action: 'Check your store hash and access token in BigCommerce admin',
    canRetry: false,
    severity: 'error'
  },
  
  // Rate Limiting
  rate_limit_exceeded: {
    type: 'rate_limit_exceeded',
    title: 'Rate Limit Exceeded',
    message: 'Too many requests were made to the platform API',
    action: 'Wait a few minutes before trying again. The system will automatically retry.',
    canRetry: true,
    retryAfter: 300, // 5 minutes
    severity: 'warning'
  },
  
  // Network Errors
  network_error: {
    type: 'network_error',
    title: 'Network Error',
    message: 'Failed to connect to the platform API',
    action: 'Check your internet connection and try again',
    canRetry: true,
    retryAfter: 60,
    severity: 'error'
  },
  timeout: {
    type: 'timeout',
    title: 'Request Timeout',
    message: 'The request to the platform took too long and timed out',
    action: 'Try again. For large stores, sync runs automatically in the background.',
    canRetry: true,
    retryAfter: 60,
    severity: 'warning'
  },
  
  // Platform-Specific Errors
  store_not_found: {
    type: 'store_not_found',
    title: 'Store Not Found',
    message: 'The store could not be found on the platform',
    action: 'Verify the store still exists and you have access',
    canRetry: false,
    severity: 'error'
  },
  insufficient_permissions: {
    type: 'insufficient_permissions',
    title: 'Insufficient Permissions',
    message: 'Your API credentials don\'t have the required permissions',
    action: 'Grant "Read Products" and "Read Inventory" permissions in your store admin',
    canRetry: false,
    severity: 'error'
  },
  store_suspended: {
    type: 'store_suspended',
    title: 'Store Suspended',
    message: 'This store has been suspended or closed',
    action: 'Contact your platform support to reactivate the store',
    canRetry: false,
    severity: 'error'
  },
  
  // Data Errors
  invalid_response: {
    type: 'invalid_response',
    title: 'Invalid Response',
    message: 'The platform returned an unexpected response format',
    action: 'This may be a temporary platform issue. Try again later.',
    canRetry: true,
    retryAfter: 300,
    severity: 'error'
  },
  no_products_found: {
    type: 'no_products_found',
    title: 'No Products Found',
    message: 'No products were found in this store',
    action: 'Add products to your store first, then sync again',
    canRetry: false,
    severity: 'info'
  },
  
  // Subscription Errors
  subscription_limit_reached: {
    type: 'subscription_limit_reached',
    title: 'Product Limit Reached',
    message: 'Your subscription plan doesn\'t support this many products',
    action: 'Upgrade your subscription plan to sync more products',
    canRetry: false,
    severity: 'error'
  },
  platform_not_allowed: {
    type: 'platform_not_allowed',
    title: 'Platform Not Allowed',
    message: 'Your subscription plan doesn\'t include access to this platform',
    action: 'Upgrade to a plan that includes this platform',
    canRetry: false,
    severity: 'error'
  },
  
  // Server Errors
  server_error: {
    type: 'server_error',
    title: 'Server Error',
    message: 'An unexpected server error occurred',
    action: 'Our team has been notified. Please try again later.',
    canRetry: true,
    retryAfter: 300,
    severity: 'error'
  },
  database_error: {
    type: 'database_error',
    title: 'Database Error',
    message: 'Failed to save products to the database',
    action: 'This is a temporary issue. Please try again.',
    canRetry: true,
    retryAfter: 60,
    severity: 'error'
  },
  
  // Unknown
  unknown_error: {
    type: 'unknown_error',
    title: 'Unknown Error',
    message: 'An unexpected error occurred',
    action: 'Please try again or contact support if the problem persists',
    canRetry: true,
    retryAfter: 60,
    severity: 'error'
  }
}

/**
 * Classify an error and return appropriate error info
 */
export function classifyError(error: any): ErrorInfo {
  const errorMessage = error?.message?.toLowerCase() || ''
  const errorCode = error?.code || error?.statusCode
  
  // Authentication errors
  if (errorMessage.includes('unauthorized') || errorMessage.includes('authentication') || errorCode === 401) {
    return SYNC_ERRORS.auth_failed
  }
  if (errorMessage.includes('token') && errorMessage.includes('expired')) {
    return SYNC_ERRORS.token_expired
  }
  if (errorMessage.includes('invalid') && (errorMessage.includes('credentials') || errorMessage.includes('token'))) {
    return SYNC_ERRORS.invalid_credentials
  }
  
  // Rate limiting
  if (errorMessage.includes('rate limit') || errorCode === 429) {
    return SYNC_ERRORS.rate_limit_exceeded
  }
  
  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('econnrefused') || errorMessage.includes('enotfound')) {
    return SYNC_ERRORS.network_error
  }
  if (errorMessage.includes('timeout') || errorCode === 408) {
    return SYNC_ERRORS.timeout
  }
  
  // Platform errors
  if (errorMessage.includes('not found') || errorCode === 404) {
    return SYNC_ERRORS.store_not_found
  }
  if (errorMessage.includes('permission') || errorMessage.includes('forbidden') || errorCode === 403) {
    return SYNC_ERRORS.insufficient_permissions
  }
  if (errorMessage.includes('suspended') || errorMessage.includes('closed')) {
    return SYNC_ERRORS.store_suspended
  }
  
  // Data errors
  if (errorMessage.includes('invalid') && errorMessage.includes('response')) {
    return SYNC_ERRORS.invalid_response
  }
  if (errorMessage.includes('no products')) {
    return SYNC_ERRORS.no_products_found
  }
  
  // Server errors
  if (errorCode >= 500) {
    return SYNC_ERRORS.server_error
  }
  if (errorMessage.includes('database')) {
    return SYNC_ERRORS.database_error
  }
  
  // Default
  return SYNC_ERRORS.unknown_error
}

/**
 * Format error for logging
 */
export function formatErrorForLog(error: any, context?: any): string {
  const errorInfo = classifyError(error)
  const timestamp = new Date().toISOString()
  
  let log = `[${timestamp}] ${errorInfo.title}\n`
  log += `Type: ${errorInfo.type}\n`
  log += `Message: ${errorInfo.message}\n`
  log += `Action: ${errorInfo.action}\n`
  
  if (error?.stack) {
    log += `\nStack Trace:\n${error.stack}\n`
  }
  
  if (context) {
    log += `\nContext:\n${JSON.stringify(context, null, 2)}\n`
  }
  
  return log
}

/**
 * Get user-friendly error message
 */
export function getUserMessage(error: any): string {
  const errorInfo = classifyError(error)
  return `${errorInfo.title}: ${errorInfo.message}. ${errorInfo.action}`
}