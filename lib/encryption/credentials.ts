import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 characters (32 bytes in hex)')
  }
  return Buffer.from(key, 'hex')
}

/**
 * Encrypt sensitive credential data
 * Returns a JSON string with IV, encrypted data, and auth tag
 */
export function encryptCredential(plaintext: string): string {
  try {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    return JSON.stringify({
      iv: iv.toString('hex'),
      data: encrypted,
      tag: authTag.toString('hex'),
    })
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt credential')
  }
}

/**
 * Decrypt encrypted credential data
 * Takes a JSON string with IV, encrypted data, and auth tag
 */
export function decryptCredential(encryptedText: string): string {
  try {
    const key = getEncryptionKey()
    const { iv, data, tag } = JSON.parse(encryptedText)
    
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(iv, 'hex')
    )
    
    decipher.setAuthTag(Buffer.from(tag, 'hex'))
    
    let decrypted = decipher.update(data, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt credential')
  }
}

/**
 * Encrypt an object of credentials
 */
export function encryptCredentialObject(credentials: Record<string, any>): string {
  return encryptCredential(JSON.stringify(credentials))
}

/**
 * Decrypt to an object of credentials
 */
export function decryptCredentialObject(encryptedText: string): Record<string, any> {
  const decrypted = decryptCredential(encryptedText)
  return JSON.parse(decrypted)
}