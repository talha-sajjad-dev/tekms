import { db } from '@/lib/db'
import { decrypt } from '@/lib/encryption'
import { rateLimitedFetch } from '@/lib/bigcommerce/rate-limiter'

interface SyncStage {
  name: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  itemsProcessed: number
  totalItems: number
  startedAt?: Date
  completedAt?: Date
  errors?: string[]
}

export class FullSyncService {
  private jobId: string
  private store: any
  private accessToken: string
  private stages: SyncStage[] = []
  private storeHash: string
  
  constructor(jobId: string, store: any) {
    this.jobId = jobId
    this.store = store
    this.accessToken = decrypt(store.accessToken)
    this.storeHash = store.externalStoreId
  }
  
  async execute() {
    try {
      await this.initializeStages()
      
      for (const stageName of this.getStageNames()) {
        // Check for cancellation
        if (await this.isCancelled()) {
          await this.markAsCancelled()
          return
        }
        
        // Check for pause
        while (await this.isPaused()) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
        await this.executeStage(stageName)
      }
      
      await this.complete()
    } catch (error) {
      console.error('Full sync error:', error)
      await this.markAsFailed(error)
      throw error
    }
  }
  
  private getStageNames(): string[] {
    return [
      'products',
      'variants',
      'modifiers',
      'options',
      'custom_fields',
      'seo',
      'shipping',
      'inventory',
      'bulk_pricing'
    ]
  }
  
  private async initializeStages() {
    this.stages = this.getStageNames().map(name => ({
      name,
      status: 'pending' as const,
      itemsProcessed: 0,
      totalItems: 0
    }))
    
    await this.updateJob({
      stages: this.stages,
      currentStage: this.stages[0].name
    })
  }
  
  private async executeStage(stageName: string) {
    const stage = this.stages.find(s => s.name === stageName)!
    stage.status = 'processing'
    stage.startedAt = new Date()
    
    await this.updateJob({
      stages: this.stages,
      currentStage: stageName
    })
    
    try {
      console.log(`🔄 Executing stage: ${stageName}`)
      
      switch (stageName) {
        case 'products':
          await this.syncProducts()
          break
        case 'variants':
          await this.syncVariants()
          break
        case 'modifiers':
          await this.syncModifiers()
          break
        case 'options':
          await this.syncOptions()
          break
        case 'custom_fields':
          await this.syncCustomFields()
          break
        case 'seo':
          await this.syncSEO()
          break
        case 'shipping':
          await this.syncShipping()
          break
        case 'inventory':
          await this.syncInventory()
          break
        case 'bulk_pricing':
          await this.syncBulkPricing()
          break
      }
      
      stage.status = 'completed'
      stage.completedAt = new Date()
      console.log(`✅ Stage completed: ${stageName}`)
    } catch (error) {
      stage.status = 'failed'
      stage.errors = [error instanceof Error ? error.message : 'Unknown error']
      console.error(`❌ Stage failed: ${stageName}`, error)
      throw error
    } finally {
      await this.updateJob({ stages: this.stages })
    }
  }
  
