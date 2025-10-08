import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET() {
  try {
    console.log('=== ANALYZING TIKTOK EXCEL FILE ===')
    
    // Read the template file
    const templatePath = path.join(process.cwd(), 'tiktok_up.xlsx')
    const fileBuffer = await fs.readFile(templatePath)
    
    // Parse the Excel file
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Convert to JSON to analyze structure
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
    
    // Analyze the structure
    const analysis = {
      totalRows: jsonData.length,
      totalColumns: jsonData[0]?.length || 0,
      headers: jsonData[0] || [],
      sampleRows: jsonData.slice(1, 6), // Show first 5 data rows
      nonEmptyRows: 0,
      emptyRows: 0
    }
    
    // Count non-empty vs empty rows
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i]
      const hasData = row && row.some(cell => cell !== null && cell !== undefined && cell !== '')
      if (hasData) {
        analysis.nonEmptyRows++
      } else {
        analysis.emptyRows++
      }
    }
    
    console.log('Excel Analysis:', {
      totalRows: analysis.totalRows,
      totalColumns: analysis.totalColumns,
      nonEmptyRows: analysis.nonEmptyRows,
      emptyRows: analysis.emptyRows,
      headers: analysis.headers.slice(0, 10) // First 10 headers
    })
    
    return NextResponse.json({
      success: true,
      analysis: {
        ...analysis,
        summary: {
          hasHeaders: analysis.headers.length > 0,
          hasExistingData: analysis.nonEmptyRows > 0,
          dataRowsAfterHeaders: analysis.totalRows - 1,
          recommendation: analysis.nonEmptyRows > 0 
            ? 'Template has existing data - should preserve or append'
            : 'Template is empty - can populate with BigCommerce data'
        }
      }
    })
  } catch (error) {
    console.error('Error analyzing Excel file:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze Excel file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}