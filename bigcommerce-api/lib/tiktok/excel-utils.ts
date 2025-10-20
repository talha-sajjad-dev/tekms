import * as XLSX from 'xlsx'
import { promises as fs } from 'fs'
import path from 'path'

export interface TikTokColumn {
  name: string
  required: boolean
  type: 'string' | 'number' | 'array' | 'boolean'
  description?: string
}

export interface TikTokTemplate {
  columns: TikTokColumn[]
  headers: string[]
  exampleRow?: any[]
}

/**
 * Read the TikTok template Excel file and extract its structure
 */
export async function readTikTokTemplate(): Promise<TikTokTemplate> {
  try {
    // Read the template file
    const templatePath = path.join(process.cwd(), 'tiktok_up.xlsx')
    const fileBuffer = await fs.readFile(templatePath)
    
    // Parse the Excel file
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Convert to JSON to analyze structure
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
    
    // Extract headers (first row)
    const headers = jsonData[0] || []
    
    // Extract example data (second row if exists)
    const exampleRow = jsonData[1] || []
    
    // Map columns with basic type inference
    const columns: TikTokColumn[] = headers.map((header, index) => {
      const exampleValue = exampleRow[index]
      let type: 'string' | 'number' | 'array' | 'boolean' = 'string'
      
      if (typeof exampleValue === 'number') {
        type = 'number'
      } else if (typeof exampleValue === 'boolean') {
        type = 'boolean'
      }
      
      // Common required fields for TikTok
      const requiredFields = ['Product Title', 'Price', 'SKU', 'Description']
      const required = requiredFields.some(field => 
        header.toLowerCase().includes(field.toLowerCase())
      )
      
      return {
        name: header,
        required,
        type,
        description: `Column ${index + 1}: ${header}`
      }
    })
    
    return {
      columns,
      headers,
      exampleRow
    }
  } catch (error) {
    console.error('Error reading TikTok template:', error)
    throw new Error('Failed to read TikTok template file')
  }
}

/**
 * Create an Excel file with TikTok product data, preserving existing template data
 */
export async function createTikTokExcel(
  products: any[],
  template: TikTokTemplate
): Promise<Buffer> {
  try {
    // Read the original template file to preserve existing data
    const templatePath = path.join(process.cwd(), 'tiktok_up.xlsx')
    const templateBuffer = await fs.readFile(templatePath)
    const templateWorkbook = XLSX.read(templateBuffer, { type: 'buffer' })
    const templateSheet = templateWorkbook.Sheets[templateWorkbook.SheetNames[0]]
    
    // Convert template to array format to work with
    const templateData = XLSX.utils.sheet_to_json(templateSheet, { header: 1 }) as any[][]
    
    // Get headers from first row
    const headers = templateData[0] || []
    
    // Find column indices for fields we want to update
    const productNameCol = headers.findIndex(h =>
      h && h.toString().toLowerCase().includes('product') && h.toString().toLowerCase().includes('name')
    )
    const descriptionCol = headers.findIndex(h =>
      h && h.toString().toLowerCase().includes('description')
    )
    
    // Find image columns (look for columns containing "image" or "picture")
    const imageColumns: number[] = []
    headers.forEach((header, index) => {
      if (header && (
        header.toString().toLowerCase().includes('image') ||
        header.toString().toLowerCase().includes('picture') ||
        header.toString().toLowerCase().includes('photo')
      )) {
        imageColumns.push(index)
      }
    })
    
    console.log('Found columns:', {
      productName: productNameCol,
      description: descriptionCol,
      images: imageColumns
    })
    
    // Start with template data (preserve all existing data)
    const newData = [...templateData]
    
    // Use the first selected product to fill ALL 272 rows
    const selectedProduct = products[0] // Take the first (and likely only) selected product
    
    if (!selectedProduct) {
      console.log('No product selected, keeping template as-is')
      // Create new worksheet from unchanged template data
      const worksheet = XLSX.utils.aoa_to_sheet(templateData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products')
      return XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
        compression: true
      })
    }
    
    console.log(`Filling all 272 rows with data from: ${selectedProduct['Product Title']}`)
    
    // Update ALL existing data rows (skip header row)
    for (let rowIndex = 1; rowIndex < templateData.length; rowIndex++) {
      // Only update rows that have existing data
      if (newData[rowIndex] && newData[rowIndex].some((cell: any) => cell !== null && cell !== undefined && cell !== '')) {
        
        // Update only specific fields, preserve all other data
        if (productNameCol >= 0) {
          newData[rowIndex][productNameCol] = selectedProduct['Product Title'] || newData[rowIndex][productNameCol] || ''
        }
        
        if (descriptionCol >= 0) {
          newData[rowIndex][descriptionCol] = selectedProduct['Description'] || newData[rowIndex][descriptionCol] || ''
        }
        
        // Update images - fill available image columns with product images
        imageColumns.forEach((colIndex, imageIndex) => {
          const imageKey = `Image ${imageIndex + 1}`
          if (selectedProduct[imageKey]) {
            newData[rowIndex][colIndex] = selectedProduct[imageKey]
          }
          // If no BigCommerce image, keep existing template image
        })
        
        // Fix column swapping for AH (34) and AI (35) - swap data but keep headers
        const ahIndex = 33 // Column AH (34th column, 0-indexed = 33)
        const aiIndex = 34 // Column AI (35th column, 0-indexed = 34)
        if (newData[rowIndex][ahIndex] !== undefined || newData[rowIndex][aiIndex] !== undefined) {
          const tempAH = newData[rowIndex][ahIndex]
          newData[rowIndex][ahIndex] = newData[rowIndex][aiIndex]
          newData[rowIndex][aiIndex] = tempAH
        }
        
        // Fix product status columns - BC (55), BD (56), BE (57)
        const bcIndex = 54 // Column BC (55th column, 0-indexed = 54)
        const bdIndex = 55 // Column BD (56th column, 0-indexed = 55)
        const beIndex = 56 // Column BE (57th column, 0-indexed = 56)
        
        // Move product status to BE and clear BC, BD
        if (selectedProduct['Status']) {
          newData[rowIndex][beIndex] = selectedProduct['Status']
          newData[rowIndex][bcIndex] = ''
          newData[rowIndex][bdIndex] = ''
        }
      }
    }
    
    console.log(`Updated ${templateData.length - 1} rows with product data`)
    
    // Create new worksheet from updated data
    const worksheet = XLSX.utils.aoa_to_sheet(newData)
    
    // Create new workbook and add worksheet
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products')
    
    // Generate buffer
    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
      compression: true
    })
    
    return buffer
  } catch (error) {
    console.error('Error creating TikTok Excel:', error)
    throw new Error('Failed to create TikTok Excel file')
  }
}

/**
 * Validate product data against TikTok template requirements
 */
export function validateProductData(
  product: any,
  template: TikTokTemplate
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  template.columns.forEach(column => {
    if (column.required && !product[column.name]) {
      errors.push(`Missing required field: ${column.name}`)
    }
    
    if (product[column.name] && column.type === 'number') {
      const value = product[column.name]
      if (isNaN(Number(value))) {
        errors.push(`${column.name} must be a number`)
      }
    }
  })
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Parse Excel file to extract product data
 */
export async function parseExcelFile(buffer: Buffer): Promise<any[]> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Convert to JSON with headers
    const jsonData = XLSX.utils.sheet_to_json(worksheet)
    
    return jsonData
  } catch (error) {
    console.error('Error parsing Excel file:', error)
    throw new Error('Failed to parse Excel file')
  }
}