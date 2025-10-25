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
    
    // Swap header titles: AH ↔ AI and move Product Status from BC to BE
    const tempHeaderAH = headers[33]
    headers[33] = headers[34]
    headers[34] = tempHeaderAH
    
    // Move "Product Status" header from BC to BE
    if (headers[54]) {
      headers[56] = headers[54]  // Move to BE
      headers[54] = ''  // Clear BC
      headers[55] = ''  // Clear BD
    }
    
    // Update the header row in template
    templateData[0] = headers
    
    // Find column indices for fields we want to update
    const productNameCol = headers.findIndex(h =>
      h && h.toString().toLowerCase().includes('product') && h.toString().toLowerCase().includes('name')
    )
    const descriptionCol = headers.findIndex(h =>
      h && h.toString().toLowerCase().includes('description')
    )
    
    // Define column indices directly (Excel columns are 0-indexed)
    const retailPriceCol = 33  // Column AH (34th column) - "Retail Price (Local Currency)"
    const listPriceCol = 34    // Column AI (35th column) - "List price (Local currency)"
    const productStatusCol = 54 // Column BC (55th column) - "Product Status"
    
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
        
        // Swap data between columns AH (Retail Price) and AI (List Price)
        const tempAH = newData[rowIndex][retailPriceCol]
        const tempAI = newData[rowIndex][listPriceCol]
        newData[rowIndex][retailPriceCol] = tempAI
        newData[rowIndex][listPriceCol] = tempAH
        
        // Set column BB (index 53) to "No" as default
        newData[rowIndex][53] = 'No'
        
        // Move Product Status from BC (index 54) to BE (index 56), clear BC and BD
        const statusData = newData[rowIndex][productStatusCol]
        if (statusData !== undefined && statusData !== null && statusData !== '') {
          newData[rowIndex][56] = statusData  // Move to BE (column 57, index 56)
          newData[rowIndex][54] = ''  // Clear BC (column 55, index 54)
          newData[rowIndex][55] = ''  // Clear BD (column 56, index 55)
        }
        
        // Update images - fill available image columns with product images
        imageColumns.forEach((colIndex, imageIndex) => {
          const imageKey = `Image ${imageIndex + 1}`
          if (selectedProduct[imageKey]) {
            newData[rowIndex][colIndex] = selectedProduct[imageKey]
          }
          // If no BigCommerce image, keep existing template image
        })
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