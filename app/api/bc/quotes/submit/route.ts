import { NextRequest, NextResponse } from 'next/server'
import { saveQuote, generateQuoteId } from '@/lib/bigcommerce-app/storage'
import { sendEmail } from '@/lib/email/send'
import { db } from '@/lib/db'
import type { QuoteRequest, QuoteSubmission } from '@/types/bigcommerce-app'

/**
 * Submit a new quote request (from storefront)
 * POST /api/bc/quotes/submit
 */
export async function POST(request: NextRequest) {
  try {
    const body: QuoteSubmission = await request.json()
    
    // Validate required fields
    if (!body.customer?.name || !body.customer?.email || !body.customer?.phone) {
      return NextResponse.json(
        { success: false, error: 'Missing required customer information' },
        { status: 400 }
      )
    }
    
    if (!body.product?.id || !body.product?.name) {
      return NextResponse.json(
        { success: false, error: 'Missing required product information' },
        { status: 400 }
      )
    }
    
    if (!body.quantity || body.quantity < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid quantity' },
        { status: 400 }
      )
    }
    
    if (!body.storeHash) {
      return NextResponse.json(
        { success: false, error: 'Missing store hash' },
        { status: 400 }
      )
    }
    
    // Create quote request
    const quoteId = generateQuoteId()
    const quote: QuoteRequest = {
      id: quoteId,
      storeHash: body.storeHash,
      createdAt: new Date().toISOString(),
      status: 'pending',
      customer: {
        name: body.customer.name,
        email: body.customer.email,
        phone: body.customer.phone,
        company: body.customer.company
      },
      product: {
        id: body.product.id,
        name: body.product.name,
        sku: body.product.sku,
        price: body.product.price,
        imageUrl: body.product.imageUrl
      },
      quantity: body.quantity,
      notes: body.notes
    }
    
    // Save quote
    await saveQuote(quote)
    
    console.log('Quote saved:', quoteId)
    
    // Send email notifications
    try {
      // Send confirmation to customer
      await sendEmail({
        to: quote.customer.email,
        subject: `Quote Request Received - ${quoteId}`,
        template: 'quote_received',
        data: {
          customerName: quote.customer.name,
          quoteId: quote.id,
          productName: quote.product.name,
          quantity: quote.quantity,
          notes: quote.notes,
          phone: quote.customer.phone
        }
      }).catch(err => console.error('Failed to send customer quote email:', err))

      // Send notification to admin/support
      const supportEmail = await db.settings.findUnique({
        where: { key: 'support_email' }
      })
      
      if (supportEmail?.value) {
        await sendEmail({
          to: supportEmail.value,
          subject: `New Quote Request - ${quoteId}`,
          template: 'quote_admin_notification',
          data: {
            quoteId: quote.id,
            customerName: quote.customer.name,
            customerEmail: quote.customer.email,
            customerPhone: quote.customer.phone,
            customerCompany: quote.customer.company,
            productName: quote.product.name,
            productSku: quote.product.sku,
            quantity: quote.quantity,
            notes: quote.notes
          }
        }).catch(err => console.error('Failed to send admin quote email:', err))
      }
      
      console.log(`✅ Quote emails sent for ${quoteId}`)
    } catch (emailError) {
      console.error('Error sending quote emails:', emailError)
      // Don't fail the quote submission if email fails
    }
    
    return NextResponse.json({
      success: true,
      quoteId,
      message: 'Quote request submitted successfully'
    })
  } catch (error) {
    console.error('Error submitting quote:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to submit quote request' },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS handler for CORS (if needed for storefront)
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}