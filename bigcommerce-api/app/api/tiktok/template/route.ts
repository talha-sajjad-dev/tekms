import { NextResponse } from 'next/server'
import { readTikTokTemplate } from '@/lib/tiktok/excel-utils'

export async function GET() {
  try {
    console.log('=== READING TIKTOK TEMPLATE ===')
    
    const template = await readTikTokTemplate()
    
    console.log(`Found ${template.columns.length} columns in template`)
    console.log('Headers:', template.headers)
    
    return NextResponse.json({
      success: true,
      template: {
        columns: template.columns,
        headers: template.headers,
        exampleRow: template.exampleRow,
        totalColumns: template.columns.length,
        requiredColumns: template.columns.filter(col => col.required).map(col => col.name)
      }
    })
  } catch (error) {
    console.error('Error reading TikTok template:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to read TikTok template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}