  private async syncProducts() {
    let page = 1
    let hasMorePages = true
    let allProducts: any[] = []
    
    console.log(`📦 Syncing products from BigCommerce...`)
    
    while (hasMorePages) {
      if (await this.isCancelled()) return
      
      const response = await rateLimitedFetch(
        `https://api.bigcommerce.com/stores/${this.storeHash}/v3/catalog/products?include=images,variants,custom_fields&limit=250&page=${page}`,
        {
          headers: {
            'X-Auth-Token': this.accessToken,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`)
      }
      
      const data = await response.json()
      allProducts = [...allProducts, ...data.data]
      
      // Update progress
      await this.updateStageProgress('products', allProducts.length, data.meta.pagination.total)
      
      hasMorePages = data.meta.pagination.current_page < data.meta.pagination.total_pages
      page++
      
      console.log(`   Fetched page ${page - 1}, total: ${allProducts.length}`)
    }
    
    console.log(`📊 Total products fetched: ${allProducts.length}`)
    
    // Save products to database
    for (const product of allProducts) {
      if (await this.isCancelled()) return
      await this.saveProduct(product)
    }
  }
  
  private async syncVariants() {
    const products = await db.product.findMany({
      where: {
        storeConnectionId: this.store.id,
        platform: 'BIGCOMMERCE'
      },
      select: { id: true, externalId: true }
    })
    
    const stage = this.stages.find(s => s.name === 'variants')!
    stage.totalItems = products.length
    await this.updateJob({ stages: this.stages })
    
    console.log(`🔀 Syncing variants for ${products.length} products...`)
    
    for (const product of products) {
      if (await this.isCancelled()) return
      
      await this.syncProductVariants(product.id, product.externalId)
      
      stage.itemsProcessed++
      await this.updateJob({ stages: this.stages })
    }
  }
  
  private async syncProductVariants(productId: string, externalId: string) {
    try {
      const response = await rateLimitedFetch(
        `https://api.bigcommerce.com/stores/${this.storeHash}/v3/catalog/products/${externalId}/variants`,
        {
          headers: {
            'X-Auth-Token': this.accessToken,
            'Accept': 'application/json'
          }
        }
      )
      
      if (!response.ok) {
        console.warn(`Failed to fetch variants for product ${externalId}`)
        return
      }
      
      const data = await response.json()
      
      // Delete existing variants
      await db.productVariant.deleteMany({
        where: { productId }
      })
      
      // Save new variants
      for (const variant of data.data || []) {
        await db.productVariant.create({
          data: {
            productId,
            platform: 'BIGCOMMERCE',
            externalId: variant.id.toString(),
            sku: variant.sku,
            price: variant.price || 0,
            compareAtPrice: variant.retail_price,
            costPrice: variant.cost_price,
            inventoryLevel: variant.inventory_level || 0,
            inventoryTracking: variant.inventory_tracking !== 'none',
            weight: variant.weight,
            weightUnit: 'lb',
            optionValues: variant.option_values || {},
            images: variant.image_url ? { url: variant.image_url } : null,
            dimensions: {
              width: variant.width,
              height: variant.height,
              depth: variant.depth
            },
            platformData: variant
          }
        })
      }
    } catch (error) {
      console.error(`Error syncing variants for product ${externalId}:`, error)
    }
  }
  
  private async syncModifiers() {
    const products = await db.product.findMany({
      where: {
        storeConnectionId: this.store.id,
        platform: 'BIGCOMMERCE'
      },
      select: { id: true, externalId: true }
    })
    
    const stage = this.stages.find(s => s.name === 'modifiers')!
    stage.totalItems = products.length
    await this.updateJob({ stages: this.stages })
    
    console.log(`🔧 Syncing modifiers for ${products.length} products...`)
    
    for (const product of products) {
      if (await this.isCancelled()) return
      
      await this.syncProductModifiers(product.id, product.externalId)
      
      stage.itemsProcessed++
      await this.updateJob({ stages: this.stages })
    }
  }
  
  private async syncProductModifiers(productId: string, externalId: string) {
    try {
      const response = await rateLimitedFetch(
        `https://api.bigcommerce.com/stores/${this.storeHash}/v3/catalog/products/${externalId}/modifiers`,
        {
          headers: {
            'X-Auth-Token': this.accessToken,
            'Accept': 'application/json'
          }
        }
      )
      
      if (!response.ok) {
        console.warn(`Failed to fetch modifiers for product ${externalId}`)
        return
      }
      
      const data = await response.json()
      
      await db.productModifier.deleteMany({ where: { productId } })
      
      for (const modifier of data.data || []) {
        await db.productModifier.create({
          data: {
            productId,
            platform: 'BIGCOMMERCE',
            externalId: modifier.id.toString(),
            name: modifier.name,
            displayName: modifier.display_name,
            type: modifier.type,
            required: modifier.required,
            values: modifier.option_values || [],
            validation: modifier.config || {},
            platformData: modifier
          }
        })
      }
    } catch (error) {
      console.error(`Error syncing modifiers for product ${externalId}:`, error)
    }
  }
  
  private async syncOptions() {
    const products = await db.product.findMany({
      where: {
        storeConnectionId: this.store.id,
        platform: 'BIGCOMMERCE'
      },
      select: { id: true, externalId: true }
    })
    
    const stage = this.stages.find(s => s.name === 'options')!
    stage.totalItems = products.length
    await this.updateJob({ stages: this.stages })
    
    console.log(`⚙️ Syncing options for ${products.length} products...`)
    
    for (const product of products) {
      if (await this.isCancelled()) return
      
      await this.syncProductOptions(product.id, product.externalId)
      
      stage.itemsProcessed++
      await this.updateJob({ stages: this.stages })
    }
  }
  
  private async syncProductOptions(productId: string, externalId: string) {
    try {
      const response = await rateLimitedFetch(
        `https://api.bigcommerce.com/stores/${this.storeHash}/v3/catalog/products/${externalId}/options`,
        {
          headers: {
            'X-Auth-Token': this.accessToken,
            'Accept': 'application/json'
          }
        }
      )
      
      if (!response.ok) {
        console.warn(`Failed to fetch options for product ${externalId}`)
        return
      }
      
      const data = await response.json()
      
      await db.productOption.deleteMany({ where: { productId } })
      
      for (const option of data.data || []) {
        await db.productOption.create({
          data: {
            productId,
            platform: 'BIGCOMMERCE',
            externalId: option.id.toString(),
            name: option.name,
            displayName: option.display_name,
            type: option.type,
            values: option.option_values || []
          }
        })
      }
    } catch (error) {
      console.error(`Error syncing options for product ${externalId}:`, error)
    }
  }
  
  private async syncCustomFields() {
    const products = await db.product.findMany({
      where: {
        storeConnectionId: this.store.id,
        platform: 'BIGCOMMERCE'
      },
      select: { id: true, platformData: true }
    })
    
    const stage = this.stages.find(s => s.name === 'custom_fields')!
    stage.totalItems = products.length
    await this.updateJob({ stages: this.stages })
    
    console.log(`📝 Syncing custom fields for ${products.length} products...`)
    
    for (const product of products) {
      if (await this.isCancelled()) return
      
      const platformData = product.platformData as any
      if (platformData?.custom_fields) {
        await db.productCustomField.deleteMany({ where: { productId: product.id } })
        
        for (const field of platformData.custom_fields) {
          await db.productCustomField.create({
            data: {
              productId: product.id,
              platform: 'BIGCOMMERCE',
              name: field.name,
              value: field.value
            }
          })
        }
      }
      
      stage.itemsProcessed++
      await this.updateJob({ stages: this.stages })
    }
  }
  
  private async syncSEO() {
    const products = await db.product.findMany({
      where: {
        storeConnectionId: this.store.id,
        platform: 'BIGCOMMERCE'
      },
      select: { id: true, platformData: true }
    })
    
    const stage = this.stages.find(s => s.name === 'seo')!
    stage.totalItems = products.length
    await this.updateJob({ stages: this.stages })
    
    console.log(`🔍 Syncing SEO data for ${products.length} products...`)
    
    for (const product of products) {
      if (await this.isCancelled()) return
      
      const platformData = product.platformData as any
      if (platformData) {
        await db.productSEO.upsert({
          where: { productId: product.id },
          create: {
            productId: product.id,
            metaTitle: platformData.page_title,
            metaDescription: platformData.meta_description,
            searchKeywords: platformData.search_keywords?.split(',').map((k: string) => k.trim()) || [],
            urlSlug: platformData.custom_url?.url,
            platformSEO: {
              page_title: platformData.page_title,
              meta_description: platformData.meta_description,
              search_keywords: platformData.search_keywords
            }
          },
          update: {
            metaTitle: platformData.page_title,
            metaDescription: platformData.meta_description,
            searchKeywords: platformData.search_keywords?.split(',').map((k: string) => k.trim()) || [],
            urlSlug: platformData.custom_url?.url,
            platformSEO: {
              page_title: platformData.page_title,
              meta_description: platformData.meta_description,
              search_keywords: platformData.search_keywords
            }
          }
        })
      }
      
      stage.itemsProcessed++
      await this.updateJob({ stages: this.stages })
    }
  }
  
  private async syncShipping() {
    const products = await db.product.findMany({
      where: {
        storeConnectionId: this.store.id,
        platform: 'BIGCOMMERCE'
      },
      select: { id: true, platformData: true }
    })
    
    const stage = this.stages.find(s => s.name === 'shipping')!
    stage.totalItems = products.length
    await this.updateJob({ stages: this.stages })
    
    console.log(`📦 Syncing shipping data for ${products.length} products...`)
    
    for (const product of products) {
      if (await this.isCancelled()) return
      
      const platformData = product.platformData as any
      if (platformData) {
        await db.productShipping.upsert({
          where: { productId: product.id },
          create: {
            productId: product.id,
            weight: platformData.weight,
            weightUnit: 'lb',
            width: platformData.width,
            height: platformData.height,
            depth: platformData.depth,
            dimensionUnit: 'in',
            fixedCost: platformData.fixed_cost_shipping_price,
            freeShipping: platformData.is_free_shipping || false
          },
          update: {
            weight: platformData.weight,
            weightUnit: 'lb',
            width: platformData.width,
            height: platformData.height,
            depth: platformData.depth,
            dimensionUnit: 'in',
            fixedCost: platformData.fixed_cost_shipping_price,
            freeShipping: platformData.is_free_shipping || false
          }
        })
      }
      
      stage.itemsProcessed++
      await this.updateJob({ stages: this.stages })
    }
  }
  
  private async syncInventory() {
    const products = await db.product.findMany({
      where: {
        storeConnectionId: this.store.id,
        platform: 'BIGCOMMERCE'
      },
      select: { id: true, platformData: true }
    })
    
    const stage = this.stages.find(s => s.name === 'inventory')!
    stage.totalItems = products.length
    await this.updateJob({ stages: this.stages })
    
    console.log(`📊 Syncing inventory for ${products.length} products...`)
    
    for (const product of products) {
      if (await this.isCancelled()) return
      
      const platformData = product.platformData as any
      if (platformData) {
        await db.productInventory.upsert({
          where: {
            productId_variantId_locationId: {
              productId: product.id,
              variantId: null,
              locationId: null
            }
          },
          create: {
            productId: product.id,
            variantId: null,
            locationId: null,
            quantity: platformData.inventory_level || 0,
            tracking: platformData.inventory_tracking || 'none',
            warningLevel: platformData.inventory_warning_level || 5
          },
          update: {
            quantity: platformData.inventory_level || 0,
            tracking: platformData.inventory_tracking || 'none',
            warningLevel: platformData.inventory_warning_level || 5
          }
        })
      }
      
      stage.itemsProcessed++
      await this.updateJob({ stages: this.stages })
    }
  }
  
  private async syncBulkPricing() {
    const products = await db.product.findMany({
      where: {
        storeConnectionId: this.store.id,
        platform: 'BIGCOMMERCE'
      },
      select: { id: true, externalId: true }
    })
    
    const stage = this.stages.find(s => s.name === 'bulk_pricing')!
    stage.totalItems = products.length
    await this.updateJob({ stages: this.stages })
    
    console.log(`💰 Syncing bulk pricing for ${products.length} products...`)
    
    for (const product of products) {
      if (await this.isCancelled()) return
      
      await this.syncProductBulkPricing(product.id, product.externalId)
      
      stage.itemsProcessed++
      await this.updateJob({ stages: this.stages })
    }
  }
  
  private async syncProductBulkPricing(productId: string, externalId: string) {
    try {
      const response = await rateLimitedFetch(
        `https://api.bigcommerce.com/stores/${this.storeHash}/v3/catalog/products/${externalId}/bulk-pricing-rules`,
        {
          headers: {
            'X-Auth-Token': this.accessToken,
            'Accept': 'application/json'
          }
        }
      )
      
      if (!response.ok) {
        return
      }
      
      const data = await response.json()
      
      await db.productBulkPricing.deleteMany({ where: { productId } })
      
      for (const rule of data.data || []) {
        await db.productBulkPricing.create({
          data: {
            productId,
            minQuantity: rule.quantity_min,
            maxQuantity: rule.quantity_max,
            price: rule.amount,
            type: rule.type
          }
        })
      }
    } catch (error) {
      // Bulk pricing might not be available, ignore errors
    }
  }
  
  private async saveProduct(bcProduct: any) {
    const existing = await db.product.findFirst({
      where: {
        userId: this.store.userId,
        platform: 'BIGCOMMERCE',
        externalId: bcProduct.id.toString(),
        storeConnectionId: this.store.id
      }
    })
    
    const productData = {
      userId: this.store.userId,
      platform: 'BIGCOMMERCE' as const,
      externalId: bcProduct.id.toString(),
      storeConnectionId: this.store.id,
      importMethod: 'oauth' as const,
      name: bcProduct.name,
      description: bcProduct.description || null,
      sku: bcProduct.sku || null,
      price: bcProduct.price || 0,
      compareAtPrice: bcProduct.retail_price || null,
      categories: (bcProduct.categories || []).map((c: number) => c.toString()),
      tags: [],
      images: bcProduct.images ? { images: bcProduct.images } : undefined,
      variants: bcProduct.variants ? { variants: bcProduct.variants } : undefined,
      customFields: bcProduct.custom_fields ? { custom_fields: bcProduct.custom_fields } : undefined,
      platformData: bcProduct,
      lastSyncedAt: new Date(),
      syncStatus: 'synced'
    }
    
    if (existing) {
      await db.product.update({
        where: { id: existing.id },
        data: productData
      })
    } else {
      await db.product.create({ data: productData })
    }
  }
  
  private async updateStageProgress(stageName: string, processed: number, total: number) {
    const stage = this.stages.find(s => s.name === stageName)!
    stage.itemsProcessed = processed
    stage.totalItems = total
    
    await this.updateJob({
      stages: this.stages,
      processedItems: this.getTotalProcessed(),
      totalItems: this.getTotalItems()
    })
  }
  
  private getTotalProcessed(): number {
    return this.stages.reduce((sum, stage) => sum + stage.itemsProcessed, 0)
  }
  
  private getTotalItems(): number {
    return this.stages.reduce((sum, stage) => sum + stage.totalItems, 0)
  }
  
  private async isCancelled(): Promise<boolean> {
    const job = await db.syncJob.findUnique({
      where: { id: this.jobId },
      select: { cancelRequested: true, status: true }
    })
    return job?.cancelRequested || false
  }
  
  private async isPaused(): Promise<boolean> {
    const job = await db.syncJob.findUnique({
      where: { id: this.jobId },
      select: { isPaused: true, status: true }
    })
    return job?.isPaused || false
  }
  
  private async markAsCancelled() {
    await db.syncJob.update({
      where: { id: this.jobId },
      data: {
        status: 'cancelled',
        completedAt: new Date()
      }
    })
    
    console.log(`🛑 Sync job ${this.jobId} cancelled`)
  }
  
  private async markAsFailed(error: any) {
    await db.syncJob.update({
      where: { id: this.jobId },
      data: {
        status: 'failed',
        errorLog: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date()
      }
    })
    
    console.log(`❌ Sync job ${this.jobId} failed:`, error)
  }
  
  private async complete() {
    const totalProcessed = this.getTotalProcessed()
    
    await db.syncJob.update({
      where: { id: this.jobId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        processedItems: totalProcessed,
        totalItems: this.getTotalItems()
      }
    })
    
    // Update store product count
    const productCount = await db.product.count({
      where: {
        storeConnectionId: this.store.id,
        platform: 'BIGCOMMERCE'
      }
    })
    
    await db.storeConnection.update({
      where: { id: this.store.id },
      data: {
        productCount,
        lastSyncedAt: new Date(),
        syncStatus: 'connected',
        syncError: null
      }
    })
    
    console.log(`✅ Full sync completed! ${totalProcessed} items synced`)
  }
  
  private async updateJob(data: any) {
    await db.syncJob.update({
      where: { id: this.jobId },
      data
    }).catch(err => {
      console.error('Failed to update job:', err)
    })
  }
}