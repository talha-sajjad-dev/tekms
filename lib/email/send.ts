import { db } from '@/lib/db'

interface EmailParams {
  to: string
  subject: string
  template: string
  data: any
}

/**
 * Send an email using configured email provider
 */
export async function sendEmail({ to, subject, template, data }: EmailParams): Promise<void> {
  try {
    // Log email attempt
    const emailLog = await db.emailLog.create({
      data: {
        to,
        subject,
        template,
        status: 'pending',
        metadata: data
      }
    })

    // Get email settings from database
    const [smtpHost, smtpPort, smtpUser, smtpPassword, fromAddress, fromName] = await Promise.all([
      db.settings.findUnique({ where: { key: 'smtp_host' } }),
      db.settings.findUnique({ where: { key: 'smtp_port' } }),
      db.settings.findUnique({ where: { key: 'smtp_user' } }),
      db.settings.findUnique({ where: { key: 'smtp_password' } }),
      db.settings.findUnique({ where: { key: 'email_from_address' } }),
      db.settings.findUnique({ where: { key: 'email_from_name' } })
    ])

    // If SMTP not configured, just log and return
    if (!smtpHost?.value || !smtpUser?.value) {
      console.log(`📧 Email queued (SMTP not configured): ${subject} to ${to}`)
      await db.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'queued',
          error: 'SMTP not configured'
        }
      })
      return
    }

    // Generate email HTML based on template
    const html = generateEmailHTML(template, data)

    // Send email using nodemailer (if configured)
    try {
      const nodemailer = require('nodemailer')
      
      const transporter = nodemailer.createTransport({
        host: smtpHost.value,
        port: parseInt(smtpPort?.value || '465'),
        secure: true,
        auth: {
          user: smtpUser.value,
          pass: smtpPassword?.value || ''
        }
      })

      const info = await transporter.sendMail({
        from: `"${fromName?.value || 'TEKMS'}" <${fromAddress?.value || smtpUser.value}>`,
        to,
        subject,
        html
      })

      await db.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'sent',
          providerId: info.messageId
        }
      })

      console.log(`✅ Email sent: ${subject} to ${to}`)
    } catch (sendError) {
      console.error('Failed to send email:', sendError)
      await db.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'failed',
          error: sendError instanceof Error ? sendError.message : 'Unknown error'
        }
      })
      throw sendError
    }
  } catch (error) {
    console.error('Email service error:', error)
    throw error
  }
}

/**
 * Generate email HTML from template
 */
function generateEmailHTML(template: string, data: any): string {
  const templates: Record<string, (data: any) => string> = {
    payment_success: (d) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">✅ Payment Successful</h2>
        <p>Hi ${d.userName},</p>
        <p>Your payment for <strong>${d.storeName}</strong> has been processed successfully.</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Plan:</strong> ${d.tierName}</p>
          <p style="margin: 5px 0;"><strong>Amount:</strong> $${d.amount}</p>
          <p style="margin: 5px 0;"><strong>Next billing:</strong> ${d.periodEnd}</p>
        </div>
        <p>Your subscription is now active and all features are available.</p>
        <p>Thank you for your business!</p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          TEKMS Listing Manager
        </p>
      </div>
    `,
    
    payment_failed: (d) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">⚠️ Payment Failed</h2>
        <p>Hi ${d.userName},</p>
        <p>We were unable to process your payment for <strong>${d.storeName}</strong>.</p>
        <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p style="margin: 5px 0;"><strong>Amount due:</strong> $${d.amount}</p>
          <p style="margin: 5px 0;"><strong>Attempt:</strong> ${d.attemptCount}</p>
          <p style="margin: 5px 0;"><strong>Next retry:</strong> ${d.nextAttempt}</p>
        </div>
        <p>Please update your payment method to avoid service interruption.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/billing" 
           style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">
          Update Payment Method
        </a>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          TEKMS Listing Manager
        </p>
      </div>
    `,
    
    quote_received: (d) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">📋 Quote Request Received</h2>
        <p>Hi ${d.customerName},</p>
        <p>Thank you for your quote request. We've received your inquiry and will get back to you shortly.</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Quote ID:</strong> ${d.quoteId}</p>
          <p style="margin: 5px 0;"><strong>Product:</strong> ${d.productName}</p>
          <p style="margin: 5px 0;"><strong>Quantity:</strong> ${d.quantity}</p>
          ${d.notes ? `<p style="margin: 5px 0;"><strong>Notes:</strong> ${d.notes}</p>` : ''}
        </div>
        <p>We'll review your request and send you a detailed quote within 24-48 hours.</p>
        <p>Questions? Reply to this email or call ${d.phone || 'our support line'}.</p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          TEKMS Listing Manager
        </p>
      </div>
    `,
    
    quote_admin_notification: (d) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">🔔 New Quote Request</h2>
        <p>A new quote request has been submitted:</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Quote ID:</strong> ${d.quoteId}</p>
          <p style="margin: 5px 0;"><strong>Customer:</strong> ${d.customerName}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${d.customerEmail}</p>
          <p style="margin: 5px 0;"><strong>Phone:</strong> ${d.customerPhone}</p>
          <p style="margin: 5px 0;"><strong>Company:</strong> ${d.customerCompany || 'N/A'}</p>
          <hr style="margin: 15px 0; border: none; border-top: 1px solid #d1d5db;">
          <p style="margin: 5px 0;"><strong>Product:</strong> ${d.productName}</p>
          <p style="margin: 5px 0;"><strong>SKU:</strong> ${d.productSku || 'N/A'}</p>
          <p style="margin: 5px 0;"><strong>Quantity:</strong> ${d.quantity}</p>
          ${d.notes ? `<p style="margin: 5px 0;"><strong>Notes:</strong> ${d.notes}</p>` : ''}
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/quotes" 
           style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          View Quote Request
        </a>
      </div>
    `,
    
    subscription_gifted: (d) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">🎁 You've Received a Subscription Gift!</h2>
        <p>Hi ${d.userName},</p>
        <p>Great news! An administrator has gifted you a <strong>${d.tier}</strong> subscription.</p>
        <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <p style="margin: 5px 0;"><strong>Plan:</strong> ${d.tier}</p>
          <p style="margin: 5px 0;"><strong>Duration:</strong> ${d.duration} month(s)</p>
          <p style="margin: 5px 0;"><strong>Expires:</strong> ${d.expiresAt}</p>
          ${d.note ? `<p style="margin: 5px 0;"><strong>Note:</strong> ${d.note}</p>` : ''}
        </div>
        <p>All ${d.tier} features are now available in your account!</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
           style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">
          Go to Dashboard
        </a>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          TEKMS Listing Manager - Enjoy your gifted subscription!
        </p>
      </div>
    `
  }

  const generator = templates[template]
  if (!generator) {
    console.warn(`Unknown email template: ${template}`)
    return `<p>Email template "${template}" not found.</p><pre>${JSON.stringify(data, null, 2)}</pre>`
  }

  return generator(data)
}