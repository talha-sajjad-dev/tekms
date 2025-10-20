/**
 * Bi-directional Sync Service
 * Handles pushing local changes back to BigCommerce and other platforms
 */

import { db } from '@/lib/db';
import { Platform } from '@prisma/client';

interface BigCommerceCredentials {
  storeHash: string;
  accessToken: string;
}

export class BiDirectionalSyncService {
  /**
   * Sync variant updates to BigCommerce
   */
  static async syncVariantToBigCommerce(
    productId: string,
    variantId: string
  ): Promise<void> {
    const variant = await db.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          include: {
            storeConnection: {
              select: {
                id: true,
                platform: true,
                accessToken: true,
                metadata: true
              }
            }
          }
        }
      }
    });

    if (!variant) {
      throw new Error('Variant not found');
    }

    if (!variant.product.storeConnection) {
      throw new Error('Store connection not found');
    }

    const { storeConnection } = variant.product;

    if (storeConnection.platform !== 'BIGCOMMERCE') {
      throw new Error('Only BigCommerce sync is supported');
    }

    const metadata = storeConnection.metadata as any;
    const storeHash = metadata?.storeHash;

    if (!storeHash) {
      throw new Error('Store hash not found');
    }

    const apiUrl = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${variant.product.externalId}/variants${
      variant.externalId ? `/${variant.externalId}` : ''
    }`;

    const variantData = {
      sku: variant.sku,
      price: Number(variant.price),
      cost_price: variant.costPrice ? Number(variant.costPrice) : undefined,
      weight: variant.weight ? Number(variant.weight) : undefined,
      inventory_level: variant.inventoryLevel,
      option_values: variant.optionValues
        ? Object.entries(variant.optionValues as Record<string, any>).map(
            ([optionId, valueId]) => ({
              option_id: parseInt(optionId),
              id: parseInt(valueId as string)
            })
          )
        : []
    };

    const method = variant.externalId ? 'PUT' : 'POST';
    const response = await fetch(apiUrl, {
      method,
      headers: {
        'X-Auth-Token': storeConnection.accessToken,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(variantData)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('BigCommerce API error:', error);
      throw new Error(`Failed to sync variant: ${error}`);
    }

    const result = await response.json();

    // Update variant with external ID if it was created
    if (!variant.externalId && result.data?.id) {
      await db.productVariant.update({
        where: { id: variantId },
        data: { externalId: result.data.id.toString() }
      });
    }
  }

  /**
   * Sync modifier updates to BigCommerce
   */
  static async syncModifierToBigCommerce(
    productId: string,
    modifierId: string
  ): Promise<void> {
    const modifier = await db.productModifier.findUnique({
      where: { id: modifierId },
      include: {
        product: {
          include: {
            storeConnection: {
              select: {
                id: true,
                platform: true,
                accessToken: true,
                metadata: true
              }
            }
          }
        }
      }
    });

    if (!modifier) {
      throw new Error('Modifier not found');
    }

    if (!modifier.product.storeConnection) {
      throw new Error('Store connection not found');
    }

    const { storeConnection } = modifier.product;
    const metadata = storeConnection.metadata as any;
    const storeHash = metadata?.storeHash;

    const apiUrl = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${modifier.product.externalId}/modifiers${
      modifier.externalId ? `/${modifier.externalId}` : ''
    }`;

    const modifierData = {
      type: modifier.type,
      required: modifier.required,
      display_name: modifier.displayName,
      option_values: modifier.values || []
    };

    const method = modifier.externalId ? 'PUT' : 'POST';
    const response = await fetch(apiUrl, {
      method,
      headers: {
        'X-Auth-Token': storeConnection.accessToken,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(modifierData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to sync modifier: ${error}`);
    }

    const result = await response.json();

    if (!modifier.externalId && result.data?.id) {
      await db.productModifier.update({
        where: { id: modifierId },
        data: { externalId: result.data.id.toString() }
      });
    }
  }

  /**
   * Sync SEO updates to BigCommerce
   */
  static async syncSEOToBigCommerce(
    productId: string,
    seoId: string
  ): Promise<void> {
    const seo = await db.productSEO.findUnique({
      where: { id: seoId },
      include: {
        product: {
          include: {
            storeConnection: {
              select: {
                id: true,
                platform: true,
                accessToken: true,
                metadata: true
              }
            }
          }
        }
      }
    });

    if (!seo || !seo.product.storeConnection) {
      throw new Error('SEO data or store connection not found');
    }

    const { storeConnection } = seo.product;
    const metadata = storeConnection.metadata as any;
    const storeHash = metadata?.storeHash;

    const apiUrl = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${seo.product.externalId}`;

    const productData = {
      meta_title: seo.metaTitle,
      meta_description: seo.metaDescription,
      search_keywords: seo.searchKeywords?.join(','),
      custom_url: {
        url: seo.urlSlug ? `/${seo.urlSlug}` : undefined
      }
    };

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'X-Auth-Token': storeConnection.accessToken,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(productData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to sync SEO: ${error}`);
    }
  }

  /**
   * Sync shipping/dimensions updates to BigCommerce
   */
  static async syncShippingToBigCommerce(
    productId: string,
    shippingId: string
  ): Promise<void> {
    const shipping = await db.productShipping.findUnique({
      where: { id: shippingId },
      include: {
        product: {
          include: {
            storeConnection: {
              select: {
                id: true,
                platform: true,
                accessToken: true,
                metadata: true
              }
            }
          }
        }
      }
    });

    if (!shipping || !shipping.product.storeConnection) {
      throw new Error('Shipping data or store connection not found');
    }

    const { storeConnection } = shipping.product;
    const metadata = storeConnection.metadata as any;
    const storeHash = metadata?.storeHash;

    const apiUrl = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${shipping.product.externalId}`;

    const productData = {
      weight: shipping.weight ? Number(shipping.weight) : undefined,
      width: shipping.width ? Number(shipping.width) : undefined,
      height: shipping.height ? Number(shipping.height) : undefined,
      depth: shipping.depth ? Number(shipping.depth) : undefined,
      fixed_cost_shipping_price: shipping.fixedCost
        ? Number(shipping.fixedCost)
        : undefined,
      is_free_shipping: shipping.freeShipping
    };

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'X-Auth-Token': storeConnection.accessToken,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(productData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to sync shipping: ${error}`);
    }
  }

  /**
   * Sync inventory updates to BigCommerce
   */
  static async syncInventoryToBigCommerce(
    productId: string,
    inventoryId: string
  ): Promise<void> {
    const inventory = await db.productInventory.findUnique({
      where: { id: inventoryId },
      include: {
        product: {
          include: {
            storeConnection: {
              select: {
                id: true,
                platform: true,
                accessToken: true,
                metadata: true
              }
            }
          }
        }
      }
    });

    if (!inventory || !inventory.product.storeConnection) {
      throw new Error('Inventory data or store connection not found');
    }

    const { storeConnection } = inventory.product;
    const metadata = storeConnection.metadata as any;
    const storeHash = metadata?.storeHash;

    const apiUrl = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${inventory.product.externalId}`;

    const productData = {
      inventory_level: inventory.quantity,
      inventory_warning_level: inventory.warningLevel,
      inventory_tracking: inventory.tracking !== 'none' ? 'product' : 'none'
    };

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'X-Auth-Token': storeConnection.accessToken,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(productData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to sync inventory: ${error}`);
    }
  }

  /**
   * Delete variant from BigCommerce
   */
  static async deleteVariantFromBigCommerce(
    productId: string,
    variantId: string
  ): Promise<void> {
    const variant = await db.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          include: {
            storeConnection: {
              select: {
                id: true,
                platform: true,
                accessToken: true,
                metadata: true
              }
            }
          }
        }
      }
    });

    if (!variant?.externalId) {
      // Variant not synced to BC yet, just delete locally
      return;
    }

    const { storeConnection } = variant.product;
    const metadata = storeConnection?.metadata as any;
    const storeHash = metadata?.storeHash;

    if (!storeHash) {
      return;
    }

    const apiUrl = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${variant.product.externalId}/variants/${variant.externalId}`;

    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'X-Auth-Token': storeConnection!.accessToken,
        Accept: 'application/json'
      }
    });

    if (!response.ok && response.status !== 404) {
      const error = await response.text();
      throw new Error(`Failed to delete variant from BigCommerce: ${error}`);
    }
  }

  /**
   * Delete modifier from BigCommerce
   */
  static async deleteModifierFromBigCommerce(
    productId: string,
    modifierId: string
  ): Promise<void> {
    const modifier = await db.productModifier.findUnique({
      where: { id: modifierId },
      include: {
        product: {
          include: {
            storeConnection: {
              select: {
                id: true,
                platform: true,
                accessToken: true,
                metadata: true
              }
            }
          }
        }
      }
    });

    if (!modifier?.externalId) {
      return;
    }

    const { storeConnection } = modifier.product;
    const metadata = storeConnection?.metadata as any;
    const storeHash = metadata?.storeHash;

    if (!storeHash) {
      return;
    }

    const apiUrl = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${modifier.product.externalId}/modifiers/${modifier.externalId}`;

    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'X-Auth-Token': storeConnection!.accessToken,
        Accept: 'application/json'
      }
    });

    if (!response.ok && response.status !== 404) {
      const error = await response.text();
      throw new Error(`Failed to delete modifier from BigCommerce: ${error}`);
    }
  }
}