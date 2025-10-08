import { NextRequest, NextResponse } from 'next/server'
import { ProductCreator } from '@/lib/bigcommerce/product-creator'

export async function GET(request: NextRequest) {
  try {
    console.log('📋 Fetching categories and shared modifiers...')

    // Fetch categories, shared modifiers, and variant options in parallel
    const [categories, sharedModifiers, variantOptions] = await Promise.all([
      ProductCreator.getCategories(),
      ProductCreator.getSharedModifiers(),
      ProductCreator.getSharedVariantOptions()
    ])

    console.log(`✅ Found ${categories.length} categories, ${sharedModifiers.length} shared modifiers, and ${variantOptions.length} variant options`)

    return NextResponse.json({
      success: true,
      data: {
        categories: categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          parent_id: cat.parent_id,
          is_visible: cat.is_visible
        })),
        sharedModifiers: sharedModifiers.map(mod => ({
          id: mod.id,
          name: mod.name,
          display_name: mod.display_name,
          type: mod.type,
          required: mod.required,
          optionCount: mod.option_values?.length || 0
        })),
        variantOptions: variantOptions.map(opt => ({
          id: opt.id,
          name: opt.name,
          display_name: opt.display_name,
          type: opt.type,
          valueCount: opt.option_values?.length || 0
        }))
      }
    })

  } catch (error) {
    console.error('❌ Failed to fetch categories and modifiers:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}