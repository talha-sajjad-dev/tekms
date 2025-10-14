import nodemailer from 'nodemailer'
import { getEmailConfig } from './settings'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Send email using configured email provider (Zoho Mail via SMTP)
 * Configure in Admin > System Settings > Email tab
 */
export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  try {
    const config = await getEmailConfig()
    
    if (!config.smtp_host || !config.smtp_user || !config.smtp_password) {
      throw new Error('Email not configured. Please configure in Admin > System Settings.')
    }

    // Create transporter for Zoho Mail (or any SMTP)
    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port || 465,
      secure: config.smtp_port === 465, // true for 465, false for other ports
      auth: {
        user: config.smtp_user,
        pass: config.smtp_password,
      },
    })

    // Verify transporter configuration
    await transporter.verify()

    // Send email
    const fromAddress = config.fromEmail || 'noreply@tekms.com'
    const info = await transporter.sendMail({
      from: config.fromName
        ? `"${config.fromName}" <${fromAddress}>`
        : fromAddress,
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ''),
      html,
    })

    console.log('Email sent:', info.messageId)
    return { success: true, messageId: info.messageId || 'sent' }
  } catch (error: any) {
    console.error('Email send error:', error)
    throw new Error(`Failed to send email: ${error.message}`)
  }
}

/**
 * Email templates
 */

export async function sendWelcomeEmail(to: string, name: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3B82F6, #06B6D4); padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { background: #f8f9fa; padding: 40px; }
          .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #3B82F6, #06B6D4); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { background: #0F172A; color: #94A3B8; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to TEKMS!</h1>
          </div>
          <div class="content">
            <h2>Hi ${name},</h2>
            <p>Thank you for joining TEKMS Listing Manager! We're excited to help you manage your marketplace listings across multiple platforms.</p>
            
            <p><strong>What you can do now:</strong></p>
            <ul>
              <li>Connect your Shopify, BigCommerce, Etsy, and TikTok stores</li>
              <li>Sync products across all platforms</li>
              <li>Start with our free tier (up to 10 products)</li>
              <li>Scale as your business grows</li>
            </ul>
            
            <a href="https://tekms.com/dashboard" class="button">Go to Dashboard</a>
            
            <p>Need help getting started? Check out our <a href="https://tekms.com/docs">documentation</a> or reply to this email.</p>
            
            <p>Happy selling!<br>The TEKMS Team</p>
          </div>
          <div class="footer">
            <p>© 2024 TEKMS Listing Manager. All rights reserved.</p>
            <p>If you have questions, contact us at support@tekmslisting.com</p>
          </div>
        </div>
      </body>
    </html>
  `

  return sendEmail({
    to,
    subject: 'Welcome to TEKMS Listing Manager! 🎉',
    html,
  })
}

export async function sendPasswordResetEmail(to: string, resetToken: string) {
  const resetUrl = `https://tekms.com/reset-password?token=${resetToken}`
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3B82F6, #06B6D4); padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { background: #f8f9fa; padding: 40px; }
          .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #3B82F6, #06B6D4); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
          .footer { background: #0F172A; color: #94A3B8; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Reset Your Password</h1>
          </div>
          <div class="content">
            <p>Hi there,</p>
            <p>We received a request to reset your password for your TEKMS account. Click the button below to create a new password:</p>
            
            <a href="${resetUrl}" class="button">Reset Password</a>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="background: white; padding: 10px; border: 1px solid #ddd; word-break: break-all;">${resetUrl}</p>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong><br>
              This link will expire in 1 hour. If you didn't request this password reset, please ignore this email or contact support if you have concerns.
            </div>
            
            <p>Best regards,<br>The TEKMS Team</p>
          </div>
          <div class="footer">
            <p>© 2024 TEKMS Listing Manager. All rights reserved.</p>
            <p>If you have questions, contact us at support@tekmslisting.com</p>
          </div>
        </div>
      </body>
    </html>
  `

  return sendEmail({
    to,
    subject: 'Reset Your TEKMS Password',
    html,
  })
}

export async function sendSubscriptionUpgradeEmail(
  to: string, 
  name: string, 
  storeName: string, 
  oldTier: string, 
  newTier: string,
  newPrice: number
) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3B82F6, #06B6D4); padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { background: #f8f9fa; padding: 40px; }
          .tier-box { background: white; border: 2px solid #3B82F6; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
          .footer { background: #0F172A; color: #94A3B8; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📈 Your Store Has Been Upgraded!</h1>
          </div>
          <div class="content">
            <h2>Hi ${name},</h2>
            <p>Great news! Your store "<strong>${storeName}</strong>" has been automatically upgraded to a higher tier based on your product count.</p>
            
            <div class="tier-box">
              <p style="margin: 0; font-size: 14px; color: #64748B;">Tier Change</p>
              <p style="font-size: 24px; margin: 10px 0;"><strong>${oldTier}</strong> → <strong style="color: #3B82F6;">${newTier}</strong></p>
              <p style="margin: 0; font-size: 14px; color: #64748B;">New Price</p>
              <p style="font-size: 32px; margin: 10px 0; color: #3B82F6;"><strong>$${newPrice}/month</strong></p>
            </div>
            
            <p><strong>What this means:</strong></p>
            <ul>
              <li>You now have access to more products on this store</li>
              <li>Your billing will be prorated for the current period</li>
              <li>All your existing data and settings remain intact</li>
            </ul>
            
            <p>View your billing details and manage your subscription in your dashboard.</p>
            
            <p>Thank you for growing with TEKMS!<br>The TEKMS Team</p>
          </div>
          <div class="footer">
            <p>© 2024 TEKMS Listing Manager. All rights reserved.</p>
            <p>Questions? Contact support@tekmslisting.com</p>
          </div>
        </div>
      </body>
    </html>
  `

  return sendEmail({
    to,
    subject: `Store Upgraded: ${storeName} → ${newTier} Tier`,
    html,
  })
}